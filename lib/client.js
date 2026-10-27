window.__ModuleLoader__.load({
	id: "@local/dsh-threejs",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region lib/types/client/css.js
		const css = [
			".lg3_chip{color:var(--dsw-alias-label-secondary);cursor:pointer;background:var(--dsw-alias-fill-l2);border:none;border-radius:999px;align-items:center;gap:6px;padding:3px 10px;font-family:var(--dsw-font-mono,monospace);font-size:12px;line-height:18px;display:inline-flex}",
			".lg3_chip:hover,.lg3_chip:focus-visible{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".lg3_chip svg{flex:none}",
			".lg3_chipBad{color:var(--dsw-alias-state-error-primary);font-weight:600}",
			".lg3_chipOk{color:var(--dsw-alias-state-success-primary)}",
			".lg3_layer{position:fixed;inset:0 0 0 auto;z-index:80;display:flex;flex-direction:column;width:min(1180px,84vw);background:var(--dsw-specific-sidebar-fill);border-left:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);animation:lg3-in .18s ease-out}",
			"@media (prefers-reduced-motion:reduce){.lg3_layer{animation:none}}",
			"@keyframes lg3-in{from{transform:translateX(28px);opacity:.6}to{transform:none;opacity:1}}",
			".lg3_head{flex:none;display:flex;align-items:center;gap:10px;min-height:48px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}",
			".lg3_title{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;min-width:0}",
			".lg3_ver{color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-mono,monospace);font-size:11px;background:var(--dsw-alias-fill-l2);border-radius:999px;padding:2px 8px}",
			".lg3_tag{color:var(--dsw-alias-label-caption);font-size:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:1px 7px;text-transform:uppercase;letter-spacing:.04em}",
			".lg3_spacer{flex:1}",
			".lg3_btn{min-height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 10px;font:inherit;font-size:12px;line-height:18px;text-decoration:none;display:inline-flex;align-items:center;gap:5px}",
			".lg3_btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".lg3_close{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;padding:0;font-size:16px;flex:none}",
			".lg3_close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}",
			".lg3_body{flex:1;min-height:0;display:flex}",
			".lg3_side{flex:none;width:300px;min-width:0;border-right:1px solid var(--dsw-alias-border-l2);overflow-y:auto;padding:8px}",
			".lg3_main{flex:1;min-width:0;display:flex;flex-direction:column}",
			".lg3_sec{color:var(--dsw-alias-label-caption);font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:8px 6px 4px}",
			".lg3_file{width:100%;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;color:var(--dsw-alias-label-primary)}",
			".lg3_file:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".lg3_file[data-active]{background:var(--dsw-alias-interactive-bg-hover)}",
			".lg3_fileTop{display:flex;align-items:center;gap:6px;min-width:0}",
			".lg3_fileName{font-family:var(--dsw-font-mono,monospace);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".lg3_fileWhy{color:var(--dsw-alias-label-caption);font-size:10px;line-height:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".lg3_badge{flex:none;font-size:10px;line-height:14px;border-radius:999px;padding:0 6px;background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-secondary)}",
			".lg3_find{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;margin:0 0 6px;padding:6px 8px}",
			".lg3_findHead{display:flex;align-items:baseline;gap:6px;font-family:var(--dsw-font-mono,monospace);font-size:11px}",
			".lg3_findMsg{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;padding-top:2px}",
			".lg3_findHint{color:var(--dsw-alias-label-caption);font-family:var(--dsw-font-mono,monospace);font-size:10.5px;line-height:15px;padding-top:2px;white-space:pre-wrap}",
			".lg3_sevError{color:var(--dsw-alias-state-error-primary)}",
			".lg3_sevWarn{color:var(--dsw-alias-state-warn-primary,#d29922)}",
			".lg3_sevInfo{color:var(--dsw-alias-label-caption)}",
			".lg3_note{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;padding:6px}",
			".lg3_ok{color:var(--dsw-alias-state-success-primary);font-size:11px;padding:6px}",
			".lg3_frameWrap{position:relative;flex:1;min-height:0;background:#101215}",
			".lg3_frame{width:100%;height:100%;border:0;display:block}",
			".lg3_empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:12px;text-align:center;padding:24px}",
			".lg3_log{flex:none;height:132px;display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-fill-l2)}",
			".lg3_logHead{flex:none;display:flex;align-items:center;gap:8px;padding:4px 8px;color:var(--dsw-alias-label-caption);font-size:11px}",
			".lg3_logBody{flex:1;min-height:0;overflow-y:auto;padding:0 8px 6px}",
			".lg3_row{font-family:var(--dsw-font-mono,monospace);font-size:11px;line-height:16px;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary)}",
			".lg3_row[data-k=error]{color:var(--dsw-alias-state-error-primary)}",
			".lg3_row[data-k=warn]{color:var(--dsw-alias-state-warn-primary,#d29922)}",
			".lg3_row[data-k=info]{color:var(--dsw-alias-label-caption)}",
			".lg3_assets{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px;padding:2px 6px;display:flex;justify-content:space-between;gap:8px}",
			".lg3_assetPath{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl}"
		].join("");
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"@local/dsh-threejs\"]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@local/dsh-threejs";
			tag.dataset.pluginCss = "@local/dsh-threejs/client.css";
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region lib/types/client/icons.js
		/** Wireframe-cube glyph drawn against currentColor. */
		function CubeIcon({ size }) {
			const edge = size ?? 14;
			return react.createElement("svg", {
				width: edge,
				height: edge,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.3,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true
			},
				react.createElement("path", { d: "M8 1.6 14 5v6L8 14.4 2 11V5z" }),
				react.createElement("path", { d: "M2 5l6 3.2L14 5M8 8.2v6.2" })
			);
		}
		//#endregion

		//#region lib/types/client/logic.js
		/** Inspector cache: one report per session id, reused until it goes stale. */
		const CACHE_TTL_MS = 20000;
		/** Console rows kept per preview frame. */
		const MAX_LOG_ROWS = 200;
		/** Last selection per session, so reopening lands on the same scene. */
		const SELECTION_KEY = "lg3.entry";

		/** One shared drawer/inspector store; components read it through uSES. */
		const store = {
			snapshot: { rev: 0 },
			open: false,
			seq: 0,
			sessionId: null,
			status: "idle",
			data: null,
			error: null,
			selected: null,
			frameRev: 0,
			log: [],
			logOpen: true,
			listeners: new Set()
		};
		/** sessionId -> { at, data }. */
		const cache = new Map();
		/** sessionId -> in-flight promise. */
		const inFlight = new Map();

		/** Subscribe for useSyncExternalStore. */
		function subscribe(listener) {
			store.listeners.add(listener);
			return () => {
				store.listeners.delete(listener);
			};
		}
		/** Version-only snapshot: components read the mutable store fields. */
		function getSnapshot() {
			return store.snapshot;
		}
		/** Publish one revision to every surface. */
		function commit() {
			store.snapshot = { rev: store.snapshot.rev + 1 };
			for (const listener of store.listeners) listener();
		}
		/** Relative path's last segment. */
		function baseName(path) {
			const parts = String(path).split("/");
			return parts[parts.length - 1] ?? "";
		}
		/** Human byte size. */
		function formatBytes(bytes) {
			if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
			const units = ["B", "KB", "MB", "GB"];
			let value = bytes;
			let unit = 0;
			while (value >= 1024 && unit < units.length - 1) {
				value /= 1024;
				unit += 1;
			}
			return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
		}
		/** Remember the file picked in one session. */
		function rememberSelection(sessionId, path) {
			try {
				localStorage.setItem(`${SELECTION_KEY}:${sessionId ?? "root"}`, path);
			} catch {
				/* storage disabled */
			}
		}
		/** Last file picked in one session, if any. */
		function lastSelection(sessionId) {
			try {
				return localStorage.getItem(`${SELECTION_KEY}:${sessionId ?? "root"}`);
			} catch {
				return null;
			}
		}
		/** Best entry candidate for a fresh report. */
		function defaultEntry(data) {
			const runnable = (data?.entries ?? []).filter((entry) => entry.runnable === true);
			return runnable[0]?.path ?? data?.entries?.[0]?.path ?? null;
		}
		/** The selected entry belongs to the report; otherwise fall back. */
		function resolveSelection(data, wanted) {
			const entries = data?.entries ?? [];
			if (wanted !== null && wanted !== undefined && entries.some((entry) => entry.path === wanted)) return wanted;
			const remembered = lastSelection(store.sessionId);
			if (remembered !== null && entries.some((entry) => entry.path === remembered)) return remembered;
			return defaultEntry(data);
		}
		/**
		* Load (or reuse) the workspace report for one session.
		* @param {string|undefined} sessionId - session whose cwd is inspected.
		* @param {boolean} force - ignore the cached report.
		*/
		async function loadReport(sessionId, force) {
			if (typeof sessionId !== "string" || sessionId.length === 0) {
				store.status = "idle";
				commit();
				return;
			}
			const cached = cache.get(sessionId);
			if (!force && cached !== undefined && Date.now() - cached.at < CACHE_TTL_MS) {
				store.status = "ready";
				store.data = cached.data;
				store.error = cached.data?.ok === false ? String(cached.data.error ?? "inspection failed") : null;
				store.selected = resolveSelection(cached.data, store.selected);
				commit();
				return;
			}
			const pending = inFlight.get(sessionId);
			if (pending !== undefined && !force) {
				await pending;
				return;
			}
			store.status = store.data === null ? "loading" : "refreshing";
			commit();
			const request = fetch(`/api/threejs/inspect?session=${encodeURIComponent(sessionId)}`, { headers: { accept: "application/json" } })
				.then(async (res) => {
					const payload = await res.json().catch(() => null);
					if (!res.ok || payload === null) throw new Error(payload?.error ?? `HTTP ${res.status}`);
					return payload;
				})
				.then((payload) => {
					cache.set(sessionId, { at: Date.now(), data: payload });
					if (store.sessionId !== sessionId) return;
					store.data = payload;
					store.error = payload.ok === false ? String(payload.error ?? "inspection failed") : null;
					store.status = "ready";
					store.selected = resolveSelection(payload, store.selected);
					commit();
				})
				.catch((error) => {
					if (store.sessionId !== sessionId) return;
					store.status = "error";
					store.error = String(error?.message ?? error);
					commit();
				})
				.finally(() => {
					inFlight.delete(sessionId);
				});
			inFlight.set(sessionId, request);
			await request;
		}
		/** Point the drawer at one session and make sure its report is loaded. */
		function focusSession(sessionId, force) {
			const changed = store.sessionId !== sessionId;
			store.sessionId = sessionId ?? null;
			if (changed) {
				store.selected = null;
				store.data = null;
				store.log = [];
			}
			return loadReport(sessionId, force === true);
		}
		/** Open the drawer on a session. */
		function openDrawer(sessionId) {
			store.open = true;
			store.seq += 1;
			commit();
			return focusSession(sessionId, false);
		}
		/** Close the drawer. */
		function closeDrawer() {
			store.open = false;
			commit();
		}
		/** Toggle from a chip. */
		function toggleDrawer(sessionId) {
			if (store.open && store.sessionId === sessionId) {
				closeDrawer();
				return;
			}
			return openDrawer(sessionId);
		}
		/** Select one scene file (and remember it for this session). */
		function selectEntry(path) {
			store.selected = path;
			store.log = [];
			rememberSelection(store.sessionId, path);
			commit();
		}
		/** Reload the preview frame. */
		function reloadFrame() {
			store.log = [];
			store.frameRev += 1;
			commit();
		}
		/** Append one console row from the preview page. */
		function pushLog(level, text) {
			store.log = [...store.log, { level, text }].slice(-MAX_LOG_ROWS);
			commit();
		}
		/** Drop the console rows. */
		function clearLog() {
			store.log = [];
			commit();
		}
		/** Build the preview URL for the current selection. */
		function previewUrl() {
			if (store.sessionId === null || store.selected === null) return null;
			const query = new URLSearchParams({ session: store.sessionId, path: store.selected, rev: String(store.frameRev) });
			return `/api/threejs/preview?${query.toString()}`;
		}

		//#endregion

		//#region lib/types/client/ThreeChip.js
		/**
		* Session-header chip: the workspace's three revision plus a finding count,
		* and the entry point into the preview drawer.
		*/
		function ThreeChip({ sessionId, useSessions }) {
			react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			const cwd = useSessions((s) => (sessionId !== undefined ? s.byId?.[sessionId]?.cwd : undefined));
			react.useEffect(() => {
				if (typeof sessionId === "string" && cwd !== undefined) loadReport(sessionId, false);
			}, [sessionId, cwd]);
			const report = store.data;
			const revision = report?.three?.revision;
			const errors = (report?.findings ?? []).filter((finding) => finding.severity === "error").length;
			const warns = (report?.findings ?? []).filter((finding) => finding.severity === "warn").length;
			const stale = report !== null && report !== undefined;
			const label = revision !== undefined && revision !== null ? `three r${revision}` : "three";
			const title = [
				"Three.js workbench — live preview and API check",
				cwd !== undefined ? cwd : "",
				stale ? `${errors} error(s), ${warns} warning(s) in ${report.scannedFiles ?? 0} files` : "click to inspect this project"
			].filter((line) => line.length > 0).join("\n");
			return react.createElement(primitives.Tooltip, { label: title, side: "bottom", delayMs: 400 },
				react.createElement("button", {
					type: "button",
					className: "lg3_chip",
					"data-active": (store.open && store.sessionId === sessionId) || undefined,
					"aria-expanded": store.open && store.sessionId === sessionId,
					"aria-label": "Three.js workbench",
					onClick: () => {
						toggleDrawer(sessionId);
					}
				},
					react.createElement(CubeIcon, { size: 13 }),
					react.createElement("span", null, label),
					errors > 0
						? react.createElement("span", { className: "lg3_chipBad" }, `!${errors}`)
						: warns > 0
							? react.createElement("span", { className: "lg3_chipOk" }, "ok")
							: null
				)
			);
		}
		//#endregion

		//#region lib/types/client/ThreeDrawer.js
		/**
		* Right-edge slide-over: the project report on the left (scene candidates,
		* stale-API findings, asset weights) and a live preview of the selected
		* scene on the right, with the page's console bridged underneath.
		* Lives in `shell.overlay`; the module store carries its open state.
		*/
		function ThreeDrawer({ useSessions }) {
			react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			const currentSessionId = useSessions((s) => s.current);
			const cwd = useSessions((s) => (store.sessionId !== null ? s.byId?.[store.sessionId]?.cwd : undefined));
			react.useEffect(() => {
				if (!store.open) return undefined;
				const onKey = (event) => {
					if (event.key === "Escape") closeDrawer();
				};
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, [store.seq, store.open]);
			react.useEffect(() => {
				const onMessage = (event) => {
					if (event.origin !== window.location.origin) return;
					const payload = event.data;
					if (payload === null || typeof payload !== "object" || payload.source !== "dsh-threejs") return;
					pushLog(payload.level ?? "log", String(payload.text ?? ""));
				};
				window.addEventListener("message", onMessage);
				return () => {
					window.removeEventListener("message", onMessage);
				};
			}, []);
			// A brand-new session opened while the drawer is up: follow it.
			react.useEffect(() => {
				if (store.open && store.sessionId === null && currentSessionId !== undefined) focusSession(currentSessionId, false);
			}, [currentSessionId]);
			if (!store.open) return null;
			return react.createElement(DrawerBody, { sessionId: store.sessionId, cwd });
		}

		/** Drawer body: report columns, preview frame and console. */
		function DrawerBody({ sessionId, cwd }) {
			const report = store.data;
			const three = report?.three ?? null;
			const entries = report?.entries ?? [];
			const findings = report?.findings ?? [];
			const url = previewUrl();
			const source = three?.source === "project" ? "project install" : three?.source === "ancestor" ? "hoisted install" : three?.source === "bundled" ? "bundled copy" : "not found";
			const openTab = (event) => {
				if (url === null) event.preventDefault();
			};
			return react.createElement("aside", { className: "lg3_layer", role: "complementary", "aria-label": "Three.js workbench" },
				react.createElement("div", { className: "lg3_head" },
					react.createElement("span", { className: "lg3_title" },
						react.createElement(CubeIcon, { size: 14 }),
						"Three.js",
						react.createElement("span", { className: "lg3_ver" }, three === null ? "no three detected" : `r${three.revision ?? "?"}${three.version !== undefined && three.version !== null ? ` · ${three.version}` : ""}`),
						react.createElement("span", { className: "lg3_tag" }, source),
						(report?.renderers ?? []).map((renderer) => react.createElement("span", { className: "lg3_tag", key: renderer }, renderer))
					),
					react.createElement("span", { className: "lg3_spacer" }),
					store.status === "loading" || store.status === "refreshing"
						? react.createElement("span", { className: "lg3_note" }, "scanning…")
						: null,
					react.createElement("button", {
						type: "button",
						className: "lg3_btn",
						onClick: () => {
							loadReport(sessionId, true);
						}
					}, "Rescan"),
					react.createElement("a", {
						className: "lg3_btn",
						href: url ?? "#",
						target: "_blank",
						rel: "noreferrer",
						onClick: openTab
					}, "Open in tab"),
					react.createElement("button", { type: "button", className: "lg3_close", "aria-label": "Close panel", onClick: closeDrawer }, "✕")
				),
				store.error !== null && store.error !== undefined
					? react.createElement("div", { className: "lg3_note" }, `Inspector error: ${store.error}`)
					: null,
				react.createElement("div", { className: "lg3_body" },
					react.createElement("div", { className: "lg3_side" },
						cwd !== undefined ? react.createElement("div", { className: "lg3_note", title: cwd }, cwd) : null,
						react.createElement("div", { className: "lg3_sec" }, `Scene files (${entries.length})`),
						entries.length === 0
							? react.createElement("div", { className: "lg3_note" }, store.status === "loading" ? "Scanning the workspace…" : "No file in this project imports three yet. Ask the agent to write a scene module, then Rescan.")
							: entries.map((entry) => react.createElement("button", {
								type: "button",
								key: entry.path,
								className: "lg3_file",
								"data-active": store.selected === entry.path || undefined,
								title: entry.path,
								onClick: () => {
									selectEntry(entry.path);
								}
							},
								react.createElement("span", { className: "lg3_fileTop" },
									react.createElement("span", { className: "lg3_fileName" }, baseName(entry.path)),
									entry.renderer !== null && entry.renderer !== undefined ? react.createElement("span", { className: "lg3_badge" }, entry.renderer) : null,
									entry.runnable === false ? react.createElement("span", { className: "lg3_badge" }, "build first") : null
								),
								react.createElement("span", { className: "lg3_fileWhy" }, entry.path)
							)),
						react.createElement("div", { className: "lg3_sec" }, `Findings (${findings.length})`),
						findings.length === 0
							? react.createElement("div", { className: "lg3_ok" }, "No removed or renamed three APIs found.")
							: findings.map((finding, index) => react.createElement("div", { className: "lg3_find", key: `${finding.rule}:${finding.path}:${finding.line}:${index}` },
								react.createElement("div", { className: "lg3_findHead" },
									react.createElement("span", { className: `lg3_sev${finding.severity === "error" ? "Error" : finding.severity === "warn" ? "Warn" : "Info"}` }, finding.severity === "error" ? "error" : finding.severity === "warn" ? "warn" : "info"),
									react.createElement("span", { className: "lg3_fileName", title: finding.path }, `${baseName(finding.path)}:${finding.line}`),
									react.createElement("span", { className: "lg3_badge" }, finding.removedIn !== null && finding.removedIn !== undefined ? `r${finding.removedIn}+` : finding.rule)
								),
								react.createElement("div", { className: "lg3_findMsg" }, finding.message),
								react.createElement("div", { className: "lg3_findHint" }, finding.hint)
							)),
						(report?.stacks ?? []).length > 0 ? react.createElement("div", { className: "lg3_sec" }, "Stack") : null,
						(report?.stacks ?? []).map((stack) => react.createElement("div", { className: "lg3_assets", key: stack.package },
							react.createElement("span", { className: "lg3_assetPath", title: `${stack.package}@${stack.range}` }, stack.label),
							react.createElement("span", null, stack.range)
						)),
						(report?.assets ?? []).length > 0
							? react.createElement("div", { className: "lg3_sec" }, `Assets (${report.assetCount ?? 0} · ${formatBytes(report.assetsTotalBytes ?? 0)})`)
							: null,
						(report?.assets ?? []).slice(0, 10).map((asset) => react.createElement("div", { className: "lg3_assets", key: asset.rel },
							react.createElement("span", { className: "lg3_assetPath", title: asset.rel }, asset.rel),
							react.createElement("span", null, formatBytes(asset.size))
						)),
						(report?.warnings ?? []).map((warning) => react.createElement("div", { className: "lg3_note", key: warning }, `⚠ ${warning}`))
					),
					react.createElement("div", { className: "lg3_main" },
						react.createElement("div", { className: "lg3_frameWrap" },
							url === null
								? react.createElement("div", { className: "lg3_empty" }, "Pick a scene file on the left to render it here.")
								: react.createElement("iframe", {
									className: "lg3_frame",
									key: `${store.selected}:${store.frameRev}`,
									src: url,
									title: "Three.js preview",
									allow: "xr-spatial-tracking; fullscreen; gamepad; autoplay",
									referrerPolicy: "no-referrer"
								})
						),
						react.createElement("div", { className: "lg3_log" },
							react.createElement("div", { className: "lg3_logHead" },
								react.createElement("span", null, `Console (${store.log.length})`),
								react.createElement("span", { className: "lg3_spacer" }),
								react.createElement("button", { type: "button", className: "lg3_btn", onClick: reloadFrame }, "Reload"),
								react.createElement("button", { type: "button", className: "lg3_btn", onClick: clearLog }, "Clear")
							),
							react.createElement("div", { className: "lg3_logBody" },
								store.log.length === 0
									? react.createElement("div", { className: "lg3_row", "data-k": "info" }, "Page log appears here — errors, warnings and console output from the preview.")
									: store.log.map((row, index) => react.createElement("div", { className: "lg3_row", "data-k": row.level, key: index }, `${row.level} ${row.text}`))
							)
						)
					)
				)
			);
		}
		//#endregion

		//#region lib/types/client/index.js
		/** Service faces this plugin reads on ctx — every ctx.* access must be declared here. */
		const inject = ["slots"];
		/**
		* Client plugin body: one session-header chip and one frame-wide drawer.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "threejs-chip",
				order: -3
			}, ThreeChip));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "threejs-drawer"
			}, ThreeDrawer));
		}
		exports.apply = apply;
		exports.inject = inject;
		/** Test/debug seams. */
		exports.__store = store;
		exports.__openDrawer = openDrawer;
		exports.__closeDrawer = closeDrawer;
		exports.__previewUrl = previewUrl;
		exports.__pushLog = pushLog;
		return module.exports;
	}
});
