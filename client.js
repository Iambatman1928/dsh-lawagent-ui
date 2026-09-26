/**
 * 法学学习实训工作台 · Client 半
 *
 * 形态：三栏学术风工作台（PRD 第 5 节）
 *   左栏 = 固定导航（首页 / 法条库 / 案例库 / 逻辑引擎 / 刷题 / 文书 / 论文 / 庭审 / 背诵 / 笔记错题本 / 设置）
 *   中栏 = 核心工作区（每个页签读的是真实学习档案，不是示例数据）
 *   右栏 = 动态信息面板（案件时间线 / 关联法条 / 争议焦点 / 未闭合要件），可折叠
 *
 * 两个挂载点：
 *   * `sidebar.footer.action` 放一个入口按钮（宽栏显示文字，窄栏只显示图标）
 *   * `shell.overlay` 里渲染工作台本体（整帧浮层，必须自己 opt-in pointer-events）
 * 两处共享一个模块级小 store —— 入口按钮与浮层是两个独立的 Slot 占用者，
 * 没有父子关系，只能靠共享状态通信。
 *
 * 数据与动作都走 Host 半的 /lawui/api/<method>：
 *   读：overview / caseDetail / norms / cards / wrong
 *   写：setSettings / setActiveCase / gradeCard / reviewWrong
 *   联动：prompt（把一条指令真的送进明律会话）+ sessions（选目标会话）
 *
 * 手写 CJS 工厂形态：client.js 由 __ModuleLoader__ 直接执行，不需要构建步骤，
 * 因此这里**没有** import / JSX / TS，React 通过 factory 的 require 取得。
 * 颜色一律用「律思」令牌（--lx-*，作用域在 .lawu-overlay），深浅色跟随 DSH 主题服务（data-theme）。
 */

window.__ModuleLoader__.load({
	id: 'lawagent-ui',
	factory: (require) => {
		var module = { exports: {} }
		var exports = module.exports
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
		var React = require('react')

		// ── 样式 ─────────────────────────────────────────────────────────────

		var CSS = `/* ==========================================================================
   律思 LegalMind · 法学学习实训工作台 品牌令牌系统
   炭灰蓝 × 暖米白纸面 × Obsidian 式知识工具质感（对齐设计稿 --lx-*）
   ========================================================================== */
.lawu-overlay {
  --lx-background: #f4f0e4;
  --lx-foreground: #26282d;
  --lx-card: #fbf8ef;
  --lx-card-foreground: #26282d;
  --lx-popover: #fdfbf4;
  --lx-popover-foreground: #26282d;
  --lx-primary: #3a536e;
  --lx-primary-foreground: #f5f2e8;
  --lx-muted: #eae4d2;
  --lx-muted-foreground: #6c675b;
  --lx-border: #ddd6c0;
  --lx-input: #d2cab2;
  --lx-ring: #3a536e;

  --lx-surface-2: #f0ebdb;
  --lx-sidebar: #eae4d2;
  --lx-sidebar-foreground: #3b3e44;
  --lx-sidebar-border: #ddd6c0;
  --lx-inset: #f8f4e8;

  --lx-ink: #26282d;
  --lx-ink-2: #565a61;
  --lx-ink-3: #8b8678;

  --lx-brand: #3a536e;
  --lx-brand-strong: #2d4359;
  --lx-brand-soft: #e3e9f0;
  --lx-brand-line: #c3d0dd;
  --lx-on-brand: #f5f2e8;

  --state-success: #466f52;
  --state-success-soft: #e2ece3;
  --state-warning: #94662a;
  --state-warning-soft: #f1e8d4;
  --state-error: #963f3b;
  --state-error-soft: #f2dedc;
  --state-info: #3a536e;
  --state-info-soft: #e3e9f0;

  --lx-r-xs: 3px;
  --lx-r-sm: 4px;
  --lx-r-md: 8px;
  --lx-r-lg: 14px;
  --lx-r-pill: 999px;

  --lx-shadow-static: 0 1px 2px rgba(38, 40, 45, 0.04), 0 1px 1px rgba(38, 40, 45, 0.03);
  --lx-shadow-float: 0 10px 28px -10px rgba(30, 34, 44, 0.22);
  --lx-shadow-overlay: 0 28px 64px -22px rgba(30, 34, 44, 0.32);

  --lx-font-sans: "Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, -apple-system, sans-serif;
  --lx-font-serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif;
  --lx-font-mono: "JetBrains Mono", "Cascadia Code", Consolas, "Courier New", monospace;

  color-scheme: light;
}
.lawu-overlay[data-theme="dark"] {
  --lx-background: #1b1c20;
  --lx-foreground: #e3e0d6;
  --lx-card: #232429;
  --lx-card-foreground: #e3e0d6;
  --lx-popover: #26282d;
  --lx-popover-foreground: #e3e0d6;
  --lx-primary: #85a1c0;
  --lx-primary-foreground: #151a20;
  --lx-muted: #2a2c31;
  --lx-muted-foreground: #9d9a90;
  --lx-border: #34373d;
  --lx-input: #44474f;
  --lx-ring: #85a1c0;

  --lx-surface-2: #2e3036;
  --lx-sidebar: #18191d;
  --lx-sidebar-foreground: #c9c6bc;
  --lx-sidebar-border: #2c2e34;
  --lx-inset: #202227;

  --lx-ink: #e3e0d6;
  --lx-ink-2: #a3a097;
  --lx-ink-3: #706f68;

  --lx-brand: #85a1c0;
  --lx-brand-strong: #a3b9d2;
  --lx-brand-soft: #283444;
  --lx-brand-line: #3a4a5e;
  --lx-on-brand: #151a20;

  --state-success: #7fa787;
  --state-success-soft: #243029;
  --state-warning: #c2925a;
  --state-warning-soft: #352c1c;
  --state-error: #cf7f7a;
  --state-error-soft: #3a2422;
  --state-info: #85a1c0;
  --state-info-soft: #283444;

  --lx-shadow-static: 0 1px 2px rgba(0, 0, 0, 0.25);
  --lx-shadow-float: 0 10px 28px -10px rgba(0, 0, 0, 0.55);
  --lx-shadow-overlay: 0 28px 64px -22px rgba(0, 0, 0, 0.66);

  color-scheme: dark;
}

/* ==========================================================================
   框架：整帧浮层工作台（顶栏 / 侧栏 / 主体 / 右栏 / 状态栏）
   ========================================================================== */
.lawu-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  background: var(--lx-background);
  color: var(--lx-foreground);
  font-family: var(--lx-font-sans);
  font-size: 13.5px;
  line-height: 1.6;
  overflow: hidden;
}
.lawu-overlay * { box-sizing: border-box; }
.lawu-serif { font-family: var(--lx-font-serif); }
.lx-scroll { scrollbar-width: thin; scrollbar-color: var(--lx-input) transparent; }
.lx-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.lx-scroll::-webkit-scrollbar-thumb { background: var(--lx-input); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
.lx-scroll::-webkit-scrollbar-track { background: transparent; }

/* ---------- 顶栏 ---------- */
.lawu-top {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  flex: none;
  padding: 0 16px;
  border-bottom: 1px solid var(--lx-border);
  background: var(--lx-card);
  min-width: 0;
}
.lawu-brand { display: flex; flex-direction: column; gap: 1px; line-height: 1.2; min-width: 0; }
.lawu-brand b { font-size: 14.5px; font-weight: 600; color: var(--lx-ink); letter-spacing: .04em; white-space: nowrap; }
.lawu-brand span { font-size: 11px; color: var(--lx-ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lawu-top-grow { flex: 1; min-width: 0; }
.lawu-chip {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 12px;
  border-radius: var(--lx-r-pill); border: 1px solid var(--lx-border);
  background: var(--lx-inset); color: var(--lx-ink-2); font-size: 12.5px;
  max-width: 380px; overflow: hidden; white-space: nowrap;
}
.lawu-chip i { width: 7px; height: 7px; border-radius: 50%; background: var(--state-success); display: inline-block; flex: none; }

/* ---------- 主体三栏 ---------- */
.lawu-body { flex: 1; display: flex; min-height: 0; min-width: 0; }

/* ---------- 左侧导航 ---------- */
.lawu-rail {
  width: 232px; flex: 0 0 232px;
  display: flex; flex-direction: column; min-height: 0;
  background: var(--lx-sidebar); border-right: 1px solid var(--lx-sidebar-border);
}
.lawu-brand-side {
  display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 16px;
  border-bottom: 1px solid var(--lx-sidebar-border); flex: none;
}
.lawu-brand-mark {
  width: 30px; height: 30px; border-radius: var(--lx-r-md); flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--lx-brand); color: var(--lx-on-brand);
}
.lawu-brand-mark svg { width: 17px; height: 17px; }
.lawu-brand-name { font-size: 16px; font-weight: 600; letter-spacing: .04em; color: var(--lx-sidebar-foreground); line-height: 1.1; }
.lawu-brand-sub { font-size: 10.5px; color: var(--lx-ink-3); letter-spacing: .08em; display: block; }
.lawu-nav-scroll { flex: 1 1 auto; overflow-y: auto; padding: 10px 10px 14px; }
.lawu-nav-group { margin-top: 14px; }
.lawu-nav-group:first-child { margin-top: 2px; }
.lawu-nav-label { font-size: 11px; color: var(--lx-ink-3); letter-spacing: .12em; padding: 0 10px 6px; user-select: none; }
.lawu-nav {
  display: flex; align-items: center; gap: 10px; width: 100%;
  height: 36px; padding: 0 10px; border: 0; border-radius: var(--lx-r-md);
  background: transparent; color: var(--lx-ink-2); cursor: pointer; text-align: left;
  font-size: 13.5px; font-family: inherit; white-space: nowrap;
  transition: background-color .15s cubic-bezier(.2,.8,.2,1), color .15s cubic-bezier(.2,.8,.2,1);
}
.lawu-nav:hover { background: var(--lx-surface-2); color: var(--lx-ink); }
.lawu-nav.on { background: var(--lx-brand-soft); color: var(--lx-brand-strong); font-weight: 600; }
.lawu-nav .ic { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.lawu-nav .lb { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lawu-nav .bd {
  font-size: 10.5px; min-width: 18px; text-align: center; padding: 0 5px; border-radius: 9px;
  background: var(--lx-muted); color: var(--lx-muted-foreground); flex: none;
}
.lawu-nav.on .bd { background: var(--lx-brand); color: var(--lx-on-brand); }
.lawu-user { flex: none; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid var(--lx-sidebar-border); }
.lawu-avatar {
  width: 30px; height: 30px; border-radius: var(--lx-r-pill); flex: none;
  background: var(--lx-brand); color: var(--lx-on-brand);
  display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;
}
.lawu-user-name { font-size: 13px; color: var(--lx-sidebar-foreground); line-height: 1.25; display: block; }
.lawu-user-meta { font-size: 11px; color: var(--lx-ink-3); }
.lawu-rail-note { margin: 12px 14px 0; padding-top: 12px; border-top: 1px dashed var(--lx-border); font-size: 11px; color: var(--lx-ink-3); line-height: 1.7; }

/* ---------- 中栏 ---------- */
.lawu-main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 0; }
.lawu-scroll { flex: 1; min-height: 0; overflow: auto; padding: 22px 26px 40px; }
.lawu-wrap { max-width: 920px; margin: 0 auto; }
.lawu-h1 { font-size: 21px; font-weight: 600; color: var(--lx-ink); letter-spacing: .02em; margin: 0 0 2px; }
.lawu-sub { color: var(--lx-ink-3); font-size: 12.5px; margin-bottom: 14px; }
.lawu-rule { height: 1px; background: var(--lx-border); margin: 12px 0 18px; position: relative; }
.lawu-rule:after { content: ""; position: absolute; left: 0; top: -1px; width: 54px; height: 2px; background: var(--lx-brand); }
.lawu-h2 { font-size: 13.5px; font-weight: 600; color: var(--lx-ink-2); margin: 18px 0 8px; letter-spacing: .02em; display: flex; align-items: center; gap: 7px; }
.lawu-h2:first-child { margin-top: 0; }

/* ---------- 卡片 / 栅格 / 统计 ---------- */
.lawu-card { border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); background: var(--lx-card); box-shadow: var(--lx-shadow-static); padding: 14px 16px; margin-bottom: 12px; }
.lawu-grid { display: grid; gap: 12px; }
.lawu-stat { border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); padding: 12px 14px; background: var(--lx-card); box-shadow: var(--lx-shadow-static); }
.lawu-stat b { display: block; font-size: 24px; font-weight: 600; line-height: 1.2; color: var(--lx-ink); font-variant-numeric: tabular-nums; }
.lawu-stat span { font-size: 11.5px; color: var(--lx-ink-3); letter-spacing: .04em; }

/* ---------- 表格 ---------- */
.lawu-tb { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.lawu-tb th { text-align: left; font-weight: 600; color: var(--lx-ink-2); font-size: 11.5px; border-bottom: 1px solid var(--lx-input); padding: 6px 8px; white-space: nowrap; }
.lawu-tb td { border-bottom: 1px solid var(--lx-border); padding: 6px 8px; vertical-align: top; }
.lawu-tb tr:hover td { background: var(--lx-surface-2); }
.lawu-mono { font-family: var(--lx-font-mono); font-size: 11.5px; color: var(--lx-ink-2); font-variant-numeric: tabular-nums; }

/* ---------- 状态标签 ---------- */
.lawu-st { display: inline-block; padding: 0 7px; border-radius: var(--lx-r-sm); font-size: 11.5px; white-space: nowrap; line-height: 20px; }
.lawu-st.ok { color: var(--state-success); background: var(--state-success-soft); }
.lawu-st.no { color: var(--state-error); background: var(--state-error-soft); }
.lawu-st.mid { color: var(--state-warning); background: var(--state-warning-soft); }
.lawu-st.none { color: var(--lx-muted-foreground); background: var(--lx-muted); }

/* ---------- 按钮 ---------- */
.lawu-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; padding: 0 13px; border-radius: var(--lx-r-md);
  border: 1px solid var(--lx-border); background: var(--lx-card); color: var(--lx-ink);
  cursor: pointer; font-size: 12.5px; font-weight: 500; font-family: inherit; white-space: nowrap;
  transition: background-color .15s cubic-bezier(.2,.8,.2,1), border-color .15s, color .15s, transform .15s;
}
.lawu-btn:hover { background: var(--lx-surface-2); }
.lawu-btn:active { transform: translateY(1px); }
.lawu-btn:disabled { opacity: .5; cursor: default; }
.lawu-iconbtn { position: relative; width: 32px; height: 32px; border-radius: var(--lx-r-md); display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; background: transparent; color: var(--lx-ink-2); cursor: pointer; font-size: 15px; line-height: 1; font-family: inherit; transition: background-color .15s cubic-bezier(.2,.8,.2,1), color .15s; flex: none; }
.lawu-iconbtn:hover { background: var(--lx-surface-2); color: var(--lx-ink); }
.lawu-iconbtn.is-on { background: var(--lx-brand-soft); color: var(--lx-brand-strong); }
.lawu-btn.pri { background: var(--lx-brand); border-color: var(--lx-brand); color: var(--lx-on-brand); }
.lawu-btn.pri:hover { background: var(--lx-brand-strong); border-color: var(--lx-brand-strong); }
.lawu-link { border: 0; background: transparent; color: var(--lx-brand-strong); cursor: pointer; padding: 0; font: inherit; font-size: 12.5px; }
.lawu-link:hover { text-decoration: underline; }
.lawu-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.lawu-pad { padding: 10px 12px; }
.lawu-muted { color: var(--lx-ink-2); }
.lawu-sm { font-size: 12px; }
.lawu-empty { padding: 26px 16px; text-align: center; color: var(--lx-ink-3); border: 1px dashed var(--lx-input); border-radius: var(--lx-r-md); }

/* ---------- 联动操作区 ---------- */
.lawu-acts { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0 4px; padding: 12px 14px; border: 1px solid var(--lx-border); border-left: 3px solid var(--lx-brand); border-radius: var(--lx-r-md); background: var(--lx-card); }
.lawu-acts-t { width: 100%; font-size: 11px; letter-spacing: .14em; color: var(--lx-ink-3); margin-bottom: 2px; }

/* ---------- 时间线 ---------- */
.lawu-timeline { position: relative; padding-left: 18px; }
.lawu-timeline:before { content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 1px; background: var(--lx-border); }
.lawu-tl { position: relative; margin-bottom: 12px; }
.lawu-tl:before { content: ""; position: absolute; left: -17px; top: 5px; width: 9px; height: 9px; border-radius: 50%; background: var(--lx-brand); border: 2px solid var(--lx-card); box-shadow: 0 0 0 1px var(--lx-brand); }
.lawu-tl time { font-size: 11.5px; color: var(--lx-ink-3); font-family: var(--lx-font-mono); display: block; }

/* ---------- 右栏动态面板 ---------- */
.lawu-aside { width: 324px; flex: 0 0 324px; border-left: 1px solid var(--lx-border); overflow: auto; background: var(--lx-inset); padding: 16px 14px 40px; }
.lawu-aside-h { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.lawu-aside-h b { font-size: 12.5px; letter-spacing: .02em; color: var(--lx-ink-2); font-weight: 600; flex: 1; }
.lawu-blk { margin-bottom: 18px; }
.lawu-blk > b { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid var(--lx-border); color: var(--lx-ink-2); }
.lawu-pill { display: block; width: 100%; text-align: left; border: 1px solid var(--lx-border); background: var(--lx-card); border-radius: var(--lx-r-sm); padding: 6px 9px; margin-bottom: 5px; font-size: 12px; color: var(--lx-ink-2); cursor: pointer; font-family: inherit; }
.lawu-pill:hover { border-color: var(--lx-brand-line); color: var(--lx-brand-strong); }

/* ---------- 文书 / 正文 ---------- */
.lawu-pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12.5px; line-height: 1.75; color: var(--lx-ink-2); }
.lawu-foot { margin-top: 26px; padding-top: 12px; border-top: 1px solid var(--lx-border); font-size: 11px; color: var(--lx-ink-3); line-height: 1.7; }

/* ---------- 标准闭环 ---------- */
.lawu-board { display: flex; gap: 16px; align-items: flex-start; justify-content: center; margin: 14px 0 6px; }
.lawu-flow { flex: 1; max-width: 340px; border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); padding: 12px 14px; background: var(--lx-card); box-shadow: var(--lx-shadow-static); }
.lawu-flow h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--lx-ink); }
.lawu-flow ol { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--lx-ink-2); }
.lawu-flow li { margin: 3px 0; }

/* ---------- 提示 / 弹层 / 入口 ---------- */
.lawu-toast { position: absolute; right: 18px; bottom: 18px; max-width: 420px; border: 1px solid var(--lx-input); border-radius: var(--lx-r-md); padding: 10px 13px; background: var(--lx-popover); box-shadow: var(--lx-shadow-float); font-size: 12.5px; z-index: 80; }
.lawu-close { border: 0; background: transparent; color: var(--lx-ink-2); cursor: pointer; font-size: 17px; line-height: 1; padding: 2px 6px; font-family: inherit; }
.lawu-close:hover { color: var(--lx-ink); }
.lawu-entry { display: flex; align-items: center; gap: 7px; width: 100%; padding: 6px 8px; border: 0; border-radius: var(--lx-r-sm); background: transparent; color: inherit; cursor: pointer; font-family: inherit; font-size: 12.5px; justify-content: flex-start; }
.lawu-entry:hover { background: var(--lx-surface-2); }
.lawu-entry .ic { font-size: 14px; }

/* ---------- 表单 / 分段控件 ---------- */
.lawu-field { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; font-size: 12.5px; }
.lawu-field label { min-width: 112px; color: var(--lx-ink-2); }
.lawu-inp { padding: 7px 10px; border: 1px solid var(--lx-input); border-radius: var(--lx-r-md); background: var(--lx-card); color: var(--lx-ink); font-family: inherit; font-size: 12.5px; outline: none; transition: border-color .15s, box-shadow .15s; }
.lawu-inp:focus { border-color: var(--lx-brand); box-shadow: 0 0 0 2px var(--lx-brand-soft); }
.lawu-inp::placeholder { color: var(--lx-ink-3); }
.lawu-sw { display: inline-flex; border: 1px solid var(--lx-input); border-radius: var(--lx-r-md); overflow: hidden; background: var(--lx-inset); }
.lawu-sw button { border: 0; background: transparent; color: var(--lx-ink-2); padding: 5px 11px; cursor: pointer; font-family: inherit; font-size: 12.5px; transition: background-color .15s, color .15s; }
.lawu-sw button.on { background: var(--lx-brand); color: var(--lx-on-brand); }

/* ---------- 卡片自测（背诵） ---------- */
.lawu-card-q { border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); padding: 12px 14px; margin-bottom: 10px; background: var(--lx-card); box-shadow: var(--lx-shadow-static); }
.lawu-card-q .q { font-weight: 600; margin-bottom: 5px; color: var(--lx-ink); }
.lawu-card-q .a { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--lx-border); color: var(--lx-ink-2); }
.lawu-grades { display: flex; gap: 6px; margin-top: 9px; flex-wrap: wrap; }

/* ---------- 内嵌对话区 ---------- */
.lawu-chat { border-top: 1px solid var(--lx-input); background: var(--lx-card); display: flex; flex-direction: column; min-height: 0; flex: none; }
.lawu-chat-h { display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-bottom: 1px solid var(--lx-border); flex-wrap: wrap; }
.lawu-chat-h b { font-size: 12px; letter-spacing: .12em; color: var(--lx-ink-3); font-weight: 600; }
.lawu-chat-h .grow { flex: 1; }
.lawu-chat-body { flex: 1; min-height: 0; overflow: auto; padding: 12px 16px; }
.lawu-msg { display: flex; gap: 9px; margin-bottom: 12px; align-items: flex-start; }
.lawu-msg .who { flex: 0 0 62px; text-align: right; font-size: 11.5px; color: var(--lx-ink-3); padding-top: 2px; }
.lawu-msg .bubble { flex: 1; min-width: 0; border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); padding: 8px 11px; background: var(--lx-inset); overflow-wrap: anywhere; }
.lawu-msg.user .bubble { background: var(--lx-brand-soft); border-color: var(--lx-brand-line); }
.lawu-msg.assistant .bubble { background: var(--lx-card); border-left: 3px solid var(--lx-brand); }
.lawu-msg.tool .bubble { background: transparent; border-style: dashed; color: var(--lx-ink-2); font-size: 12px; }
.lawu-msg .time { font-size: 11px; color: var(--lx-ink-3); margin-left: 6px; }
.lawu-md p { margin: 0 0 7px; }
.lawu-md p:last-child { margin-bottom: 0; }
.lawu-md h { margin: 10px 0 6px; font-weight: 600; }
.lawu-md h:first-child { margin-top: 0; }
.lawu-md h1 { font-size: 15.5px; } .lawu-md h2 { font-size: 14.5px; } .lawu-md h3 { font-size: 13.5px; } .lawu-md h4 { font-size: 13px; }
.lawu-md ul, .lawu-md ol { margin: 0 0 7px; padding-left: 20px; }
.lawu-md li { margin: 1px 0; }
.lawu-md pre { margin: 6px 0; padding: 8px 10px; border-radius: var(--lx-r-sm); overflow: auto; background: var(--lx-inset); font-family: var(--lx-font-mono); font-size: 12px; white-space: pre-wrap; }
.lawu-md code { padding: 0 4px; border-radius: var(--lx-r-sm); background: var(--lx-inset); font-family: var(--lx-font-mono); font-size: 12px; }
.lawu-md blockquote { margin: 6px 0; padding: 4px 10px; border-left: 3px solid var(--lx-input); color: var(--lx-ink-2); }
.lawu-md table { border-collapse: collapse; margin: 6px 0; font-size: 12.5px; }
.lawu-md th, .lawu-md td { border: 1px solid var(--lx-border); padding: 3px 7px; text-align: left; }
.lawu-md th { background: var(--lx-surface-2); font-weight: 600; }
.lawu-compose { border-top: 1px solid var(--lx-border); padding: 8px 12px; display: flex; gap: 8px; align-items: flex-end; }
.lawu-compose textarea { flex: 1; min-height: 44px; max-height: 140px; resize: vertical; padding: 8px 10px; border-radius: var(--lx-r-md); border: 1px solid var(--lx-input); background: var(--lx-card); color: var(--lx-ink); font-family: inherit; font-size: 13px; line-height: 1.6; outline: none; }
.lawu-compose textarea:focus { border-color: var(--lx-brand); box-shadow: 0 0 0 2px var(--lx-brand-soft); }
.lawu-hint { font-size: 11px; color: var(--lx-ink-3); margin-top: 3px; }
.lawu-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--state-warning); margin-right: 5px; }
.lawu-thinking { font-size: 12px; color: var(--lx-ink-3); padding: 2px 0 8px 71px; }

/* ---------- 资料来源 / 笔记 ---------- */
.lawu-src { border: 1px solid var(--lx-border); border-left: 3px solid var(--lx-brand); border-radius: var(--lx-r-md); background: var(--lx-card); padding: 10px 12px; margin-bottom: 14px; }
.lawu-src-h { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.lawu-src-h b { font-size: 11px; letter-spacing: .14em; color: var(--lx-ink-3); font-weight: 600; }
.lawu-dir { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--lx-border); border-radius: var(--lx-r-pill); padding: 2px 7px 2px 10px; font-size: 12px; background: var(--lx-inset); max-width: 100%; }
.lawu-dir .p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
.lawu-dir.off { opacity: .55; text-decoration: line-through; }
.lawu-dir.bad { border-color: var(--state-error); color: var(--state-error); }
.lawu-dir .x { border: 0; background: transparent; color: inherit; cursor: pointer; font-family: inherit; font-size: 12px; padding: 0 2px; opacity: .65; }
.lawu-dir .x:hover { opacity: 1; }
.lawu-files { border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); background: var(--lx-card); margin-bottom: 14px; overflow: hidden; }
.lawu-files-h { display: flex; align-items: center; gap: 8px; padding: 7px 11px; border-bottom: 1px solid var(--lx-border); flex-wrap: wrap; }
.lawu-files-h b { font-size: 11px; letter-spacing: .14em; color: var(--lx-ink-3); font-weight: 600; }
.lawu-file { display: grid; grid-template-columns: 1fr 190px 74px; gap: 8px; align-items: center; padding: 5px 11px; font-size: 12.5px; border-bottom: 1px solid var(--lx-border); cursor: pointer; }
.lawu-file:hover { background: var(--lx-surface-2); }
.lawu-file .n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lawu-file .d { color: var(--lx-ink-3); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lawu-file .s { text-align: right; color: var(--lx-ink-3); font-size: 11.5px; }
.lawu-modal { position: absolute; inset: 0; background: rgba(20, 22, 28, .38); display: flex; align-items: center; justify-content: center; padding: 28px; z-index: 70; }
.lawu-modal > div { background: var(--lx-popover); color: var(--lx-popover-foreground); border-radius: var(--lx-r-md); width: min(860px, 92vw); max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--lx-input); box-shadow: var(--lx-shadow-overlay); }
.lawu-modal-h { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--lx-border); }
.lawu-modal-h b { flex: 1; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lawu-modal-b { overflow: auto; padding: 14px 18px 24px; }
.lawu-fm { border: 1px dashed var(--lx-input); border-radius: var(--lx-r-sm); padding: 6px 9px; margin-bottom: 10px; font-size: 11.5px; color: var(--lx-ink-2); font-family: var(--lx-font-mono); white-space: pre-wrap; }
.lawu-wiki { border: 0; background: transparent; color: var(--lx-brand-strong); cursor: pointer; font: inherit; padding: 0 1px; border-bottom: 1px dotted var(--lx-brand-strong); }
.lawu-wiki:hover { background: var(--lx-brand-soft); }
.lawu-tagpill { display: inline-block; padding: 0 7px; border-radius: var(--lx-r-sm); font-size: 11px; margin: 0 4px 3px 0; color: var(--lx-muted-foreground); background: var(--lx-muted); }

/* ---------- 首页英雄输入面板 ---------- */
.lawu-hero { border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); background: var(--lx-card); box-shadow: var(--lx-shadow-static); padding: 18px; margin-bottom: 14px; }
.lawu-hero p { margin: 0 0 12px; font-size: 17px; line-height: 1.5; color: var(--lx-ink); }
.lawu-hero textarea { width: 100%; border: 1px solid var(--lx-input); border-radius: var(--lx-r-md); background: var(--lx-card); color: var(--lx-ink); font-family: inherit; font-size: 13.5px; line-height: 1.7; padding: 10px 12px; resize: vertical; outline: none; min-height: 74px; }
.lawu-hero textarea:focus { border-color: var(--lx-brand); box-shadow: 0 0 0 2px var(--lx-brand-soft); }
.lawu-hero textarea::placeholder { color: var(--lx-ink-3); }

/* ---------- 底部状态栏 ---------- */
.lawu-statusbar { display: flex; align-items: center; gap: 10px; height: 30px; flex: none; padding: 0 16px; border-top: 1px solid var(--lx-border); background: var(--lx-card); font-size: 11px; color: var(--lx-ink-3); white-space: nowrap; overflow: hidden; }
.lawu-statusbar .lawu-sb-right { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.lawu-sb-dot { width: 5px; height: 5px; border-radius: var(--lx-r-pill); background: var(--state-success); display: inline-block; }

/* ==========================================================================
   设计系统补全：页头 / 卡片结构 / 引用块 / 要件行 / 三段论 / 校验清单 / 联动条 / 标签页
   （对齐设计稿的 .lm-page-hd / .lm-card-hd / .lm-quote / .lm-elem / .lm-syl / .lm-check / .lm-jumpbar / .lm-tabs）
   ========================================================================== */
.lawu-card.flush { padding: 0; overflow: hidden; }
.lawu-page-hd { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
.lawu-page-hd h1 { font-size: 21px; font-weight: 600; color: var(--lx-ink); line-height: 1.25; margin: 0; }
.lawu-page-hd p { font-size: 13px; color: var(--lx-ink-3); margin: 5px 0 0; }
.lawu-page-hd .lawu-hd-right { margin-left: auto; display: flex; gap: 8px; align-items: center; flex: none; }
.lawu-card-hd { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--lx-border); }
.lawu-card-hd > svg { width: 16px; height: 16px; color: var(--lx-ink-3); flex: none; }
.lawu-card-hd .lawu-hd-right { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; flex: none; }
.lawu-card-body { padding: 14px 16px; }
.lawu-card-ft { padding: 11px 16px; border-top: 1px solid var(--lx-border); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lawu-card-ft .lawu-spacer { margin-left: auto; }
.lawu-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lawu-grid.cols-auto { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.lawu-strong { font-weight: 600; color: var(--lx-ink); }
.lawu-quote { border-left: 3px solid var(--lx-brand-line); background: var(--lx-inset); padding: 10px 14px; border-radius: 0 var(--lx-r-md) var(--lx-r-md) 0; font-size: 13px; color: var(--lx-ink-2); line-height: 1.75; }
.lawu-quote .lawu-q-tt { color: var(--lx-brand-strong); font-weight: 600; margin-right: 6px; }
.lawu-elem { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; }
.lawu-elem + .lawu-elem { border-top: 1px solid var(--lx-border); }
.lawu-elem > div { min-width: 0; }
.lawu-elem b { font-size: 13px; color: var(--lx-ink); font-weight: 600; }
.lawu-elem p { font-size: 12.5px; color: var(--lx-ink-2); margin: 2px 0 0; line-height: 1.6; }
.lawu-elem .lawu-tag { margin-top: 6px; }
.lawu-syl { display: grid; grid-template-columns: 1fr 26px 1fr 26px 1fr; align-items: stretch; }
.lawu-syl-node { border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); background: var(--lx-card); padding: 12px; min-width: 0; }
.lawu-syl-node .lawu-syl-tag { font-size: 11px; font-weight: 600; color: var(--lx-brand-strong); }
.lawu-syl-node p { font-size: 12.5px; color: var(--lx-ink-2); margin: 6px 0 0; line-height: 1.65; }
.lawu-syl-arrow { display: flex; align-items: center; justify-content: center; color: var(--lx-ink-3); }
.lawu-syl-arrow svg { width: 18px; height: 18px; }
.lawu-check { display: flex; align-items: flex-start; gap: 9px; padding: 8px 0; font-size: 12.5px; color: var(--lx-ink-2); }
.lawu-check + .lawu-check { border-top: 1px solid var(--lx-border); }
.lawu-check > svg { width: 15px; height: 15px; flex: none; margin-top: 2px; }
.lawu-check.ok > svg { color: var(--state-success); }
.lawu-check.warn > svg { color: var(--state-warning); }
.lawu-check.miss > svg { color: var(--state-error); }
.lawu-check .lawu-chk-note { display: block; font-size: 11.5px; color: var(--lx-ink-3); margin-top: 2px; }
.lawu-jumpbar { display: flex; gap: 10px; padding: 12px; background: var(--lx-card); border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); box-shadow: var(--lx-shadow-static); }
.lawu-jumpbtn { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 7px; padding: 12px 13px; border-radius: var(--lx-r-md); border: 1px solid var(--lx-border); background: var(--lx-inset); cursor: pointer; text-align: left; font-family: inherit; transition: border-color .15s, background-color .15s, transform .15s; }
.lawu-jumpbtn:hover { border-color: var(--lx-brand-line); background: var(--lx-brand-soft); transform: translateY(-1px); }
.lawu-jumpbtn .lawu-jb-ic { width: 28px; height: 28px; border-radius: var(--lx-r-sm); background: var(--lx-brand-soft); color: var(--lx-brand-strong); display: inline-flex; align-items: center; justify-content: center; flex: none; }
.lawu-jumpbtn .lawu-jb-ic svg { width: 15px; height: 15px; }
.lawu-jumpbtn b { font-size: 13px; font-weight: 600; color: var(--lx-ink); }
.lawu-jumpbtn span { font-size: 11.5px; color: var(--lx-ink-3); line-height: 1.45; }
.lawu-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--lx-border); margin-bottom: 16px; flex-wrap: wrap; }
.lawu-tabs button { border: 0; background: transparent; font-family: inherit; cursor: pointer; padding: 9px 14px; font-size: 13px; color: var(--lx-ink-3); position: relative; transition: color .15s; }
.lawu-tabs button:hover { color: var(--lx-ink); }
.lawu-tabs button.is-active { color: var(--lx-brand-strong); font-weight: 600; }
.lawu-tabs button.is-active::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px; background: var(--lx-brand); border-radius: 2px; }
.lawu-soft-brand { border: 1px solid var(--lx-brand-line); background: var(--lx-brand-soft); border-radius: var(--lx-r-md); padding: 13px 14px; }
.lawu-soft-warn { border: 1px solid var(--lx-border); background: var(--state-warning-soft); border-radius: var(--lx-r-md); padding: 13px 14px; }
.lawu-dotlist { display: flex; flex-direction: column; gap: 9px; }
.lawu-dotlist > span { display: flex; gap: 8px; font-size: 12.5px; line-height: 1.65; color: var(--lx-ink-2); }
.lawu-dotlist > span > svg { width: 14px; height: 14px; flex: none; margin-top: 3px; }
.lawu-srcbox { display: flex; flex-direction: column; gap: 9px; border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); background: var(--lx-inset); padding: 13px; }
.lawu-srcbox .lawu-srcbox-hd { display: flex; align-items: center; gap: 8px; }
.lawu-srcbox .lawu-srcbox-hd b { font-size: 13px; color: var(--lx-ink); }
.lawu-srcbox .lawu-srcbox-hd .lawu-spacer { margin-left: auto; }

/* ---------- 上下文携带条 / 文书纸（设计稿 .lm-carry / .lm-doc） ---------- */
.lawu-carry { display: flex; align-items: center; gap: 9px; padding: 9px 14px; border: 1px solid var(--lx-brand-line); background: var(--lx-brand-soft); border-radius: var(--lx-r-md); font-size: 12.5px; color: var(--lx-brand-strong); margin-bottom: 14px; }
.lawu-carry > svg { width: 15px; height: 15px; flex: none; }
.lawu-carry .lawu-tag { margin-left: auto; }
.lawu-doc-wrap { display: flex; flex-direction: column; gap: 14px; }
.lawu-docbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.lawu-docbar-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--lx-ink-3); }
.lawu-docbar-hint svg { width: 14px; height: 14px; }
.lawu-doc { background: var(--lx-popover); border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); padding: 34px 40px; font-family: var(--lx-font-serif); color: var(--lx-ink); box-shadow: var(--lx-shadow-static); }
.lawu-doc h2 { font-size: 19px; font-weight: 600; text-align: center; margin: 0 0 22px; letter-spacing: .12em; }
.lawu-doc h3 { font-size: 14.5px; font-weight: 600; margin: 20px 0 8px; }
.lawu-doc p { font-size: 13.5px; line-height: 2; margin: 0 0 8px; text-align: justify; }
.lawu-doc .lawu-doc-fill { background: var(--lx-brand-soft); color: var(--lx-brand-strong); border-radius: 3px; padding: 0 3px; font-family: var(--lx-font-sans); font-size: 12.5px; }
.lawu-doc .lawu-doc-blank { display: inline-block; min-width: 120px; border-bottom: 1px dashed var(--lx-input); height: 20px; vertical-align: bottom; }
.lawu-doc .lawu-doc-meta { font-family: var(--lx-font-sans); font-size: 12px; color: var(--lx-ink-3); text-align: right; }
.lawu-doc .lawu-doc-ol { margin: 0 0 8px; padding-left: 22px; }
.lawu-doc .lawu-doc-ol li { font-size: 13.5px; line-height: 2; }
.lawu-doc-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lawu-doc-actions .lawu-spacer { margin-left: auto; }

/* ---------- 通用三列（法条库：目录 / 命中 / 详情） ---------- */
.lawu-split3 { display: grid; grid-template-columns: 220px minmax(0, 1fr) 300px; gap: 14px; align-items: start; }
.lawu-dirrow { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 10px; border: 0; border-radius: var(--lx-r-sm); background: transparent; color: var(--lx-ink-2); font-family: inherit; font-size: 12.5px; cursor: pointer; text-align: left; }
.lawu-dirrow:hover { background: var(--lx-surface-2); color: var(--lx-ink); }
.lawu-dirrow.is-on { background: var(--lx-brand-soft); color: var(--lx-brand-strong); font-weight: 600; }
.lawu-dirrow .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lawu-dirrow .c { font-size: 11px; color: var(--lx-ink-3); font-family: var(--lx-font-mono); }
.lawu-hit { display: block; width: 100%; text-align: left; padding: 9px 11px; border: 1px solid transparent; border-radius: var(--lx-r-sm); background: transparent; color: inherit; font-family: inherit; cursor: pointer; }
.lawu-hit:hover { background: var(--lx-surface-2); }
.lawu-hit.is-on { background: var(--lx-brand-soft); border-color: var(--lx-brand-line); }
.lawu-hit b { display: block; font-size: 13px; color: var(--lx-ink); }
.lawu-hit span { display: block; font-size: 11.5px; color: var(--lx-ink-3); margin-top: 2px; }

/* ==========================================================================
   庭审模拟：法庭三列（对齐设计稿 .lx-court）
   ========================================================================== */
.lawu-court-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 11px 14px; border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); background: var(--lx-card); box-shadow: var(--lx-shadow-static); }
.lawu-bar-group { display: flex; align-items: center; gap: 8px; }
.lawu-bar-label { font-size: 11px; color: var(--lx-ink-3); letter-spacing: .08em; flex: none; }
.lawu-bar-actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.lawu-steps { list-style: none; display: flex; align-items: center; flex-wrap: wrap; margin: 0; padding: 0; }
.lawu-step { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--lx-ink-3); white-space: nowrap; }
.lawu-step + .lawu-step::before { content: ""; width: 26px; height: 1px; background: var(--lx-input); margin: 0 10px 0 0; }
.lawu-step-dot { width: 22px; height: 22px; border-radius: var(--lx-r-pill); flex: none; border: 1px solid var(--lx-input); background: var(--lx-card); color: var(--lx-ink-3); display: inline-flex; align-items: center; justify-content: center; font-family: var(--lx-font-mono); font-size: 11px; }
.lawu-step.is-active { color: var(--lx-brand-strong); font-weight: 600; }
.lawu-step.is-active .lawu-step-dot { background: var(--lx-brand); border-color: var(--lx-brand); color: var(--lx-on-brand); }

.lawu-court { display: grid; grid-template-columns: 248px minmax(0, 1fr) 264px; grid-template-rows: minmax(0, 1fr); gap: 14px; margin-top: 12px; }
.lawu-court > [data-tab-panel] { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.lawu-dock { overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 2px; max-height: 64vh; }
.lawu-dock > .lawu-card { flex: none; margin-bottom: 0; }

.lawu-case-kicker { font-size: 11px; color: var(--lx-ink-3); letter-spacing: .1em; }
.lawu-case-no { font-family: var(--lx-font-mono); font-size: 12.5px; font-weight: 600; color: var(--lx-ink); margin-top: 3px; }
.lawu-party { display: flex; gap: 8px; font-size: 12.5px; color: var(--lx-ink-2); margin-top: 7px; line-height: 1.5; }
.lawu-party-role { color: var(--lx-ink-3); flex: none; }
.lawu-case-tags { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }

.lawu-evi { display: flex; align-items: center; gap: 9px; padding: 9px 0; }
.lawu-evi + .lawu-evi { border-top: 1px solid var(--lx-border); }
.lawu-evi > svg { width: 15px; height: 15px; flex: none; }
.lawu-evi.ok > svg { color: var(--state-success); }
.lawu-evi.warn > svg { color: var(--state-warning); }
.lawu-evi-main { flex: 1 1 auto; min-width: 0; }
.lawu-evi-name { font-size: 12.5px; color: var(--lx-ink); line-height: 1.35; }
.lawu-evi-note { display: block; font-size: 11px; color: var(--lx-ink-3); margin-top: 2px; }

.lawu-hearing { background: var(--lx-card); border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); box-shadow: var(--lx-shadow-static); overflow: hidden; min-height: 380px; }
.lawu-hearing-hd { flex: none; padding: 9px 14px; border-bottom: 1px solid var(--lx-border); font-size: 12px; color: var(--lx-ink-3); letter-spacing: .1em; display: flex; align-items: center; gap: 8px; }
.lawu-hearing-scroll { flex: 1 1 auto; min-height: 0; max-height: 54vh; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; background: var(--lx-inset); }
.lawu-judge-line { align-self: center; max-width: 88%; display: flex; align-items: center; gap: 9px; background: var(--lx-brand-strong); color: var(--lx-on-brand); border-radius: var(--lx-r-sm); padding: 8px 16px; font-family: var(--lx-font-serif); font-size: 12.5px; line-height: 1.75; box-shadow: var(--lx-shadow-static); }
.lawu-judge-line > svg { width: 14px; height: 14px; flex: none; opacity: .85; }
.lawu-judge-line > span { flex: 1; text-align: center; }
.lawu-bubble { max-width: 78%; border: 1px solid var(--lx-border); border-radius: var(--lx-r-md); padding: 10px 14px 11px; background: var(--lx-card); box-shadow: var(--lx-shadow-static); }
.lawu-bubble.mine { align-self: flex-start; border-left: 3px solid var(--lx-brand); }
.lawu-bubble.opp { align-self: flex-end; background: var(--lx-popover); }
.lawu-bubble.is-current { box-shadow: 0 0 0 2px var(--lx-brand-soft); }
.lawu-bb-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; }
.lawu-bubble.opp .lawu-bb-meta { justify-content: flex-end; }
.lawu-bb-who { font-size: 12px; font-weight: 600; }
.lawu-bubble.mine .lawu-bb-who { color: var(--lx-brand-strong); }
.lawu-bubble.opp .lawu-bb-who { color: var(--lx-ink-2); }
.lawu-bb-time { font-size: 11px; color: var(--lx-ink-3); font-family: var(--lx-font-mono); }
.lawu-bubble.mine .lawu-bb-time { margin-left: auto; }
.lawu-bubble p { font-size: 13px; line-height: 1.75; color: var(--lx-ink-2); margin: 0; text-align: justify; }
.lawu-typing { align-self: center; display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--lx-ink-3); padding: 2px 10px; }
.lawu-typing .lawu-dots { display: inline-flex; gap: 4px; }
.lawu-typing .lawu-dots i { width: 5px; height: 5px; border-radius: var(--lx-r-pill); background: var(--lx-ink-3); animation: lawu-breathe 1.2s ease-in-out infinite; }
.lawu-typing .lawu-dots i:nth-child(2) { animation-delay: .18s; }
.lawu-typing .lawu-dots i:nth-child(3) { animation-delay: .36s; }
@keyframes lawu-breathe { 0%, 100% { opacity: .25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
.lawu-composer { flex: none; border-top: 1px solid var(--lx-border); background: var(--lx-card); padding: 12px 14px; }
.lawu-composer textarea { width: 100%; border: 1px solid var(--lx-input); border-radius: var(--lx-r-md); background: var(--lx-card); color: var(--lx-ink); font-family: inherit; font-size: 13px; line-height: 1.6; padding: 8px 10px; resize: none; outline: none; }
.lawu-composer textarea:focus { border-color: var(--lx-brand); box-shadow: 0 0 0 2px var(--lx-brand-soft); }
.lawu-composer-row { display: flex; align-items: center; gap: 8px; margin-top: 9px; flex-wrap: wrap; }
.lawu-composer-row .lawu-spacer { margin-left: auto; }

.lawu-elem-row { display: flex; align-items: flex-start; gap: 9px; padding: 9px 10px; border: 1px solid transparent; border-radius: var(--lx-r-sm); }
.lawu-elem-row + .lawu-elem-row { margin-top: 2px; }
.lawu-elem-row.is-current { background: var(--lx-brand-soft); border-color: var(--lx-brand-line); }
.lawu-elem-name { font-size: 12.5px; font-weight: 600; color: var(--lx-ink); }
.lawu-elem-state { display: block; font-size: 11px; color: var(--lx-ink-3); margin-top: 1px; }
.lawu-elem-ic { width: 20px; height: 20px; border-radius: var(--lx-r-pill); flex: none; margin-top: 1px; display: inline-flex; align-items: center; justify-content: center; }
.lawu-elem-ic svg { width: 12px; height: 12px; }
.lawu-elem-ic.ok { background: var(--state-success-soft); color: var(--state-success); }
.lawu-elem-ic.warn { background: var(--state-warning-soft); color: var(--state-warning); }
.lawu-elem-ic.miss { background: var(--state-error-soft); color: var(--state-error); }

.lawu-law { display: flex; align-items: baseline; gap: 10px; padding: 8px 0; }
.lawu-law + .lawu-law { border-top: 1px solid var(--lx-border); }
.lawu-law code { font-family: var(--lx-font-mono); font-size: 11.5px; color: var(--lx-brand-strong); background: var(--lx-brand-soft); border-radius: var(--lx-r-xs); padding: 2px 6px; flex: none; }
.lawu-law p { margin: 0; font-size: 12px; color: var(--lx-ink-2); line-height: 1.55; }

.lawu-warn-card { background: var(--state-warning-soft); }
.lawu-def-item { padding: 8px 0; }
.lawu-def-item + .lawu-def-item { border-top: 1px solid var(--lx-border); }
.lawu-def-item b { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--lx-ink); font-weight: 600; }
.lawu-def-item b > svg { width: 13px; height: 13px; color: var(--state-warning); flex: none; }
.lawu-def-item p { margin: 3px 0 0 19px; font-size: 12px; color: var(--lx-ink-2); line-height: 1.6; }

.lawu-timer-num { font-family: var(--lx-font-mono); font-variant-numeric: tabular-nums; font-size: 30px; font-weight: 600; color: var(--lx-ink); letter-spacing: .04em; line-height: 1.1; }
.lawu-timer-label { font-size: 11.5px; color: var(--lx-ink-3); margin-top: 2px; }
.lawu-timer-sub { font-size: 11.5px; color: var(--lx-ink-2); margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--lx-border); }

.lawu-rail-flow { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lawu-rail-flow li { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--lx-ink-3); }
.lawu-rf-dot { width: 9px; height: 9px; border-radius: var(--lx-r-pill); border: 2px solid var(--lx-input); background: var(--lx-card); flex: none; }
.lawu-rail-flow li.is-active { color: var(--lx-brand-strong); font-weight: 600; }
.lawu-rail-flow li.is-active .lawu-rf-dot { background: var(--lx-brand); border-color: var(--lx-brand); }
.lawu-rf-state { margin-left: auto; }
.lawu-stat3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; text-align: center; }
.lawu-stat3 b { display: block; font-family: var(--lx-font-mono); font-variant-numeric: tabular-nums; font-size: 19px; font-weight: 600; color: var(--lx-ink); }
.lawu-stat3 span { font-size: 11px; color: var(--lx-ink-3); }

/* 标签（设计稿 .lm-tag 的对应物） */
.lawu-tag { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 9px; border-radius: var(--lx-r-sm); font-size: 11.5px; line-height: 1; background: var(--lx-muted); color: var(--lx-muted-foreground); white-space: nowrap; }
.lawu-tag.brand { background: var(--lx-brand-soft); color: var(--lx-brand-strong); }
.lawu-tag.succ { background: var(--state-success-soft); color: var(--state-success); }
.lawu-tag.warn { background: var(--state-warning-soft); color: var(--state-warning); }
.lawu-tag.err { background: var(--state-error-soft); color: var(--state-error); }
.lawu-tag.outline { background: transparent; border: 1px solid var(--lx-border); color: var(--lx-ink-2); }

.lawu-court-tabs { display: none; }

/* 分段控件（设计稿 .lm-seg 的对应物） */
.lawu-seg { display: inline-flex; padding: 3px; gap: 2px; background: var(--lx-muted); border-radius: var(--lx-r-md); flex-wrap: wrap; }
.lawu-seg button { border: 0; background: transparent; font-family: inherit; cursor: pointer; height: 26px; padding: 0 13px; border-radius: var(--lx-r-sm); font-size: 12.5px; color: var(--lx-ink-2); display: inline-flex; align-items: center; gap: 5px; transition: background-color .15s, color .15s; }
.lawu-seg button:hover { color: var(--lx-ink); }
.lawu-seg button.is-on { background: var(--lx-card); color: var(--lx-brand-strong); font-weight: 600; box-shadow: var(--lx-shadow-static); }

/* ==========================================================================
   响应式（多端适配）：窄屏右栏转抽屉、更窄屏侧栏转抽屉
   ========================================================================== */
.lawu-hamburger { display: none; }
.lawu-rail-backdrop { display: none; }
@media (max-width: 1200px) {
  /* 法庭三列 → 单列 + 标签切换（只庭审流常驻） */
  .lawu-court-tabs { display: flex; gap: 6px; margin-top: 12px; }
  .lawu-court-tabs button {
    flex: 1 1 0; height: 32px; border: 1px solid var(--lx-border); border-radius: var(--lx-r-sm);
    background: var(--lx-card); color: var(--lx-ink-2); font-family: inherit; font-size: 12.5px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    transition: background-color .15s cubic-bezier(.2,.8,.2,1), border-color .15s, color .15s;
  }
  .lawu-court-tabs button svg { width: 14px; height: 14px; }
  .lawu-court-tabs button:hover { color: var(--lx-ink); }
  .lawu-court-tabs button.is-active { background: var(--lx-brand-soft); border-color: var(--lx-brand-line); color: var(--lx-brand-strong); font-weight: 600; }
  .lawu-court { grid-template-columns: minmax(0, 1fr); }
  .lawu-court > [data-tab-panel]:not(.is-active) { display: none; }
  .lawu-court > [data-tab-panel].is-active { display: flex; flex-direction: column; }
  .lawu-dock { max-height: none; padding-right: 0; }
}
@media (max-width: 1100px) {
  .lawu-aside {
    position: fixed; right: 0; top: 56px; bottom: 30px; width: 330px; z-index: 45;
    transform: translateX(105%); transition: transform .24s cubic-bezier(.3,0,0,1);
    box-shadow: var(--lx-shadow-overlay);
  }
  .lawu-body[data-aside-open="true"] .lawu-aside { transform: translateX(0); }
  .lawu-grid { grid-template-columns: 1fr; }
  .lawu-board { flex-direction: column; }
  .lawu-flow { max-width: none; }
}
@media (max-width: 820px) {
  .lawu-hamburger { display: inline-flex; }
  .lawu-rail {
    position: fixed; left: 0; top: 0; bottom: 0; width: 250px; z-index: 50;
    transform: translateX(-105%); transition: transform .24s cubic-bezier(.3,0,0,1);
    box-shadow: var(--lx-shadow-overlay);
  }
  .lawu-body[data-nav-open="true"] .lawu-rail { transform: translateX(0); }
  .lawu-body[data-nav-open="true"] .lawu-rail-backdrop { display: block; }
  .lawu-rail-backdrop { position: fixed; inset: 0; background: rgba(20,22,28,.32); z-index: 49; }
  .lawu-scroll { padding: 18px 14px 32px; }
  .lawu-brand span { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .lawu-overlay *, .lawu-overlay *::before, .lawu-overlay *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
`

		// ── 模块级小 store：入口按钮与整帧浮层之间唯一的通信方式 ──────────────

		function createStore(initial) {
			var state = initial
			var listeners = new Set()
			return {
				get: function () {
					return state
				},
				set: function (patch) {
					state = Object.assign({}, state, patch)
					listeners.forEach(function (fn) {
						fn()
					})
				},
				subscribe: function (fn) {
					listeners.add(fn)
					return function () {
						listeners.delete(fn)
					}
				},
			}
		}

		var uiStore = createStore({ open: false })
		/** 深浅色主题：跟随 DSH 主题服务（律思 light/dark 两套令牌由 CSS 的 data-theme 切换） */
		var themeStore = createStore({ dark: false })
		var themeSvc = null

		/** 从 DSH 主题服务读当前是否深色（读不到时退回 false = 浅色） */
		function syncTheme() {
			var dark = false
			try {
				if (themeSvc && typeof themeSvc.getTheme === 'function') {
					var snap = themeSvc.getTheme()
					dark = !!(snap && snap.active && snap.active.colorScheme === 'dark')
				}
			} catch (e) {
				dark = false
			}
			themeStore.set({ dark: dark })
		}

		/** 切主题：走 DSH 主题服务（只切 light/dark，不碰 system） */
		function toggleTheme() {
			if (!themeSvc || typeof themeSvc.setTheme !== 'function') return
			try {
				themeSvc.setTheme(themeStore.get().dark ? 'light' : 'dark')
			} catch (e) {
				/* 主题服务不可用时静默 */
			}
		}

		function useStore(store) {
			var pair = React.useState(store.get())
			React.useEffect(function () {
				return store.subscribe(function () {
					pair[1](store.get())
				})
			}, [])
			return pair[0]
		}

		// ── 数据访问 ─────────────────────────────────────────────────────────

		async function call(method, payload) {
			var response
			try {
				response = await fetch('/lawui/api/' + method, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload || {}),
				})
			} catch (e) {
				throw new Error('网络错误：' + ((e && e.message) || e))
			}
			var parsed = await response.json().catch(function () {
				return null
			})
			if (!response.ok || !parsed || parsed.ok !== true) {
				throw new Error((parsed && parsed.error && parsed.error.message) || 'HTTP ' + response.status)
			}
			return parsed.value
		}

		// ── 常量 ─────────────────────────────────────────────────────────────

		/** 单色线性图标（对齐设计稿的 Lucide 风格；stroke=currentColor，随主题着色） */
		var ICONS = {
			house: [['path', 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'], ['path', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z']],
			library: [['path', 'M16 6l4 14'], ['path', 'M12 6v14'], ['path', 'M8 8v12'], ['path', 'M4 4v16']],
			bookmarked: [['path', 'M10 2v8l3-3 3 3V2'], ['path', 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20']],
			gitfork: [['circle', { cx: 12, cy: 18, r: 3 }], ['circle', { cx: 6, cy: 6, r: 3 }], ['circle', { cx: 18, cy: 6, r: 3 }], ['path', 'M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9'], ['path', 'M12 12v3']],
			pen: [['path', 'M12 20h9'], ['path', 'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z']],
			scroll: [['path', 'M15 12h-5'], ['path', 'M15 8h-5'], ['path', 'M19 17V5a2 2 0 0 0-2-2H4'], ['path', 'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3']],
			cap: [['path', 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z'], ['path', 'M22 10v6'], ['path', 'M6 12.5V16a6 3 0 0 0 12 0v-3.5']],
			gavel: [['path', 'M14.5 12.5l-8 8a2.119 2.119 0 1 1-3-3l8-8'], ['path', 'M16 16l6-6'], ['path', 'M8 8l6-6'], ['path', 'M9 7l8 8'], ['path', 'M21 11l-8-8']],
			layers: [['path', 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z'], ['path', 'M22 12l-8.58 3.9a2 2 0 0 1-1.66 0L3 12'], ['path', 'M22 17l-8.58 3.9a2 2 0 0 1-1.66 0L3 17']],
			notebook: [['path', 'M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4'], ['path', 'M2 6h4'], ['path', 'M2 10h4'], ['path', 'M2 14h4'], ['path', 'M2 18h4'], ['path', 'M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z']],
			settings: [['path', 'M20 7h-9'], ['path', 'M14 17H5'], ['circle', { cx: 17, cy: 17, r: 3 }], ['circle', { cx: 7, cy: 7, r: 3 }]],
			moon: [['path', 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z']],
			sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', 'M12 2v2'], ['path', 'M12 20v2'], ['path', 'M4.93 4.93l1.41 1.41'], ['path', 'M17.66 17.66l1.41 1.41'], ['path', 'M2 12h2'], ['path', 'M20 12h2'], ['path', 'M6.34 17.66l-1.41 1.41'], ['path', 'M19.07 4.93l-1.41 1.41']],
			back: [['path', 'M19 12H5'], ['path', 'M12 19l-7-7 7-7']],
			check: [['path', 'M20 6 9 17l-5-5']],
			warn: [['path', 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'], ['path', 'M12 9v4'], ['path', 'M12 17h.01']],
			shield: [['path', 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'], ['path', 'M12 8v4'], ['path', 'M12 16h.01']],
			arrow: [['path', 'M5 12h14'], ['path', 'm12 5 7 7-7 7']],
			filetext: [['path', 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'], ['path', 'M14 2v4a2 2 0 0 0 2 2h4'], ['path', 'M10 9H8'], ['path', 'M16 13H8'], ['path', 'M16 17H8']],
			key: [['path', 'm15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4'], ['path', 'm21 2-9.6 9.6'], ['circle', { cx: 7.5, cy: 15.5, r: 5.5 }]],
			listchecks: [['path', 'm3 17 2 2 4-4'], ['path', 'm3 7 2 2 4-4'], ['path', 'M13 6h8'], ['path', 'M13 12h8'], ['path', 'M13 18h8']],
			scale: [['path', 'm16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z'], ['path', 'm2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z'], ['path', 'M7 21h10'], ['path', 'M12 3v18'], ['path', 'M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2']],
			lightbulb: [['path', 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'], ['path', 'M9 18h6'], ['path', 'M10 22h4']],
			ban: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', 'm4.9 4.9 14.2 14.2']],
			flag: [['path', 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'], ['path', 'M4 22v-7']],
			rotate: [['path', 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'], ['path', 'M3 3v5h5']],
			messages: [['path', 'M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z'], ['path', 'M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1']],
			dot: [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 2 }]],
		}

		function Icon(name, size) {
			var els = ICONS[name] || []
			var svgProps = { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
			return h.apply(null, ['svg', svgProps].concat(els.map(function (e, i) {
				// e 有两种形态：[tag, '路径 d 字符串'] 与 [tag, { 属性对象 }]。
				// 字符串必须包成 { d }：直接 Object.assign 会把字符串按下标展开成 0/1/2… 假属性
				// （React 19 报 Invalid attribute name），而且 d 根本没设上 → 图标画不出来。
				var attrs = typeof e[1] === 'string' ? { d: e[1] } : e[1] || {}
				return h(e[0], Object.assign({ key: i }, attrs))
			})))
		}

		var NAV = [
			{ id: 'home', ic: 'house', lb: '首页' },
			{ id: 'norms', ic: 'library', lb: '法条库' },
			{ id: 'cases', ic: 'bookmarked', lb: '案例库' },
			{ id: 'engine', ic: 'gitfork', lb: '法律逻辑与论证辅助' },
			{ id: 'drills', ic: 'pen', lb: '刷题训练' },
			{ id: 'docs', ic: 'scroll', lb: '法律文书练习' },
			{ id: 'papers', ic: 'cap', lb: '论文辅助' },
			{ id: 'moot', ic: 'gavel', lb: '庭审模拟' },
			{ id: 'cards', ic: 'layers', lb: '知识点背诵' },
			{ id: 'notes', ic: 'notebook', lb: '我的笔记/错题本' },
			{ id: 'settings', ic: 'settings', lb: '设置' },
		]

		var STATUS_CLASS = { 满足: 'ok', 不满足: 'no', 存疑: 'mid', 缺失: 'none' }

		function sid(x) {
			return String(x == null ? '' : x)
		}

		function fmtTime(iso) {
			if (!iso) return '—'
			var d = new Date(iso)
			if (isNaN(d.getTime())) return String(iso)
			var p = function (n) {
				return n < 10 ? '0' + n : String(n)
			}
			return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
		}

		function fmtDay(iso) {
			if (!iso) return ''
			return String(iso).slice(0, 10)
		}

		function clip(s, n) {
			var t = String(s == null ? '' : s)
			return t.length <= n ? t : t.slice(0, n) + '…'
		}

		/** 会话显示名：拿不到真实标题就用「明律会话 · 日期」，不编造 */
		function sessionLabel(s) {
			if (!s) return ''
			return s.title || ('明律会话 · ' + fmtDay(s.updatedAt || s.createdAt || ''))
		}

		// ── 基础组件 ─────────────────────────────────────────────────────────

		function h(tag, props) {
			var kids = Array.prototype.slice.call(arguments, 2)
			return React.createElement.apply(React, [tag, props].concat(kids))
		}

		function Btn(props) {
			return h(
				'button',
				{
					className: 'lawu-btn' + (props.pri ? ' pri' : ''),
					onClick: props.onClick,
					disabled: props.disabled,
					title: props.title,
				},
				props.children,
			)
		}

		function Status(props) {
			var key = sid(props.value)
			return h('span', { className: 'lawu-st ' + (STATUS_CLASS[key] || 'none') }, key || '未标注')
		}

		function Empty(props) {
			return h('div', { className: 'lawu-empty' }, props.children)
		}

		function Table(props) {
			var cols = props.cols || []
			var rows = props.rows || []
			if (rows.length === 0) return h(Empty, null, props.emptyText || '（暂无数据）')
			return h(
				'table',
				{ className: 'lawu-tb' },
				h('thead', null, h('tr', null, cols.map(function (c, i) {
					return h('th', { key: i }, c)
				}))),
				h('tbody', null, rows.map(function (r, i) {
					return h('tr', { key: i }, r.map(function (cell, j) {
						return h('td', { key: j }, cell)
					}))
				})),
			)
		}

		/**
		 * 联动操作区：把 PRD 4.1.3 的五大联动做成真的会发指令的按钮。
		 * 渲染形态对齐设计稿的 .lm-jumpbar（图标底座 + 标题 + 一句说明）；
		 * **发送通道不变** —— 仍然只是 ctx.send(text)，没有新增/改动任何 API 调用。
		 * item 形状：{ label, text, ic?, desc? }
		 */
		function Actions(props) {
			var ctx = props.ctx
			var items = props.items || []
			if (items.length === 0) return null
			return h(
				'div',
				{ className: 'lawu-jumpbar', 'aria-label': props.title || '一键联动' },
				items.map(function (it, i) {
					return h(
						'button',
						{
							key: i,
							type: 'button',
							className: 'lawu-jumpbtn',
							disabled: ctx.busy,
							title: it.text,
							onClick: function () { ctx.send(it.text) },
						},
						h('span', { className: 'lawu-jb-ic' }, Icon(it.ic || 'pen', 15)),
						h('b', null, it.label),
						h('span', null, it.desc || ''),
					)
				}),
			)
		}

		// ── 左侧导航 ─────────────────────────────────────────────────────────

		/** 左侧导航分组（与设计稿一致：首页 / 核心学习 / 资源与管理） */
		var NAV_GROUPS = [
			{ label: null, items: ['home'] },
			{ label: '核心学习', items: ['engine', 'drills', 'docs', 'papers', 'moot', 'cards'] },
			{ label: '资源与管理', items: ['norms', 'cases', 'notes', 'settings'] },
		]
		var NAV_BY_ID = {}
		NAV.forEach(function (it) { NAV_BY_ID[it.id] = it })

		function Rail(props) {
			var counts = props.counts || {}
			return h(
				'div',
				{ className: 'lawu-rail' },
				h(
					'div',
					{ className: 'lawu-brand-side' },
					h(
						'span',
						{ className: 'lawu-brand-mark', 'aria-hidden': true },
						h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
							h('path', { d: 'M12 3v18' }),
							h('path', { d: 'M7 21h10' }),
							h('path', { d: 'M12 6c-2.5-2-6-2.5-8-2v9c2 0 5.5.5 8 3' }),
							h('path', { d: 'M12 6c2.5-2 6-2.5 8-2v9c-2 0-5.5.5-8 3' }),
						),
					),
					h(
						'span',
						null,
						h('span', { className: 'lawu-brand-name' }, '律思'),
						h('span', { className: 'lawu-brand-sub' }, 'LEGALMIND'),
					),
				),
				h(
					'div',
					{ className: 'lawu-nav-scroll lx-scroll' },
					NAV_GROUPS.map(function (group, gi) {
						return h(
							'div',
							{ className: 'lawu-nav-group', key: gi },
							group.label ? h('div', { className: 'lawu-nav-label' }, group.label) : null,
							group.items.map(function (id) {
								var item = NAV_BY_ID[id]
								if (!item) return null
								var badge = counts[id]
								return h(
									'button',
									{
										key: id,
										className: 'lawu-nav' + (props.nav === id ? ' on' : ''),
										onClick: function () { props.onNav(id) },
									},
									h('span', { className: 'ic' }, Icon(item.ic, 17)),
									h('span', { className: 'lb' }, item.lb),
									badge ? h('span', { className: 'bd' }, String(badge)) : null,
								)
							}),
						)
					}),
				),
				h(
					'div',
					{ className: 'lawu-user' },
					h('span', { className: 'lawu-avatar' }, '学'),
					h(
						'span',
						null,
						h('span', { className: 'lawu-user-name' }, '法学生'),
						h('span', { className: 'lawu-user-meta' }, '法律逻辑引擎 · 全场景联动'),
					),
				),
			)
		}

		// ── 右侧动态信息面板 ─────────────────────────────────────────────────

		function Aside(props) {
			var aside = props.aside || {}
			var cases = props.cases || []
			var onPickCase = props.onPickCase
			return h(
				'div',
				{ className: 'lawu-aside' },
				h(
					'div',
					{ className: 'lawu-aside-h' },
					h('b', null, '案件动态面板'),
					h('button', { className: 'lawu-close', title: '折叠右栏', onClick: props.onCollapse }, '›'),
				),

				h(
					'div',
					{ className: 'lawu-blk' },
					h('b', null, '当前案件'),
					cases.length === 0
						? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有案件卷宗）')
						: h(
								'select',
								{
									className: 'lawu-inp',
									style: { width: '100%' },
									value: props.activeCaseId || '',
									onChange: function (e) { onPickCase(e.target.value) },
								},
								cases.map(function (c) {
									return h('option', { key: c.id, value: c.id }, c.title + '（' + c.subject + '）')
								}),
							),
				),

				h(
					'div',
					{ className: 'lawu-blk' },
					h('b', null, '案件时间线'),
					(aside.timeline || []).length === 0
						? h('div', { className: 'lawu-sm lawu-muted' }, '（时间线为空，让明律从事实里提取节点）')
						: h(
								'div',
								{ className: 'lawu-timeline' },
								aside.timeline.map(function (t, i) {
									return h(
										'div',
										{ className: 'lawu-tl', key: i },
										h('time', null, t.at),
										h('div', { className: 'lawu-sm' }, t.event),
										t.evidence ? h('div', { className: 'lawu-mono' }, '证据：' + t.evidence) : null,
									)
								}),
							),
				),

				h(
					'div',
					{ className: 'lawu-blk' },
					h('b', null, '未闭合要件'),
					(aside.gaps || []).length === 0
						? h('div', { className: 'lawu-sm lawu-muted' }, '（没有未闭合要件）')
						: aside.gaps.map(function (g, i) {
								return h(
									'div',
									{ className: 'lawu-pill', key: i, title: (g.claim || '') + ' · ' + (g.norm || '') },
									h(Status, { value: g.status }),
									' ',
									g.name,
								)
							}),
				),

				h(
					'div',
					{ className: 'lawu-blk' },
					h('b', null, '关联法条'),
					(aside.norms || []).length === 0
						? h('div', { className: 'lawu-sm lawu-muted' }, '（要件清单里还没有记规范依据）')
						: aside.norms.map(function (n, i) {
								return h('div', { className: 'lawu-pill', key: i }, n)
							}),
				),

				h(
					'div',
					{ className: 'lawu-blk' },
					h('b', null, '争议焦点'),
					(aside.focus || []).length === 0
						? h('div', { className: 'lawu-sm lawu-muted' }, '（尚未归纳）')
						: aside.focus.map(function (f, i) {
								return h('div', { className: 'lawu-pill', key: i }, f)
							}),
				),
			)
		}

		// ── 各页签 ───────────────────────────────────────────────────────────

		function SecHome(props) {
			var d = props.data
			var st = d.stats || {}
			var record = d.case
			var heroState = React.useState('')
			var heroText = heroState[0]
			var setHeroText = heroState[1]
			var stats = [
				['在办案卷', st.cases],
				['今日待背', st.dueCards],
				['主观题', st.drills],
				['错题', st.wrong],
			]
			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '法学学习实训工作台'),
				h('div', { className: 'lawu-sub' }, '以「法律逻辑与论证辅助」引擎为底层核心 · 学、练、训、写、辩、背全场景联动'),
				h('div', { className: 'lawu-rule' }),

				h(
					'div',
					{ className: 'lawu-hero' },
					h('p', { className: 'lawu-serif' }, '今天从一个案件开始'),
					h('textarea', {
						rows: 3,
						placeholder: '粘贴案情、裁判文书或法条，或描述你想训练的知识点…',
						value: heroText,
						onChange: function (e) { setHeroText(e.target.value) },
					}),
					h(
						'div',
						{ className: 'lawu-row', style: { marginTop: '10px' } },
						h(Btn, { pri: true, disabled: !heroText.trim(), onClick: function () { var t = heroText.trim(); if (t) { props.ctx.send(t); setHeroText('') } } }, '开始逻辑分析'),
						h('span', { className: 'lawu-sm lawu-muted' }, '把案情送进明律 → 建卷宗 → 追问缺口 → 逻辑分析'),
					),
				),

				h(
					'div',
					{ className: 'lawu-grid', style: { gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '14px' } },
					stats.map(function (pair, i) {
						return h('div', { className: 'lawu-stat', key: i }, h('b', null, String(pair[1] == null ? 0 : pair[1])), h('span', null, pair[0]))
					}),
				),

				/* 学习模块（对齐设计稿首页的模块入口网格；点了直接切页签） */
				h(
					'section',
					null,
					h('h2', { className: 'lawu-h2' }, Icon('library', 14), '学习模块'),
					h(
						'div',
						{ className: 'lawu-grid cols-3' },
						[
							{ id: 'engine', ic: 'gitfork', t: '法律逻辑与论证', d: '要件拆解 · 三段论 · 谬误识别', tag: '核心引擎' },
							{ id: 'drills', ic: 'pen', t: '刷题训练', d: '主观题批改 · 采分点对照' },
							{ id: 'docs', ic: 'scroll', t: '法律文书练习', d: '起诉状 / 答辩状 / 代理词' },
							{ id: 'papers', ic: 'cap', t: '论文辅助', d: '大纲生成 · 论证校验' },
							{ id: 'moot', ic: 'gavel', t: '庭审模拟', d: 'AI 对抗 · 全流程演练' },
							{ id: 'cards', ic: 'layers', t: '知识点背诵', d: '智能卡片 · 错题重背' },
						].map(function (m, i) {
							return h(
								'button',
								{
									key: i,
									type: 'button',
									className: 'lawu-card lawu-jumpbtn',
									style: { marginBottom: 0 },
									onClick: props.onNav ? function () { props.onNav(m.id) } : null,
								},
								h('span', { className: 'lawu-jb-ic' }, Icon(m.ic, 15)),
								h('b', null, m.t, m.tag ? h('span', { className: 'lawu-tag brand', style: { marginLeft: '8px' } }, m.tag) : null),
								h('span', null, m.d),
							)
						}),
					),
				),

				h(
					'div',
					{ className: 'lawu-card' },
					h('div', { className: 'lawu-h2' }, '当前案件'),
					record
						? h(
								'div',
								null,
								h('div', { style: { fontWeight: 600, marginBottom: '4px' } }, record.title + '（' + record.subject + ' · ' + record.stage + '）'),
								record.parties ? h('div', { className: 'lawu-sm' }, '当事人：' + record.parties) : null,
								record.focus ? h('div', { className: 'lawu-sm' }, '争议焦点：' + record.focus) : null,
								record.summary ? h('pre', { className: 'lawu-pre', style: { marginTop: '6px' } }, record.summary) : null,
								h(
									'div',
									{ className: 'lawu-row', style: { marginTop: '8px' } },
									h('span', { className: 'lawu-chip' }, '事实 ' + record.facts.length),
									h('span', { className: 'lawu-chip' }, '要件 ' + record.elements.length),
									h('span', { className: 'lawu-chip' }, '时间线 ' + record.timeline.length),
									h('span', { className: 'lawu-chip' }, '习题 ' + record.drills.length),
									h('span', { className: 'lawu-chip' }, '文书 ' + record.documents.length),
									h('span', { className: 'lawu-chip' }, '庭审 ' + record.moot.length),
								),
							)
						: h(Empty, null, '还没有案件卷宗。给明律一段案情（或点下面的按钮开始），它会建卷宗、追问缺口、再做逻辑分析。'),
				),

				h(Actions, {
					ctx: props.ctx,
					title: '开始',
					items: record
						? [
								{ label: '继续追问缺口事实', text: '请重新检视本案要件缺口（law_elements action=check），本轮只追问缺口事实，最多 3 个问题。' },
								{ label: '按现有事实出结论', text: '请按现有事实推进：完成三段论拆解与正反论证，未闭合要件写明假设与举证责任。' },
								{ label: '生成今日背诵计划', text: '请看我的背诵库（law_flashcards action=plan），按到期顺序安排今天的复习。' },
							]
						: [
								{ label: '我有一段案情要分析', text: '我有一段案情要分析：' },
								{ label: '今天想刷题', text: '我想刷主观题，先看我的错题本和背诵库，给我安排一组训练。' },
							],
				}),

				h(
					'div',
					{ className: 'lawu-h2' },
					'标准闭环',
				),
				h(
					'div',
					{ className: 'lawu-board' },
					h(
						'div',
						{ className: 'lawu-flow' },
						h('h4', { className: 'lawu-serif' }, '① 事实 → ② 逻辑'),
						h(
							'ol',
							null,
							h('li', null, '输入案情，建立案件卷宗'),
							h('li', null, '多轮事实追问，补全要件事实'),
							h('li', null, '请求权基础检索与规范要件解构'),
							h('li', null, '三段论拆解 · 正反论证 · 谬误识别'),
						),
					),
					h(
						'div',
						{ className: 'lawu-flow' },
						h('h4', { className: 'lawu-serif' }, '③ 四大场景'),
						h(
							'ol',
							null,
							h('li', null, '应试：主观题 → 逻辑复盘 → 错题本'),
							h('li', null, '实训：庭审模拟 → 笔录 → 文书写作'),
							h('li', null, '学业：论文大纲 → 逻辑校验 → 论证优化'),
							h('li', null, '复盘：知识点入背诵库 → 日常自测'),
						),
					),
				),

				h('div', { className: 'lawu-foot' }, d.disclaimer),
			)
		}

		function SecNorms(props) {
			var norms = (props.extra.norms && props.extra.norms.norms) || []
			var q = props.query || ''
			var selState = React.useState('')
			var sel = selState[0]
			var setSel = selState[1]
			var lawState = React.useState('')
			var law = lawState[0]
			var setLaw = lawState[1]

			/** 从「《刑法》第236条第1款」里取出法律名，用于左侧目录 */
			function lawOf(n) {
				var m = /^《([^》]+)》/.exec(String(n || ''))
				return m ? m[1] : '（未标注法律）'
			}
			var dirs = []
			var dirMap = {}
			norms.forEach(function (n) {
				var l = lawOf(n.norm)
				if (!dirMap[l]) {
					dirMap[l] = []
					dirs.push(l)
				}
				dirMap[l].push(n)
			})
			var shown = norms.filter(function (n) {
				if (law && lawOf(n.norm) !== law) return false
				if (q && String(n.norm).indexOf(q) < 0 && (n.cases || []).join(' ').indexOf(q) < 0) return false
				return true
			})
			var active = shown.filter(function (n) { return n.norm === sel })[0] || shown[0] || null
			var totalRefs = norms.reduce(function (a, n) { return a + Number(n.count || 0) }, 0)

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '法条库'),
				h('div', { className: 'lawu-sub' }, '从你自己的要件清单里聚合出的规范依据索引 · 条文原文与有效性请让明律联网核实'),
				h('div', { className: 'lawu-rule' }),

				h(
					'div',
					{ className: 'lawu-row', style: { marginBottom: '12px' } },
					h('input', {
						className: 'lawu-inp',
						style: { flex: 1, minWidth: '220px' },
						placeholder: '按法条或案件标题过滤…',
						value: q,
						onChange: function (e) { props.onQuery(e.target.value) },
					}),
					h('span', { className: 'lawu-tag outline' }, '法条 ' + norms.length + ' 条'),
					h('span', { className: 'lawu-tag outline' }, '被引用 ' + totalRefs + ' 次'),
				),

				norms.length === 0
					? h(Empty, null, '还没有记录任何法条依据。要件解构时让明律把每一条要件的规范依据写进 law_elements，这里就会自动汇总。')
					: h(
							'div',
							{ className: 'lawu-split3' },

							/* 左：法律目录（按法律名聚合） */
							h(
								'section',
								{ className: 'lawu-card flush' },
								h('div', { className: 'lawu-card-hd' }, Icon('library', 16), h('span', { className: 'lawu-card-tt' }, '法律目录')),
								h(
									'div',
									{ className: 'lawu-card-body', style: { padding: '8px' } },
									h(
										'button',
										{ type: 'button', className: 'lawu-dirrow' + (law === '' ? ' is-on' : ''), onClick: function () { setLaw('') } },
										h('span', { className: 'n' }, '全部'),
										h('span', { className: 'c' }, String(norms.length)),
									),
									dirs.map(function (l) {
										return h(
											'button',
											{ key: l, type: 'button', className: 'lawu-dirrow' + (law === l ? ' is-on' : ''), onClick: function () { setLaw(l) } },
											h('span', { className: 'n' }, l),
											h('span', { className: 'c' }, String(dirMap[l].length)),
										)
									}),
								),
							),

							/* 中：条文命中 */
							h(
								'section',
								{ className: 'lawu-card flush' },
								h('div', { className: 'lawu-card-hd' }, Icon('filetext', 16), h('span', { className: 'lawu-card-tt' }, '条文命中'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, shown.length + ' 条'))),
								h(
									'div',
									{ className: 'lawu-card-body', style: { padding: '8px' } },
									shown.length === 0
										? h('div', { className: 'lawu-sm lawu-muted', style: { padding: '10px' } }, '（当前筛选下没有命中）')
										: shown.map(function (n, i) {
												return h(
													'button',
													{ key: i, type: 'button', className: 'lawu-hit' + (active && active.norm === n.norm ? ' is-on' : ''), onClick: function () { setSel(n.norm) } },
													h('b', null, n.norm),
													h('span', null, '被引用 ' + n.count + ' 次' + ((n.cases || []).length ? ' · ' + (n.cases || []).join(' / ') : '')),
												)
											}),
								),
							),

							/* 右：条文详情 / 关联案例 / 引用它的要件 */
							h(
								'div',
								{ style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('scale', 16), h('span', { className: 'lawu-card-tt' }, '条文详情')),
									h(
										'div',
										{ className: 'lawu-card-body' },
										active
											? [
													h('div', { className: 'lawu-quote lawu-serif', key: 'q' }, h('span', { className: 'lawu-q-tt' }, active.norm)),
													h('div', { className: 'lawu-sm lawu-muted', key: 'n', style: { marginTop: '8px' } }, '条文原文请让明律联网核实（现行有效性以官方文本为准）。'),
												]
											: h('div', { className: 'lawu-sm lawu-muted' }, '（左侧选一条法条）'),
									),
								),
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('bookmarked', 16), h('span', { className: 'lawu-card-tt' }, '关联案例')),
									h(
										'div',
										{ className: 'lawu-card-body' },
										active && (active.cases || []).length > 0
											? active.cases.map(function (c, i) { return h('div', { className: 'lawu-check ok', key: i }, Icon('check', 15), h('span', null, c)) })
											: h('div', { className: 'lawu-sm lawu-muted' }, '（这条法条暂无关联案件）'),
									),
								),
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('gitfork', 16), h('span', { className: 'lawu-card-tt' }, '引用它的要件')),
									h(
										'div',
										{ className: 'lawu-card-body' },
										active && (active.elements || []).length > 0
											? active.elements.map(function (e, i) {
													var k = statusClass(e.status)
													return h('div', { className: 'lawu-check ' + k, key: i }, Icon(k === 'ok' ? 'check' : 'warn', 15), h('span', null, e.name, h('span', { className: 'lawu-chk-note' }, sid(e.status) + (e.caseTitle ? ' · ' + e.caseTitle : ''))))
												})
											: h('div', { className: 'lawu-sm lawu-muted' }, '（暂无引用）'),
									),
								),
							),
						),

				h(
					'div',
					{ style: { marginTop: '15px' } },
					h(Actions, {
						ctx: props.ctx,
						title: '法条核查',
						items: [
							{ label: '逐条核实', desc: '核实现行有效性与准确条文号', ic: 'listchecks', text: '请把我要件清单里记过的规范依据逐条核实现行有效性与准确条文号，列出需要更正的地方。' },
							{ label: '导出法条汇编', desc: '按本案要件整理成汇编', ic: 'library', text: '请把本案要件涉及的规范依据整理成一份法条汇编（含条文原文与效力核查截止日），保存到导出目录。' },
						],
					}),
				),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		function SecCases(props) {
			var d = props.data
			var record = d.case
			var cases = d.cases || []
			var qState = React.useState('')
			var q = qState[0]
			var setQ = qState[1]

			var filtered = cases.filter(function (c) {
				if (!q) return true
				return (c.title || '').indexOf(q) >= 0 || (c.subject || '').indexOf(q) >= 0 || (c.stage || '').indexOf(q) >= 0
			})

			if (!record) {
				return h(
					'div',
					null,
					h('h1', { className: 'lawu-h1 lawu-serif' }, '案例库 · 案件卷宗'),
					h('div', { className: 'lawu-sub' }, '每一份卷宗都是全场景唯一事实基准：习题、文书、论文、庭审、背诵都挂回这里'),
					h('div', { className: 'lawu-rule' }),
					h(
						'div',
						{ className: 'lawu-card flush' },
						h('div', { className: 'lawu-card-hd' }, Icon('bookmarked', 16), h('span', { className: 'lawu-card-tt' }, '案例列表')),
						h('div', { className: 'lawu-card-body' },
							h(Table, {
								cols: ['案件', '科目', '阶段', '事实', '要件', '习题', '更新于'],
								emptyText: '还没有案件卷宗。',
								rows: filtered.map(function (c) {
									return [h('button', { className: 'lawu-link', onClick: function () { props.onPickCase(c.id) } }, c.title), c.subject, c.stage, String(c.facts), String(c.elements), String(c.drills), h('span', { className: 'lawu-mono' }, fmtDay(c.updatedAt))]
								}),
							}),
						),
					),
					h('div', { className: 'lawu-foot' }, d.disclaimer),
				)
			}

			var elements = record.elements || []
			var facts = record.facts || []
			var timeline = record.timeline || []
			var args = record.arguments || []
			var fallacies = record.fallacies || []
			var reviews = record.reviews || []
			var focusList = String(record.focus || '').split(/[；;]/).map(function (t) { return t.trim() }).filter(Boolean)
			var norms = []
			elements.forEach(function (e) {
				String(e.norm || '')
					.split(/[；;]/)
					.forEach(function (t) {
						var s = t.trim()
						if (s && norms.indexOf(s) < 0) norms.push(s)
					})
			})
			var subjects = []
			cases.forEach(function (c) { if (c.subject && subjects.indexOf(c.subject) < 0) subjects.push(c.subject) })

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '案例库 · 案件卷宗'),
				h('div', { className: 'lawu-sub' }, '每一份卷宗都是全场景唯一事实基准：习题、文书、论文、庭审、背诵都挂回这里'),
				h('div', { className: 'lawu-rule' }),

				/* 筛选 + 案例列表 */
				h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon('bookmarked', 16), h('span', { className: 'lawu-card-tt' }, '案例列表'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, filtered.length + ' / ' + cases.length))),
					h(
						'div',
						{ className: 'lawu-card-body' },
						h(
							'div',
							{ className: 'lawu-row', style: { marginBottom: '12px' } },
							h('input', { className: 'lawu-inp', style: { flex: 1, minWidth: '220px' }, placeholder: '按案件 / 科目 / 阶段筛选…', value: q, onChange: function (e) { setQ(e.target.value) } }),
							subjects.map(function (s) {
								return h('button', { key: s, type: 'button', className: 'lawu-chip' + (q === s ? ' is-on' : ''), onClick: function () { setQ(q === s ? '' : s) } }, s)
							}),
						),
						h(Table, {
							cols: ['案件', '科目', '阶段', '事实', '要件', '习题', '更新于'],
							emptyText: '没有匹配的案件。',
							rows: filtered.map(function (c) {
								return [
									h('button', { className: 'lawu-link', onClick: function () { props.onPickCase(c.id) }, key: 't' }, c.title + (c.id === record.id ? '（当前）' : '')),
									c.subject,
									c.stage,
									String(c.facts),
									String(c.elements),
									String(c.drills),
									h('span', { className: 'lawu-mono' }, fmtDay(c.updatedAt)),
								]
							}),
						}),
					),
				),

				/* 卷宗详情 */
				h('div', { className: 'lawu-h2', style: { marginTop: '18px' } }, '卷宗详情 · ' + record.title),

				h(
					'div',
					{ style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '14px', alignItems: 'start' } },

					/* 左：案情摘要 / 关键事实链 / 争议焦点与裁判理由 / 适用法条 */
					h(
						'div',
						{ style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('filetext', 16), h('span', { className: 'lawu-card-tt' }, '案情摘要')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								h('p', { style: { margin: 0, fontSize: '13px', lineHeight: 1.8, color: 'var(--lx-ink-2)' } }, record.summary || '（未填摘要）'),
								h('div', { className: 'lawu-row', style: { marginTop: '10px' } },
									h('span', { className: 'lawu-tag brand' }, record.subject || '—'),
									h('span', { className: 'lawu-tag outline' }, record.stage || '—'),
									h('span', { className: 'lawu-tag outline' }, '来源：' + (record.source || '—')),
								),
								record.parties ? h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '8px' } }, '当事人：' + record.parties) : null,
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('listchecks', 16), h('span', { className: 'lawu-card-tt' }, '关键事实链'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, facts.length + ' 条'))),
							h(
								'div',
								{ className: 'lawu-card-body' },
								facts.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有事实）')
									: facts.map(function (f, i) {
											return h('div', { className: 'lawu-check ' + (f.confirmed ? 'ok' : 'warn'), key: f.id || i }, Icon(f.confirmed ? 'check' : 'warn', 15), h('span', null, f.text, h('span', { className: 'lawu-chk-note' }, '来源：' + factSourceLabel(f.source) + ' · ' + sid(f.id))))
										}),
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('scale', 16), h('span', { className: 'lawu-card-tt' }, '争议焦点与裁判理由'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, focusList.length + ' 项焦点'))),
							h(
								'div',
								{ className: 'lawu-card-body' },
								focusList.map(function (f, i) {
									return h('div', { className: 'lawu-check ok', key: 'f' + i }, Icon('dot', 15), h('span', null, ('0' + (i + 1)).slice(-2) + ' ' + f))
								}),
								args.length > 0
									? h(
											'div',
											{ className: 'lawu-grid', style: { marginTop: '14px' } },
											args.map(function (a, i) {
												var mine = i % 2 === 0
												return h(
													'div',
													{ className: mine ? 'lawu-soft-brand' : 'lawu-soft-warn', key: i },
													h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } }, Icon(mine ? 'flag' : 'shield', 15), h('b', { style: { fontSize: '13px', color: 'var(--lx-ink)' } }, a.stance || (mine ? '一方主张' : '另一方主张'))),
													h('div', { className: 'lawu-dotlist' },
														h('span', null, Icon(mine ? 'dot' : 'ban', 14), a.proposition),
														(a.grounds || []).map(function (g, j) { return h('span', { key: j }, Icon(mine ? 'dot' : 'ban', 14), g) }),
														a.rebuttal ? h('span', null, Icon('dot', 14), '对方可能反驳：' + a.rebuttal) : null,
													),
												)
											}),
										)
									: null,
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('library', 16), h('span', { className: 'lawu-card-tt' }, '适用法条'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, norms.length + ' 条'))),
							h(
								'div',
								{ className: 'lawu-card-body' },
								norms.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（要件清单里还没有记规范依据）')
									: norms.map(function (n, i) {
											return h('div', { className: 'lawu-law', key: i }, h('code', null, n), h('p', null, elements.filter(function (e) { return String(e.norm || '').indexOf(n) >= 0 }).map(function (e) { return e.name }).join(' / ')))
										}),
							),
						),
					),

					/* 右：诉讼进程 / 考点提炼 / 我的批注 */
					h(
						'div',
						{ style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('rotate', 16), h('span', { className: 'lawu-card-tt' }, '诉讼进程')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								timeline.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（时间线为空）')
									: h('div', { className: 'lawu-timeline' }, timeline.map(function (t, i) {
											return h('div', { className: 'lawu-tl', key: i }, h('time', null, t.at), h('div', { className: 'lawu-sm' }, t.event), t.evidence ? h('div', { className: 'lawu-mono' }, '证据：' + t.evidence) : null)
										})),
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('cap', 16), h('span', { className: 'lawu-card-tt' }, '考点提炼'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, elements.length + ' 个'))),
							h(
								'div',
								{ className: 'lawu-card-body' },
								elements.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有要件清单）')
									: elements.map(function (e, i) {
											var k = statusClass(e.status)
											return h('div', { className: 'lawu-check ' + k, key: e.id || i }, Icon(k === 'ok' ? 'check' : 'warn', 15), h('span', null, e.name, h('span', { className: 'lawu-chk-note' }, (e.level || '') + ' · ' + sid(e.status))))
										}),
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('notebook', 16), h('span', { className: 'lawu-card-tt' }, '我的批注 / 复盘'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, reviews.length + ' 条'))),
							h(
								'div',
								{ className: 'lawu-card-body' },
								fallacies.length > 0
									? h('div', { style: { marginBottom: '12px' } },
											h('div', { className: 'lawu-sm lawu-strong', style: { marginBottom: '6px' } }, '逻辑谬误 ' + fallacies.length + ' 处'),
											fallacies.map(function (x, i) { return h('div', { className: 'lawu-check warn', key: i }, Icon('warn', 15), h('span', null, x.kind, h('span', { className: 'lawu-chk-note' }, x.fix || x.explanation || ''))) }),
										)
									: null,
								reviews.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有复盘记录 —— 做完主观题让明律复盘一次）')
									: reviews.map(function (r, i) {
											return h('div', { key: i, style: { marginBottom: '10px' } },
												h('div', { className: 'lawu-sm lawu-muted' }, fmtTime(r.at) + ' · 对象：' + (r.target || '—')),
												(r.checks || []).map(function (c, j) { return h('div', { className: 'lawu-check ' + (c.ok ? 'ok' : 'warn'), key: j }, Icon(c.ok ? 'check' : 'warn', 15), h('span', null, c.dim, c.note ? h('span', { className: 'lawu-chk-note' }, c.note) : null)) }),
												r.advice ? h('div', { className: 'lawu-sm lawu-muted' }, '改进建议：' + r.advice) : null,
											)
										}),
							),
						),
					),
				),

				h(
					'div',
					{ style: { marginTop: '15px' } },
					h(Actions, {
						ctx: props.ctx,
						title: '案件操作',
						items: [
							{ label: '补齐本案时间线', desc: '从事实里提取节点，缺的问我', ic: 'rotate', text: '请把本案事实里的时间节点整理进案件时间线（law_timeline），缺失的时间点单独列出来问我。' },
							{ label: '按要素解构本案', desc: '请求权基础 → 构成要件', ic: 'gitfork', text: '请对本案做一次完整的规范要件解构（law_elements action=set），按请求权成立 / 抗辩 / 再抗辩三层列出要件与采分点。' },
							{ label: '导出本案卷宗', desc: '全档导出到 exports/', ic: 'filetext', text: '请把当前案件导出为完整卷宗（law_export kind=case）。' },
						],
					}),
				),
				h('div', { className: 'lawu-foot' }, d.disclaimer),
			)
		}

		function SecEngine(props) {
			var record = props.data.case
			var tabState = React.useState('')
			var tab = tabState[0]
			var setTab = tabState[1]
			if (!record) return h(Empty, null, '还没有案件卷宗 —— 引擎需要一份案情才能开始拆解。')
			var elements = record.elements || []
			var facts = record.facts || []
			var syllogisms = record.syllogisms || []
			var args = record.arguments || []
			var fallacies = record.fallacies || []
			var focusList = String(record.focus || '').split(/[；;]/).map(function (t) { return t.trim() }).filter(Boolean)

			/** 按请求权基础（claim）聚合 —— 概览卡与要件拆解页签共用 */
			var claims = {}
			var claimOrder = []
			elements.forEach(function (e) {
				var c = e.claim || '（未归类请求权基础）'
				if (!claims[c]) { claims[c] = []; claimOrder.push(c) }
				claims[c].push(e)
			})
			var activeTab = tab && claims[tab] ? tab : (claimOrder[0] || '')
			var active = claims[activeTab] || []

			var total = 0
			var got = 0
			elements.forEach(function (e) {
				var p = Number(e.points || 0)
				total += p
				if (e.status === '满足') got += p
			})
			var openItems = elements.filter(function (e) { return e.status !== '满足' })
			var confirmed = facts.filter(function (f) { return f.confirmed })
			var unconfirmed = facts.filter(function (f) { return !f.confirmed })

			/** 一条请求权基础的整体状态 → 标签色与文案 */
			function claimState(list) {
				if (list.some(function (e) { return e.status === '缺失' || e.status === '不满足' })) return { cls: 'err', txt: '要件待补' }
				if (list.some(function (e) { return e.status !== '满足' })) return { cls: 'warn', txt: '待强化' }
				return { cls: 'brand', txt: '已闭合' }
			}

			return h(
				'div',
				{ style: { display: 'flex', flexDirection: 'column', gap: '15px' } },

				/* 1 · 页头 */
				h(
					'div',
					{ className: 'lawu-page-hd' },
					h('div', null, h('h1', { className: 'lawu-serif' }, '案件逻辑分析'), h('p', null, '请求权基础检索 → 规范要件解构 → 三段论涵摄 → 正反论证 → 谬误识别')),
					h(
						'div',
						{ className: 'lawu-hd-right' },
						h('span', { className: 'lawu-tag ' + (elements.length === 0 ? 'outline' : openItems.length === 0 ? 'brand' : 'warn') }, elements.length === 0 ? '待分析' : openItems.length === 0 ? '分析完成' : '要件待闭合'),
						total > 0 ? h('span', { className: 'lawu-tag outline' }, '采分点 ' + got + '/' + total) : null,
					),
				),

				/* 2 · 案情与事实追问 */
				h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon('filetext', 16), h('span', { className: 'lawu-card-tt' }, '案情与事实追问'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, '事实 ' + facts.length + ' 条'))),
					h(
						'div',
						{ className: 'lawu-card-body' },
						h('p', { style: { fontSize: '13px', lineHeight: '1.8', color: 'var(--lx-ink-2)', margin: 0 } }, record.summary || '（未填案情摘要 —— 让明律先把案情落成卷宗）'),
						h('div', { className: 'lawu-h2', style: { margin: '14px 0 10px' } }, Icon('messages', 14), '多轮事实追问'),
						h(
							'div',
							{ style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px' } },
							confirmed.map(function (f, i) {
								return h('span', { key: 'c' + i, style: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--lx-ink-2)' } }, Icon('check', 15), clip(f.text, 26))
							}),
							unconfirmed.map(function (f, i) {
								return h('span', { key: 'u' + i, style: { display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: 'var(--state-warning)', border: '1px dashed var(--state-warning)', background: 'var(--state-warning-soft)', borderRadius: 'var(--lx-r-pill)', padding: '4px 11px' } }, Icon('warn', 14), clip(f.text, 24), h('span', { className: 'lawu-tag warn' }, '待确认'))
							}),
							openItems.map(function (e, i) {
								return h('span', { key: 'o' + i, style: { display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: 'var(--state-warning)', border: '1px dashed var(--state-warning)', background: 'var(--state-warning-soft)', borderRadius: 'var(--lx-r-pill)', padding: '4px 11px' } }, Icon('warn', 14), e.name, h('span', { className: 'lawu-tag warn' }, sid(e.status)))
							}),
							confirmed.length + unconfirmed.length + openItems.length === 0 ? h('span', { className: 'lawu-sm lawu-muted' }, '（还没有事实与追问记录）') : null,
						),
					),
				),

				/* 3 · 请求权基础概览 */
				h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon('key', 16), h('span', { className: 'lawu-card-tt' }, '请求权基础概览'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, claimOrder.length + ' 条路径'))),
					h(
						'div',
						{ className: 'lawu-card-body' },
						claimOrder.length === 0
							? h(Empty, null, '还没有请求权基础。让明律按鉴定式顺序做检索与规范要件解构（law_elements action=set）。')
							: h(
									'div',
									{ className: 'lawu-grid cols-3' },
									claimOrder.map(function (c, i) {
										var st = claimState(claims[c])
										var norm = (claims[c].filter(function (e) { return e.norm })[0] || {}).norm || ''
										return h(
											'div',
											{ className: 'lawu-srcbox', key: i },
											h('div', { className: 'lawu-srcbox-hd' }, h('b', null, c), h('span', { className: 'lawu-tag ' + st.cls, style: { marginLeft: 'auto' } }, st.txt)),
											h('span', { style: { fontSize: '12px', color: 'var(--lx-ink-3)' } }, claims[c].length + ' 项要件 · 已满足 ' + claims[c].filter(function (e) { return e.status === '满足' }).length),
											norm ? h('div', { className: 'lawu-quote lawu-serif', style: { fontSize: '12px', lineHeight: '1.7', padding: '8px 11px' } }, h('span', { className: 'lawu-q-tt lawu-mono' }, norm)) : null,
										)
									}),
								),
					),
				),

				/* 4 · 构成要件拆解 */
				h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon('listchecks', 16), h('span', { className: 'lawu-card-tt' }, '构成要件拆解'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, elements.length + ' 项'))),
					h(
						'div',
						{ className: 'lawu-card-body' },
						claimOrder.length === 0
							? h(Empty, null, '（还没有要件清单）')
							: [
									h(
										'div',
										{ className: 'lawu-tabs', key: 'tabs' },
										claimOrder.map(function (c) {
											return h('button', { key: c, type: 'button', className: activeTab === c ? 'is-active' : '', onClick: function () { setTab(c) } }, c)
										}),
									),
									h(
										'div',
										{ key: 'list' },
										active.map(function (e, i) {
											var k = statusClass(e.status)
											return h(
												'div',
												{ className: 'lawu-elem', key: e.id || i },
												h('span', { className: 'lawu-elem-ic ' + k }, Icon(k === 'ok' ? 'check' : 'warn', 12)),
												h(
													'div',
													null,
													h('b', null, e.name),
													h('p', null, (e.level ? e.level + ' · ' : '') + (e.factRef || e.note || '（未记事实指向）')),
													h('span', { className: 'lawu-tag ' + (k === 'ok' ? 'succ' : k === 'miss' ? 'err' : 'warn') }, sid(e.status)),
												),
											)
										}),
									),
								],
					),
				),

				/* 5 · 三段论涵摄 */
				h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon('gitfork', 16), h('span', { className: 'lawu-card-tt' }, '三段论涵摄')),
					h(
						'div',
						{ className: 'lawu-card-body' },
						syllogisms.length === 0
							? h(Empty, null, '还没有三段论。让明律对每条请求权做一次涵摄（law_analysis kind=syllogism）。')
							: syllogisms.map(function (s, i) {
									return h(
										'div',
										{ key: i, style: i > 0 ? { marginTop: '16px' } : null },
										h('div', { style: { fontSize: '12.5px', fontWeight: 600, color: 'var(--lx-ink)', marginBottom: '8px' } }, s.title || '三段论 ' + (i + 1)),
										h(
											'div',
											{ className: 'lawu-syl' },
											h('div', { className: 'lawu-syl-node' }, h('span', { className: 'lawu-syl-tag' }, '大前提 · 法律规范'), h('p', null, s.majorPremise)),
											h('div', { className: 'lawu-syl-arrow' }, Icon('arrow', 18)),
											h('div', { className: 'lawu-syl-node' }, h('span', { className: 'lawu-syl-tag' }, '小前提 · 案件事实'), h('p', null, s.minorPremise)),
											h('div', { className: 'lawu-syl-arrow' }, Icon('arrow', 18)),
											h('div', { className: 'lawu-syl-node' }, h('span', { className: 'lawu-syl-tag' }, '结论 · 法律效果'), h('p', null, s.conclusion)),
										),
										(s.gaps || []).length > 0 ? h('div', { className: 'lawu-check warn', style: { marginTop: '8px' } }, Icon('warn', 15), h('span', null, '逻辑缺口', h('span', { className: 'lawu-chk-note' }, (s.gaps || []).join('；')))) : null,
									)
								}),
					),
				),

				/* 6 · 争议焦点与双方主张 */
				h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon('scale', 16), h('span', { className: 'lawu-card-tt' }, '争议焦点与双方主张'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, focusList.length + ' 项焦点'))),
					h(
						'div',
						{ className: 'lawu-card-body' },
						focusList.length > 0 ? h('div', { className: 'lawu-dotlist', style: { marginBottom: '14px' } }, focusList.map(function (f, i) { return h('span', { key: i }, Icon('dot', 14), f) })) : null,
						args.length === 0
							? h(Empty, null, '还没有正反观点论证。让明律对每个争议焦点做正反学说论证（law_analysis kind=argument）。')
							: h(
									'div',
									{ className: 'lawu-grid' },
									args.map(function (a, i) {
										var mine = i % 2 === 0
										return h(
											'div',
											{ className: mine ? 'lawu-soft-brand' : 'lawu-soft-warn', key: i },
											h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } }, Icon(mine ? 'flag' : 'shield', 15), h('b', { style: { fontSize: '13px', color: 'var(--lx-ink)' } }, a.stance || (mine ? '一方主张' : '对方抗辩'))),
											h(
												'div',
												{ className: 'lawu-dotlist' },
												h('span', null, Icon(mine ? 'dot' : 'ban', 14), a.proposition),
												(a.grounds || []).map(function (g, j) { return h('span', { key: j }, Icon(mine ? 'dot' : 'ban', 14), g) }),
												a.rebuttal ? h('span', null, Icon('dot', 14), '对方可能反驳：' + a.rebuttal) : null,
											),
										)
									}),
								),
					),
				),

				/* 7 · 逻辑谬误校验 */
				h(
					'section',
					{ className: 'lawu-card flush', style: { borderLeft: '3px solid var(--state-warning)' } },
					h('div', { className: 'lawu-card-hd' }, Icon('warn', 16), h('span', { className: 'lawu-card-tt' }, '逻辑谬误校验'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag ' + (fallacies.length ? 'warn' : 'outline') }, fallacies.length ? fallacies.length + ' 处待改' : '未发现'))),
					h(
						'div',
						{ className: 'lawu-card-body', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
						fallacies.length === 0
							? h('div', { className: 'lawu-sm lawu-muted' }, '（未记录谬误 —— 让明律对你的作答与文书做一次逻辑复盘，law_review）')
							: fallacies.map(function (x, i) {
									return h(
										'div',
										{ key: i, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
										x.target ? h('div', { className: 'lawu-quote lawu-serif', style: { borderLeftColor: 'var(--state-warning)', background: 'var(--state-warning-soft)' } }, h('span', { className: 'lawu-q-tt', style: { color: 'var(--state-warning)' } }, (x.kind || '待改') + ' · ' + x.target)) : null,
										x.explanation ? h('p', { style: { margin: 0, fontSize: '13px', lineHeight: '1.8', color: 'var(--lx-ink-2)' } }, h('span', { className: 'lawu-strong' }, '问题解析：'), x.explanation) : null,
										x.fix ? h('div', { className: 'lawu-soft-brand', style: { display: 'flex', gap: '9px', alignItems: 'flex-start', padding: '10px 13px' } }, Icon('lightbulb', 15), h('p', { style: { margin: 0, fontSize: '12.5px', lineHeight: '1.7', color: 'var(--lx-ink-2)' } }, h('span', { className: 'lawu-strong' }, '正确表述建议：'), x.fix)) : null,
									)
								}),
					),
				),

				/* 8 · 五大联动 */
				h(Actions, {
					ctx: props.ctx,
					title: '引擎联动',
					items: [
						{ label: '习题训练', desc: '改编为主观题，要件即采分点', ic: 'pen', text: '请把本案改编成一道主观题（law_drill action=generate），采分点取自本案要件清单。' },
						{ label: '文书练习', desc: '填充起诉状 / 辩护词框架', ic: 'scroll', text: '请按本案要件与时间线生成一份文书练习框架（law_document action=frame）。' },
						{ label: '论文辅助', desc: '生成大纲与核心论点', ic: 'cap', text: '请围绕本案争议焦点生成论文大纲与核心论点（law_paper action=outline）。' },
						{ label: '庭审模拟', desc: '载入争议焦点开庭', ic: 'gavel', text: '请载入本案争议焦点与要件开庭（law_moot action=start role=被告代理人）。' },
						{ label: '背诵题库', desc: '按要件生成卡片', ic: 'layers', text: '请用本案要件生成背诵卡（law_flashcards action=from_case）。' },
					],
				}),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		function SecDrills(props) {
			var record = props.data.case
			if (!record) return h(Empty, null, '还没有案件卷宗 —— 习题需要一份案情或要件清单来生成采分点。')
			var drills = record.drills || []
			var elements = record.elements || []

			/** 作答数据：按已批改的题统计 */
			var graded = drills.filter(function (d) { return d.score != null })
			var sumScore = graded.reduce(function (a, d) { return a + Number(d.score || 0) }, 0)
			var sumTotal = graded.reduce(function (a, d) { return a + Number(d.totalPoints || 0) }, 0)
			var avg = graded.length > 0 && sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : null

			/** 考点法条：本案要件用到的规范依据 */
			var norms = []
			elements.forEach(function (e) {
				String(e.norm || '')
					.split(/[；;]/)
					.forEach(function (t) {
						var s = t.trim()
						if (s && norms.indexOf(s) < 0) norms.push(s)
					})
			})

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '刷题训练'),
				h('div', { className: 'lawu-sub' }, '主观题 / 客观题 · 采分点取自本案要件清单 · 批改后自动归集错题'),
				h('div', { className: 'lawu-rule' }),

				drills.length === 0
					? h(Empty, null, '本案还没有生成过题目。点下面的按钮，让明律用本案要件清单做采分点标准答案，出一道主观题。')
					: drills.map(function (d, i) {
							var pct = d.score != null && d.totalPoints ? Math.round((Number(d.score) / Number(d.totalPoints)) * 100) : null
							var rows = (d.points || []).map(function (p, j) {
								var g = (d.gradedPoints || []).find(function (x) { return x.text === p.text })
								return [String(j + 1), p.text, p.points ? String(p.points) + ' 分' : '—', g ? (g.got ? '✅ 已拿' : '❌ 漏') : '—', g && g.note ? g.note : '']
							})
							return h(
								'div',
								{ key: i, style: { display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' } },

								/* 案情与问题 */
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('filetext', 16), h('span', { className: 'lawu-card-tt' }, '案情与问题'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag brand' }, d.kind || '主观题'), pct != null ? h('span', { className: 'lawu-tag ' + (pct >= 80 ? 'succ' : pct >= 60 ? 'warn' : 'err') }, '得分 ' + d.score + ' / ' + d.totalPoints) : null)),
									h('div', { className: 'lawu-card-body' }, h('pre', { className: 'lawu-pre' }, d.question || '（题干缺失）')),
								),

								/* 我的作答 */
								d.myAnswer
									? h(
											'section',
											{ className: 'lawu-card flush' },
											h('div', { className: 'lawu-card-hd' }, Icon('pen', 16), h('span', { className: 'lawu-card-tt' }, '我的作答')),
											h('div', { className: 'lawu-card-body' }, h('pre', { className: 'lawu-pre' }, d.myAnswer)),
										)
									: h(
											'section',
											{ className: 'lawu-card flush' },
											h('div', { className: 'lawu-card-hd' }, Icon('pen', 16), h('span', { className: 'lawu-card-tt' }, '我的作答')),
											h('div', { className: 'lawu-card-body' }, h('div', { className: 'lawu-sm lawu-muted' }, '（还没作答 —— 在会话里写完，让明律按采分点批改）')),
										),

								/* 采分点速览 */
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('listchecks', 16), h('span', { className: 'lawu-card-tt' }, '采分点速览'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, (d.points || []).length + ' 点'))),
									h('div', { className: 'lawu-card-body' }, h(Table, { cols: ['#', '采分点', '分值', '批改', '说明'], rows: rows })),
								),
							)
						}),

				/* 作答数据 / 考点法条（设计稿右栏两张卡） */
				drills.length === 0
					? null
					: h(
							'div',
							{ className: 'lawu-grid cols-3', style: { marginTop: '6px' } },
							h(
								'section',
								{ className: 'lawu-card flush' },
								h('div', { className: 'lawu-card-hd' }, Icon('scale', 16), h('span', { className: 'lawu-card-tt' }, '作答数据')),
								h(
									'div',
									{ className: 'lawu-card-body' },
									h('div', { className: 'lawu-stat3' },
										h('span', null, h('b', null, String(drills.length)), '题数'),
										h('span', null, h('b', null, String(graded.length)), '已批改'),
										h('span', null, h('b', null, avg == null ? '—' : avg + '%'), '平均得分率'),
									),
									avg != null ? h('div', { className: 'lawu-progress', style: { marginTop: '10px' } }, h('i', { style: { width: avg + '%' } })) : null,
								),
							),
							h(
								'section',
								{ className: 'lawu-card flush' },
								h('div', { className: 'lawu-card-hd' }, Icon('library', 16), h('span', { className: 'lawu-card-tt' }, '考点法条')),
								h(
									'div',
									{ className: 'lawu-card-body' },
									norms.length === 0
										? h('div', { className: 'lawu-sm lawu-muted' }, '（本案还没有规范依据）')
										: norms.map(function (n, i) {
												return h('div', { className: 'lawu-law', key: i }, h('code', null, n), h('p', null, elements.filter(function (e) { return String(e.norm || '').indexOf(n) >= 0 }).map(function (e) { return e.name }).join(' / ')))
											}),
								),
							),
							h(
								'section',
								{ className: 'lawu-card flush' },
								h('div', { className: 'lawu-card-hd' }, Icon('gitfork', 16), h('span', { className: 'lawu-card-tt' }, '同考点推荐')),
								h(
									'div',
									{ className: 'lawu-card-body' },
									elements.filter(function (e) { return e.status !== '满足' }).length === 0
										? h('div', { className: 'lawu-sm lawu-muted' }, '（本案要件已全部闭合，可换案训练）')
										: elements
												.filter(function (e) { return e.status !== '满足' })
												.slice(0, 5)
												.map(function (e, i) {
													var k = statusClass(e.status)
													return h('div', { className: 'lawu-check ' + k, key: i }, Icon(k === 'ok' ? 'check' : 'warn', 15), h('span', null, e.name, h('span', { className: 'lawu-chk-note' }, '建议再练这个要件的题')))
												}),
								),
							),
						),

				h(
					'div',
					{ style: { marginTop: '15px' } },
					h(Actions, {
						ctx: props.ctx,
						title: '应试场景',
						items: [
							{ label: '把本案编成主观题', desc: '采分点自动取本案要件', ic: 'pen', text: '请把当前案件改编成一道主观题（law_drill action=generate），采分点自动取本案要件清单。' },
							{ label: '逻辑复盘我的作答', desc: '三段论 / 要件 / 法条适配', ic: 'listchecks', text: '请对我最近一次作答做逻辑复盘（law_review kind=drill），逐项检查三段论结构、要件完整性、法条适配性。' },
							{ label: '今天该重做哪些错题', desc: '按到期顺序带我重做', ic: 'rotate', text: '请看我错题本里今天该重做的题（law_wrongbook action=list due=true），带我一题一题重做。' },
						],
					}),
				),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		function SecDocs(props) {
			var record = props.data.case
			var kindState = React.useState('')
			var kind = kindState[0]
			var setKind = kindState[1]
			if (!record) return h(Empty, null, '还没有案件卷宗 —— 文书练习要挂在本案要件与事实上。')

			var elements = record.elements || []
			var facts = record.facts || []
			var documents = record.documents || []
			// 文书类型必须是 preset `DOC_TEMPLATES` 的键：law_document 的 type 是 enum，
			// 传它不认识的值会被 schema 直接拒掉。上一版我自作主张编了「民事起诉状」等名字，
			// 与模板表不一致（模板表用「起诉状」，且原本没有「起诉书」—— 已在 preset 侧补上）。
			var isCriminal = String(record.subject || '').indexOf('刑') >= 0
			var kinds = isCriminal ? ['起诉书', '公诉意见书', '辩护词'] : ['起诉状', '答辩状', '代理词']
			var activeKind = kinds.indexOf(kind) >= 0 ? kind : kinds[0]
			var latest = documents.length > 0 ? documents[documents.length - 1] : null
			var checks = latest ? latest.checks || [] : []

			/** 从要件清单携带：请求权基础 / 规范依据 */
			var claims = []
			var norms = []
			elements.forEach(function (e) {
				var c = e.claim || ''
				if (c && claims.indexOf(c) < 0) claims.push(c)
				String(e.norm || '')
					.split(/[；;]/)
					.forEach(function (t) {
						var s = t.trim()
						if (s && norms.indexOf(s) < 0) norms.push(s)
					})
			})
			var focusList = String(record.focus || '').split(/[；;]/).map(function (t) { return t.trim() }).filter(Boolean)
			var parties = String(record.parties || '').split(/[;；]/).map(function (t) { return t.trim() }).filter(Boolean)

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '法律文书练习'),
				h('div', { className: 'lawu-sub' }, '框架自动填充本案请求权基础与时间线 · 产出均为练习稿，不可用于实务'),
				h('div', { className: 'lawu-rule' }),

				/* 1 · 上下文携带条 */
				h(
					'div',
					{ className: 'lawu-carry' },
					Icon('filetext', 15),
					h('span', null, '已从逻辑分析携带：请求权基础 ' + claims.length + ' 项 · 争议焦点 ' + focusList.length + ' 项 · 要件 ' + elements.length + ' 项'),
					h('span', { className: 'lawu-tag brand' }, record.title),
				),

				h(
					'div',
					{ className: 'lawu-doc-wrap' },

					/* 2 · 文书类型 */
					h(
						'div',
						{ className: 'lawu-docbar' },
						h(
							'span',
							{ className: 'lawu-seg' },
							kinds.map(function (k) {
								return h('button', { key: k, type: 'button', className: activeKind === k ? 'is-on' : '', onClick: function () { setKind(k) } }, k)
							}),
						),
						h('span', { className: 'lawu-docbar-hint' }, Icon('pen', 14), '浅色为逻辑引擎自动带入，虚线处待填写'),
					),

					/* 3 · 文书纸 */
					h(
						'article',
						{ className: 'lawu-doc' },
						h('h2', null, activeKind),
						parties.length === 0
							? h('p', null, '当事人：', h('span', { className: 'lawu-doc-blank' }))
							: parties.map(function (p, i) {
									return h('p', { key: i }, p, '：', h('span', { className: 'lawu-doc-blank' }))
								}),
						h('h3', null, '事实与理由'),
						h('p', null, h('span', { className: 'lawu-doc-fill' }, record.summary || '（本案案情摘要待补 —— 让明律先把案情落成卷宗）')),
						h('h3', null, '证据与法律依据'),
						h('p', null, h('span', { className: 'lawu-doc-fill' }, facts.length > 0 ? facts.map(function (f) { return f.text }).join('；') : '（本案事实待补）')),
						h('p', null, h('span', { className: 'lawu-doc-fill' }, norms.length > 0 ? norms.join('；') : '（本案规范依据待补）')),
						h('h3', null, '请求与主张'),
						h('p', null, focusList.length > 0 ? focusList.map(function (f, i) { return h('span', { key: i }, '（' + (i + 1) + '）' + f, ' ') }) : h('span', { className: 'lawu-doc-blank' })),
						h('p', { style: { textIndent: '2em', marginTop: '16px' } }, '此致'),
						h('p', { style: { textIndent: '2em' } }, h('span', { className: 'lawu-doc-blank' }), '人民法院'),
						h('p', { className: 'lawu-doc-meta', style: { marginTop: '22px' } }, '具状人：', h('span', { className: 'lawu-doc-blank' })),
						h('p', { className: 'lawu-doc-meta' }, '练习稿 · 仅用于学习，不可用于实务'),
					),

					/* 4 · 底部操作行 */
					h(
						'div',
						{ className: 'lawu-doc-actions' },
						h(Btn, { onClick: function () { props.ctx.send('请用当前案件的请求权基础、争议焦点与要件清单，给我' + activeKind + '的练习框架并逐段提示写法（law_document action=template type=' + activeKind + '）。') } }, '按本案填充框架'),
						h(Btn, { onClick: function () { props.ctx.send('请对我最近一份文书练习稿做论证逻辑检查（law_document action=check），逐维度给结论并指出具体段落。') } }, '提交校验'),
						h('span', { className: 'lawu-spacer' }),
						h('span', { className: 'lawu-tag outline' }, documents.length + ' 份练习稿'),
					),
				),

				/* 5 · 三张面板（设计稿右栏：校验清单 / 要素映射 / 法条速查） */
				h(
					'div',
					{ className: 'lawu-grid cols-3', style: { marginTop: '15px' } },
					h(
						'section',
						{ className: 'lawu-card flush' },
						h('div', { className: 'lawu-card-hd' }, Icon('listchecks', 16), h('span', { className: 'lawu-card-tt' }, '文书校验清单')),
						h(
							'div',
							{ className: 'lawu-card-body' },
							checks.length === 0
								? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有校验记录 —— 写完点「提交校验」）')
								: checks.map(function (c, i) {
										return h('div', { className: 'lawu-check ' + (c.ok ? 'ok' : 'warn'), key: i }, Icon(c.ok ? 'check' : 'warn', 15), h('span', null, c.dim, c.note ? h('span', { className: 'lawu-chk-note' }, c.note) : null))
									}),
						),
					),
					h(
						'section',
						{ className: 'lawu-card flush' },
						h('div', { className: 'lawu-card-hd' }, Icon('gitfork', 16), h('span', { className: 'lawu-card-tt' }, '要素映射')),
						h(
							'div',
							{ className: 'lawu-card-body' },
							elements.length === 0
								? h('div', { className: 'lawu-sm lawu-muted' }, '（本案还没有要件清单）')
								: elements.map(function (e, i) {
										var k = statusClass(e.status)
										return h('div', { className: 'lawu-check ' + k, key: e.id || i }, Icon(k === 'ok' ? 'check' : 'warn', 15), h('span', null, e.name, h('span', { className: 'lawu-chk-note' }, e.factRef || '（未记事实指向）')))
									}),
						),
					),
					h(
						'section',
						{ className: 'lawu-card flush' },
						h('div', { className: 'lawu-card-hd' }, Icon('library', 16), h('span', { className: 'lawu-card-tt' }, '法条速查')),
						h(
							'div',
							{ className: 'lawu-card-body' },
							norms.length === 0
								? h('div', { className: 'lawu-sm lawu-muted' }, '（本案还没有规范依据）')
								: norms.map(function (n, i) {
										return h(
											'div',
											{ className: 'lawu-law', key: i },
											h('code', null, n),
											h('p', null, elements.filter(function (e) { return String(e.norm || '').indexOf(n) >= 0 }).map(function (e) { return e.name }).join(' / ')),
										)
									}),
						),
					),
				),

				h(
					'div',
					{ style: { marginTop: '15px' } },
					h(Actions, {
						ctx: props.ctx,
						title: '文书联动',
						items: [
							{ label: '写' + kinds[0], desc: '框架自动填充要件与时间线', ic: 'scroll', text: '请用当前案件的请求权基础、争议焦点与要件清单，给我' + kinds[0] + '的练习框架并逐段提示写法（law_document action=template type=' + kinds[0] + '）。' },
							{ label: '论证逻辑检查', desc: '逐维度检查我的练习稿', ic: 'listchecks', text: '请对我最近一份文书练习稿做论证逻辑检查（law_document action=check），逐维度给结论并指出具体段落。' },
							{ label: '改写' + kinds[2], desc: '按庭审争议焦点组织', ic: 'gavel', text: '请按本案庭审争议焦点，给我' + kinds[2] + '的练习框架（law_document action=template type=' + kinds[2] + '）。' },
						],
					}),
				),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		function SecPapers(props) {
			var record = props.data.case
			if (!record) return h(Empty, null, '还没有案件卷宗 —— 论文辅助从案卷的要件与学说争议出发。')
			var papers = record.papers || []
			var elements = record.elements || []
			var args = record.arguments || []
			var focusList = String(record.focus || '').split(/[；;]/).map(function (t) { return t.trim() }).filter(Boolean)
			var norms = []
			elements.forEach(function (e) {
				String(e.norm || '')
					.split(/[；;]/)
					.forEach(function (t) {
						var s = t.trim()
						if (s && norms.indexOf(s) < 0) norms.push(s)
					})
			})
			var latest = papers.length > 0 ? papers[papers.length - 1] : null
			var outline = latest ? latest.outline || [] : []
			var theses = latest ? latest.theses || [] : []
			var sources = latest ? latest.sources || [] : []
			var citeIssues = latest ? latest.citeIssues || [] : []

			/** 学术规范清单（静态清单 + 本案可核项） */
			var SPECS = [
				['引用格式统一', citeIssues.length === 0 ? '（未记录问题）' : citeIssues.join('；')],
				['不代写正文', '本模块只产出大纲、论点与逻辑纠错'],
				['主张有出处', '每个论点配代表文献或指导性案例'],
				['区分己见与通说', '明确标注「本文认为」与「主流说」'],
			]

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '论文 / 课程作业辅助'),
				h('div', { className: 'lawu-sub' }, '只做大纲、论点、学说争议与逻辑纠错 —— 不代写正文'),
				h('div', { className: 'lawu-rule' }),

				/* 从案卷携带 */
				h(
					'div',
					{ className: 'lawu-carry' },
					Icon('cap', 15),
					h('span', null, '已从案卷携带：争议焦点 ' + focusList.length + ' 项 · 正反论点 ' + args.length + ' 条 · 要件 ' + elements.length + ' 项 · 规范依据 ' + norms.length + ' 条'),
					h('span', { className: 'lawu-tag brand' }, record.subject || '—'),
				),

				papers.length === 0
					? h(Empty, null, '还没有论文工作稿。让明律用本案的学说争议起一个大纲（law_paper action=outline）。')
					: h(
							'div',
							{ style: { display: 'flex', flexDirection: 'column', gap: '15px' } },

							/* 选题 */
							h(
								'section',
								{ className: 'lawu-card flush' },
								h('div', { className: 'lawu-card-hd' }, Icon('lightbulb', 16), h('span', { className: 'lawu-card-tt' }, '选题'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag brand' }, '问题导向'))),
								h(
									'div',
									{ className: 'lawu-card-body' },
									h('div', { style: { fontSize: '15px', fontWeight: 600, color: 'var(--lx-ink)', lineHeight: 1.6 } }, latest.title || '（未命名选题）'),
									focusList.length > 0
										? h('div', { className: 'lawu-dotlist', style: { marginTop: '10px' } }, focusList.map(function (f, i) { return h('span', { key: i }, Icon('dot', 14), f) }))
										: null,
									h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '8px' } }, '标题避免「浅析」「初探」这类空词；从司法实践或学说分歧切入，说清争议是什么。'),
								),
							),

							/* 论文大纲 + 写作进度 */
							h(
								'div',
								{ style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '14px', alignItems: 'start' } },
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('scroll', 16), h('span', { className: 'lawu-card-tt' }, '论文大纲'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, outline.length + ' 节'))),
									h(
										'div',
										{ className: 'lawu-card-body' },
										outline.length === 0
											? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有大纲）')
											: outline.map(function (o, i) {
													return h('div', { className: 'lawu-check ok', key: i }, Icon('check', 15), h('span', null, (i + 1) + '. ' + o))
												}),
										h(
											'div',
											{ className: 'lawu-card-ft' },
											h(Btn, { onClick: function () { props.ctx.send('请基于本案已记录的正反论证与学说分歧，给我一份课程论文大纲（law_paper action=outline），并把可用的论点与检索方向一并给出。') } }, '按本案重出大纲'),
										),
									),
								),
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('rotate', 16), h('span', { className: 'lawu-card-tt' }, '写作进度')),
									h(
										'div',
										{ className: 'lawu-card-body' },
										h('div', { className: 'lawu-stat3' },
											h('span', null, h('b', null, String(outline.length)), '大纲节数'),
											h('span', null, h('b', null, String(theses.length)), '核心论点'),
											h('span', null, h('b', null, String(sources.length)), '检索方向'),
										),
										h('div', { className: 'lawu-progress', style: { marginTop: '10px' } }, h('i', { style: { width: Math.min(100, outline.length * 12) + '%' } })),
										h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '8px' } }, '进度只反映结构完成度；正文由你自己写，本模块不代写。'),
									),
								),
							),

							/* 核心论点与正反论证 */
							h(
								'section',
								{ className: 'lawu-card flush' },
								h('div', { className: 'lawu-card-hd' }, Icon('scale', 16), h('span', { className: 'lawu-card-tt' }, '核心论点与正反论证')),
								h(
									'div',
									{ className: 'lawu-card-body' },
									theses.length > 0
										? h('div', { className: 'lawu-dotlist', style: { marginBottom: '14px' } }, theses.map(function (t, i) { return h('span', { key: i }, Icon('flag', 14), t) }))
										: h('div', { className: 'lawu-sm lawu-muted' }, '（还没有核心论点）'),
									args.length > 0
										? h(
												'div',
												{ className: 'lawu-grid' },
												args.map(function (a, i) {
													var mine = i % 2 === 0
													return h(
														'div',
														{ className: mine ? 'lawu-soft-brand' : 'lawu-soft-warn', key: i },
														h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } }, Icon(mine ? 'flag' : 'shield', 15), h('b', { style: { fontSize: '13px', color: 'var(--lx-ink)' } }, a.stance || (mine ? '本文立场' : '可能反驳'))),
														h('div', { className: 'lawu-dotlist' },
															h('span', null, Icon(mine ? 'dot' : 'ban', 14), a.proposition),
															(a.grounds || []).map(function (g, j) { return h('span', { key: j }, Icon(mine ? 'dot' : 'ban', 14), g) }),
															a.rebuttal ? h('span', null, Icon('dot', 14), '需要回应的最强反驳：' + a.rebuttal) : null,
														),
													)
												}),
											)
										: h('div', { className: 'lawu-sm lawu-muted' }, '（还没有正反论证 —— 让明律对每个争议焦点做一次）'),
								),
							),

							/* 全文论证校验 + 学术规范清单 + 推荐文献方向 */
							h(
								'div',
								{ className: 'lawu-grid cols-3' },
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('listchecks', 16), h('span', { className: 'lawu-card-tt' }, '全文论证校验')),
									h(
										'div',
										{ className: 'lawu-card-body' },
										citeIssues.length === 0
											? h('div', { className: 'lawu-sm lawu-muted' }, '（未记录问题 —— 让明律对草稿做一次逻辑校验）')
											: citeIssues.map(function (c, i) { return h('div', { className: 'lawu-check warn', key: i }, Icon('warn', 15), h('span', null, c)) }),
									),
								),
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('bookmarked', 16), h('span', { className: 'lawu-card-tt' }, '学术规范清单')),
									h(
										'div',
										{ className: 'lawu-card-body' },
										SPECS.map(function (p, i) {
											return h('div', { className: 'lawu-check ok', key: i }, Icon('check', 15), h('span', null, p[0], h('span', { className: 'lawu-chk-note' }, p[1])))
										}),
									),
								),
								h(
									'section',
									{ className: 'lawu-card flush' },
									h('div', { className: 'lawu-card-hd' }, Icon('library', 16), h('span', { className: 'lawu-card-tt' }, '推荐文献方向')),
									h(
										'div',
										{ className: 'lawu-card-body' },
										sources.length === 0
											? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有检索方向）')
											: sources.map(function (s, i) { return h('div', { className: 'lawu-law', key: i }, h('code', null, '检索'), h('p', null, s)) }),
									),
								),
							),
						),

				h(
					'div',
					{ style: { marginTop: '15px' } },
					h(Actions, {
						ctx: props.ctx,
						title: '学业场景',
						items: [
							{ label: '起论文大纲', desc: '基于本案学说争议', ic: 'cap', text: '请基于本案已记录的正反论证与学说分歧，给我一份课程论文大纲（law_paper action=outline），并把可用的论点与检索方向一并给出。' },
							{ label: '找可写的争议点', desc: '每点给论证路径与反驳', ic: 'lightbulb', text: '请基于本案要件与学说分歧，帮我拓展 2–3 个可写的论文争议点，并说明每一点的论证路径与可能的反驳。' },
							{ label: '校验草稿论证', desc: '只纠错，不代写', ic: 'listchecks', text: '请对我在下面贴出的论文草稿做论证逻辑校验，指出循环论证、要件偷换、因果断裂与法条适用错误，并给出修改方向（不要代写正文）。' },
						],
					}),
				),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		/** 庭审模拟：可选角色（与 law_moot 的 role 取值一致） */
		var ROLES = ['原告代理人', '被告代理人', '辩护人', '公诉人', '法官']
		var MOOT_PHASES = ['法庭调查', '举证质证', '法庭辩论', '最后陈述']

		/** 发言人 → 气泡归属：审判长/法官走居中条，学生本人走左侧，其余算对方 AI */
		function speakerKind(speaker) {
			var s = String(speaker || '')
			if (s.indexOf('审判长') >= 0 || s.indexOf('法官') >= 0) return 'judge'
			if (s.indexOf('我') === 0 || s.indexOf('我方') >= 0) return 'mine'
			return 'opp'
		}

		/** 事实来源的显示名（与 preset tools.js 的用词保持一致） */
		function factSourceLabel(source) {
			return { user: '学生陈述', question: '追问确认', assumption: '假设' }[String(source)] || String(source || '未标注')
		}

		function statusClass(st) {
			if (st === '满足') return 'ok'
			if (st === '不满足' || st === '缺失') return 'miss'
			return 'warn'
		}

		function SecMoot(props) {
			var record = props.data.case
			var tabState = React.useState('hearing')
			var tab = tabState[0]
			var setTab = tabState[1]
			var roleState = React.useState(ROLES[1])
			var activeRole = roleState[0]
			var setRole = roleState[1]
			var obState = React.useState(true)
			var openBook = obState[0]
			var setOpenBook = obState[1]
			var sayState = React.useState('')
			var say = sayState[0]
			var setSay = sayState[1]
			if (!record) return h(Empty, null, '还没有案件卷宗 —— 庭审模拟需要一份卷宗（要件清单就是辩论的靶子）。')

			var phases = MOOT_PHASES
			var sessions = record.moot || []
			var session = sessions.length > 0 ? sessions[sessions.length - 1] : null
			var transcript = (session && session.transcript) || []
			var elements = record.elements || []
			var facts = record.facts || []
			var timeline = record.timeline || []
			var phase = session && session.phase ? session.phase : phases[0]
			var phaseIdx = Math.max(0, phases.indexOf(phase))

			/** 待辩论要件 = 非「满足」的要件（需在庭上立住/补强的） */
			var openItems = elements.filter(function (e) { return e.status !== '满足' })
			/** 对方抗辩思路 = 要件清单里的抗辩 / 再抗辩层 */
			var defenses = elements.filter(function (e) { return e.level === '抗辩' || e.level === '再抗辩' })
			/** 可用法条 = 从要件的 norm 聚合（同一法条只出现一次）
			 *  只按「；」拆：规范依据里的「、」是并列、「（）」是括注，拆开会把一条引用撕成两半。 */
			var normUsers = {}
			elements.forEach(function (e) {
				String(e.norm || '')
					.split(/[；;]/)
					.forEach(function (t) {
						var s = t.trim()
						if (!s) return
						if (!normUsers[s]) normUsers[s] = []
						if (normUsers[s].indexOf(e.name) < 0) normUsers[s].push(e.name)
					})
			})
			var normKeys = Object.keys(normUsers)
			/** 当事人：把「甲（说明）；乙（说明）」拆成角色 + 主体 */
			var parties = String(record.parties || '')
				.split(/[;；]/)
				.map(function (t) { return t.trim() })
				.filter(Boolean)
				.map(function (t) {
					var m = /^(.+?)[（(](.+?)[）)]$/.exec(t)
					return m ? { role: m[2], name: m[1] } : { role: '当事人', name: t }
				})

			function send(text) {
				var body = String(text == null ? '' : text).trim()
				if (body === '') return
				props.ctx.send(body)
			}

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '庭审模拟'),
				h('div', { className: 'lawu-sub' }, '法庭调查 → 举证质证 → 法庭辩论 → 最后陈述 · 单人 AI 对抗演练'),
				h('div', { className: 'lawu-rule' }),

				/* ---------- 顶部控制条：角色 / 模式 / 四阶段 / 操作 ---------- */
				h(
					'div',
					{ className: 'lawu-court-bar' },
					h(
						'div',
						{ className: 'lawu-bar-group' },
						h('span', { className: 'lawu-bar-label' }, '角色'),
						h(
							'span',
							{ className: 'lawu-seg' },
							ROLES.map(function (r) {
								return h(
									'button',
									{
										key: r,
										type: 'button',
										className: activeRole === r ? 'is-on' : '',
										onClick: function () { setRole(r) },
									},
									r,
								)
							}),
						),
					),
					h(
						'div',
						{ className: 'lawu-bar-group' },
						h('span', { className: 'lawu-bar-label' }, '模式'),
						h(
							'span',
							{ className: 'lawu-seg' },
							['开卷', '闭卷'].map(function (m) {
								return h(
									'button',
									{ key: m, type: 'button', className: openBook === (m === '开卷') ? 'is-on' : '', onClick: function () { setOpenBook(m === '开卷') } },
									m,
								)
							}),
						),
					),
					h(
						'div',
						{ className: 'lawu-bar-actions' },
						h(Btn, {
							title: '导出当前庭审场次的笔录',
							onClick: function () { send('请导出当前庭审场次的笔录（law_moot action=record）。') },
						}, '导出笔录'),
						h(Btn, {
							title: '以当前角色重新开庭',
							onClick: function () { send('请以「' + activeRole + '」身份重新开庭（law_moot action=start role=' + activeRole + '），载入本案要件、法条与抗辩思路，你先发言。') },
						}, '重新开庭'),
					),
				),

				/* ---------- 四阶段进度 ---------- */
				h(
					'div',
					{ style: { marginTop: '12px' } },
					h(
						'ol',
						{ className: 'lawu-steps' },
						phases.map(function (ph, i) {
							return h(
								'li',
								{ className: 'lawu-step' + (i === phaseIdx ? ' is-active' : ''), key: ph },
								h('span', { className: 'lawu-step-dot' }, String(i + 1)),
								ph,
								i < phaseIdx ? h('span', { className: 'lawu-tag succ' }, '已过') : null,
							)
						}),
					),
				),

				/* ---------- ≤1200px 的列切换 ---------- */
				h(
					'div',
					{ className: 'lawu-court-tabs' },
					[['dossier', '案卷'], ['hearing', '庭审'], ['assist', '辅助']].map(function (pair) {
						return h(
							'button',
							{ key: pair[0], type: 'button', className: tab === pair[0] ? 'is-active' : '', onClick: function () { setTab(pair[0]) } },
							pair[1],
						)
					}),
				),

				/* ---------- 法庭三列 ---------- */
				h(
					'div',
					{ className: 'lawu-court' },

					/* 左列：案卷 */
					h(
						'aside',
						{ className: 'lawu-dock', 'data-tab-panel': 'dossier' },
						h(
							'section',
							{ className: 'lawu-card' },
							h('div', { className: 'lawu-card-tt' }, '案件概览'),
							h(
								'div',
								null,
								h('div', { className: 'lawu-case-kicker' }, '教学案例 · 非真实受理案件'),
								h('div', { className: 'lawu-case-no' }, record.id),
								parties.map(function (pt, i) {
									return h(
										'div',
										{ className: 'lawu-party', key: i },
										h('span', { className: 'lawu-party-role' }, pt.role),
										h('span', null, pt.name),
									)
								}),
								h(
									'div',
									{ className: 'lawu-case-tags' },
									h('span', { className: 'lawu-tag brand' }, record.subject || '—'),
									h('span', { className: 'lawu-tag outline' }, record.stage || '—'),
								),
							),
						),

						h(
							'section',
							{ className: 'lawu-card' },
							h('div', { className: 'lawu-card-tt' }, '事实时间线'),
							timeline.length === 0
								? h('div', { className: 'lawu-sm lawu-muted' }, '（时间线为空，让明律从事实里提取节点）')
								: h(
										'div',
										{ className: 'lawu-timeline' },
										timeline.map(function (t, i) {
											return h(
												'div',
												{ className: 'lawu-tl', key: i },
												h('time', null, t.at),
												h('div', { className: 'lawu-sm' }, t.event),
											)
										}),
									),
						),

						h(
							'section',
							{ className: 'lawu-card' },
							h(
								'div',
								{ className: 'lawu-card-tt' },
								'事实清单',
								h('span', { className: 'lawu-tag outline', style: { marginLeft: 'auto' } }, facts.length + ' 条'),
							),
							facts.length === 0
								? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有记录事实）')
								: facts.map(function (f, i) {
										return h(
											'div',
											{ className: 'lawu-evi ' + (f.confirmed ? 'ok' : 'warn'), key: i },
											Icon(f.confirmed ? 'check' : 'warn', 15),
											h(
												'span',
												{ className: 'lawu-evi-main' },
												h('span', { className: 'lawu-evi-name' }, f.text),
												h('span', { className: 'lawu-evi-note' }, '来源：' + factSourceLabel(f.source)),
											),
											h('span', { className: 'lawu-tag ' + (f.confirmed ? 'succ' : 'warn') }, f.confirmed ? '已确认' : '待确认'),
										)
									}),
						),
					),

					/* 中列：庭审对话流 */
					h(
						'section',
						{ className: 'lawu-hearing', 'data-tab-panel': 'hearing' },
						h(
							'div',
							{ className: 'lawu-hearing-hd' },
							'庭审记录 · ',
							phase,
							session ? h('span', { className: 'lawu-tag outline', style: { marginLeft: 'auto' } }, session.role) : null,
						),
						h(
							'div',
							{ className: 'lawu-hearing-scroll lawu-scroll' },
							transcript.length === 0
								? h(
										'div',
										{ className: 'lawu-sm lawu-muted', style: { textAlign: 'center', padding: '28px 10px', lineHeight: 1.9 } },
										'还没有开庭记录。',
										h('br'),
										'点上方「重新开庭」，明律会载入本案要件、法条与抗辩思路，由它先发言；',
										h('br'),
										'你也可以直接在下面输入第一段发言。',
									)
								: transcript.map(function (t, i) {
										var kind = speakerKind(t.speaker)
										if (kind === 'judge') {
											return h('div', { className: 'lawu-judge-line', key: i }, Icon('gavel', 14), h('span', null, t.text))
										}
										return h(
											'div',
											{ className: 'lawu-bubble ' + (kind === 'mine' ? 'mine' : 'opp') + (i === transcript.length - 1 ? ' is-current' : ''), key: i },
											h(
												'div',
												{ className: 'lawu-bb-meta' },
												h('span', { className: 'lawu-bb-who' }, t.speaker),
												h('span', { className: 'lawu-bb-time' }, t.phase || ''),
											),
											h('p', null, t.text),
										)
									}),
							session && phaseIdx < phases.length - 1
								? h(
										'div',
										{ className: 'lawu-typing' },
										h('span', { className: 'lawu-dots' }, h('i', null), h('i', null), h('i', null)),
										h('span', null, '对方代理人正在组织抗辩……'),
									)
								: null,
						),
						h(
							'div',
							{ className: 'lawu-composer' },
							h('textarea', {
								rows: 2,
								placeholder: '以「' + activeRole + '」身份发言，围绕待辩论要件展开……',
								value: say,
								onChange: function (e) { setSay(e.target.value) },
							}),
							h(
								'div',
								{ className: 'lawu-composer-row' },
								h(
									Btn,
									{
										title: '取本案辩论辅助面板（要件 / 法条 / 抗辩思路）',
										onClick: function () { send('请给我本案的辩论辅助面板（law_moot action=panel），列出待辩论要件、可用法条、对方可能的抗辩思路。') },
									},
									'要提示',
									h('span', { className: 'lawu-tag outline' }, openBook ? '开卷' : '闭卷'),
								),
								h('span', { className: 'lawu-spacer' }),
								h(
									Btn,
									{
										pri: true,
										disabled: !say.trim(),
										onClick: function () {
											var body = say.trim()
											if (!body) return
											setSay('')
											send('我在庭审模拟中以「' + activeRole + '」身份发言（当前阶段：' + phase + '）：' + body + '\n请用 law_moot action=turn 记录这一轮，并从要件层面给出反馈（我漏了哪个要件、对方最强论点是什么）。')
										},
									},
									'发表辩论意见',
								),
							),
						),
					),

					/* 右列：辩论辅助 */
					h(
						'aside',
						{ className: 'lawu-dock', 'data-tab-panel': 'assist' },
						h(
							'section',
							{ className: 'lawu-card' },
							h(
								'div',
								{ className: 'lawu-card-tt' },
								'待辩论要件',
								h('span', { className: 'lawu-tag brand', style: { marginLeft: 'auto' } }, openItems.length + ' 项未闭合'),
							),
							elements.length === 0
								? h('div', { className: 'lawu-sm lawu-muted' }, '（本案还没有要件清单 —— 让明律先做规范要件解构）')
								: elements.map(function (e, i) {
										var k = statusClass(e.status)
										return h(
											'div',
											{ className: 'lawu-elem-row' + (k !== 'ok' && i === 0 && open.length > 0 ? ' is-current' : ''), key: e.id || i },
											h('span', { className: 'lawu-elem-ic ' + k }, Icon(k === 'ok' ? 'check' : 'warn', 12)),
											h(
												'span',
												null,
												h('span', { className: 'lawu-elem-name' }, e.name),
												h('span', { className: 'lawu-elem-state' }, (e.level || '') + ' · ' + sid(e.status) + (e.factRef ? ' · ' + clip(e.factRef, 34) : '')),
											),
										)
									}),
						),

						openBook
							? h(
									'section',
									{ className: 'lawu-card' },
									h(
										'div',
										{ className: 'lawu-card-tt' },
										'可用法条',
										h('span', { className: 'lawu-tag outline', style: { marginLeft: 'auto' } }, '开卷'),
									),
									normKeys.length === 0
										? h('div', { className: 'lawu-sm lawu-muted' }, '（要件清单里还没有记规范依据）')
										: normKeys.map(function (n, i) {
												return h(
													'div',
													{ className: 'lawu-law', key: i },
													h('code', null, n),
													h('p', null, normUsers[n].join(' / ')),
												)
											}),
								)
							: h('section', { className: 'lawu-card' }, h('div', { className: 'lawu-card-tt' }, '可用法条'), h('div', { className: 'lawu-sm lawu-muted' }, '闭卷模式：法条与抗辩思路由你自己回忆。')),

						openBook
							? h(
									'section',
									{ className: 'lawu-card lawu-warn-card' },
									h(
										'div',
										{ className: 'lawu-card-tt' },
										'对方抗辩思路',
										h('span', { className: 'lawu-tag warn', style: { marginLeft: 'auto' } }, '预判'),
									),
									defenses.length === 0
										? h('div', { className: 'lawu-sm lawu-muted' }, '（要件清单里还没有抗辩层要件）')
										: defenses.map(function (d, i) {
												return h(
													'div',
													{ className: 'lawu-def-item', key: d.id || i },
													h('b', null, Icon('shield', 13), d.name),
													h('p', null, '应对：' + (d.note || d.factRef || '围绕该抗辩的要件事实举证与反驳')),
												)
											}),
								)
							: null,

						h(
							'section',
							{ className: 'lawu-card' },
							h('div', { className: 'lawu-card-tt' }, '发言统计'),
							h('div', { className: 'lawu-stat3' },
								h('span', null, h('b', null, String(transcript.length)), '轮发言'),
								h('span', null, h('b', null, String(transcript.filter(function (t) { return speakerKind(t.speaker) === 'mine' }).length)), '我方'),
								h('span', null, h('b', null, String(transcript.filter(function (t) { return speakerKind(t.speaker) === 'opp' }).length)), 'AI'),
							),
							h('div', { className: 'lawu-timer-sub' }, '当前阶段：' + phase + ' · 第 ' + (Math.floor(transcript.length / 2) + 1) + ' 回合'),
						),
					),
				),

				h(Actions, {
					ctx: props.ctx,
					title: '实训场景',
					items: [
						{ label: '开庭：我演' + activeRole, text: '我要演' + activeRole + '，请载入本案要件与法条开庭（law_moot action=start role=' + activeRole + '），你先发言。' },
						{ label: '给我辩论辅助面板', text: '请给我本案的辩论辅助面板（law_moot action=panel），列出待辩论要件、可用法条、对方可能的抗辩思路。' },
						{ label: '导出庭审笔录', text: '请导出当前庭审场次的笔录（law_moot action=record）。' },
					],
				}),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		function SecCards(props) {
			var extra = props.extra.cards || {}
			var cards = extra.cards || []
			var reveal = props.reveal || {}
			var goal = extra.dailyGoal || 10
			var done = extra.reviewedToday || 0
			var pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0

			/** 卡片库构成：按 kind 与 tag 聚合 */
			var kindMap = {}
			var tagMap = {}
			cards.forEach(function (c) {
				var k = c.kind || '未分类'
				kindMap[k] = (kindMap[k] || 0) + 1
				;(c.tags || []).forEach(function (t) {
					tagMap[t] = (tagMap[t] || 0) + 1
				})
			})
			var kindKeys = Object.keys(kindMap).sort(function (a, b) { return kindMap[b] - kindMap[a] })
			var tagKeys = Object.keys(tagMap).sort(function (a, b) { return tagMap[b] - tagMap[a] }).slice(0, 10)

			var quiz = cards.length === 0
				? h(Empty, null, '背诵库是空的。让明律用本案要件一键生成卡片（law_flashcards action=from_case）。')
				: cards.slice(0, 60).map(function (c, i) {
						var shown = reveal[c.id] === true
						return h(
							'div',
							{ className: 'lawu-card-q', key: i },
							h('div', { className: 'q' }, c.front),
							h('div', { className: 'lawu-sm lawu-muted' }, '【' + (c.kind || '未分类') + '】' + (c.tags || []).join('、') + (c.dueAt ? ' · 到期 ' + fmtDay(c.dueAt) : '')),
							shown ? h('div', { className: 'a' }, h('div', null, c.back), (c.points || []).length > 0 ? h('div', { className: 'lawu-sm lawu-muted' }, '必答要点：' + c.points.join('；')) : null) : null,
							h(
								'div',
								{ className: 'lawu-grades' },
								h(Btn, { onClick: function () { props.onReveal(c.id, !shown) } }, shown ? '收起' : '看答案'),
								shown
									? [
											h(Btn, { key: 'a', onClick: function () { props.onGrade(c.id, 'again') } }, '没背出来'),
											h(Btn, { key: 'h', onClick: function () { props.onGrade(c.id, 'hard') } }, '漏考点'),
											h(Btn, { key: 'g', pri: true, onClick: function () { props.onGrade(c.id, 'good') } }, '基本准确'),
											h(Btn, { key: 'e', onClick: function () { props.onGrade(c.id, 'easy') } }, '完全准确'),
										]
									: null,
							),
						)
					})

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '知识点背诵'),
				h('div', { className: 'lawu-sub' }, '提问背诵 / 默写填空双模式 · 按必答要点批改 · 间隔复习排程'),
				h('div', { className: 'lawu-rule' }),

				/* 今日背诵 */
				h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon('layers', 16), h('span', { className: 'lawu-card-tt' }, '今日背诵'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag ' + (done >= goal ? 'succ' : 'outline') }, done + ' / ' + goal))),
					h(
						'div',
						{ className: 'lawu-card-body' },
						h('div', { className: 'lawu-progress' }, h('i', { style: { width: pct + '%' } })),
						h('div', { className: 'lawu-row', style: { marginTop: '10px' } },
							h('span', { className: 'lawu-tag outline' }, '卡片 ' + (extra.total || cards.length) + ' 张'),
							h('span', { className: 'lawu-tag warn' }, '今日待复习 ' + (extra.dueCount || 0)),
							h(Btn, { onClick: function () { props.onFilter(props.dueOnly ? false : true) } }, props.dueOnly ? '显示全部' : '只看待复习'),
							h(Btn, { onClick: props.onExport }, '导出 Anki CSV'),
						),
					),
				),

				/* 主区：卡片自测 + 右栏（构成 / 计划 / 错题重背） */
				h(
					'div',
					{ style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '14px', alignItems: 'start', marginTop: '15px' } },
					h(
						'section',
						{ className: 'lawu-card flush' },
						h('div', { className: 'lawu-card-hd' }, Icon('pen', 16), h('span', { className: 'lawu-card-tt' }, '默写填空 · 法条挖空自测'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, (props.dueOnly ? '待复习' : '全部')))),
						h('div', { className: 'lawu-card-body' }, quiz),
					),
					h(
						'div',
						{ style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('library', 16), h('span', { className: 'lawu-card-tt' }, '卡片库构成')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								kindKeys.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有卡片）')
									: kindKeys.map(function (k, i) {
											return h('div', { className: 'lawu-check ok', key: i, style: { justifyContent: 'space-between' } }, Icon('check', 15), h('span', null, k), h('span', { className: 'lawu-tag outline' }, String(kindMap[k])))
										}),
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('bookmarked', 16), h('span', { className: 'lawu-card-tt' }, '智能归集来源')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								tagKeys.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有标签）')
									: h('div', { className: 'lawu-row' }, tagKeys.map(function (t, i) { return h('span', { className: 'lawu-tag brand', key: i }, t + ' · ' + tagMap[t]) })),
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('rotate', 16), h('span', { className: 'lawu-card-tt' }, '学习计划')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								h('div', { className: 'lawu-stat3' },
									h('span', null, h('b', null, String(extra.dueCount || 0)), '待复习'),
									h('span', null, h('b', null, String(done)), '今日已复习'),
									h('span', null, h('b', null, String(goal)), '每日目标'),
								),
								h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '10px' } }, '间隔复习按 Leitner 6 档排程（0/1/2/4/7/15/30 天）：标「没背出来」会把卡片打回第 1 档。'),
								h('div', { className: 'lawu-row', style: { marginTop: '10px' } },
									h(Btn, { onClick: function () { props.ctx.send('请按到期顺序出题考我（law_flashcards action=quiz），只给问题不给答案，我答完你按必答要点批改。') } }, '开始今日自测'),
								),
							),
						),
					),
				),

				h(
					'div',
					{ style: { marginTop: '15px' } },
					h(Actions, {
						ctx: props.ctx,
						title: '复盘场景',
						items: [
							{ label: '本案要点做卡片', desc: '要件 / 学说争议 / 谬误入卡', ic: 'layers', text: '请把当前案件的要件、学说争议与逻辑谬误一键做成背诵卡（law_flashcards action=from_case）。' },
							{ label: '按到期顺序考我', desc: '只给问题，我答完再批改', ic: 'pen', text: '请按到期顺序出题考我（law_flashcards action=quiz），只给问题不给答案，我答完你按必答要点批改。' },
							{ label: '错题重背', desc: '按漏掉的采分点出题', ic: 'rotate', text: '请把我错题本里漏掉的采分点做成背诵卡并安排重背（law_flashcards action=add）。' },
						],
					}),
				),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		function SecNotes(props) {
			var wrong = props.extra.wrong || {}
			var items = wrong.items || []
			var q = props.query || ''
			var tagState = React.useState('')
			var tag = tagState[0]
			var setTag = tagState[1]

			/** 高频考点：漏点与标签的词频 —— 对应设计稿右栏的「薄弱考点」 */
			var missMap = {}
			var tagMap = {}
			items.forEach(function (w) {
				;(w.missedPoints || []).forEach(function (p) {
					var k = String(p || '').trim()
					if (k) missMap[k] = (missMap[k] || 0) + 1
				})
				;(w.tags || []).forEach(function (t) {
					var k = String(t || '').trim()
					if (k) tagMap[k] = (tagMap[k] || 0) + 1
				})
			})
			var tags = Object.keys(tagMap).sort(function (a, b) { return tagMap[b] - tagMap[a] })
			var misses = Object.keys(missMap).sort(function (a, b) { return missMap[b] - missMap[a] }).slice(0, 8)

			var shown = items.filter(function (w) {
				if (tag && (w.tags || []).indexOf(tag) < 0) return false
				if (q && (w.question || '').indexOf(q) < 0 && (w.missedPoints || []).join(' ').indexOf(q) < 0) return false
				return true
			})

			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '我的笔记 / 错题本'),
				h('div', { className: 'lawu-sub' }, '跨案件归集 · 复习时按漏掉的采分点出题，而不是把整道题重抄一遍'),
				h('div', { className: 'lawu-rule' }),

				h(
					'div',
					{ className: 'lawu-row', style: { marginBottom: '12px' } },
					h('input', { className: 'lawu-inp', style: { flex: 1, minWidth: '220px' }, placeholder: '按题目或漏点过滤…', value: q, onChange: function (e) { props.onQuery(e.target.value) } }),
					h('span', { className: 'lawu-tag outline' }, '错题 ' + (wrong.total || items.length) + ' 道'),
					h('span', { className: 'lawu-tag warn' }, '待重做 ' + (wrong.dueCount || 0)),
				),

				h(
					'div',
					{ style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '14px', alignItems: 'start' } },

					/* 主区：错题本 */
					h(
						'section',
						{ className: 'lawu-card flush' },
						h('div', { className: 'lawu-card-hd' }, Icon('notebook', 16), h('span', { className: 'lawu-card-tt' }, '错题本'), h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, shown.length + ' 道'))),
						h(
							'div',
							{ className: 'lawu-card-body' },
							tags.length > 0
								? h(
										'div',
										{ className: 'lawu-row', style: { marginBottom: '12px' } },
										h('button', { type: 'button', className: 'lawu-chip' + (tag === '' ? ' is-on' : ''), onClick: function () { setTag('') } }, '全部分类'),
										tags.map(function (t) {
											return h('button', { key: t, type: 'button', className: 'lawu-chip' + (tag === t ? ' is-on' : ''), onClick: function () { setTag(t) } }, t + ' · ' + tagMap[t])
										}),
									)
								: null,
							shown.length === 0
								? h(Empty, null, '错题本还是空的。主观题批改后让明律把漏掉的采分点归集进来（law_review wrongbook=true 或 law_wrongbook）。')
								: shown.map(function (w, i) {
										return h(
											'div',
											{ className: 'lawu-check warn', key: w.id || i, style: { alignItems: 'flex-start' } },
											Icon('warn', 15),
											h(
												'span',
												{ style: { flex: 1, minWidth: 0 } },
												clip(w.question, 90),
												h('span', { className: 'lawu-chk-note' }, '漏点：' + ((w.missedPoints || []).join('；') || '—') + ' · 重做 ' + (w.reviews || 0) + ' 次 · 下次 ' + (fmtDay(w.dueAt) || '—')),
												h(
													'div',
													{ className: 'lawu-row', style: { marginTop: '6px' } },
													(w.tags || []).map(function (t, j) { return h('span', { className: 'lawu-tag outline', key: j }, t) }),
													h(Btn, { onClick: function () { props.onReview(w.id, 'good') } }, '已重做'),
													h(Btn, { onClick: function () { props.onReview(w.id, 'again') } }, '还是错'),
												),
											),
										)
									}),
						),
					),

					/* 右栏：高频考点 / 薄弱考点 / 今日复盘 */
					h(
						'div',
						{ style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('bookmarked', 16), h('span', { className: 'lawu-card-tt' }, '高频考点')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								tags.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有足够的错题来统计）')
									: h('div', { className: 'lawu-row' }, tags.slice(0, 8).map(function (t, i) { return h('span', { className: 'lawu-tag brand', key: i }, t + ' · ' + tagMap[t]) })),
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('warn', 16), h('span', { className: 'lawu-card-tt' }, '薄弱考点')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								misses.length === 0
									? h('div', { className: 'lawu-sm lawu-muted' }, '（还没有漏点记录）')
									: misses.map(function (m, i) {
											return h('div', { className: 'lawu-check warn', key: i, style: { justifyContent: 'space-between' } }, Icon('warn', 15), h('span', null, m), h('span', { className: 'lawu-tag warn' }, '×' + missMap[m]))
										}),
							),
						),
						h(
							'section',
							{ className: 'lawu-card flush' },
							h('div', { className: 'lawu-card-hd' }, Icon('rotate', 16), h('span', { className: 'lawu-card-tt' }, '今日复盘')),
							h(
								'div',
								{ className: 'lawu-card-body' },
								h('div', { className: 'lawu-stat3' },
									h('span', null, h('b', null, String(items.length)), '错题总数'),
									h('span', null, h('b', null, String(wrong.dueCount || 0)), '今日待重做'),
									h('span', null, h('b', null, String(tags.length)), '涉及考点'),
								),
								h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '10px' } }, '重做时按漏掉的采分点逐条追问，不重抄整题。'),
							),
						),
					),
				),

				h(
					'div',
					{ style: { marginTop: '15px' } },
					h(Actions, {
						ctx: props.ctx,
						title: '复盘场景',
						items: [
							{ label: '今天该重做哪些错题', desc: '带我一题一题重做并记录', ic: 'rotate', text: '请看我错题本里今天该重做的题（law_wrongbook action=list due=true），带我一题一题重做并记录结果。' },
							{ label: '错题做成背诵卡', desc: '必答要点＝漏掉的采分点', ic: 'layers', text: '请把我最近的错题按漏掉的采分点做成背诵卡（law_flashcards action=add），每张卡的必答要点就是那些漏点。' },
						],
					}),
				),
				h('div', { className: 'lawu-foot' }, props.data.disclaimer),
			)
		}

		function SecSettings(props) {
			var d = props.data
			var s = d.settings || {}
			var c = props.ctx
			var dark = useStore(themeStore).dark
			function set(patch) {
				c.save(patch)
			}
			/** 一张设置卡：图标 + 标题 + 副标 + 内容 */
			function Card(icon, title, hint, body) {
				return h(
					'section',
					{ className: 'lawu-card flush' },
					h('div', { className: 'lawu-card-hd' }, Icon(icon, 16), h('span', { className: 'lawu-card-tt' }, title), hint ? h('span', { className: 'lawu-hd-right' }, h('span', { className: 'lawu-tag outline' }, hint)) : null),
					h('div', { className: 'lawu-card-body' }, body),
				)
			}
			var SHORTCUTS = [
				['切换深浅色主题', '主题按钮'],
				['折叠 / 展开右侧面板', '顶栏 »'],
				['关闭工作台 / 返回对话', '← 返回对话'],
				['切换左栏页签', '左侧导航'],
				['切换庭审页 案卷/庭审/辅助', '窄屏标签'],
			]
			return h(
				'div',
				null,
				h('h1', { className: 'lawu-h1 lawu-serif' }, '设置'),
				h('div', { className: 'lawu-sub' }, '与明律共用同一份 settings.json —— 这里改的，下一次对话立刻生效'),
				h('div', { className: 'lawu-rule' }),

				h(
					'div',
					{ style: { display: 'flex', flexDirection: 'column', gap: '15px' } },

					/* 语言与双语 */
					Card('library', '语言与双语', s.bilingual ? '中英对照' : '纯中文',
						h('div', { className: 'lawu-field' },
							h('label', null, '术语呈现'),
							h('div', { className: 'lawu-sw' },
								h('button', { className: s.bilingual ? '' : 'on', onClick: function () { set({ bilingual: false }) } }, '纯中文'),
								h('button', { className: s.bilingual ? 'on' : '', onClick: function () { set({ bilingual: true }) } }, '中英对照'),
							),
						),
						h('div', { className: 'lawu-sm lawu-muted' }, '英文为学术参考译文，非官方法定译本；术语表可导出（law_export kind=glossary）。'),
					),

					/* 交互与追问 */
					Card('messages', '交互与追问', s.socratic ? '学习模式' : '已关闭',
						h('div', { className: 'lawu-field' },
							h('label', null, '多轮事实追问'),
							h('div', { className: 'lawu-sw' },
								h('button', { className: s.socratic ? 'on' : '', onClick: function () { set({ socratic: true }) } }, '开启'),
								h('button', { className: s.socratic ? '' : 'on', onClick: function () { set({ socratic: false }) } }, '关闭'),
							),
						),
						h('div', { className: 'lawu-sm lawu-muted' }, '开启时事实不齐不下结论，每轮最多追问 3 个问题；关闭后允许在缺口未闭合时先给结论并标注假设。'),
					),

					/* 输出偏好 */
					Card('pen', '输出偏好', s.outputStyle || '应试版',
						h('div', { className: 'lawu-field' },
							h('label', null, '详略'),
							h('div', { className: 'lawu-sw' },
								h('button', { className: s.outputStyle === '应试版' ? 'on' : '', onClick: function () { set({ outputStyle: '应试版' }) } }, '精简应试版'),
								h('button', { className: s.outputStyle === '学理版' ? 'on' : '', onClick: function () { set({ outputStyle: '学理版' }) } }, '详细学理版'),
							),
						),
						h('div', { className: 'lawu-field' },
							h('label', null, '学习轨道'),
							h('select', { className: 'lawu-inp', value: s.track || '法考', onChange: function (e) { set({ track: e.target.value }) } },
								['法考', '本科', '研究生', '通识'].map(function (t) { return h('option', { key: t, value: t }, t) }),
							),
						),
						h('div', { className: 'lawu-field' },
							h('label', null, '每日背诵目标'),
							h('input', { className: 'lawu-inp', type: 'number', min: 1, style: { width: '90px' }, value: s.dailyGoal || 10, onChange: function (e) { set({ dailyGoal: Number(e.target.value) || 1 }) } }),
							h('span', { className: 'lawu-sm lawu-muted' }, '张 / 天'),
						),
					),

					/* 外观主题 */
					Card('moon', '外观主题', dark ? '深色' : '浅色',
						h('div', { className: 'lawu-field' },
							h('label', null, '主题'),
							h('div', { className: 'lawu-sw' },
								h('button', { className: dark ? '' : 'on', onClick: function () { if (dark) toggleTheme() } }, '浅色'),
								h('button', { className: dark ? 'on' : '', onClick: function () { if (!dark) toggleTheme() } }, '深色'),
							),
						),
						h('div', { className: 'lawu-sm lawu-muted' }, '工作台跟随 DSH 主题服务（theme/change）；这里切换等于切换整个宿主主题。版式为「律思」单主色策略：炭灰蓝 × 暖米白纸面。'),
					),

					/* 全局安全边界 */
					Card('shield', '全局安全边界', '不可关闭',
						h('div', { className: 'lawu-sm' }, d.disclaimer),
						h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '8px', lineHeight: '1.8' } },
							'① 全站永久免责声明；',
							h('br'), '② 禁止完整代写课程论文；',
							h('br'), '③ 禁止生成可直接用于实务的正式法律文书（文书模块一律产出「练习稿」）；',
							h('br'), '④ 禁止解答真实案件维权咨询；模拟庭审与案例分析结论无司法效力。',
						),
					),

					/* 数据与存储 */
					Card('notebook', '数据与存储', '只读 + 有限写入',
						h('div', { className: 'lawu-sm' }, '学习档案目录：', h('span', { className: 'lawu-mono' }, d.dataRoot)),
						h('div', { className: 'lawu-sm' }, '导出目录：', h('span', { className: 'lawu-mono' }, d.dataRoot + '\\exports')),
						h('div', { className: 'lawu-row', style: { marginTop: '10px' } },
							h(Btn, { onClick: function () { c.openFolder('exports') } }, '打开导出目录'),
							h(Btn, { onClick: function () { c.openFolder('root') } }, '打开学习档案目录'),
							h(Btn, { onClick: c.refresh }, '刷新数据'),
						),
						h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '8px' } }, '工作台只读档案；写入仅限设置、背诵卡复习与错题重做记录。分析与写档由明律在会话里完成。'),
					),

					/* 快捷键 */
					Card('key', '快捷键', '当前界面',
						SHORTCUTS.map(function (pair, i) {
							return h('div', { className: 'lawu-check', key: i, style: { justifyContent: 'space-between' } },
								h('span', null, pair[0]),
								h('span', { className: 'lawu-tag outline' }, pair[1]),
							)
						}),
						h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '6px' } }, '工作台是宿主浮层，全局按键由 DSH 拥有；这里只列工作台内置的交互入口。'),
					),

					/* 明律会话（保留诊断） */
					Card('messages', '明律会话', (d.sessions || []).length + ' 条',
						h('div', { className: 'lawu-sm' }, '当前会话：', (d.sessions && d.sessions.length > 0) ? sessionLabel(d.sessions[0]) : '（还没有用「法学学习实训 Agent」开过会话）'),
						(d.sessions || []).length > 1 ? h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '6px' } }, '联动指令默认发往最近活跃的一条。') : null,
						h('div', { className: 'lawu-row', style: { marginTop: '10px' } }, h(Btn, { onClick: function () { c.openSession() } }, '打开明律会话')),
						h(
							'div',
							{ className: 'lawu-sm lawu-muted', style: { marginTop: '8px' } },
							sessionsService()
								? '会话跳转服务：✅ 已就绪（' + (sessionsDiag.via || '未知路径') + '）'
								: '会话跳转服务：❌ 取不到（' + (sessionsDiag.note || '原因未知') + '）——「打开完整会话」会降级成关闭工作台',
						),
					),

					/* 数据清理 / 生效配置速览 */
					Card('rotate', '生效配置速览', '实时',
						h('div', { className: 'lawu-stat3' },
							h('span', null, h('b', null, s.bilingual ? '中英' : '中文'), '术语'),
							h('span', null, h('b', null, s.socratic ? '开' : '关'), '追问'),
							h('span', null, h('b', null, String(s.dailyGoal || 10)), '每日目标'),
						),
						h('div', { className: 'lawu-row', style: { marginTop: '12px' } },
							h(Btn, { onClick: function () { props.ctx.send('请导出我的学习统计与术语对照表（law_export kind=stats、kind=glossary）。') } }, '导出统计与术语表'),
							h(Btn, { onClick: function () { props.ctx.send('请把当前案件导出为完整卷宗（law_export kind=case）。') } }, '导出本案卷宗'),
						),
						h('div', { className: 'lawu-sm lawu-muted', style: { marginTop: '8px' } }, '轨道：' + (s.track || '法考') + ' · 输出：' + (s.outputStyle || '应试版') + ' · 活跃案件：' + (d.activeCaseId || '（未选择）')),
					),
				),

				h('div', { className: 'lawu-foot' }, d.disclaimer),
			)
		}

		// ── 内嵌对话：工作台里直接跟明律说话 ─────────────────────────────────

		/**
		 * 极简 Markdown 渲染。明律的输出里全是标题、清单、表格、法条引用，
		 * 直接按纯文本铺开会很难读，所以这里做一层克制的块级渲染（不做完整 Markdown 实现）。
		 * 支持：``` 代码块 / | 表格 | / # 标题 / - 与 1. 列表 / > 引用 / **粗体** / `行内代码`
		 */
		function inlineNodes(text, onWiki) {
			var out = []
			var re = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g
			var last = 0
			var m
			var key = 0
			/**
			 * 双链元素单独造：目标与别名作为参数传进来。
			 * 不能直接在循环里写 onClick 闭包 —— `var` 是函数作用域，
			 * 所有 handler 都会捕获到循环结束时的最后一个 target（会造成点 A 打开 B）。
			 */
			var makeWiki = function (target, alias) {
				return h(
					'button',
					{
						key: 'w' + key++,
						className: 'lawu-wiki',
						title: onWiki ? '打开笔记：' + target : '笔记：' + target,
						onClick: onWiki
							? function () {
									onWiki(target)
								}
							: undefined,
					},
					alias,
				)
			}
			while ((m = re.exec(text)) !== null) {
				if (m.index > last) out.push(text.slice(last, m.index))
				var token = m[0]
				if (token.slice(0, 2) === '**') {
					out.push(h('strong', { key: 'b' + key++ }, token.slice(2, -2)))
				} else if (token.slice(0, 2) === '[[') {
					// Obsidian 双链：[[目标]] 或 [[目标|别名]] 或 [[目标#小节]]
					var inner = token.slice(2, -2)
					var bar = inner.indexOf('|')
					var target = (bar >= 0 ? inner.slice(0, bar) : inner).split('#')[0].trim()
					var alias = bar >= 0 ? inner.slice(bar + 1) : target
					out.push(makeWiki(target, alias))
				} else {
					out.push(h('code', { key: 'c' + key++ }, token.slice(1, -1)))
				}
				last = m.index + token.length
			}
			if (last < text.length) out.push(text.slice(last))
			return out
		}

		function MarkdownLite(props) {
			var onWiki = props.onWiki || null
			var lines = String(props.text == null ? '' : props.text).split(/\r?\n/)
			var blocks = []
			var i = 0
			var key = 0
			var isTableRow = function (s) { return /^\s*\|.*\|\s*$/.test(s) }
			var isListRow = function (s) { return /^\s*([-*+]|\d+\.)\s+/.test(s) }
			while (i < lines.length) {
				var line = lines[i]
				if (/^\s*```/.test(line)) {
					var buf = []
					i += 1
					while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i += 1 }
					i += 1
					blocks.push(h('pre', { key: key++ }, buf.join('\n')))
					continue
				}
				if (isTableRow(line)) {
					var rows = []
					while (i < lines.length && isTableRow(lines[i])) {
						var cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim() })
						if (!/^[\s:|-]+$/.test(lines[i].replace(/\|/g, ''))) rows.push(cells)
						i += 1
					}
					if (rows.length > 0) {
						var head = rows[0]
						var body = rows.slice(1)
						blocks.push(
							h('table', { key: key++ },
								h('thead', null, h('tr', null, head.map(function (c, j) { return h('th', { key: j }, inlineNodes(c, onWiki)) }))),
								h('tbody', null, body.map(function (r, ri) {
									return h('tr', { key: ri }, r.map(function (c, j) { return h('td', { key: j }, inlineNodes(c, onWiki)) }))
								})),
							),
						)
					}
					continue
				}
				var hm = /^(#{1,6})\s+(.*)$/.exec(line)
				if (hm) {
					blocks.push(h('h' + Math.min(6, hm[1].length), { key: key++ }, inlineNodes(hm[2], onWiki)))
					i += 1
					continue
				}
				if (/^>\s?/.test(line)) {
					var quote = []
					while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1 }
					blocks.push(h('blockquote', { key: key++ }, inlineNodes(quote.join(' '), onWiki)))
					continue
				}
				if (isListRow(line)) {
					var ordered = /^\s*\d+\./.test(line)
					var items = []
					while (i < lines.length && isListRow(lines[i])) {
						items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''))
						i += 1
					}
					blocks.push(
						h(ordered ? 'ol' : 'ul', { key: key++ }, items.map(function (t, j) { return h('li', { key: j }, inlineNodes(t, onWiki)) })),
					)
					continue
				}
				if (/^\s*$/.test(line)) { i += 1; continue }
				var para = []
				while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*(```|#{1,6}\s|>|\||([-*+]|\d+\.)\s)/.test(lines[i])) {
					para.push(lines[i])
					i += 1
				}
				blocks.push(h('p', { key: key++ }, inlineNodes(para.join('\n'), onWiki)))
			}
			return h('div', { className: 'lawu-md' }, blocks)
		}

		var ROLE_LABEL = { user: '我', assistant: '明律', tool: '工具' }

		function MessageRow(props) {
			var m = props.message
			var role = m.role || 'assistant'
			return h(
				'div',
				{ className: 'lawu-msg ' + role },
				h('div', { className: 'who' }, ROLE_LABEL[role] || role),
				h(
					'div',
					{ className: 'bubble' },
					role === 'tool'
						? h('div', null, (m.error ? '⚠️ 工具出错' : '🔧 工具返回') + '（' + (m.chars || 0) + ' 字）', m.text ? h('pre', { className: 'lawu-pre', style: { marginTop: '4px', fontSize: '11.5px' } }, m.text) : null)
						: h(MarkdownLite, { text: m.text }),
					m.interrupted ? h('div', { className: 'lawu-hint' }, '（这一轮被中断）') : null,
				),
			)
		}

		/**
		 * 对话区。三种高度：closed（只留一条工具栏）/ open（占中栏 46%）/ full（占满中栏）。
		 * 数据由 Workspace 轮询 /lawui/api/chat 提供，这里只负责渲染与本地滚动。
		 */
		function ChatDock(props) {
			var chat = props.chat || { messages: [], sessions: [] }
			var messages = chat.messages || []
			var sessions = chat.sessions || []
			var bodyRef = React.useRef(null)

			React.useEffect(function () {
				var el = bodyRef.current
				if (el) el.scrollTop = el.scrollHeight
			}, [messages.length, chat.running, props.mode])

			var header = h(
				'div',
				{ className: 'lawu-chat-h' },
				h('b', null, '明律对话'),
				chat.running
					? h('span', { className: 'lawu-chip' }, h('i', null), '正在思考…')
					: h('span', { className: 'lawu-chip' }, '空闲'),
				sessions.length > 0
					? h(
							'select',
							{
								className: 'lawu-inp',
								style: { maxWidth: '260px' },
								value: chat.sessionId || '',
								onChange: function (e) { props.onPickSession(e.target.value) },
							},
							sessions.map(function (s) {
								return h('option', { key: s.sessionId, value: s.sessionId }, sessionLabel(s))
							}),
						)
					: null,
				h('div', { className: 'grow' }),
				h(Btn, { onClick: props.onNewSession, title: '新开一条明律会话' }, '新建会话'),
				h(Btn, { onClick: function () { props.onMode(props.mode === 'full' ? 'open' : 'full') } }, props.mode === 'full' ? '还原布局' : '对话全屏'),
				h(Btn, { onClick: props.onOpenReal, title: '关闭工作台并在会话界面打开这条对话（含工具卡片与轨迹）' }, '打开完整会话'),
				h(Btn, { onClick: function () { props.onMode('closed') } }, '收起'),
			)

			if (props.mode === 'closed') {
				return h(
					'div',
					{ className: 'lawu-chat', style: { flex: '0 0 auto' } },
					h(
						'div',
						{ className: 'lawu-chat-h' },
						h('b', null, '明律对话'),
						h('span', { className: 'lawu-muted lawu-sm' }, chat.running ? '正在思考…' : '已收起'),
						h('div', { className: 'grow' }),
						h(Btn, { onClick: function () { props.onMode('open') } }, '展开对话'),
					),
				)
			}

			var body = h(
				'div',
				{ className: 'lawu-chat-body', ref: bodyRef },
				chat.needsSession
					? h(
							Empty,
							null,
							h('div', null, '还没有「法学学习实训 Agent」的会话。'),
							h('div', { style: { marginTop: '8px' } }, h(Btn, { pri: true, onClick: props.onNewSession }, '新建明律会话并开始')),
						)
					: messages.length === 0
						? h(Empty, null, '还没有对话。直接在下面输入，或从上面任一页签点「一键联动」按钮。')
						: messages.map(function (m, i) {
								return h(MessageRow, { key: (m.seq || i) + '-' + (m.role || ''), message: m })
							}),
				chat.running && !chat.needsSession ? h('div', { className: 'lawu-thinking' }, h('span', { className: 'lawu-dot' }), '明律正在思考…') : null,
			)

			var composer = h(
				'div',
				{ className: 'lawu-compose' },
				h('textarea', {
					value: props.input,
					placeholder: '跟明律说点什么…（例如：把本案编成主观题 / 这题的抗辩我漏了什么）',
					onChange: function (e) { props.onInput(e.target.value) },
					onKeyDown: function (e) {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							props.onSend()
						}
					},
				}),
				h(Btn, { pri: true, onClick: props.onSend, disabled: props.sending || String(props.input || '').trim() === '' }, props.sending ? '发送中…' : '发送'),
			)

			return h(
				'div',
				{ className: 'lawu-chat', style: props.mode === 'full' ? { flex: '1 1 auto' } : { flex: '0 0 46%' } },
				header,
				body,
				composer,
				h(
					'div',
					{ className: 'lawu-hint', style: { padding: '0 12px 8px' } },
					'⏎ 发送 · Shift+⏎ 换行 · 目标会话：' + (chat.title || sessionLabel(sessions.find(function (s) { return s.sessionId === chat.sessionId })) || '（未选择）'),
				),
			)
		}

		// ── 资料来源：模块可自选多个文件夹（可屏蔽 / 删除 / 设笔记写入目录） ────

		function dirName(p) {
			var s = String(p || '').replace(/[\\/]+$/, '')
			var parts = s.split(/[\\/]/)
			return parts[parts.length - 1] || s
		}

		function fmtSize(n) {
			if (n == null) return ''
			if (n < 1024) return n + ' B'
			if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
			return (n / 1024 / 1024).toFixed(1) + ' MB'
		}

		function SourcesBar(props) {
			var moduleKey = props.moduleKey
			var info = (props.modules || []).find(function (m) { return m.key === moduleKey })
			var dirs = (info && info.dirs) || []
			var scanning = props.scanning
			var manualState = React.useState(false)
			var manual = manualState[0]
			var setManual = manualState[1]
			var pathState = React.useState('')
			var manualPath = pathState[0]
			var setManualPath = pathState[1]
			var label = (info && info.label) || moduleKey
			var isNotes = moduleKey === 'notes'

			return h(
				'div',
				{ className: 'lawu-src' },
				h(
					'div',
					{ className: 'lawu-src-h' },
					h('b', null, '资料来源'),
					h('span', { className: 'lawu-sm lawu-muted' }, label + ' · ' + dirs.filter(function (d) { return d.enabled && !d.missing }).length + ' / ' + dirs.length + ' 个文件夹启用'),
					h('div', { style: { flex: 1 } }),
					h(Btn, { onClick: function () { props.onPickFolder(moduleKey) }, disabled: !!props.picking }, props.picking ? '选择中…' : '＋ 添加文件夹'),
					h(Btn, { onClick: function () { setManual(!manual) } }, manual ? '收起手动输入' : '手动输入路径'),
					h(Btn, { onClick: function () { props.onRescan(moduleKey) }, disabled: scanning }, scanning ? '扫描中…' : '↻ 重扫'),
				),
				manual
					? h(
							'div',
							{ className: 'lawu-row', style: { marginBottom: '6px' } },
							h('input', {
								className: 'lawu-inp',
								style: { flex: 1, minWidth: '260px' },
								placeholder: '例如 D:\\Obsidian\\法学笔记',
								value: manualPath,
								onChange: function (e) { setManualPath(e.target.value) },
								onKeyDown: function (e) {
									if (e.key === 'Enter') {
										props.onAdd(moduleKey, manualPath)
										setManualPath('')
									}
								},
							}),
							h(
								Btn,
								{
									pri: true,
									onClick: function () {
										props.onAdd(moduleKey, manualPath)
										setManualPath('')
									},
								},
								'添加',
							),
						)
					: null,
				dirs.length === 0
					? h('div', { className: 'lawu-sm lawu-muted' }, '还没有挂文件夹。点「＋ 添加文件夹」选一个（可挂多个，随时屏蔽或删除）。')
					: h(
							'div',
							{ className: 'lawu-row' },
							dirs.map(function (d, i) {
								var cls = 'lawu-dir' + (d.enabled ? '' : ' off') + (d.missing ? ' bad' : '')
								return h(
									'span',
									{ className: cls, key: i, title: d.path + (d.missing ? '（路径不可访问）' : '') },
									h('span', null, d.missing ? '⚠️' : d.enabled ? '📁' : '🚫'),
									h('span', { className: 'p' }, dirName(d.path)),
									isNotes && info && info.writePath && info.writePath === d.path ? h('span', { className: 'lawu-st ok' }, '写入目录') : null,
									h(
										'button',
										{
											className: 'x',
											title: d.enabled ? '屏蔽这个文件夹（保留配置）' : '启用这个文件夹',
											onClick: function () { props.onToggle(moduleKey, d.path, !d.enabled) },
										},
										d.enabled ? '屏蔽' : '启用',
									),
									isNotes
										? h(
												'button',
												{
													className: 'x',
													title: '把生成的笔记写到这里',
													onClick: function () { props.onSetWriteRoot(moduleKey, d.path) },
												},
												'设为写入',
											)
										: null,
									h('button', { className: 'x', title: '在资源管理器中打开', onClick: function () { props.onOpenFolder(d.path) } }, '打开'),
									h('button', { className: 'x', title: '从这个模块移除', onClick: function () { props.onRemove(moduleKey, d.path) } }, '✕'),
								)
							}),
						),
				isNotes && props.notesInfo
					? h(
							'div',
							{ className: 'lawu-sm lawu-muted', style: { marginTop: '6px' } },
							'笔记写入目录：' + (props.notesInfo.writePath || '（默认 lawdata/notes）') + (props.notesInfo.isFallback ? '（尚未指定，用的是默认目录）' : ''),
						)
					: null,
			)
		}

		/** 一个模块所有启用文件夹里的资料文件 */
		function FilesPanel(props) {
			var scan = props.scan
			if (!props.open) return null
			if (!scan) {
				return h(
					'div',
					{ className: 'lawu-files' },
					h('div', { className: 'lawu-files-h' }, h('b', null, '资料文件'), h('span', { className: 'lawu-sm lawu-muted' }, props.loading ? '扫描中…' : '（尚未扫描）')),
				)
			}
			var dirs = (scan.dirs || []).filter(function (d) { return d.enabled && !d.missing && d.files.length > 0 })
			var allFiles = []
			dirs.forEach(function (d) {
				d.files.forEach(function (f) { allFiles.push({ file: f, dir: d.path }) })
			})
			return h(
				'div',
				{ className: 'lawu-files' },
				h(
					'div',
					{ className: 'lawu-files-h' },
					h('b', null, '资料文件'),
					h('span', { className: 'lawu-sm lawu-muted' }, '共 ' + scan.total + ' 个文件' + (scan.truncated ? '（已达扫描上限）' : '')),
					(scan.dirs || [])
						.filter(function (d) { return d.error })
						.map(function (d, i) {
							return h('span', { className: 'lawu-sm', key: i, style: { color: 'var(--state-error,#963f3b)' } }, dirName(d.path) + '：' + d.error)
						}),
					h('div', { style: { flex: 1 } }),
					h(Btn, { onClick: function () { props.onHide() } }, '收起'),
				),
				allFiles.length === 0
					? h('div', { className: 'lawu-pad lawu-sm lawu-muted' }, scan.total === 0 ? '这些文件夹里没有可识别的资料文件（支持 md / txt / pdf / docx / 图片）。' : '文件都在被屏蔽的文件夹里。')
					: allFiles.slice(0, 200).map(function (item, i) {
							return h(
								'div',
								{ className: 'lawu-file', key: i, onClick: function () { props.onOpenFile(item.file) } },
								h('span', { className: 'n' }, (item.file.readable ? '📄 ' : '📎 ') + item.file.rel),
								h('span', { className: 'd' }, dirName(item.dir)),
								h('span', { className: 's' }, fmtSize(item.file.bytes)),
							)
						}),
			)
		}

		/** 资料 / 笔记预览：Markdown 渲染，[[双链]] 可点跳转 */
		function PreviewModal(props) {
			var doc = props.doc
			if (!doc) return null
			return h(
				'div',
				{
					className: 'lawu-modal',
					onClick: function (e) {
						if (e.target === e.currentTarget) props.onClose()
					},
				},
				h(
					'div',
					null,
					h(
						'div',
						{ className: 'lawu-modal-h' },
						h('b', null, doc.title || doc.name || ''),
						h('span', { className: 'lawu-mono', style: { maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, doc.path),
						h(Btn, { onClick: function () { props.onOpenFolder(doc.path) } }, '打开所在目录'),
						h(Btn, { onClick: function () { props.onAsk(doc) }, title: '让明律基于这份资料继续工作' }, '交给明律'),
						h(Btn, { onClick: props.onClose }, '关闭'),
					),
					h(
						'div',
						{ className: 'lawu-modal-b' },
						doc.loading ? h(Empty, null, '读取中…') : null,
						doc.error ? h('div', { className: 'lawu-card', style: { borderColor: 'var(--state-error,#963f3b)' } }, doc.error) : null,
						doc.readable === false ? h(Empty, null, doc.hint || '这个格式工作台不直接渲染，交给明律处理。') : null,
						doc.frontmatterText ? h('div', { className: 'lawu-fm' }, doc.frontmatterText) : null,
						doc.body ? h(MarkdownLite, { text: doc.body, onWiki: props.onWiki }) : null,
						doc.links && doc.links.length > 0
							? h(
									'div',
									{ style: { marginTop: '12px' } },
									h('div', { className: 'lawu-h2' }, '双链（点击跳转）'),
									doc.links.map(function (t, i) {
										return h('button', { key: i, className: 'lawu-wiki', style: { marginRight: '10px' }, onClick: function () { props.onWiki(t) } }, '[[' + t + ']]')
									}),
								)
							: null,
					),
				),
			)
		}

		/** 我的笔记：按 frontmatter 展示（kind / summary / tags / 出链数） */
		function NotesPanel(props) {
			var info = props.notes
			if (!info) {
				return h('div', { className: 'lawu-files' }, h('div', { className: 'lawu-files-h' }, h('b', null, '笔记库'), h('span', { className: 'lawu-sm lawu-muted' }, '读取中…')))
			}
			var items = info.items || []
			return h(
				'div',
				{ className: 'lawu-files' },
				h(
					'div',
					{ className: 'lawu-files-h' },
					h('b', null, '笔记库'),
					h('span', { className: 'lawu-sm lawu-muted' }, items.length + ' 篇 · 目录 ' + (info.roots || []).map(dirName).join('、')),
					h('div', { style: { flex: 1 } }),
					(info.roots || []).map(function (r, i) {
						return h(Btn, { key: i, onClick: function () { props.onOpenFolder(r) } }, '打开 ' + dirName(r))
					}),
				),
				items.length === 0
					? h('div', { className: 'lawu-pad lawu-sm lawu-muted' }, '还没有笔记。让明律把这次分析整理成笔记（它会按 Obsidian 双链格式写到笔记目录），或先挂一个已有笔记文件夹。')
					: items.slice(0, 60).map(function (n, i) {
							return h(
								'div',
								{ className: 'lawu-file', key: i, style: { gridTemplateColumns: '1fr 150px 90px' }, onClick: function () { props.onOpenNote(n) } },
								h(
									'span',
									{ className: 'n' },
									(n.isMaster ? '🗂️ ' : '🗒️ ') + n.title,
									n.summary ? h('span', { className: 'lawu-sm lawu-muted' }, ' · ' + clip(n.summary, 60)) : null,
									(n.tags || []).slice(0, 4).map(function (t, j) {
										return h('span', { className: 'lawu-tagpill', key: j }, '#' + t)
									}),
								),
								h('span', { className: 'd' }, (n.kind || n.module || '') + ((n.links || []).length ? ' · 出链 ' + n.links.length : '')),
								h('span', { className: 's' }, fmtDay(n.updated || new Date(n.mtime).toISOString())),
							)
						}),
			)
		}

		// ── 工作台本体 ───────────────────────────────────────────────────────

		function Workspace() {
			var open = useStore(uiStore).open
			var dark = useStore(themeStore).dark
			var navState = React.useState('home')
			var nav = navState[0]
			var setNav = navState[1]
			var navOpenState = React.useState(false)
			var navOpen = navOpenState[0]
			var setNavOpen = navOpenState[1]
			var dataState = React.useState(null)
			var data = dataState[0]
			var setData = dataState[1]
			var errState = React.useState('')
			var err = errState[0]
			var setErr = errState[1]
			var busyState = React.useState(false)
			var busy = busyState[0]
			var setBusy = busyState[1]
			var toastState = React.useState(null)
			var toast = toastState[0]
			var setToast = toastState[1]
			var asideState = React.useState(true)
			var asideOpen = asideState[0]
			var setAsideOpen = asideState[1]
			var revealState = React.useState({})
			var reveal = revealState[0]
			var setReveal = revealState[1]
			var extraState = React.useState({})
			var extra = extraState[0]
			var setExtra = extraState[1]
			var dueOnlyState = React.useState(true)
			var dueOnly = dueOnlyState[0]
			var setDueOnly = dueOnlyState[1]
			var queryState = React.useState('')
			var query = queryState[0]
			var setQuery = queryState[1]

			// ── 资料来源 / 笔记 状态 ──
			var srcState = React.useState(null)
			var sourcesInfo = srcState[0]
			var setSourcesInfo = srcState[1]
			var scanState = React.useState({})
			var scans = scanState[0]
			var setScans = scanState[1]
			var filesOpenState = React.useState(false)
			var filesOpen = filesOpenState[0]
			var setFilesOpen = filesOpenState[1]
			var docState = React.useState(null)
			var doc = docState[0]
			var setDoc = docState[1]
			var pickingState = React.useState(false)
			var picking = pickingState[0]
			var setPicking = pickingState[1]
			var notesState = React.useState(null)
			var notesInfo = notesState[0]
			var setNotesInfo = notesState[1]
			/** 有资料来源面板的模块（首页与设置除外） */
			var SOURCE_MODULES = ['engine', 'norms', 'cases', 'drills', 'docs', 'papers', 'moot', 'cards', 'notes']

			// ── 内嵌对话的状态 ──
			var chatState = React.useState({ messages: [], sessions: [], running: false, sessionId: null, title: null, needsSession: true, messageCount: 0, lastSeq: null })
			var chat = chatState[0]
			var setChat = chatState[1]
			var chatModeState = React.useState('closed')
			var chatMode = chatModeState[0]
			var setChatMode = chatModeState[1]
			var inputState = React.useState('')
			var input = inputState[0]
			var setInput = inputState[1]
			var sendingState = React.useState(false)
			var sending = sendingState[0]
			var setSending = sendingState[1]
			/** 对话目标会话：用户选过就一直用它，没选过交给 Host 挑最近的明律会话 */
			var targetRef = React.useRef(null)
			var lastSeqRef = React.useRef(null)

			var refreshChat = React.useCallback(function (sessionId, force) {
				var sid = sessionId || targetRef.current || null
				return call('chat', sid ? { sessionId: sid } : {})
					.then(function (v) {
						// 内容没变就只同步运行态，避免每次轮询都整棵重渲染
						if (!force && v.lastSeq !== null && v.lastSeq === lastSeqRef.current) {
							setChat(function (prev) {
								return Object.assign({}, prev, { running: v.running, sessions: v.sessions, sessionId: v.sessionId, title: v.title })
							})
							return v
						}
						lastSeqRef.current = v.lastSeq
						if (v.sessionId) targetRef.current = v.sessionId
						setChat(v)
						return v
					})
					.catch(function (e) {
						setErr('对话读取失败：' + ((e && e.message) || e))
						return null
					})
			}, [])

			// 对话轮询：工作台打开且对话区没被收起时才有心跳；思考中加快节奏
			React.useEffect(function () {
				if (!open || chatMode === 'closed') return undefined
				refreshChat(null, true)
				var timer = setInterval(function () { refreshChat() }, chat.running ? 1200 : 2500)
				return function () { clearInterval(timer) }
			}, [open, chatMode, chat.running])

			function refresh(caseId) {
				return call('overview', caseId ? { caseId: caseId } : {})
					.then(function (value) {
						setData(value)
						setErr('')
					})
					.catch(function (e) {
						setErr(String((e && e.message) || e))
					})
			}

			React.useEffect(function () {
				if (open && !data) refresh()
			}, [open])

			// 资料来源：工作台一打开就取一次（每个模块的文件夹列表都要用）
			React.useEffect(function () {
				if (open && !sourcesInfo) loadSources()
			}, [open])

			function loadSources() {
				return call('sources', {})
					.then(function (v) {
						setSourcesInfo(v)
						return v
					})
					.catch(function (e) {
						setErr('读取资料来源失败：' + ((e && e.message) || e))
						return null
					})
			}

			function rescan(moduleKey) {
				setScans(function (prev) {
					var next = Object.assign({}, prev)
					delete next[moduleKey]
					return next
				})
				return call('scanModule', { module: moduleKey })
					.then(function (v) {
						setScans(function (prev) {
							return Object.assign({}, prev, { [moduleKey]: v })
						})
						return v
					})
					.catch(function (e) {
						flash('扫描失败：' + ((e && e.message) || e))
						return null
					})
			}

			// 切到某个模块且它挂了文件夹时，自动扫一次
			React.useEffect(function () {
				if (!open || !sourcesInfo) return
				if (SOURCE_MODULES.indexOf(nav) < 0) return
				var info = (sourcesInfo.modules || []).find(function (m) { return m.key === nav })
				if (!info || info.enabledCount === 0) return
				if (scans[nav]) return
				rescan(nav)
				if (nav === 'notes' && !notesInfo) {
					call('notes', {})
						.then(setNotesInfo)
						.catch(function (e) { setErr('读取笔记库失败：' + ((e && e.message) || e)) })
				}
			}, [open, nav, sourcesInfo])

			function openModuleFile(file) {
				setDoc({ path: file.path, name: file.name, loading: true, body: '', links: [] })
				call('readFile', { path: file.path })
					.then(function (v) {
						setDoc({
							path: v.path,
							name: v.name,
							title: v.name,
							loading: false,
							readable: v.readable,
							hint: v.hint,
							body: v.content || '',
							truncated: v.truncated,
							links: [],
						})
					})
					.catch(function (e) {
						setDoc({ path: file.path, name: file.name, loading: false, error: String((e && e.message) || e) })
					})
			}

			function openNote(note) {
				setDoc({ path: note.path, title: note.title, loading: true, body: '', links: [] })
				call('readNote', { path: note.path })
					.then(function (v) {
						setDoc({
							path: v.path,
							title: v.title,
							loading: false,
							body: v.body,
							links: v.links || [],
							frontmatterText: frontmatterText(v.frontmatter),
						})
					})
					.catch(function (e) {
						setDoc({ path: note.path, title: note.title, loading: false, error: String((e && e.message) || e) })
					})
			}

			function frontmatterText(fm) {
				if (!fm || Object.keys(fm).length === 0) return ''
				var lines = ['---']
				Object.keys(fm).forEach(function (key) {
					var value = fm[key]
					if (Array.isArray(value)) lines.push(key + ': [' + value.join(', ') + ']')
					else if (value !== null && value !== undefined && value !== '') lines.push(key + ': ' + value)
				})
				lines.push('---')
				return lines.join('\n')
			}

			/** 点 [[双链]]：按标题解析到笔记并打开 */
			function openWiki(title) {
				call('resolveWiki', { title: title })
					.then(function (v) {
						setDoc({
							path: v.content.path,
							title: v.content.title,
							loading: false,
							body: v.content.body,
							links: v.content.links || [],
							frontmatterText: frontmatterText(v.content.frontmatter),
						})
					})
					.catch(function (e) {
						flash('没有找到这篇笔记：' + title + '（' + ((e && e.message) || e) + '）')
					})
			}

			/** 选文件夹：优先用宿主的原生目录选择器（uiWorkspace.pickDirectory） */
			function pickFolder(moduleKey) {
				var picker = null
				try {
					picker = pluginCtx && typeof pluginCtx.get === 'function' ? pluginCtx.get('uiWorkspace') : null
				} catch (e) {
					picker = null
				}
				if (!picker || typeof picker.pickDirectory !== 'function') {
					flash('这个界面取不到目录选择器，请点「手动输入路径」填绝对路径。')
					return
				}
				setPicking(true)
				Promise.resolve(picker.pickDirectory())
					.then(function (path) {
						setPicking(false)
						if (path) addSource(moduleKey, path)
					})
					.catch(function (e) {
						setPicking(false)
						flash('目录选择器不可用（' + ((e && e.message) || e) + '），请点「手动输入路径」。')
					})
			}

			function addSource(moduleKey, dirPath) {
				var target = String(dirPath || '').trim()
				if (!target) {
					flash('路径为空')
					return
				}
				call('addSource', { module: moduleKey, path: target })
					.then(function () {
						flash('已把文件夹挂到「' + moduleLabel(moduleKey) + '」')
						return loadSources()
					})
					.then(function () { return rescan(moduleKey) })
					.catch(function (e) { flash('添加失败：' + ((e && e.message) || e)) })
			}

			function removeSource(moduleKey, dirPath) {
				call('removeSource', { module: moduleKey, path: dirPath })
					.then(function () {
						flash('已移除文件夹')
						return loadSources()
					})
					.then(function () { return rescan(moduleKey) })
					.catch(function (e) { flash('移除失败：' + ((e && e.message) || e)) })
			}

			function toggleSource(moduleKey, dirPath, enabled) {
				call('toggleSource', { module: moduleKey, path: dirPath, enabled: enabled })
					.then(function () {
						flash(enabled ? '已启用' : '已屏蔽（配置保留）')
						return loadSources()
					})
					.then(function () { return rescan(moduleKey) })
					.catch(function (e) { flash('切换失败：' + ((e && e.message) || e)) })
			}

			function setWriteRoot(moduleKey, dirPath) {
				call('setNotesWritePath', { module: moduleKey, path: dirPath })
					.then(function () {
						flash('生成的笔记将写入：' + dirPath)
						setNotesInfo(null)
						return loadSources()
					})
					.then(function () {
						return call('notes', {}).then(setNotesInfo)
					})
					.catch(function (e) { flash('设置失败：' + ((e && e.message) || e)) })
			}

			function moduleLabel(moduleKey) {
				var info = sourcesInfo && (sourcesInfo.modules || []).find(function (m) { return m.key === moduleKey })
				return (info && info.label) || moduleKey
			}

			// 每个页签按需取数：只有真看那一页时才发请求
			React.useEffect(function () {
				if (!open) return
				if (nav === 'cards' && !extra.cards) {
					call('cards', { dueOnly: dueOnly }).then(function (v) { setExtra(function (p) { return Object.assign({}, p, { cards: v }) }) }).catch(function (e) { setErr(String(e.message || e)) })
				}
				if (nav === 'notes' && !extra.wrong) {
					call('wrong', {}).then(function (v) { setExtra(function (p) { return Object.assign({}, p, { wrong: v }) }) }).catch(function (e) { setErr(String(e.message || e)) })
				}
				if (nav === 'norms' && !extra.norms) {
					call('norms', {}).then(function (v) { setExtra(function (p) { return Object.assign({}, p, { norms: v }) }) }).catch(function (e) { setErr(String(e.message || e)) })
				}
			}, [open, nav, dueOnly])

			function flash(text, extraInfo, options) {
				setToast({ text: text, info: extraInfo || null, close: !!(options && options.close) })
			}

			/** 统一的发送入口：联动按钮与输入框都走这里，保证「发出去的一定进对话」 */
			function send(text) {
				var body = String(text == null ? '' : text).trim()
				if (body === '') return
				setSending(true)
				call('prompt', { text: body, sessionId: targetRef.current || undefined })
					.then(function (v) {
						targetRef.current = v.sessionId
						lastSeqRef.current = null
						setInput('')
						if (chatMode === 'closed') setChatMode('open')
						flash('已发给明律：' + clip(body, 40), v.sessionId)
						return refreshChat(v.sessionId, true)
					})
					.catch(function (e) {
						flash('发送失败：' + ((e && e.message) || e))
					})
					.then(function () {
						setSending(false)
					})
			}

			function newSession() {
				call('newSession', {})
					.then(function (v) {
						targetRef.current = v.sessionId
						lastSeqRef.current = null
						setChatMode('open')
						flash('已新建明律会话' + (v.cwd ? '（' + v.cwd + '）' : ''), v.sessionId)
						return refreshChat(v.sessionId, true)
					})
					.catch(function (e) { flash('新建会话失败：' + ((e && e.message) || e)) })
			}

			var ctx = {
				busy: busy || sending,
				send: send,
				save: function (patch) {
					call('setSettings', patch)
						.then(function (v) {
							setData(function (prev) { return Object.assign({}, prev, { settings: v.settings }) })
							flash('设置已保存')
						})
						.catch(function (e) { flash('保存失败：' + ((e && e.message) || e)) })
				},
				refresh: function () {
					refresh(data && data.activeCaseId)
					setExtra({})
					refreshChat(null, true)
					flash('已刷新')
				},
				openFolder: function (which) {
					call('openFolder', { which: which }).catch(function (e) { flash('打开失败：' + ((e && e.message) || e)) })
				},
				openSession: function () {
					var sid = targetRef.current || chat.sessionId || (data && data.sessions && data.sessions[0] ? data.sessions[0].sessionId : null)
					if (!sid) {
						flash('还没有明律会话：点「新建会话」开一条。')
						return
					}
					var svc = sessionsService()
					if (!svc || typeof svc.open !== 'function') {
						// 兜底：至少让用户一步回到会话界面，而不是卡在浮层里
						flash(
							'取不到会话跳转服务，无法自动打开。关掉工作台后，在左侧列表点开「' +
								(chat.title || sessionLabel((data && data.sessions && data.sessions[0]) || null) || '明律会话') +
								'」即可。',
							null,
							{ close: true },
						)
						return
					}
					try {
						svc.open(sid)
						uiStore.set({ open: false })
					} catch (e) {
						flash('打开会话失败：' + ((e && e.message) || e))
					}
				},
				newSession: newSession,
			}

			function pickCase(caseId) {
				call('setActiveCase', { caseId: caseId })
					.then(function () {
						setExtra({})
						return refresh(caseId)
					})
					.catch(function (e) { flash('切换案件失败：' + ((e && e.message) || e)) })
			}

			if (!open) return null

			var counts = {}
			if (data) {
				counts.notes = data.stats ? data.stats.wrong : 0
				counts.cards = data.stats ? data.stats.cards : 0
				counts.cases = data.stats ? data.stats.cases : 0
			}

			var common = { data: data || { dataRoot: '', disclaimer: '', settings: {}, stats: {}, cases: [], case: null, aside: {}, sessions: [] }, ctx: ctx, extra: extra, query: query }

			var center = null
			if (!data) {
				center = h(Empty, null, err ? '读取学习档案失败：' + err : '正在读取学习档案…')
			} else if (nav === 'home') {
				center = h(SecHome, Object.assign({}, common, { onNav: setNav }))
			} else if (nav === 'norms') {
				center = h(SecNorms, Object.assign({}, common, { onQuery: setQuery }))
			} else if (nav === 'cases') {
				center = h(SecCases, Object.assign({}, common, { onPickCase: pickCase }))
			} else if (nav === 'engine') {
				center = h(SecEngine, common)
			} else if (nav === 'drills') {
				center = h(SecDrills, common)
			} else if (nav === 'docs') {
				center = h(SecDocs, common)
			} else if (nav === 'papers') {
				center = h(SecPapers, common)
			} else if (nav === 'moot') {
				center = h(SecMoot, common)
			} else if (nav === 'cards') {
				center = h(
					SecCards,
					Object.assign({}, common, {
						dueOnly: dueOnly,
						reveal: reveal,
						onFilter: function (v) {
							setDueOnly(v)
							call('cards', { dueOnly: v }).then(function (r) { setExtra(function (p) { return Object.assign({}, p, { cards: r }) }) })
						},
						onReveal: function (id, v) {
							setReveal(function (p) { return Object.assign({}, p, { [id]: v }) })
						},
						onGrade: function (id, quality) {
							call('gradeCard', { id: id, quality: quality })
								.then(function () {
									flash('已记录自测结果（' + quality + '）')
									return call('cards', { dueOnly: dueOnly })
								})
								.then(function (r) { setExtra(function (p) { return Object.assign({}, p, { cards: r }) }) })
								.catch(function (e) { flash('记录失败：' + ((e && e.message) || e)) })
						},
						onExport: function () {
							call('exportAnki', {}).then(function (v) { flash('已导出 ' + v.count + ' 张卡片到 ' + v.path) }).catch(function (e) { flash('导出失败：' + ((e && e.message) || e)) })
						},
					}),
				)
			} else if (nav === 'notes') {
				center = h(
					SecNotes,
					Object.assign({}, common, {
						onQuery: setQuery,
						onReview: function (id, quality) {
							call('reviewWrong', { id: id, quality: quality })
								.then(function () {
									flash('已记录重做结果')
									return call('wrong', {})
								})
								.then(function (r) { setExtra(function (p) { return Object.assign({}, p, { wrong: r }) }) })
								.catch(function (e) { flash('记录失败：' + ((e && e.message) || e)) })
						},
					}),
				)
			} else {
				center = h(SecSettings, common)
			}

			// 资料来源面板 + 资料文件：挂在每个模块页签的最上面（首页与设置不挂）
			if (SOURCE_MODULES.indexOf(nav) >= 0) {
				var srcProps = {
					moduleKey: nav,
					modules: sourcesInfo ? sourcesInfo.modules : [],
					notesInfo: sourcesInfo ? sourcesInfo.notes : null,
					picking: picking,
					scanning: !scans[nav],
					onPickFolder: pickFolder,
					onAdd: addSource,
					onRemove: removeSource,
					onToggle: toggleSource,
					onSetWriteRoot: setWriteRoot,
					onRescan: rescan,
					onOpenFolder: function (p) {
						call('openFolder', { path: p }).catch(function (e) { flash('打开失败：' + ((e && e.message) || e)) })
					},
				}
				var filesNode =
					nav === 'notes'
						? h(NotesPanel, {
								notes: notesInfo,
								onOpenFolder: function (p) {
									call('openFolder', { path: p }).catch(function (e) { flash('打开失败：' + ((e && e.message) || e)) })
								},
								onOpenNote: openNote,
							})
						: h(FilesPanel, {
								scan: scans[nav],
								open: filesOpen,
								loading: !scans[nav],
								onHide: function () { setFilesOpen(false) },
								onOpenFile: openModuleFile,
							})
				center = h(
					'div',
					null,
					h(SourcesBar, srcProps),
					nav !== 'notes'
						? h(
								'div',
								{ className: 'lawu-row', style: { marginBottom: '10px' } },
								h(
									Btn,
									{ onClick: function () { setFilesOpen(!filesOpen) }, disabled: !scans[nav] },
									filesOpen ? '收起资料文件' : '浏览资料文件' + (scans[nav] ? '（' + scans[nav].total + '）' : ''),
								),
							)
						: null,
					filesNode,
					center,
				)
			}

			var PAGE_META = {
				home: ['首页', '学习驾驶舱'],
				norms: ['法条库', '规范依据索引'],
				cases: ['案例库', '案件卷宗'],
				engine: ['法律逻辑与论证', '核心引擎'],
				drills: ['刷题训练', '主观题'],
				docs: ['法律文书练习', '起诉状 · 答辩状 · 代理词'],
				papers: ['论文辅助', '大纲 · 论证校验'],
				moot: ['庭审模拟', '四阶段实训'],
				cards: ['知识点背诵', '双自测 · 间隔复习'],
				notes: ['笔记 · 错题本', '双链笔记'],
				settings: ['设置', '偏好与快捷键'],
			}
			var pageMeta = PAGE_META[nav] || ['法学学习实训工作台', '法律逻辑引擎']
			var curCase = data && data.case

			return h(
				'div',
				{ className: 'lawu-overlay', 'data-theme': dark ? 'dark' : 'light' },
				h(
					'div',
					{ className: 'lawu-top' },
					h('button', { className: 'lawu-btn lawu-hamburger', title: '打开导航', onClick: function () { setNavOpen(true) } }, '☰'),
					h(
						'div',
						{ className: 'lawu-brand' },
						h('b', { className: 'lawu-serif' }, pageMeta[0]),
						h('span', null, pageMeta[1]),
					),
					curCase
						? h('span', { className: 'lawu-chip', title: '当前案件' }, h('i', null), clip(curCase.title, 24) + ' · ' + curCase.subject + ' · ' + curCase.stage)
						: h('span', { className: 'lawu-chip' }, data && data.sessions && data.sessions.length > 0 ? '明律在线：' + clip(sessionLabel(data.sessions[0]), 22) : '未发现明律会话'),
					h('div', { className: 'lawu-top-grow' }),
					h('button', { className: 'lawu-iconbtn', onClick: toggleTheme, title: '切换深浅色主题' }, Icon(dark ? 'sun' : 'moon', 16)),
					h('button', { className: 'lawu-iconbtn', onClick: function () { setAsideOpen(!asideOpen) }, title: '折叠/展开右侧面板' }, asideOpen ? '»' : '«'),
					h(Btn, { onClick: function () { uiStore.set({ open: false }) }, title: '关闭工作台，回到会话界面（对话内容都在，不会丢）' }, '← 返回对话'),
					h('button', { className: 'lawu-iconbtn', title: '关闭工作台', onClick: function () { uiStore.set({ open: false }) } }, '✕'),
				),
				h(
					'div',
					{ className: 'lawu-body', 'data-nav-open': navOpen ? 'true' : 'false', 'data-aside-open': asideOpen ? 'true' : 'false' },
					h(Rail, { nav: nav, counts: counts, onNav: function (id) { setNav(id); setNavOpen(false) } }),
					h('div', { className: 'lawu-rail-backdrop', onClick: function () { setNavOpen(false) } }),
					h(
						'div',
						{ className: 'lawu-main' },
						h(
							'div',
							{ className: 'lawu-scroll lx-scroll', style: chatMode === 'full' ? { display: 'none' } : null },
							h('div', { className: 'lawu-wrap' }, err ? h('div', { className: 'lawu-card', style: { borderColor: 'var(--state-error)' } }, err) : null, center),
						),
						h(ChatDock, {
							chat: chat,
							mode: chatMode,
							input: input,
							sending: sending,
							onMode: setChatMode,
							onInput: setInput,
							onSend: function () { send(input) },
							onNewSession: newSession,
							onOpenReal: ctx.openSession,
							onPickSession: function (sessionId) {
								targetRef.current = sessionId
								lastSeqRef.current = null
								refreshChat(sessionId, true)
							},
						}),
					),
					asideOpen && data ? h(Aside, { aside: data.aside, cases: data.cases, activeCaseId: data.activeCaseId, onPickCase: pickCase, onCollapse: function () { setAsideOpen(false) } }) : null,
				),
				h(
					'div',
					{ className: 'lawu-statusbar' },
					h('span', null, '律思 · 法学学习辅助引擎'),
					h('span', null, '·'),
					h('span', null, '引用法条以现行有效文本为准'),
					h(
						'span',
						{ className: 'lawu-sb-right' },
						h('span', { className: 'lawu-sb-dot' }),
						h('span', null, '逻辑引擎在线'),
					),
				),
				toast
					? h(
							'div',
							{ className: 'lawu-toast' },
							h('div', null, toast.text),
							h(
								'div',
								{ className: 'lawu-row', style: { marginTop: '6px' } },
								toast.info ? h(Btn, { onClick: function () { ctx.openSession() } }, '打开完整会话') : null,
								toast.close
									? h(Btn, {
											onClick: function () {
												uiStore.set({ open: false })
												setToast(null)
											},
										}, '关闭工作台')
									: null,
								h(Btn, { onClick: function () { setToast(null) } }, '知道了'),
							),
						)
					: null,
				h(PreviewModal, {
					doc: doc,
					onClose: function () { setDoc(null) },
					onWiki: openWiki,
					onOpenFolder: function (p) {
						var dir = String(p || '').replace(/[\\/][^\\/]*$/, '')
						call('openFolder', { path: dir || p }).catch(function (e) { flash('打开失败：' + ((e && e.message) || e)) })
					},
					onAsk: function (d) {
						send(
							'请读一下这份资料并把它整理进当前案件：「' +
								d.path +
								'」。读完后按 Obsidian 双链格式整理成笔记（law_note），并与相关案件/要件笔记建立 [[双链]]。',
						)
						setDoc(null)
					},
				}),
			)
		}

		// ── 入口按钮 ─────────────────────────────────────────────────────────

		function EntryButton(props) {
			var open = useStore(uiStore).open
			return h(
				'button',
				{
					className: 'lawu-entry',
					title: '打开法学学习实训工作台',
					onClick: function () {
						uiStore.set({ open: !open })
					},
				},
				h('span', { className: 'ic' }, '⚖️'),
				props.wide ? h('span', null, open ? '关闭工作台' : '实训工作台') : null,
			)
		}

		// ── 插件 ─────────────────────────────────────────────────────────────

		var sessionsSvc = null
		var pluginCtx = null
		/** 诊断：会话服务到底从哪条路取到的（取不到时记录取不到的原因） */
		var sessionsDiag = { via: null, note: '', injected: false }

		/**
		 * 会话服务**在要用的时候才解析**，并且尝试三条路：
		 *   1. `ctx.sessions` —— Cordis 把服务挂在 ctx 上的形态（官方插件主要用它）
		 *   2. `ctx.get('sessions')` —— 可选读取
		 *   3. 动态 `ctx.inject(['sessions'], …)` —— 不阻塞本插件（不写进静态 inject，
		 *      因为一旦服务在这个作用域里永远不可见，静态 inject 会让整个工作台一直不挂载）
		 *
		 * 为什么不写进静态 `inject`：`slots` 是硬依赖（工作台必须挂上），
		 * 而 `sessions` 只影响「打开完整会话」这一个按钮 —— 拿不到就优雅降级，不能连累整个界面。
		 */
		function sessionsService() {
			if (sessionsSvc) return sessionsSvc
			/** 诊断信息用「追加」而不是覆盖：否则先记下的原因会被后一次尝试冲掉 */
			var note = function (text) {
				sessionsDiag.note = sessionsDiag.note ? sessionsDiag.note + '；' + text : text
			}
			if (!pluginCtx) {
				note('no-ctx')
				return null
			}
			try {
				var prop = pluginCtx.sessions
				if (prop) {
					sessionsSvc = prop
					sessionsDiag.via = 'ctx.sessions'
					return sessionsSvc
				}
				note('ctx.sessions=undefined')
			} catch (e) {
				note('ctx.sessions 抛错(' + ((e && e.message) || e) + ')')
			}
			if (typeof pluginCtx.get === 'function') {
				try {
					var found = pluginCtx.get('sessions')
					if (found) {
						sessionsSvc = found
						sessionsDiag.via = 'ctx.get'
						return sessionsSvc
					}
					note('ctx.get=undefined')
				} catch (e) {
					note('ctx.get 抛错(' + ((e && e.message) || e) + ')')
				}
			} else {
				note('ctx 上没有 get')
			}
			return sessionsSvc
		}

		/**
		 * 只把 `slots` 当硬依赖：工作台的 UI 必须能挂上。
		 * `sessions`（会话跳转）走上面的延迟解析三路兜底，缺了只降级一个按钮，不连累界面。
		 */
		var inject = ['slots']

		function apply(ctx) {
			pluginCtx = ctx
			sessionsSvc = null
			sessionsDiag = { via: null, note: '', injected: false }

			// 主题：读当前色系 + 订阅 theme/change（读不到就停在浅色，不阻塞工作台）
			themeSvc = null
			try {
				themeSvc = typeof ctx.get === 'function' ? ctx.get('theme') : null
			} catch (e) {
				themeSvc = null
			}
			syncTheme()
			if (typeof ctx.on === 'function') {
				try {
					ctx.on('theme/change', syncTheme)
				} catch (e) {
					/* 事件注册失败不影响挂载 */
				}
			}

			// 动态注入：服务一出现就绑定；本插件不等它，照常挂载
			try {
				if (typeof ctx.inject === 'function') {
					ctx.inject(['sessions'], function (sctx) {
						try {
							sessionsSvc = (typeof sctx.get === 'function' ? sctx.get('sessions') : null) || sctx.sessions || null
						} catch (e) {
							sessionsSvc = null
						}
						sessionsDiag.injected = !!sessionsSvc
						if (sessionsSvc) sessionsDiag.via = 'dynamic-inject'
						return function () {
							sessionsSvc = null
						}
					})
				} else {
					sessionsDiag.note += '；ctx 上没有 inject'
				}
			} catch (e) {
				sessionsDiag.note += '；inject 调用抛错(' + ((e && e.message) || e) + ')'
			}

			var styleEl = document.createElement('style')
			styleEl.textContent = CSS
			document.head.appendChild(styleEl)
			ctx.effect(function () {
				return function () {
					styleEl.remove()
				}
			}, 'lawagent-ui: css')

			ctx.effect(function () {
				return ctx.slots.inject('sidebar.footer.action', function () {
					return ctx.slots.register({ name: 'sidebar.footer.action', id: 'lawagent-workspace', order: 20, label: function () { return '实训工作台' } }, EntryButton)
				})
			}, 'lawagent-ui: sidebar entry')

			ctx.effect(function () {
				return ctx.slots.inject('shell.overlay', function () {
					return ctx.slots.register({ name: 'shell.overlay', id: 'lawagent-workspace', order: 30, label: function () { return '法学学习实训工作台' } }, Workspace)
				})
			}, 'lawagent-ui: workspace overlay')
		}

		exports.apply = apply
		exports.inject = inject

		/**
		 * 测试接缝（不属于插件契约）：让离线渲染测试能把整棵 UI 与各页签单独渲染一遍，
		 * 在没有浏览器的环境里发现运行时渲染错误。生产路径不依赖它。
		 */
		exports.__test = {
			uiStore: uiStore,
			NAV: NAV,
			sessionLabel: sessionLabel,
			sessionsService: sessionsService,
			sessionsDiag: function () {
				return sessionsDiag
			},
			setPluginCtx: function (next) {
				pluginCtx = next
				sessionsSvc = null
				sessionsDiag = { via: null, note: '', injected: false }
			},
			Workspace: Workspace,
			EntryButton: EntryButton,
			ChatDock: ChatDock,
			MarkdownLite: MarkdownLite,
			SourcesBar: SourcesBar,
			FilesPanel: FilesPanel,
			NotesPanel: NotesPanel,
			PreviewModal: PreviewModal,
			sections: {
				home: SecHome,
				norms: SecNorms,
				cases: SecCases,
				engine: SecEngine,
				drills: SecDrills,
				docs: SecDocs,
				papers: SecPapers,
				moot: SecMoot,
				cards: SecCards,
				notes: SecNotes,
				settings: SecSettings,
			},
		}

		return module.exports
	},
})
