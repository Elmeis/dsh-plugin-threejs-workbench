# dsh-plugin-threejs-workbench — Three.js workbench for DeepSeek Harness

Two surfaces in the DSH Web UI, backed by one host route prefix (`/api/threejs`):

1. **A live preview of a scene file from the session's workspace.**
   The header chip opens a slide-over drawer (`shell.overlay`) with the project
   report on the left and an iframe on the right. The iframe is served by the
   host as a real page: an import map maps `three`, `three/webgpu`, `three/tsl`,
   `three/addons/` and `three/examples/jsm/` either onto the project's own
   installed three or onto the copy vendored with this plugin (three 0.186.1 —
   `build/` plus the whole `examples/jsm/` tree, so `three/addons/**` resolves
   offline), a bootstrap module imports the chosen file and calls its exported
   entry point (`init` / `start` / `createScene` / `setup` / `main` / `default`),
   and an error/console bridge mirrors every page error, unhandled rejection and
   `console.*` call into the drawer's console strip — the agent's code is
   observable without leaving the harness. `.html` targets are served as-is with
   the bridge and the import map injected. Reload re-creates the frame; "Open in
   tab" gives the same page a normal browser tab (pointer lock, WebXR, gamepad
   and fullscreen are allowed in the iframe).
2. **A project inspector.**
   One scan per session (cached 20 s, re-run with Rescan) reports:
   - the resolved three revision and where it came from (project install, a
     hoisted ancestor install, or the bundled copy) plus the version declared in
     `package.json`;
   - declared stacks (`@react-three/fiber`, `drei`, `postprocessing`, Rapier,
     cannon-es, GSAP, …);
   - WebGL vs WebGPU usage, and ranked scene-entry candidates — files that
     import three, build a renderer, drive a frame loop and mount a canvas;
   - `three` APIs that newer revisions removed or renamed, as
     `file:line:column` findings with the replacement, e.g. `outputEncoding`
     (r152), `sRGBEncoding` (r152), `useLegacyLights` (gone by r186),
     `WebGL1Renderer` (r163), `THREE.Geometry` (r145), `three/examples/js/*`
     (r148), `WebGPURenderer` addon paths (r167), `RGBELoader` (r180),
     `PCFSoftShadowMap` (r186), wrong `tsl/display/*` filenames, `PI2`,
     `applyGeometry`, `postprocessing` → `RenderPipeline`;
   - GLB/GLTF/HDR/KTX2/DRACO asset weights, so a 90 MB model is visible before
     it ships.

## Where the data comes from

The host half registers one prefix route on the shared web server. Every route
takes a session id and resolves the working directory from the host session
store (`ctx.sessions.get(id).header.cwd`) — the client never supplies a path
root, and an unknown session is a 400 rather than a fallback. Files under that
root are served through a token-bound byte route (`/api/threejs/r/<token>/…`)
after a `realpath` containment check, so symlinks and `..` cannot walk out; the
three package roots (`~three/`, `~addons/`) are checked against their own
directory. Files are streamed, never buffered, so a multi-hundred-MB GLB is
served as-is. Nothing is written and nothing is executed on the host.

`cwd=<absolute dir>` is accepted as a fallback root for callers without a
session; it is the only route input not derived from the session store.

## Install

DSH Desktop: **Settings → Plugins → add plugin**, type the package name. From the
CLI: `dsh plugin --profile <your-profile> add <name>`, then restart the harness.

```
name: dsh-plugin-threejs-workbench
```

## Checks

```sh
node test/smoke.mjs          # host routes + containment + client render (react-dom/server)
node test/browser-check.mjs  # real headless Chrome loads the preview page for test/fixture
```

The browser check boots the plugin's own handler on a loopback port, points a
stub session at `test/fixture`, and loads
`/api/threejs/preview?session=fixture-session&path=src/scene.js` in headless
Chrome (system Chrome or a Playwright headless shell). It passes when the bridge
reports `loaded scene.js` / `calling export init()` and no error row appears —
i.e. three was loaded from the plugin bundle and the fixture scene initialized
with a real WebGL context.

## Limitations

- Only ES modules run. A `.ts`/`.tsx`/`.jsx` entry is reported and shown with a
  "build it first" notice instead of being compiled; point the preview at the
  built `.js` output.
- The inspector is a text scan, not a type checker: findings are regex rules
  from the official migration guide. A finding can be a false positive when an
  identifier merely shares a name with a removed API, and `three/addons/tsl/display`
  filename drift is only caught for the names known to have changed. The scan
  skips this plugin's own package directory, because the rule table in
  `lib/index.js` contains the very API names it looks for.
- The vendored three (0.186.1) is used whenever the project has no installed
  copy; the report says so, and the drawer header shows which copy is live.
- Preview rendering depends on the browser: software WebGL is slow, and a WebGPU
  scene needs a WebGPU-capable browser (WebGPURenderer falls back to WebGL 2 on
  its own).
- The drawer is read-only: it cannot edit the scene, and it does not hot-reload
  on file writes — press Reload (the session's file edits are visible to the
  next scan).
