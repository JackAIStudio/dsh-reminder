window.__ModuleLoader__.load({
	id: "dsh-reminder",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:/Users/jkw/Documents/dshspace/plugins/dsh-reminder/src/client/PeonSettingsSection.module.css.mjs
		const css = ".Pb6RPG_wrap{flex-direction:column;gap:12px;padding:4px 2px;display:flex}.Pb6RPG_title{margin:0;font-size:15px;font-weight:600}.Pb6RPG_description{opacity:.7;margin:0;font-size:12px}.Pb6RPG_notice{background:var(--dsw-bg-2,#80808026);border-radius:6px;padding:6px 10px;font-size:12px}.Pb6RPG_row{justify-content:space-between;align-items:center;gap:12px;min-height:30px;display:flex}.Pb6RPG_label{flex:1;font-size:13px}.Pb6RPG_control{align-items:center;gap:8px;display:flex}.Pb6RPG_toggle{border:1px solid var(--dsw-border-2,#80808066);color:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:3px 10px;font-size:12px}.Pb6RPG_toggleOn{background:var(--dsw-accent,#508cff40);border-color:var(--dsw-accent,#508cff99)}.Pb6RPG_select,.Pb6RPG_number{background:var(--dsw-bg-2,#80808026);color:inherit;border:1px solid var(--dsw-border-2,#80808066);border-radius:6px;padding:3px 8px;font-size:12px}.Pb6RPG_range{width:160px}.Pb6RPG_categories{flex-direction:column;gap:6px;margin-top:4px;display:flex}.Pb6RPG_catLabel{font-size:13px;font-weight:600}.Pb6RPG_catRow{justify-content:space-between;align-items:center;font-size:13px;display:flex}";
		const tagId = "dsh-reminder/PeonSettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-reminder";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PeonSettingsSection_module_css_default = {
			"toggle": "Pb6RPG_toggle",
			"title": "Pb6RPG_title",
			"row": "Pb6RPG_row",
			"catRow": "Pb6RPG_catRow",
			"notice": "Pb6RPG_notice",
			"catLabel": "Pb6RPG_catLabel",
			"label": "Pb6RPG_label",
			"wrap": "Pb6RPG_wrap",
			"range": "Pb6RPG_range",
			"categories": "Pb6RPG_categories",
			"description": "Pb6RPG_description",
			"number": "Pb6RPG_number",
			"select": "Pb6RPG_select",
			"control": "Pb6RPG_control",
			"toggleOn": "Pb6RPG_toggleOn"
		};
		//#endregion
		//#region src/client/PeonSettingsSection.tsx
		/**
		* peon-ping settings section: reads and writes the host through the plugin's
		* own `/peon/api` HTTP prefix (get / set / action), which the host bridges to
		* the pi `~/.config/peon-ping/` files and to pack install / preview /
		* refresh.
		*
		* A plugin-owned HTTP route is used instead of the `settingsScope` transport
		* because dsh rc.6's apiproxy only exposes allowlisted settings namespaces to
		* web clients — a third-party namespace is filtered from `settings.describe`
		* and answers `settings-not-exposed` even when registered. The page talks to
		* the same host origin, so the browser-trust fence on `/peon/api` is
		* satisfied by ordinary same-origin fetches.
		*
		* The component deliberately imports no Host value modules — the namespace id
		* and value shape are restated here (type-only), so the browser bundle stays
		* free of node-only imports.
		* @module dsh-reminder/client/PeonSettingsSection
		*/
		/** Category keys in the order the pi settings panel lists them. */
		const CATEGORIES = [
			{
				key: "session.start",
				label: "cat.session.start"
			},
			{
				key: "task.acknowledge",
				label: "cat.task.acknowledge"
			},
			{
				key: "task.complete",
				label: "cat.task.complete"
			},
			{
				key: "task.error",
				label: "cat.task.error"
			},
			{
				key: "input.required",
				label: "cat.input.required"
			},
			{
				key: "resource.limit",
				label: "cat.resource.limit"
			},
			{
				key: "user.spam",
				label: "cat.user.spam"
			}
		];
		/** Call one `/peon/api/<method>` endpoint on the same origin. */
		async function peonCall(method, payload) {
			let response;
			try {
				response = await fetch(`/peon/api/${method}`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				});
			} catch (error) {
				throw new Error(`peon-ping: network error: ${error instanceof Error ? error.message : String(error)}`);
			}
			const parsed = await response.json().catch(() => null);
			if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === void 0) throw new Error(parsed?.error?.message ?? `peon-ping: HTTP ${response.status}`);
			return parsed.value;
		}
		/** Read the current section from the host. */
		async function fetchSection() {
			return peonCall("get", {});
		}
		/** Write one scalar field (categories is written whole) and return the fresh section. */
		async function setField(field, value) {
			return peonCall("set", {
				field,
				value
			});
		}
		/** Trigger one host action (install / preview / refresh) and return the fresh section. */
		async function runAction(action) {
			return peonCall("action", { action });
		}
		function Row({ label, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PeonSettingsSection_module_css_default.row,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: PeonSettingsSection_module_css_default.label,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: PeonSettingsSection_module_css_default.control,
					children
				})]
			});
		}
		function Toggle({ on, onChange, onText, offText }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${PeonSettingsSection_module_css_default.toggle} ${on ? PeonSettingsSection_module_css_default.toggleOn : ""}`,
				onClick: () => onChange(!on),
				children: on ? onText : offText
			});
		}
		function PeonSettingsSection(props) {
			const { t } = props;
			const [value, setValue] = (0, react.useState)(null);
			const [status, setStatus] = (0, react.useState)("loading");
			const [error, setError] = (0, react.useState)(null);
			const [pending, setPending] = (0, react.useState)(false);
			const mounted = (0, react.useRef)(true);
			const refresh = (0, react.useCallback)(async () => {
				try {
					const next = await fetchSection();
					if (!mounted.current) return;
					setValue(next);
					setStatus("ready");
					setError(null);
				} catch (cause) {
					if (!mounted.current) return;
					setStatus("error");
					setError(cause instanceof Error ? cause.message : String(cause));
				}
			}, []);
			(0, react.useEffect)(() => {
				mounted.current = true;
				refresh();
				return () => {
					mounted.current = false;
				};
			}, [refresh]);
			if (status === "loading" && value === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PeonSettingsSection_module_css_default.wrap,
				children: [t("notice"), "…"]
			});
			if (status === "error" || value === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PeonSettingsSection_module_css_default.wrap,
				children: [
					t("notice"),
					": ",
					error ?? t("unavailable")
				]
			});
			const set = (field, next) => {
				setField(field, next).then(refresh).catch((cause) => {
					setStatus("error");
					setError(cause instanceof Error ? cause.message : String(cause));
				});
			};
			const trigger = (action) => {
				if (action === "preview") try {
					const pack = value?.default_pack || "peon";
					const audio = new Audio(`/peon/api/audio/session.start?pack=${encodeURIComponent(pack)}&t=${Date.now()}`);
					audio.volume = typeof value?.volume === "number" ? value.volume : 1;
					audio.play().catch((e) => {
						console.warn("[dsh-reminder] Web Audio preview failed:", e);
					});
				} catch (err) {
					console.warn("[dsh-reminder] new Audio error:", err);
				}
				setPending(true);
				runAction(action).then(refresh).catch((cause) => {
					setStatus("error");
					setError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setPending(false);
				});
			};
			const activePack = value.packs.includes(value.default_pack) ? value.default_pack : value.packs[0];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PeonSettingsSection_module_css_default.wrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: PeonSettingsSection_module_css_default.title,
						children: t("title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PeonSettingsSection_module_css_default.description,
						children: t("description")
					}),
					value._notice !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PeonSettingsSection_module_css_default.notice,
						children: [
							t("notice"),
							": ",
							value._notice
						]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
						label: `${t("sounds")} (${t(value.paused ? "paused" : "active")})`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							on: value.enabled,
							onChange: (next) => set("enabled", next),
							onText: t("enabled"),
							offText: t("disabled")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							on: !value.paused,
							onChange: (next) => set("paused", !next),
							onText: t("active"),
							offText: t("paused")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
						label: t("soundPack"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: PeonSettingsSection_module_css_default.select,
								value: activePack ?? "",
								onChange: (event) => set("default_pack", event.target.value),
								children: value.packs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("noPacks")
								}) : value.packs.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: name,
									children: name
								}, name))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: pending,
								onClick: () => trigger("install"),
								children: pending ? t("installing") : t("install")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: pending || value.packs.length === 0,
								onClick: () => trigger("preview"),
								children: t("preview")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: `${t("volume")}: ${Math.round(value.volume * 100)}%`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "range",
							min: 0,
							max: 100,
							step: 10,
							value: Math.round(value.volume * 100),
							onChange: (event) => set("volume", Number(event.target.value) / 100),
							className: PeonSettingsSection_module_css_default.range
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: t("notifications"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							on: value.desktop_notifications,
							onChange: (next) => set("desktop_notifications", next),
							onText: t("enabled"),
							offText: t("disabled")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: t("toolErrorAlert"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							on: value.tool_error_sounds,
							onChange: (next) => set("tool_error_sounds", next),
							onText: t("enabled"),
							offText: t("disabled")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: t("silentWindow"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							max: 300,
							value: value.silent_window_seconds,
							onChange: (event) => set("silent_window_seconds", Number(event.target.value) || 0),
							className: PeonSettingsSection_module_css_default.number
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						label: t("relayMode"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: PeonSettingsSection_module_css_default.select,
							value: value.relay_mode,
							onChange: (event) => set("relay_mode", event.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "auto",
									children: "auto"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "local",
									children: "local"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "relay",
									children: "relay"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PeonSettingsSection_module_css_default.categories,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: PeonSettingsSection_module_css_default.catLabel,
							children: t("category")
						}), CATEGORIES.map(({ key, label }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PeonSettingsSection_module_css_default.catRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(label) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
								on: value.categories[key] !== false,
								onChange: (next) => {
									const nextCategories = {
										...value.categories,
										[key]: next
									};
									set("categories", nextCategories);
								},
								onText: t("enabled"),
								offText: t("disabled")
							})]
						}, key))]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const zh = {
			nav: "peon-ping 声音",
			title: "peon-ping 声音通知",
			description: "任务完成或意外终止时播放音效，并显示桌面通知。音效包与 pi 的 peon-ping 共用同一目录。",
			notice: "通知",
			unavailable: "无法获取配置（该命名空间未对网页客户端开放）",
			sounds: "声音",
			active: "响铃中",
			paused: "已暂停",
			soundPack: "音效包",
			noPacks: "（未安装，点击“安装默认音效包”）",
			volume: "音量",
			install: "安装默认音效包",
			installing: "正在安装…",
			preview: "试听",
			notifications: "桌面通知",
			toolErrorAlert: "工具出错提醒",
			silentWindow: "静默窗口（秒）",
			relayMode: "中继模式",
			enabled: "开",
			disabled: "关",
			category: "分类",
			"cat.session.start": "会话开始",
			"cat.task.acknowledge": "任务应答",
			"cat.task.complete": "任务完成",
			"cat.task.error": "任务出错",
			"cat.input.required": "等待输入",
			"cat.resource.limit": "上下文压缩",
			"cat.user.spam": "快速提问"
		};
		const en = {
			nav: "peon-ping sounds",
			title: "peon-ping sound notifications",
			description: "Plays sounds when a task completes or terminates unexpectedly, and shows desktop notifications. Sound packs are shared with the pi peon-ping.",
			notice: "Notice",
			unavailable: "settings unavailable (the namespace is not exposed to the web client)",
			sounds: "Sounds",
			active: "active",
			paused: "paused",
			soundPack: "Sound pack",
			noPacks: " (none installed — click “Install default packs”)",
			volume: "Volume",
			install: "Install default packs",
			installing: "Installing…",
			preview: "Preview",
			notifications: "Desktop notifications",
			toolErrorAlert: "Tool error alert",
			silentWindow: "Silent window (s)",
			relayMode: "Relay mode",
			enabled: "on",
			disabled: "off",
			category: "Category",
			"cat.session.start": "Session start",
			"cat.task.acknowledge": "Task acknowledge",
			"cat.task.complete": "Task complete",
			"cat.task.error": "Task error",
			"cat.input.required": "Input required",
			"cat.resource.limit": "Resource limit",
			"cat.user.spam": "Rapid prompt spam"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.peon";
		/** Services required by the settings section (copy + slot declaration only). */
		const inject = ["slots", "locale"];
		/** Contribute the peon-ping sounds settings page. */
		function AutoAudioListener(props) {
			const running = typeof props.useSession === "function" ? props.useSession((s) => s?.running) : false;
			const prevRunning = (0, react.useRef)(running);
			(0, react.useEffect)(() => {
				if (prevRunning.current === true && running === false) try {
					const audio = new Audio(`/peon/api/audio/task.complete?t=${Date.now()}`);
					audio.volume = .8;
					audio.play().catch(() => {});
				} catch {}
				prevRunning.current = running;
			}, [running]);
			return null;
		}
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-reminder: copy dictionaries");
			const t = ctx.locale.bind(NS);
			const injected = () => ({
				t,
				close: () => {}
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "peon-ping",
				order: 21,
				label: () => t("nav"),
				locale: NS,
				inject: injected
			}, PeonSettingsSection));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "peon-ping-listener",
				order: 100
			}, (props) => react.default.createElement(AutoAudioListener, props)));
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map