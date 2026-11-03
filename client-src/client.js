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
  const CSS = '__DSH_SKIN_CSS__'

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
