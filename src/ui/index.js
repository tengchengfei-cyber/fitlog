/**
 * 通用 UI 组件库（无框架）。
 * 约定：所有组件返回 HTMLElement；样式定义在 src/styles/components.css。
 * 业务页面必须复用本文件组件，避免各自发明样式。
 */
import { el } from '../app/dom.js';
import { icon, ICON_NAMES } from './icons.js';
import { goBack, routeHref } from '../app/router.js';

export { el, icon, ICON_NAMES };

// ---------- 按钮 ----------

export function button({
  label,
  variant = 'primary',
  size = 'md',
  iconName,
  full = false,
  disabled = false,
  onClick,
  href,
  type = 'button',
  ariaLabel,
  className = ''
}) {
  const cls = ['btn', `btn--${variant}`, size !== 'md' ? `btn--${size}` : '', full ? 'btn--full' : '', className]
    .filter(Boolean)
    .join(' ');
  const children = [];
  if (iconName) children.push(icon(iconName, { size: size === 'sm' ? 16 : 18 }));
  if (label) children.push(el('span', { className: 'btn__label' }, label));
  if (href) {
    return el(
      'a',
      {
        className: cls,
        href: routeHref(href),
        role: 'button',
        'aria-label': ariaLabel || label || undefined,
        onClick
      },
      children
    );
  }
  return el(
    'button',
    {
      className: cls,
      type,
      disabled,
      'aria-label': ariaLabel || label || undefined,
      onClick
    },
    children
  );
}

export function iconButton({ iconName, label, onClick, href, variant = 'default' }) {
  const cls = `icon-btn icon-btn--${variant}`;
  const child = icon(iconName, { size: 20 });
  if (href) {
    return el('a', { className: cls, href: routeHref(href), 'aria-label': label, title: label }, child);
  }
  return el('button', { className: cls, type: 'button', 'aria-label': label, title: label, onClick }, child);
}

// ---------- 标签 / 徽标 ----------

export function chip({ label, selected = false, onClick, tone = 'default', iconName }) {
  return el(
    'button',
    {
      className: `chip chip--${tone} ${selected ? 'is-selected' : ''}`.trim(),
      type: 'button',
      'aria-pressed': String(selected),
      onClick
    },
    iconName ? icon(iconName, { size: 14 }) : null,
    el('span', {}, label)
  );
}

export function badge({ label, tone = 'neutral', iconName }) {
  return el(
    'span',
    { className: `badge badge--${tone}` },
    iconName ? icon(iconName, { size: 12 }) : null,
    label
  );
}

// ---------- 表单 ----------

export function field({ label, hint, error, children, required = false, className = '' }) {
  const wrap = el('div', { className: `field ${className}`.trim() });
  if (label) {
    wrap.appendChild(
      el(
        'label',
        { className: 'field__label' },
        label,
        required ? el('span', { className: 'field__required', textContent: '必填' }) : null
      )
    );
  }
  wrap.appendChild(el('div', { className: 'field__control' }, children));
  if (hint && !error) wrap.appendChild(el('p', { className: 'field__hint', textContent: hint }));
  if (error) wrap.appendChild(el('p', { className: 'field__error', textContent: error }));
  return wrap;
}

export function textInput({
  value = '',
  placeholder = '',
  onChange,
  onBlur,
  onKeydown,
  type = 'text',
  inputMode,
  maxLength,
  ariaLabel,
  autocomplete,
  enterKeyHint,
  name,
  disabled = false
}) {
  return el('input', {
    className: 'input',
    type,
    name,
    value: value === null || value === undefined ? '' : value,
    placeholder,
    inputMode,
    maxLength,
    autocomplete,
    enterKeyHint,
    disabled,
    'aria-label': ariaLabel || placeholder || undefined,
    onInput: (e) => (onChange ? onChange(e.target.value, e) : null),
    onBlur,
    onKeydown
  });
}

export function textarea({ value = '', placeholder = '', onChange, rows = 3, ariaLabel, maxLength }) {
  return el('textarea', {
    className: 'input input--textarea',
    rows,
    placeholder,
    maxLength,
    'aria-label': ariaLabel || placeholder || undefined,
    onInput: (e) => (onChange ? onChange(e.target.value, e) : null)
  }, value || '');
}

function clamp(value, min, max) {
  let v = value;
  if (min !== undefined && min !== null && v < min) v = min;
  if (max !== undefined && max !== null && v > max) v = max;
  return v;
}

function roundTo(value, step) {
  const digits = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * 数字步进器：− 输入框 +；适合单手操作重量/次数/休息。
 * onChange 收到 number | null。
 */
export function numberStepper({
  value = null,
  min = 0,
  max = 999,
  step = 1,
  suffix = '',
  onChange,
  ariaLabel = '数值',
  placeholder = '—'
}) {
  let current = value === '' ? null : value;
  const input = el('input', {
    className: 'stepper__input',
    type: 'text',
    inputMode: 'decimal',
    value: current === null || current === undefined ? '' : String(current),
    placeholder,
    'aria-label': ariaLabel,
    onInput: (e) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      if (raw !== e.target.value) e.target.value = raw;
      const parsed = raw === '' || raw === '.' ? null : Number(raw);
      current = parsed === null ? null : clamp(parsed, min, max);
      if (onChange) onChange(current);
    },
    onBlur: () => {
      if (current === null) {
        input.value = '';
      } else {
        input.value = String(current);
      }
    }
  });

  function setValue(next) {
    current = clamp(roundTo(next, step), min, max);
    input.value = String(current);
    if (onChange) onChange(current);
  }

  const wrap = el('div', { className: 'stepper' });
  wrap.append(
    el(
      'button',
      {
        className: 'stepper__btn',
        type: 'button',
        'aria-label': `减少${ariaLabel}`,
        onClick: () => setValue((current === null ? (min ?? 0) : current) - step)
      },
      icon('minus', { size: 16 })
    ),
    el('div', { className: 'stepper__field' }, input, suffix ? el('span', { className: 'stepper__suffix', textContent: suffix }) : null),
    el(
      'button',
      {
        className: 'stepper__btn',
        type: 'button',
        'aria-label': `增加${ariaLabel}`,
        onClick: () => setValue((current === null ? (min ?? 0) : current) + step)
      },
      icon('plus', { size: 16 })
    )
  );
  return wrap;
}

export function segmentedControl({ options, value, onChange, name = 'segment' }) {
  const wrap = el('div', { className: 'segmented', role: 'group', 'aria-label': name });
  for (const option of options) {
    const isActive = option.value === value;
    wrap.appendChild(
      el(
        'button',
        {
          className: `segmented__item ${isActive ? 'is-active' : ''}`.trim(),
          type: 'button',
          'aria-pressed': String(isActive),
          onClick: () => onChange && onChange(option.value),
          dataset: { value: option.value }
        },
        option.iconName ? icon(option.iconName, { size: 16 }) : null,
        el('span', {}, option.label)
      )
    );
  }
  return wrap;
}

// ---------- 容器 ----------

export function screen({ title, subtitle, back = false, actions = [], children, className = '' }) {
  const headerChildren = [];
  if (back) {
    if (typeof back === 'string') {
      headerChildren.push(iconButton({ iconName: 'back', label: '返回', href: back }));
    } else {
      headerChildren.push(iconButton({ iconName: 'back', label: '返回', onClick: () => goBack('/') }));
    }
  }
  const titleWrap = el('div', { className: 'screen__titles' });
  if (title) titleWrap.appendChild(el('h1', { className: 'screen__title', textContent: title }));
  if (subtitle) titleWrap.appendChild(el('p', { className: 'screen__subtitle', textContent: subtitle }));
  headerChildren.push(titleWrap);
  if (actions.length) headerChildren.push(el('div', { className: 'screen__actions' }, actions));

  const root = el(
    'section',
    { className: `screen ${className}`.trim() },
    el('header', { className: 'screen__header' }, headerChildren),
    el('div', { className: 'screen__body' }, children)
  );
  return root;
}

export function sectionTitle({ title, hint, action }) {
  return el(
    'div',
    { className: 'section-title' },
    el(
      'div',
      { className: 'section-title__main' },
      el('h2', { className: 'section-title__title', textContent: title }),
      hint ? el('p', { className: 'section-title__hint', textContent: hint }) : null
    ),
    action || null
  );
}

export function card({ children, className = '', padded = true, tone }) {
  return el(
    'div',
    { className: `card ${padded ? 'card--padded' : ''} ${tone ? `card--${tone}` : ''} ${className}`.trim() },
    children
  );
}

export function divider({ space = 16 } = {}) {
  return el('div', { className: 'divider', style: { margin: `${space}px 0` } });
}

export function listItem({ title, subtitle, meta, leading, trailing, onClick, href, className = '' }) {
  const cls = `list-item ${className}`.trim();
  const content = [
    leading ? el('div', { className: 'list-item__leading' }, leading) : null,
    el(
      'div',
      { className: 'list-item__main' },
      el('div', { className: 'list-item__title-row' }, el('span', { className: 'list-item__title', textContent: title }), meta || null),
      subtitle ? el('div', { className: 'list-item__subtitle' }, subtitle) : null
    ),
    trailing ? el('div', { className: 'list-item__trailing' }, trailing) : el('span', { className: 'list-item__chevron' }, icon('chevron-right', { size: 18 }))
  ];
  if (href) {
    return el('a', { className: `${cls} list-item--link`, href: routeHref(href), onClick }, content);
  }
  if (onClick) {
    return el('button', { className: `${cls} list-item--link`, type: 'button', onClick }, content);
  }
  return el('div', { className: cls }, content);
}

export function statTile({ label, value, hint, tone = 'default' }) {
  return el(
    'div',
    { className: `stat stat--${tone}` },
    el('div', { className: 'stat__label', textContent: label }),
    el('div', { className: 'stat__value', textContent: value }),
    hint ? el('div', { className: 'stat__hint', textContent: hint }) : null
  );
}

export function emptyState({ title, text, action, iconName = 'sparkles' }) {
  return el(
    'div',
    { className: 'empty' },
    el('div', { className: 'empty__icon' }, icon(iconName, { size: 26 })),
    el('h3', { className: 'empty__title', textContent: title }),
    text ? el('p', { className: 'empty__text', textContent: text }) : null,
    action || null
  );
}

export function callout({ tone = 'info', title, children, iconName }) {
  const defaultIcon = { info: 'info', warning: 'warning', danger: 'warning', success: 'check', tip: 'lightbulb' }[tone] || 'info';
  return el(
    'div',
    { className: `callout callout--${tone}`, role: tone === 'danger' || tone === 'warning' ? 'alert' : undefined },
    el('div', { className: 'callout__icon' }, icon(iconName || defaultIcon, { size: 18 })),
    el(
      'div',
      { className: 'callout__body' },
      title ? el('p', { className: 'callout__title', textContent: title }) : null,
      el('div', { className: 'callout__content' }, children)
    )
  );
}

// ---------- 进度 / 分布 ----------

export function progressBar({ value = 0, max = 100, label, tone = 'accent' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return el(
    'div',
    { className: `progress progress--${tone}` },
    el('div', {
      className: 'progress__track',
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': String(max),
      'aria-valuenow': String(Math.round(value)),
      'aria-label': label || '进度'
    }, el('div', { className: 'progress__fill', style: { width: `${pct}%` } }))
  );
}

export function meterRow({ label, value = 0, max = 1, valueLabel, tone = 'accent', sublabel }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return el(
    'div',
    { className: 'meter' },
    el(
      'div',
      { className: 'meter__head' },
      el('span', { className: 'meter__label', textContent: label }),
      sublabel ? el('span', { className: 'meter__sublabel', textContent: sublabel }) : null,
      el('span', { className: 'meter__value', textContent: valueLabel })
    ),
    el('div', { className: 'meter__track' }, el('div', { className: `meter__fill meter__fill--${tone}`, style: { width: `${pct}%` } }))
  );
}

// ---------- 底部操作条 ----------

export function bottomBar({ children, className = '' }) {
  return el('div', { className: `bottom-bar ${className}`.trim() }, children);
}

// ---------- 折叠说明 ----------

export function disclosure({ summary, children, open = false, iconName = 'info' }) {
  const details = el('details', { className: 'disclosure', open });
  const summaryEl = el(
    'summary',
    { className: 'disclosure__summary' },
    icon(iconName, { size: 16 }),
    el('span', { className: 'disclosure__summary-text' }, summary),
    el('span', { className: 'disclosure__chevron' }, icon('chevron-down', { size: 16 }))
  );
  details.append(summaryEl, el('div', { className: 'disclosure__body' }, children));
  return details;
}

// ---------- 弹层 / 反馈 ----------

let overlayCount = 0;

function lockScroll(locked) {
  if (locked) {
    overlayCount += 1;
    document.documentElement.classList.add('is-locked');
  } else {
    overlayCount = Math.max(0, overlayCount - 1);
    if (overlayCount === 0) document.documentElement.classList.remove('is-locked');
  }
}

/**
 * 底部抽屉。返回 { root, body, close }。
 */
export function sheet({ title, children, onClose, footer, className = '' }) {
  let closed = false;
  const body = el('div', { className: 'sheet__body' }, children);
  const closeBtn = iconButton({ iconName: 'close', label: '关闭', onClick: () => close() });
  const panel = el(
    'div',
    { className: `sheet ${className}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '弹层' },
    el('div', { className: 'sheet__handle' }),
    el('header', { className: 'sheet__header' }, el('h2', { className: 'sheet__title', textContent: title || '' }), closeBtn),
    body,
    footer ? el('div', { className: 'sheet__footer' }, footer) : null
  );
  const overlay = el(
    'div',
    {
      className: 'sheet-overlay',
      onClick: (e) => {
        if (e.target === overlay) close();
      }
    },
    panel
  );

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    lockScroll(false);
    overlay.classList.add('is-closing');
    setTimeout(() => overlay.remove(), 180);
    if (onClose) onClose();
  }

  document.body.appendChild(overlay);
  lockScroll(true);
  document.addEventListener('keydown', onKeydown);
  const focusable = panel.querySelector('button, [href], input, textarea, select');
  if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 40);
  return { root: overlay, body, close };
}

/** 确认弹窗。返回 { close }；确认/取消通过回调处理。 */
export function confirmDialog({
  title = '确认操作',
  message = '',
  confirmLabel = '确认',
  cancelLabel = '取消',
  tone = 'primary',
  onConfirm,
  onCancel
}) {
  const dialog = sheet({
    title,
    children: el('p', { className: 'dialog__message', textContent: message }),
    footer: el(
      'div',
      { className: 'dialog__actions' },
      button({
        label: cancelLabel,
        variant: 'secondary',
        onClick: () => {
          dialog.close();
          if (onCancel) onCancel();
        }
      }),
      button({
        label: confirmLabel,
        variant: tone === 'danger' ? 'danger' : 'primary',
        onClick: () => {
          dialog.close();
          if (onConfirm) onConfirm();
        }
      })
    )
  });
  return dialog;
}

let toastRoot = null;

export function toast(message, { tone = 'default', duration = 2400 } = {}) {
  if (!toastRoot) {
    toastRoot = el('div', { className: 'toast-root', 'aria-live': 'polite', role: 'status' });
    document.body.appendChild(toastRoot);
  }
  const node = el('div', { className: `toast toast--${tone}` }, message);
  toastRoot.appendChild(node);
  setTimeout(() => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 240);
  }, duration);
  return node;
}
