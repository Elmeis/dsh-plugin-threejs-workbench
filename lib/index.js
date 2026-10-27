/**
 * @local/dsh-threejs — host half.
 *
 * Two faces for Three.js work inside a DSH session:
 *
 *   GET /api/threejs/inspect?session=<id>|cwd=<dir>
 *        → the workspace report: three revision and where it resolves from,
 *          declared stacks (react-three-fiber, drei, postprocessing, physics),
 *          WebGL/WebGPU usage, ranked scene entry candidates, GLB/GLTF/HDR
 *          asset weights, and findings for APIs removed or renamed by newer
 *          three revisions (with file:line:column).
 *
 *   GET /api/threejs/preview?session=<id>|cwd=<dir>&path=<rel>&rev=<n>
 *        → a runnable page for one scene file: an import map that maps `three`,
 *          `three/webgpu`, `three/tsl`, `three/addons/`, `three/examples/jsm/`
 *          onto the project's own three (or the copy vendored with this
 *          plugin), an error/console bridge that posts every message to the
 *          DSH page, and an auto-invoked exported entry point. `.html` targets
 *          are served as-is with the bridge and import map injected.
 *
 *   GET /api/threejs/r/<token>/<rest>
 *        → the byte server behind both: project files under the session cwd,
 *          plus `~three/<path>` (three package root) and `~addons/<path>`
 *          (three/examples/jsm) for the copy of three the import map chose.
 *
 * Every path is resolved inside the session's working directory (or the
 * explicit `cwd` fallback) after a realpath check, so a symlink cannot walk
 * out of the project. Reads are bounded by MAX_FILE_BYTES/MAX_SCAN_FILES;
 * nothing on disk is ever written or executed on the host.
 */
import { createReadStream, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Cordis plugin name. */
const name = "threejs";

/** The web server owns the route table; the session store resolves the cwd. */
const inject = ["webServer", "sessions"];

/** Prefix this plugin owns on the shared web server. */
const ROUTE_PREFIX = "/api/threejs";

/** Where the three package vendored with this plugin lives. */
const VENDOR_THREE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "vendor", "three");

/**
 * This plugin's own package root. The project scan skips it: the rule table in
 * this file literally contains the removed API names it looks for, so scanning
 * itself would report the workbench instead of the user's code.
 */
const SELF_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Directories never walked by the project scan. */
const SKIP_DIRS = new Set([
	"node_modules", ".git", ".hg", ".svn", ".dsh", ".agents", ".venv", "venv",
	"dist", "build", "out", "coverage", ".next", ".nuxt", ".svelte-kit", ".output",
	".cache", ".parcel-cache", ".turbo", "__pycache__", "vendor", "tmp", "logs"
]);

/** Extensions whose contents the scan reads. */
const CODE_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".html", ".htm", ".vue", ".svelte"]);

/** Extensions the preview page can actually run in a browser. */
const RUNNABLE_EXT = new Set([".js", ".mjs", ".html", ".htm"]);

/** Asset extensions reported with their weight. */
const ASSET_EXT = new Set([".glb", ".gltf", ".hdr", ".exr", ".ktx2", ".basis", ".drc", ".fbx", ".obj", ".mtl", ".vrm"]);

/** Content types for the byte server. */
const MIME = new Map([
	[".js", "text/javascript; charset=utf-8"],
	[".mjs", "text/javascript; charset=utf-8"],
	[".cjs", "text/javascript; charset=utf-8"],
	[".jsx", "text/javascript; charset=utf-8"],
	[".ts", "text/plain; charset=utf-8"],
	[".tsx", "text/plain; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".css", "text/css; charset=utf-8"],
	[".html", "text/html; charset=utf-8"],
	[".htm", "text/html; charset=utf-8"],
	[".svg", "image/svg+xml"],
	[".png", "image/png"],
	[".jpg", "image/jpeg"],
	[".jpeg", "image/jpeg"],
	[".webp", "image/webp"],
	[".gif", "image/gif"],
	[".avif", "image/avif"],
	[".ktx2", "image/ktx2"],
	[".hdr", "image/vnd.radiance"],
	[".exr", "image/aces"],
	[".glb", "model/gltf-binary"],
	[".gltf", "model/gltf+json"],
	[".bin", "application/octet-stream"],
	[".wasm", "application/wasm"],
	[".txt", "text/plain; charset=utf-8"],
	[".wgsl", "text/plain; charset=utf-8"],
	[".glsl", "text/plain; charset=utf-8"]
]);

/** Project scan bounds: files read, file bytes, findings, entry candidates. */
const MAX_SCAN_FILES = 600;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_FINDINGS = 200;
const MAX_ENTRIES = 30;
const MAX_ASSETS = 120;
const MAX_DEPTH = 8;
const MAX_ASSET_BYTES = 4 * 1024 * 1024 * 1024;

/**
 * APIs that newer three revisions removed or renamed. `removedIn` is the
 * revision that made the current form the only one, so a finding can be read
 * against the project's own revision. Only facts verified against the official
 * migration guide and the installed package's source belong here.
 * @type {ReadonlyArray<{id:string,severity:"error"|"warn"|"info",pattern:RegExp,message:string,hint:string,removedIn?:number}>}
 */
const RULES = [
	{
		id: "output-encoding",
		severity: "error",
		pattern: /\boutputEncoding\b/g,
		message: "renderer.outputEncoding was replaced by outputColorSpace (r152).",
		hint: "renderer.outputColorSpace = THREE.SRGBColorSpace",
		removedIn: 152
	},
	{
		id: "legacy-color-space",
		severity: "error",
		pattern: /\b(sRGBEncoding|LinearEncoding|GammaEncoding|RGBEEncoding|LogLuvEncoding|RGBM7Encoding|RGBM16Encoding|RGBDEncoding)\b/g,
		message: "The *Encoding color-space constants were replaced (r152); r186 only defines NoColorSpace, SRGBColorSpace and LinearSRGBColorSpace.",
		hint: "THREE.SRGBColorSpace / THREE.LinearSRGBColorSpace",
		removedIn: 152
	},
	{
		id: "texture-encoding",
		severity: "error",
		pattern: /\.encoding\s*=\s*(THREE\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*Encoding)\b/g,
		message: "texture.encoding was replaced by texture.colorSpace (r152).",
		hint: "texture.colorSpace = THREE.SRGBColorSpace (colour maps only; leave data maps at NoColorSpace)",
		removedIn: 152
	},
	{
		id: "legacy-lights",
		severity: "error",
		pattern: /\b(useLegacyLights|physicallyCorrectLights)\b/g,
		message: "The legacy lighting switch is gone (deprecated r155, absent from r186): lights are always physically correct, so old intensities are wrong.",
		hint: "Drop the flag and re-tune light intensity/decay; use scene.environmentIntensity for IBL strength.",
		removedIn: 186
	},
	{
		id: "color-management-legacy",
		severity: "error",
		pattern: /ColorManagement\.legacyMode/g,
		message: "THREE.ColorManagement.legacyMode was replaced by ColorManagement.enabled (r150).",
		hint: "Color management is on by default since r152; author colours with .setStyle(style, THREE.SRGBColorSpace).",
		removedIn: 150
	},
	{
		id: "webgl1-renderer",
		severity: "error",
		pattern: /\bWebGL1Renderer\b/g,
		message: "WebGL 1 support was removed (r163); WebGLRenderer is WebGL 2 only.",
		hint: "new THREE.WebGLRenderer(...) — or WebGPURenderer for the node/TSL track.",
		removedIn: 163
	},
	{
		id: "legacy-geometry",
		severity: "error",
		pattern: /\b(THREE\.)?(new\s+)?(Geometry|Face3)\b/g,
		message: "THREE.Geometry and Face3 were removed (r145); every geometry is a BufferGeometry.",
		hint: "Use BufferGeometry classes (BoxGeometry, PlaneGeometry, …) and BufferAttribute.",
		removedIn: 145
	},
	{
		id: "buffer-geometry-alias",
		severity: "warn",
		pattern: /\b(Box|Plane|Sphere|Cylinder|Cone|Circle|Ring|Torus|TorusKnot|Edges|Wireframe|Dodecahedron|Icosahedron|Octahedron|Tetrahedron|Polyhedron|Extrude|Lathe|Tube|Shape|Parametric)BufferGeometry\b/g,
		message: "The *BufferGeometry aliases were renamed in r125 and are gone by r186.",
		hint: "BoxGeometry, PlaneGeometry, SphereGeometry, …",
		removedIn: 125
	},
	{
		id: "buffer-geometry-attribute-api",
		severity: "warn",
		pattern: /\b(addAttribute|removeAttribute|computeFaceNormals)\b/g,
		message: "This BufferGeometry method is gone from current three (renamed/removed in the r110–r126 window).",
		hint: "setAttribute / deleteAttribute / computeVertexNormals",
		removedIn: 126
	},
	{
		id: "three-math",
		severity: "error",
		pattern: /\bTHREE\.Math\b/g,
		message: "THREE.Math was renamed to THREE.MathUtils (r123).",
		hint: "THREE.MathUtils",
		removedIn: 123
	},
	{
		id: "examples-js-import",
		severity: "error",
		pattern: /three\/examples\/js\//g,
		message: "The three/examples/js files were removed (r148).",
		hint: "import { OrbitControls } from 'three/addons/controls/OrbitControls.js'",
		removedIn: 148
	},
	{
		id: "merge-geometries",
		severity: "warn",
		pattern: /\bmergeBufferGeometries\b/g,
		message: "mergeBufferGeometries was renamed to mergeGeometries (r151).",
		hint: "BufferGeometryUtils.mergeGeometries(geometries, useGroups)",
		removedIn: 151
	},
	{
		id: "geometry-merge-method",
		severity: "warn",
		pattern: /\.merge\s*\(/g,
		message: "BufferGeometry.merge() was removed; merging lives in the addon now.",
		hint: "BufferGeometryUtils.mergeGeometries([a, b])",
		removedIn: 151
	},
	{
		id: "renderer-gamma",
		severity: "error",
		pattern: /\bgamma(Factor|Output|Input)\b/g,
		message: "The renderer gamma* flags were removed with the colour-management rewrite (r152).",
		hint: "Use outputColorSpace and ColorManagement.",
		removedIn: 152
	},
	{
		id: "image-utils-load-texture",
		severity: "error",
		pattern: /ImageUtils\.loadTexture\b/g,
		message: "ImageUtils.loadTexture was removed.",
		hint: "new THREE.TextureLoader().load(url)",
		removedIn: 125
	},
	{
		id: "removed-loaders",
		severity: "error",
		pattern: /\b(JSONLoader|BinaryLoader|XHRLoader|MeshFaceMaterial|MultiMaterial|LensFlare|LensFlarePlugin|SpriteCanvasMaterial|CanvasRenderer|Projector|ParticleBasicMaterial|ParticleSystem)\b/g,
		message: "This class was removed from three (r125 era cleanups and earlier).",
		hint: "Use GLTFLoader/FBXLoader, an array of materials, or Points + PointsMaterial.",
		removedIn: 125
	},
	{
		id: "pcf-soft-shadow-map",
		severity: "warn",
		pattern: /\bPCFSoftShadowMap\b/g,
		message: "PCFSoftShadowMap is deprecated for WebGLRenderer (r182) and removed for WebGPURenderer (r186): PCFShadowMap is soft now.",
		hint: "renderer.shadowMap.type = THREE.PCFShadowMap",
		removedIn: 186
	},
	{
		id: "rgbe-loader",
		severity: "warn",
		pattern: /\bRGBELoader\b/g,
		message: "RGBELoader is a deprecated shim over HDRLoader (r180) and logs a warning.",
		hint: "import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'",
		removedIn: 180
	},
	{
		id: "clock-deprecated",
		severity: "info",
		pattern: /\bnew\s+(THREE\.)?Clock\s*\(/g,
		message: "THREE.Clock is deprecated (r183); Timer lives in core since r179.",
		hint: "const timer = new THREE.Timer(); timer.update(); timer.getDelta()  // timer.connect(document) for tab-visibility pausing",
		removedIn: 183
	},
	{
		id: "webgpu-addon-path",
		severity: "warn",
		pattern: /three\/addons\/renderers\/webgpu\//g,
		message: "WebGPURenderer moved into the package entry `three/webgpu` (r167); the addon path is gone.",
		hint: "import { WebGPURenderer } from 'three/webgpu'",
		removedIn: 167
	},
	{
		id: "tsl-addon-path",
		severity: "warn",
		pattern: /three\/addons\/nodes\//g,
		message: "The node/TSL modules moved to the `three/tsl` entry (r167).",
		hint: "import { color, positionLocal, mix } from 'three/tsl'",
		removedIn: 167
	},
	{
		id: "tsl-display-path-drift",
		severity: "error",
		pattern: /tsl\/display\/(MotionBlurNode|AmbientOcclusionNode|SepiaNode|BoxBlurNode|HashBlurNode|AnamorphicNode)\.js/g,
		message: "This display-node filename does not exist in current three — the import 404s and nothing renders.",
		hint: "MotionBlur.js, GTAONode.js or SSAONode.js, Sepia.js, boxBlur.js, hashBlur.js; AnamorphicNode was removed in r185 (use BloomNode).",
		removedIn: 185
	},
	{
		id: "postprocessing-alias",
		severity: "info",
		pattern: /\bnew\s+(THREE\.)?PostProcessing\s*\(/g,
		message: "PostProcessing was renamed to RenderPipeline (r183); the old name still works as a deprecated alias.",
		hint: "new THREE.RenderPipeline(renderer) — WebGPURenderer only; the WebGL track uses EffectComposer + OutputPass last.",
		removedIn: 183
	},
	{
		id: "tsl-renames",
		severity: "info",
		pattern: /\b(varying|vertexStage|setResolution|getResolution)\s*\(/g,
		message: "TSL and display-node names drift every few revisions.",
		hint: "toVarying() / toVertexStage(); setResolutionScale() / getResolutionScale() with a scalar resolutionScale (r173/r180).",
		removedIn: 180
	},
	{
		id: "tsl-pi2",
		severity: "info",
		pattern: /\bPI2\b/g,
		message: "TSL's PI2 is deprecated in favour of TWO_PI (r181).",
		hint: "import { TWO_PI } from 'three/tsl'",
		removedIn: 181
	},
	{
		id: "batched-mesh-api",
		severity: "warn",
		pattern: /\bapplyGeometry\s*\(/g,
		message: "BatchedMesh.applyGeometry() became addGeometry() (r159), and a new geometry only renders after addInstance() (r166).",
		hint: "batchedMesh.addGeometry(geometry); batchedMesh.addInstance(geometryId)",
		removedIn: 166
	},
	{
		id: "instanced-mesh-frustum",
		severity: "info",
		pattern: /\bnew\s+(THREE\.)?InstancedMesh\s*\(/g,
		message: "InstancedMesh is frustum-culled by default since r151, so instances moved after construction can be culled away.",
		hint: "Call instancedMesh.computeBoundingSphere() after writing instance matrices.",
		removedIn: 151
	},
	{
		id: "multiple-render-targets",
		severity: "warn",
		pattern: /\bWebGLMultipleRenderTargets\b/g,
		message: "WebGLMultipleRenderTargets was removed (r162); use the count option on render-target classes.",
		hint: "new THREE.WebGLRenderTarget(w, h, { count: 2 })",
		removedIn: 162
	},
	{
		id: "loader-renames",
		severity: "info",
		pattern: /\b(USDZLoader|RGBMLoader|LWOLoader|VTKLoader|LottieLoader)\b/g,
		message: "This loader was renamed or deprecated in current three.",
		hint: "USDZLoader → USDLoader; RGBMLoader/LWOLoader/VTKLoader/LottieLoader are deprecated.",
		removedIn: 180
	},
	{
		id: "webgpu-missing-init",
		severity: "info",
		pattern: /new\s+WebGPURenderer\s*\(/g,
		message: "WebGPURenderer must be initialized before the first frame (or rely on setAnimationLoop).",
		hint: "await renderer.init();",
		removedIn: 167
	},
	{
		id: "webglrenderer-in-webgpu-file",
		severity: "warn",
		pattern: /from\s+['"]three\/webgpu['"][\s\S]{0,400}?new\s+WebGLRenderer/g,
		message: "This file imports the WebGPU entry but constructs a WebGLRenderer: node materials, TSL and RenderPipeline do not work there.",
		hint: "new WebGPURenderer({ antialias: true }) from the same import, or move to `three` + EffectComposer.",
		removedIn: 163
	},
	{
		id: "position-local-skinned",
		severity: "info",
		pattern: /\bpositionLocal\b/g,
		message: "In material.positionNode, positionLocal skips internal vertex transforms (r186): a SkinnedMesh will not deform.",
		hint: "Use positionGeometry (or positionLocal + skinning nodes) when the mesh is skinned.",
		removedIn: 186
	}
];

/** Suggestion pairs surfaced in the report header. */
const STACK_PROBES = [
	["@react-three/fiber", "React Three Fiber"],
	["@react-three/drei", "drei"],
	["@react-three/postprocessing", "r3f postprocessing"],
	["postprocessing", "postprocessing"],
	["three-stdlib", "three-stdlib"],
	["cannon-es", "cannon-es"],
	["cannon", "cannon"],
	["@dimforge/rapier3d", "Rapier"],
	["@dimforge/rapier3d-compat", "Rapier (compat)"],
	["ammojs-typed", "ammo.js"],
	["matter-js", "matter-js"],
	["gsap", "GSAP"],
	["@tweenjs/tween.js", "tween.js"],
	["troika-three-text", "troika-three-text"],
	["three-mesh-bvh", "three-mesh-bvh"],
	["lil-gui", "lil-gui"],
	["stats.js", "stats.js"]
];

/* ── small helpers ─────────────────────────────────────────────────────────── */

/**
 * Stat helper folding every failure into "absent".
 * @param {string} p - candidate path.
 * @returns {"file"|"dir"|null} the kind, or null when it does not exist.
 */
function kindOf(p) {
	try {
		const s = statSync(p);
		return s.isDirectory() ? "dir" : s.isFile() ? "file" : null;
	} catch {
		return null;
	}
}

/**
 * Path containment that survives symlinks: both sides are realpath'ed first,
 * so `link -> /elsewhere` can never escape the allowed root.
 * @param {string} root - allowed root directory.
 * @param {string} candidate - absolute path to test.
 * @returns {string|null} the real path when it is inside root, else null.
 */
function realInRoot(root, candidate) {
	try {
		const realRoot = realpathSync(root);
		const real = realpathSync(candidate);
		if (real === realRoot || real.startsWith(realRoot.endsWith(sep) ? realRoot : realRoot + sep)) return real;
		return null;
	} catch {
		return null;
	}
}

/**
 * Interpret the `session`/`cwd` query pair and resolve the project root.
 * @param {any} ctx - plugin context (needs ctx.sessions).
 * @param {URL} url - request url.
 * @returns {{root:string}|{error:string}} resolved root or a client error.
 */
function resolveRoot(ctx, url) {
	const sessionId = url.searchParams.get("session");
	if (sessionId !== null && sessionId.length > 0) {
		const sessions = ctx.sessions;
		const session = sessions?.get?.(sessionId);
		const cwd = session?.header?.cwd;
		if (typeof cwd !== "string" || cwd.length === 0) return { error: "session has no working directory" };
		const real = realInRoot(cwd, cwd);
		return real === null ? { error: "session working directory is unavailable" } : { root: real };
	}
	const cwd = url.searchParams.get("cwd");
	if (typeof cwd !== "string" || cwd.length === 0 || !isAbsolute(cwd)) return { error: "session or absolute cwd required" };
	const real = realInRoot(cwd, cwd);
	return real === null ? { error: "cwd is not a readable directory" } : { root: real };
}

/** Base64url token binding a byte-server URL to one project root. */
function tokenOf(root) {
	return Buffer.from(root, "utf8").toString("base64url");
}

/** Inverse of {@link tokenOf}; null when the token is not a readable directory. */
function rootOfToken(token) {
	try {
		const decoded = Buffer.from(token, "base64url").toString("utf8");
		if (!isAbsolute(decoded)) return null;
		return realInRoot(decoded, decoded);
	} catch {
		return null;
	}
}

/** Percent-encode a root-relative path segment by segment. */
function urlPath(rel) {
	return rel.split("/").filter((s) => s.length > 0).map(encodeURIComponent).join("/");
}

/** Relative path with forward slashes (the client speaks one dialect). */
function toPosix(p) {
	return sep === "/" ? p : p.split(sep).join("/");
}

/* ── three resolution ──────────────────────────────────────────────────────── */

/**
 * Revision number of an installed three package: read from src/constants.js,
 * falling back to the npm version's minor component.
 * @param {string} dir - three package directory.
 * @returns {string|null} the revision, e.g. "186".
 */
function readRevision(dir) {
	try {
		const text = readFileSync(join(dir, "src", "constants.js"), "utf8");
		const match = text.match(/REVISION\s*=\s*['"](\d+)['"]/);
		if (match !== null) return match[1];
	} catch {
		/* fall through to the version */
	}
	try {
		const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
		const [, minor] = String(pkg.version ?? "").split(".");
		return minor !== undefined && /^\d+$/.test(minor) ? minor : null;
	} catch {
		return null;
	}
}

/**
 * Locate the three package to run in the preview: the project's own install
 * first (nearest node_modules wins), then the copy vendored with this plugin.
 * @param {string} root - project root.
 * @returns {{dir:string,version:string|null,revision:string|null,source:"project"|"ancestor"|"bundled"}|null} the choice.
 */
function resolveThree(root) {
	let dir = root;
	for (let level = 0; level < 4; level += 1) {
		const candidate = join(dir, "node_modules", "three");
		if (kindOf(join(candidate, "build", "three.module.js")) === "file") {
			const real = realInRoot(candidate, candidate) ?? candidate;
			return { dir: real, version: readVersion(real), revision: readRevision(real), source: level === 0 ? "project" : "ancestor" };
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	if (kindOf(join(VENDOR_THREE_DIR, "build", "three.module.js")) === "file") {
		return {
			dir: VENDOR_THREE_DIR,
			version: readVersion(VENDOR_THREE_DIR),
			revision: readRevision(VENDOR_THREE_DIR),
			source: "bundled"
		};
	}
	return null;
}

/** Version field of a package.json, or null. */
function readVersion(dir) {
	try {
		const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
		return typeof pkg.version === "string" ? pkg.version : null;
	} catch {
		return null;
	}
}

/* ── project scan ──────────────────────────────────────────────────────────── */

/**
 * Walk the project collecting candidate code/asset files, bounded in depth,
 * count and size.
 * @param {string} root - project root.
 * @returns {{code:Array<{rel:string,abs:string,size:number}>,assets:Array<{rel:string,size:number}>,skipped:string[],truncated:boolean}} scan result.
 */
function scanProject(root) {
	const code = [];
	const assets = [];
	const skipped = [];
	let truncated = false;
	const walk = (dir, depth) => {
		if (truncated || depth > MAX_DEPTH) return;
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (truncated) return;
			const abs = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (SKIP_DIRS.has(entry.name) || abs === SELF_DIR) {
					if (skipped.length < 40) skipped.push(toPosix(abs.slice(root.length + 1)));
					continue;
				}
				walk(abs, depth + 1);
				continue;
			}
			if (!entry.isFile()) continue;
			const ext = extname(entry.name).toLowerCase();
			let size = 0;
			try {
				size = statSync(abs).size;
			} catch {
				continue;
			}
			if (ASSET_EXT.has(ext)) {
				if (assets.length < MAX_ASSETS) assets.push({ rel: toPosix(abs.slice(root.length + 1)), size });
				continue;
			}
			if (!CODE_EXT.has(ext) || size > MAX_FILE_BYTES) continue;
			if (code.length >= MAX_SCAN_FILES) {
				truncated = true;
				return;
			}
			code.push({ rel: toPosix(abs.slice(root.length + 1)), abs, size });
		}
	};
	walk(root, 0);
	code.sort((a, b) => a.rel.localeCompare(b.rel));
	assets.sort((a, b) => b.size - a.size);
	return { code, assets, skipped, truncated };
}

/** Read a scanned file as UTF-8, or null when it is not text. */
function readText(abs) {
	try {
		const buf = readFileSync(abs);
		if (buf.includes(0)) return null;
		return buf.toString("utf8");
	} catch {
		return null;
	}
}

/**
 * Apply the rule table to one file's text.
 * @param {{rel:string}} file - scanned file row.
 * @param {string} text - file contents.
 * @param {string[]} out - findings sink (mutated).
 */
function collectFindings(file, text, out) {
	for (const rule of RULES) {
		if (out.length >= MAX_FINDINGS) return;
		rule.pattern.lastIndex = 0;
		let match;
		while ((match = rule.pattern.exec(text)) !== null) {
			if (out.length >= MAX_FINDINGS) return;
			const before = text.slice(0, match.index);
			const line = before.split("\n").length;
			const column = match.index - before.lastIndexOf("\n");
			out.push({
				path: file.rel,
				line,
				column,
				severity: rule.severity,
				rule: rule.id,
				message: rule.message,
				hint: rule.hint,
				removedIn: rule.removedIn ?? null,
				sample: match[0].slice(0, 80)
			});
			if (match[0].length === 0) rule.pattern.lastIndex += 1;
		}
	}
}

/**
 * Rank a code file as a scene entry point: does it import three, build a
 * renderer, and drive a frame loop?
 * @param {{rel:string}} file - scanned file row.
 * @param {string} text - file contents.
 * @returns {{score:number,renderer:"webgpu"|"webgl"|null,reasons:string[]}} ranking.
 */
function scoreEntry(file, text) {
	const reasons = [];
	let score = 0;
	let renderer = null;
	const importsThree = /from\s+['"]three(\/[^'"]*)?['"]|require\(\s*['"]three/.test(text);
	if (importsThree) {
		score += 6;
		reasons.push("imports three");
	}
	if (/\bWebGPURenderer\b|from\s+['"]three\/webgpu['"]/.test(text)) {
		score += 6;
		renderer = "webgpu";
		reasons.push("WebGPURenderer");
	} else if (/\bWebGLRenderer\b/.test(text)) {
		score += 6;
		renderer = "webgl";
		reasons.push("WebGLRenderer");
	}
	if (/setAnimationLoop|requestAnimationFrame/.test(text)) {
		score += 4;
		reasons.push("frame loop");
	}
	if (/\bnew\s+(THREE\.)?(Scene|PerspectiveCamera|OrthographicCamera)\b/.test(text)) {
		score += 3;
		reasons.push("scene graph");
	}
	if (/\b(canvas|renderer\.domElement|document\.body\.appendChild|querySelector)\b/.test(text)) {
		score += 2;
		reasons.push("mounts canvas");
	}
	if (/export\s+(default\s+)?(async\s+)?function|export\s+const\s+\w+\s*=\s*(async\s*)?\(/.test(text)) {
		score += 1;
		reasons.push("exports an entry");
	}
	if (/^(main|index|app|scene|game|demo)\./.test(basename(file.rel))) {
		score += 2;
		reasons.push("conventional name");
	}
	if (extname(file.rel).toLowerCase() === ".html" && importsThree) {
		score += 1;
		reasons.push("html page");
	}
	return { score, renderer, reasons };
}

/**
 * Build the full workspace report.
 * @param {string} root - project root.
 * @returns {object} report payload.
 */
function inspectProject(root) {
	const scan = scanProject(root);
	const findings = [];
	const entries = [];
	const renderers = new Set();
	const warnings = [];
	let packageJson = null;
	try {
		packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
	} catch {
		warnings.push("no package.json at the project root");
	}
	const deps = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
	const stacks = [];
	for (const [dep, label] of STACK_PROBES) {
		if (typeof deps[dep] === "string") stacks.push({ package: dep, label, range: deps[dep] });
	}
	for (const file of scan.code) {
		const text = readText(file.abs);
		if (text === null) continue;
		collectFindings(file, text, findings);
		const ranked = scoreEntry(file, text);
		if (ranked.renderer !== null) renderers.add(ranked.renderer);
		if (ranked.score >= 6) {
			entries.push({
				path: file.rel,
				kind: extname(file.rel).toLowerCase() === ".html" ? "html" : "module",
				runnable: RUNNABLE_EXT.has(extname(file.rel).toLowerCase()),
				score: ranked.score,
				renderer: ranked.renderer,
				reasons: ranked.reasons
			});
		}
	}
	entries.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
	const three = resolveThree(root);
	const declared = typeof deps.three === "string" ? deps.three : null;
	if (declared !== null && three !== null && three.source === "bundled") {
		warnings.push(`package.json declares three@${declared} but no installed copy was found; the preview falls back to the bundled three${three.version !== null ? `@${three.version}` : ""}`);
	}
	if (declared === null && three !== null) warnings.push("three is not listed in package.json");
	const assetsTotal = scan.assets.reduce((sum, asset) => sum + Math.min(asset.size, MAX_ASSET_BYTES), 0);
	return {
		ok: true,
		root,
		name: packageJson?.name ?? basename(root),
		three: three === null ? null : { version: three.version, revision: three.revision, source: three.source, declared },
		stacks,
		renderers: [...renderers].sort(),
		entries: entries.slice(0, MAX_ENTRIES),
		assets: scan.assets.slice(0, 60),
		assetCount: scan.assets.length,
		assetsTotalBytes: assetsTotal,
		findings,
		findingsTruncated: findings.length >= MAX_FINDINGS,
		scannedFiles: scan.code.length + scan.assets.length,
		scanTruncated: scan.truncated,
		skippedDirs: scan.skipped,
		warnings
	};
}

/* ── preview page ──────────────────────────────────────────────────────────── */

/** The bridge that mirrors page errors and console output into the DSH panel. */
const BRIDGE = `<script>
(function () {
	var send = function (level, text) {
		try { parent.postMessage({ source: "dsh-threejs", level: level, text: String(text) }, "*"); } catch (error) {}
		var box = document.getElementById("dsh-threejs-log");
		if (box) {
			box.hidden = false;
			var row = document.createElement("div");
			row.className = "row " + level;
			row.textContent = level + " " + text;
			box.appendChild(row);
			box.scrollTop = box.scrollHeight;
		}
	};
	var line = function (args) {
		return Array.prototype.map.call(args, function (value) {
			try {
				if (typeof value === "string") return value;
				if (value instanceof Error) return value.stack || String(value);
				if (typeof value === "object" && value !== null) return JSON.stringify(value);
				return String(value);
			} catch (error) { return String(value); }
		}).join(" ");
	};
	["log", "info", "warn", "error"].forEach(function (level) {
		var original = console[level];
		console[level] = function () { send(level, line(arguments)); if (original) original.apply(console, arguments); };
	});
	window.addEventListener("error", function (event) {
		send("error", (event.message || "error") + (event.filename ? " @ " + event.filename + ":" + event.lineno + ":" + event.colno : ""));
	});
	window.addEventListener("unhandledrejection", function (event) {
		var reason = event.reason;
		send("error", "unhandled rejection: " + ((reason && (reason.stack || reason.message)) || reason));
	});
	window.addEventListener("load", function () { send("info", "page loaded"); });
	window.__dshThreeSend = send;
})();
</script>`;

/** Page chrome: dark canvas plus the console strip the bridge writes into. */
const PAGE_STYLE = `<style>
html, body { margin: 0; height: 100%; overflow: hidden; background: #101215; color: #e6e6e6; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
canvas { display: block; }
#dsh-threejs-log { position: fixed; left: 0; right: 0; bottom: 0; max-height: 36%; overflow: auto; background: rgba(8, 10, 12, 0.86); border-top: 1px solid #2a2f36; padding: 4px 8px; backdrop-filter: blur(4px); }
#dsh-threejs-log .row { white-space: pre-wrap; word-break: break-word; }
#dsh-threejs-log .warn { color: #e3b341; }
#dsh-threejs-log .error { color: #ff7b72; }
#dsh-threejs-log .info { color: #8b949e; }
#dsh-threejs-note { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 32px; text-align: center; color: #9aa4b2; white-space: pre-wrap; }
</style>`;

/**
 * Import map for one project: `three` and its subpath entries resolve either to
 * the project's installed package or to the copy vendored with this plugin, and
 * everything else (addons, assets, the scene module itself) is served by the
 * byte route under one token.
 * @param {string} root - project root.
 * @returns {object} the importmap payload.
 */
function importMapFor(root) {
	const base = `${ROUTE_PREFIX}/r/${tokenOf(root)}/`;
	return {
		imports: {
			three: `${base}~three/build/three.module.js`,
			"three/webgpu": `${base}~three/build/three.webgpu.js`,
			"three/tsl": `${base}~three/build/three.tsl.js`,
			"three/addons/": `${base}~addons/`,
			"three/examples/jsm/": `${base}~addons/`,
			"three/src/": `${base}~three/src/`
		}
	};
}

/**
 * Wrap one project module in a runnable page: bridge, import map, then a
 * bootstrap module that imports the target and calls its exported entry point
 * when it has one.
 * @param {{root:string,target:string,three:object|null}} options - page inputs.
 * @returns {string} html document.
 */
function modulePage({ root, target, three }) {
	const base = `${ROUTE_PREFIX}/r/${tokenOf(root)}/`;
	const targetUrl = base + urlPath(target);
	const importMap = JSON.stringify(importMapFor(root));
	const rev = three?.revision ?? null;
	const bootstrap = `<script type="module">
const target = ${JSON.stringify(targetUrl)};
const send = window.__dshThreeSend || function () {};
try {
	const mod = await import(target);
	window.__dshThreeModule = mod;
	send("info", "loaded " + ${JSON.stringify(basename(target))});
	const entryNames = ["init", "start", "createScene", "setup", "main", "default"];
	for (const name of entryNames) {
		const candidate = mod ? mod[name] : undefined;
		if (typeof candidate === "function") {
			send("info", "calling export " + name + "()");
			await candidate();
			break;
		}
	}
} catch (error) {
	send("error", (error && (error.stack || error.message)) || String(error));
}
</script>`;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>three preview — ${escapeHtml(target)}</title>
${PAGE_STYLE}
${BRIDGE}
<script type="importmap">${importMap}</script>
</head>
<body>
<div id="dsh-threejs-log" hidden></div>
${three === null ? `<div id="dsh-threejs-note">three was not found in this project and no bundled copy is available.&#10;Install it with: npm install three</div>` : ""}
${three === null ? "" : bootstrap}
</body>
</html>`;
}

/**
 * Page for a target that cannot run as a module (a .ts/.tsx/.jsx entry without
 * a build step, or a path that does not exist).
 * @param {{root:string,target:string,notice:string,three:object|null}} options - page inputs.
 * @returns {string} html document.
 */
function noticePage({ root, target, notice, three }) {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>three preview — ${escapeHtml(target)}</title>
${PAGE_STYLE}
${BRIDGE}
<script type="importmap">${JSON.stringify(importMapFor(root))}</script>
</head>
<body>
<div id="dsh-threejs-note">${escapeHtml(notice)}</div>
<div id="dsh-threejs-log" hidden></div>
</body>
</html>`;
}

/**
 * Serve an `.html` target itself, injecting the bridge and (when the document
 * has none) an import map so bare `three` specifiers resolve.
 * @param {{root:string,text:string}} options - page inputs.
 * @returns {string} html document.
 */
function htmlPage({ root, text }) {
	const hasImportMap = /<script[^>]+type\s*=\s*["']importmap["']/i.test(text);
	const injection = `${BRIDGE}\n<div id="dsh-threejs-log" hidden></div>\n${hasImportMap ? "" : `<script type="importmap">${JSON.stringify(importMapFor(root))}</script>`}`;
	if (/<\/head>/i.test(text)) return text.replace(/<\/head>/i, `${injection}\n</head>`);
	if (/<body[^>]*>/i.test(text)) return text.replace(/<body[^>]*>/i, (tag) => `${tag}\n${injection}`);
	return injection + text;
}

/** Minimal HTML text escaping for generated pages. */
function escapeHtml(text) {
	return String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/* ── HTTP ──────────────────────────────────────────────────────────────────── */

/** Send a JSON payload. */
function respondJson(res, status, payload) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
	res.end(JSON.stringify(payload));
}

/** Send a text/HTML payload. */
function respondText(res, status, type, body) {
	res.writeHead(status, { "content-type": type, "cache-control": "no-store", "access-control-allow-origin": "*" });
	res.end(body);
}

/**
 * The byte route: `~three/<path>` and `~addons/<path>` come from the resolved
 * three package, everything else from the project root.
 * @param {string} rest - path after the token.
 * @param {string} root - project root bound by the token.
 * @returns {{abs:string,cache:string}|null} file to serve, or null.
 */
function resolveServed(rest, root) {
	const three = resolveThree(root);
	const decoded = rest.split("/").map((segment) => {
		try {
			return decodeURIComponent(segment);
		} catch {
			return segment;
		}
	});
	if (decoded[0] === "~three") {
		if (three === null) return null;
		const rel = decoded.slice(1).join("/");
		const abs = resolve(three.dir, rel);
		const real = realInRoot(three.dir, abs);
		return real === null || kindOf(real) !== "file" ? null : { abs: real, cache: "public, max-age=3600" };
	}
	if (decoded[0] === "~addons") {
		if (three === null) return null;
		const rel = decoded.slice(1).join("/");
		const base = join(three.dir, "examples", "jsm");
		const real = realInRoot(base, resolve(base, rel));
		return real === null || kindOf(real) !== "file" ? null : { abs: real, cache: "public, max-age=3600" };
	}
	const abs = resolve(root, decoded.join("/"));
	const real = realInRoot(root, abs);
	if (real === null || kindOf(real) !== "file") return null;
	return { abs: real, cache: "no-store" };
}

/**
 * One request. GET only: this plugin reads and never mutates.
 * @param {any} ctx - plugin context.
 * @param {import("node:http").IncomingMessage} req - request.
 * @param {import("node:http").ServerResponse} res - response.
 */
async function handle(ctx, req, res) {
	const url = new URL(req.url ?? "/", "http://localhost");
	if (req.method !== "GET" && req.method !== "HEAD") {
		respondJson(res, 405, { ok: false, error: "method-not-allowed" });
		return;
	}

	// Static bytes for a preview page: token-bound root, no query needed.
	const staticMatch = url.pathname.match(/^\/api\/threejs\/r\/([A-Za-z0-9_-]+)\/(.+)$/);
	if (staticMatch !== null) {
		const root = rootOfToken(staticMatch[1]);
		if (root === null) {
			respondJson(res, 404, { ok: false, error: "unknown project token" });
			return;
		}
		const served = resolveServed(staticMatch[2], root);
		if (served === null) {
			respondJson(res, 404, { ok: false, error: "not found" });
			return;
		}
		let size;
		try {
			size = statSync(served.abs).size;
		} catch {
			respondJson(res, 404, { ok: false, error: "unreadable" });
			return;
		}
		res.writeHead(200, {
			"content-type": MIME.get(extname(served.abs).toLowerCase()) ?? "application/octet-stream",
			"content-length": String(size),
			"cache-control": served.cache,
			"access-control-allow-origin": "*"
		});
		if (req.method === "HEAD") {
			res.end();
			return;
		}
		// Streamed, not buffered: a 200 MB GLB must not become host memory.
		const stream = createReadStream(served.abs);
		stream.on("error", () => res.destroy());
		stream.pipe(res);
		return;
	}

	const resolved = resolveRoot(ctx, url);
	if ("error" in resolved) {
		respondJson(res, 400, { ok: false, error: resolved.error });
		return;
	}
	const { root } = resolved;

	if (url.pathname === "/api/threejs/inspect") {
		respondJson(res, 200, inspectProject(root));
		return;
	}

	if (url.pathname === "/api/threejs/preview") {
		const raw = url.searchParams.get("path") ?? "";
		const requested = resolve(root, raw);
		const target = realInRoot(root, requested);
		const three = resolveThree(root);
		if (target === null || kindOf(target) !== "file") {
			respondText(res, 200, "text/html; charset=utf-8", noticePage({
				root,
				target: raw,
				notice: raw.length === 0
					? "No scene file selected yet — pick one from the list on the left."
					: `Not found inside this project: ${raw}`,
				three
			}));
			return;
		}
		const ext = extname(target).toLowerCase();
		const text = readText(target);
		if (text === null) {
			respondText(res, 200, "text/html; charset=utf-8", noticePage({ root, target: raw, notice: "This file is binary or too large to preview.", three }));
			return;
		}
		if (ext === ".html" || ext === ".htm") {
			respondText(res, 200, "text/html; charset=utf-8", htmlPage({ root, text }));
			return;
		}
		if (!RUNNABLE_EXT.has(ext)) {
			respondText(res, 200, "text/html; charset=utf-8", noticePage({
				root,
				target: raw,
				notice: `${ext} cannot run in the browser directly.\n\nPoint the preview at the built .js output (dist/, build/) or ask the agent to emit a plain .js/.mjs scene module.`,
				three
			}));
			return;
		}
		respondText(res, 200, "text/html; charset=utf-8", modulePage({ root, target: toPosix(target.slice(root.length + 1)), three }));
		return;
	}

	respondJson(res, 404, { ok: false, error: "unknown threejs route" });
}

/**
 * Register the `/api/threejs` prefix route for this fiber's lifetime.
 * @param {any} ctx - registrant context.
 */
function apply(ctx) {
	const dispose = ctx.webServer.register({
		kind: "prefix",
		path: ROUTE_PREFIX,
		handler: (req, res) => {
			handle(ctx, req, res).catch((error) => {
				try {
					respondJson(res, 500, { ok: false, error: String(error?.message ?? error) });
				} catch {
					/* response already sent */
				}
			});
		}
	});
	ctx.effect(() => dispose, "threejs: /api/threejs route");
}

export { apply, inject, name };
/** Test seams. */
export const __internals = { RULES, inspectProject, importMapFor, modulePage, resolveThree, resolveServed, scanProject, tokenOf, rootOfToken, realInRoot, handle };
