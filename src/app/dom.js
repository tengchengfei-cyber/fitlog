/**
 * 极简 DOM 构建与查询工具（无框架、无 innerHTML 注入用户数据）。
 */

const BOOLEAN_PROPS = new Set(['checked', 'disabled', 'selected', 'readOnly', 'required', 'autofocus', 'multiple']);

function appendChildren(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === true) continue;
    if (Array.isArray(child)) {
      appendChildren(node, child);
    } else if (child instanceof Node) {
      node.appendChild(child);
    } else {
      node.appendChild(document.createTextNode(String(child)));
    }
  }
}

/**
 * el('div', { className: 'card', onClick: fn, dataset: { id } }, 'text', childNode)
 * 事件属性使用 onXxx（如 onClick / onInput / onChange）。
 * 布尔属性（checked/disabled/selected…）直接赋值；value 直接赋值。
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  applyProps(node, props || {});
  appendChildren(node, children);
  return node;
}

export function applyProps(node, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'className') {
      node.className = String(value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(node.dataset, value);
    } else if (key === 'textContent') {
      node.textContent = String(value);
    } else if (key === 'html') {
      // 仅限项目内静态模板使用，禁止拼接用户输入
      node.innerHTML = String(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'value') {
      node.value = value;
    } else if (BOOLEAN_PROPS.has(key)) {
      node[key] = Boolean(value);
    } else if (key === 'ref' && typeof value === 'function') {
      value(node);
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  return node;
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  appendChildren(f, children);
  return f;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/** 事件委托：delegate(root, 'click', '.chip', (event, matchedEl) => {}) */
export function delegate(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) handler(event, target);
  });
  return root;
}

export function mount(parent, node) {
  parent.replaceChildren(node);
  return node;
}
