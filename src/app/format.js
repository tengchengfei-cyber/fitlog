/**
 * 日期/数字/ID 格式化工具（中文、手机端友好）。
 */

export function newId(prefix = 'id') {
  const uuid = globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${uuid}`;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayISO() {
  return new Date().toISOString();
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function formatDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
}

export function formatDateShort(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < 0) return formatDateTime(d);
  if (isSameDay(d, now)) return `今天 ${formatTime(d)}`;
  if (isSameDay(d, addDays(now, -1))) return `昨天 ${formatTime(d)}`;
  if (diffMs < 7 * dayMs) return `${Math.floor(diffMs / dayMs)} 天前`;
  return formatDate(d);
}

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) return '—';
  const m = Math.max(0, Math.round(Number(minutes)));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} 小时 ${rest} 分` : `${h} 小时`;
}

export function formatNumber(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(rounded).replace(/\.0$/, '');
}

export function formatWeight(kg) {
  if (kg === null || kg === undefined || kg === '') return '—';
  return `${formatNumber(kg, 1)} kg`;
}

export function formatVolume(kg) {
  if (kg === null || kg === undefined) return '—';
  if (kg >= 10000) return `${formatNumber(kg / 1000, 1)} 吨`;
  return `${formatNumber(kg, 0)} kg`;
}

export function pluralSets(n) {
  return `${n} 组`;
}

export function percent(value, digits = 0) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${Math.round(Number(value) * 100 * 10 ** digits) / 10 ** digits}%`;
}
