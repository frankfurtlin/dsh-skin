// GENERATED for dsh-skin by scripts/build.mjs — do not edit by hand.
// Sources: styles/skin.css + client-src/client.js
// Version: 0.1.0
window.__ModuleLoader__.load({
  id: "dsh-skin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
/**
 * dsh-skin — 浏览器侧入口（源码）。
 *
 * GENERATED CLIENT 的源文件：`scripts/build.mjs` 把占位符 `__DSH_SKIN_CSS__`
 * 替换成 `styles/skin.css` 的内容，产出单文件 `client.js`。
 *
 * 职责只有一件：把样式表注入页面一次，并给 <html> 打上 `data-dsh-skin`
 * 作用域属性。不监听 DOM 变化、不改别人节点、不依赖任何 DSH 客户端 API——
 * 这样它对 DSH 版本几乎零耦合，升级时最难坏。
 */
;(() => {
  if (typeof document === 'undefined') return

  const STYLE_ID = 'dsh-skin'
  const CSS = "/*\n * dsh-skin — 视觉基座（只覆盖官方 token，不碰组件类名）\n * =============================================================================\n * 规则：本文件只允许出现两类内容\n *   1) 定义/覆盖 DSH 官方 `--dsw-*` token（颜色、圆角、阴影、焦点环、滚动条）；\n *   2) 作用于本插件自有属性 `html[data-dsh-skin]` 的少量规则。\n * 不允许写 `[class*=\"…\"]` 之类依赖别人 DOM 结构的选择器——那正是 DSH 升级\n * 后\"样式静默失效\"和\"插件互相打架\"的来源。要改组件内部观感，先改 token。\n *\n * 调参入口：下面 `--skin-*` 四个变量是唯一需要改的东西。\n * 改完必须跑 `npm run build && npm run check`（build 会校验每个 --dsw-* 名字\n * 是否真实存在于当前 DSH 的 ui-theme 样式表里）。\n */\n\n:root,\nhtml:root {\n  /* 用 `html:root`（特异性 0,1,1）而不是 `:root`（0,1,0）：官方 token 样式表\n   * 可能在我们之后插入，提高特异性才能保证覆盖与加载顺序无关。\n   * ---- 品牌旋钮（改这里） ---------------------------------------------- */\n  --skin-accent: #3b6fe0;          /* 主色：链接、焦点环、选中态 */\n  --skin-accent-soft: 24%;         /* 选中底色浓度 */\n  --skin-radius-step: 2px;         /* 圆角整体加厚量 */\n  --skin-shadow-slate: 15 23 42;   /* 阴影底色（rgb 分量） */\n\n  --dsw-focus-ring-color: var(--skin-accent);\n  --dsw-alias-state-business-primary: var(--skin-accent);\n  --dsw-alias-brand-primary-new-colorprimary-new-color: var(--skin-accent);\n  --dsw-alias-bg-document-selection: color-mix(in srgb, var(--skin-accent) var(--skin-accent-soft), transparent);\n\n  /* ---- 柔角：整站半径 +2px，面板更润 ---------------------------------- */\n  --dsw-radius-xs: calc(4px + var(--skin-radius-step));\n  --dsw-radius-sm: calc(8px + var(--skin-radius-step));\n  --dsw-radius-md: calc(12px + var(--skin-radius-step));\n  --dsw-radius-lg: calc(16px + var(--skin-radius-step));\n  --dsw-radius-xl: calc(20px + var(--skin-radius-step));\n  --dsw-radius-panel: calc(28px + var(--skin-radius-step));\n\n  /* ---- 阴影：更薄更散，抬升层级但不脏 -------------------------------- */\n  --dsw-shadow-lv1: 0 1px 2px 0 rgb(var(--skin-shadow-slate) / 6%), 0 1px 3px 0 rgb(var(--skin-shadow-slate) / 5%);\n  --dsw-shadow-lv2: 0 4px 12px -2px rgb(var(--skin-shadow-slate) / 9%), 0 2px 6px -2px rgb(var(--skin-shadow-slate) / 6%);\n  --dsw-shadow-lv3: 0 0 1px 0 rgb(0 0 0 / 22%), 0 16px 40px -8px rgb(var(--skin-shadow-slate) / 18%);\n\n  /* ---- 滚动条：主色淡淡参与，不抢视线 -------------------------------- */\n  --dsw-alias-scrollbar-bg-l1: color-mix(in srgb, var(--skin-accent) 22%, transparent);\n  --dsw-alias-scrollbar-bg-l2: color-mix(in srgb, var(--skin-accent) 26%, transparent);\n  --dsw-alias-scrollbar-hover-l1: color-mix(in srgb, var(--skin-accent) 48%, transparent);\n  --dsw-alias-scrollbar-hover-l2: color-mix(in srgb, var(--skin-accent) 52%, transparent);\n}\n\n/* ---------------------------------------------------------------------------\n * 深色：官方把大部分 token 定义在 body[data-ds-dark-theme]（特异性高于 :root），\n * 所以这里必须用同样高的选择器重新覆盖，否则深色下我们的浅色值会被压掉。\n * ------------------------------------------------------------------------- */\nhtml body[data-ds-dark-theme],\nbody[data-ds-dark-theme] {\n  --skin-accent: #7aa2ff;\n  --skin-accent-soft: 34%;\n  --skin-shadow-slate: 0 0 0;\n\n  --dsw-focus-ring-color: var(--skin-accent);\n  --dsw-alias-state-business-primary: var(--skin-accent);\n  --dsw-alias-brand-primary-new-colorprimary-new-color: var(--skin-accent);\n  --dsw-alias-bg-document-selection: color-mix(in srgb, var(--skin-accent) var(--skin-accent-soft), transparent);\n\n  --dsw-shadow-lv1: 0 1px 2px 0 rgb(0 0 0 / 40%);\n  --dsw-shadow-lv2: 0 4px 12px -2px rgb(0 0 0 / 45%), 0 2px 6px -2px rgb(0 0 0 / 35%);\n  --dsw-shadow-lv3: 0 0 1px 0 rgb(0 0 0 / 60%), 0 16px 40px -8px rgb(0 0 0 / 55%);\n\n  --dsw-alias-scrollbar-bg-l1: color-mix(in srgb, var(--skin-accent) 26%, transparent);\n  --dsw-alias-scrollbar-bg-l2: color-mix(in srgb, var(--skin-accent) 30%, transparent);\n  --dsw-alias-scrollbar-hover-l1: color-mix(in srgb, var(--skin-accent) 58%, transparent);\n  --dsw-alias-scrollbar-hover-l2: color-mix(in srgb, var(--skin-accent) 62%, transparent);\n}\n\n/* ---------------------------------------------------------------------------\n * 自有作用域的可见改进：选区与焦点环统一到品牌色，浅/深一致。\n * `html[data-dsh-skin]` 由 client.js 在注入时打上，保证这些规则只在插件生效\n * 时出现（卸载插件后不残留任何影响）。\n * ------------------------------------------------------------------------- */\nhtml[data-dsh-skin] ::selection {\n  background: color-mix(in srgb, var(--skin-accent) var(--skin-accent-soft), transparent);\n  color: inherit;\n}\n\nhtml[data-dsh-skin] :focus-visible {\n  outline: none;\n  box-shadow: 0 0 0 var(--dsw-focus-ring-width, 2px)\n    color-mix(in srgb, var(--skin-accent) 55%, transparent);\n}\n\n/* 移动端不引入任何额外限制：token 覆盖本身对窄屏是安全的，\n * 这里显式声明边界，避免以后有人往本文件里塞布局规则。 */\n@media (max-width: 1023px) {\n  html[data-dsh-skin] {\n    /* 仅保留上述 token 覆盖，不改布局（布局归 dsh-mobile-ux 管）。 */\n    --skin-mobile-note: none;\n  }\n}\n"

  /** 注入样式表，并保证它在 head 末尾（后插入 = 级联里胜出）。 */
  function ensureStyle() {
    if (typeof document.head === 'undefined') return null
    let tag = document.querySelector('style[data-dsh-skin="' + STYLE_ID + '"]')
    if (tag === null) {
      tag = document.createElement('style')
      tag.setAttribute('data-dsh-skin', STYLE_ID)
      tag.textContent = CSS
    }
    // 官方 token 定义在更早的样式表里；把自己的样式表永远放到 head 末尾，
    // 才能在同等特异性下稳定覆盖，而不必使用 !important。
    if (tag.parentNode !== document.head || document.head.lastElementChild !== tag) {
      document.head.appendChild(tag)
    }
    document.documentElement.setAttribute('data-dsh-skin', 'on')
    return tag
  }

  const tag = ensureStyle()

  /** 首屏样式表可能在我们之后才注入（主题/官方 CSS 异步加载），再补一次序。 */
  function restabilize() {
    try {
      ensureStyle()
    } catch {
      /* 注入失败不影响页面本身 */
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restabilize, { once: true })
  }
  // 官方主题样式是异步插入的，固定延迟补一次（低成本，纯幂等操作）。
  setTimeout(restabilize, 300)
  setTimeout(restabilize, 1500)

  /** 供 devtools / 验收脚本读取的状态。 */
  window.__dshSkin = {
    STYLE_ID,
    cssBytes: CSS.length,
    mounted: tag !== null,
    /**
     * 样式表是否仍然在 head 末尾且指向我们的节点。
     * DSH 的 HMR 或主题重载可能替换 head 内容，这个自检让"样式静默消失"
     * 变成一个能被检查出来的状态。
     */
    status() {
      const current = document.querySelector('style[data-dsh-skin="' + STYLE_ID + '"]')
      return {
        present: current !== null,
        lastInHead: current !== null && current.parentNode === document.head && document.head.lastElementChild === current,
        scope: document.documentElement.getAttribute('data-dsh-skin'),
        cssBytes: current !== null ? (current.textContent || '').length : 0,
      }
    },
    /** 重新挂载（主题重载后手动修复用）。 */
    remount() {
      const again = ensureStyle()
      return again !== null
    },
  }
})()

    exports.name = "dsh-skin";
    exports.apply = function apply() {};
    return module.exports;
  },
});
