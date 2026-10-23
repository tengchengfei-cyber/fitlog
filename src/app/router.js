/**
 * hash 路由：路由表在 src/main.js 注册。
 * 页面模块契约：export function xxxPage(ctx) → HTMLElement
 * ctx = { params, query, path, route }
 */

let routes = [];
let rootEl = null;
let onChange = null;
let current = null;

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return { path: path.replace(/\/+$/, '') || '/', query: new URLSearchParams(queryPart) };
}

function matchRoute(path) {
  for (const route of routes) {
    const params = matchPattern(route.path, path);
    if (params) return { route, params };
  }
  return null;
}

function matchPattern(pattern, path) {
  if (pattern === path) return {};
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(v);
    } else if (p !== v) {
      return null;
    }
  }
  return params;
}

function fallbackError(errorTitle, errorText) {
  const wrap = document.createElement('section');
  wrap.className = 'screen';
  const card = document.createElement('div');
  card.className = 'card card--padded';
  const h = document.createElement('h1');
  h.className = 'screen__title';
  h.textContent = errorTitle;
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = errorText;
  const a = document.createElement('a');
  a.className = 'btn btn--primary';
  a.href = '#/';
  a.textContent = '回到首页';
  card.append(h, p, a);
  wrap.appendChild(card);
  return wrap;
}

async function render() {
  if (!rootEl) return;
  const { path, query } = parseHash();
  const matched = matchRoute(path);
  const ctx = { path, query, params: matched ? matched.params : {}, route: matched ? matched.route : null };
  current = ctx;
  let node;
  if (!matched) {
    node = fallbackError('页面不存在', `没有找到路由 ${path}，可能链接已失效。`);
  } else {
    try {
      const mod = await matched.route.load();
      const renderFn = mod[matched.route.exportName];
      if (typeof renderFn !== 'function') {
        throw new Error(`页面模块缺少导出 ${matched.route.exportName}()：${matched.route.path}`);
      }
      node = await renderFn(ctx);
    } catch (err) {
      console.error('[router] 页面渲染失败', ctx.path, err);
      node = fallbackError('页面加载失败', `「${ctx.path}」暂时无法显示。${err && err.message ? err.message : ''}`);
    }
  }
  if (node instanceof Node) {
    rootEl.replaceChildren(node);
  }
  if (typeof onChange === 'function') onChange(ctx);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

export function initRouter({ routes: routeTable, root, onRouteChange }) {
  routes = routeTable;
  rootEl = root;
  onChange = onRouteChange || null;
  window.addEventListener('hashchange', render);
  return render();
}

export function navigate(path, { replace = false } = {}) {
  const target = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) {
    window.location.replace(target);
  } else {
    window.location.hash = target.slice(1);
  }
}

export function replace(path) {
  navigate(path, { replace: true });
}

export function goBack(fallback = '/') {
  if (window.history.length > 1) {
    window.history.back();
    // 兜底：hash 无变化时（例如直接从外部进入）跳转 fallback
    setTimeout(() => {
      const before = window.location.hash;
      if (!before || before === `#${fallback}`) return;
    }, 120);
  } else {
    navigate(fallback);
  }
}

export function currentRoute() {
  return current;
}

export function routeHref(path) {
  return `#${path.startsWith('/') ? path : `/${path}`}`;
}
