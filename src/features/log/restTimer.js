/**
 * 组间休息倒计时（纯函数 + 本机持久化）。
 *
 * 设计：
 * - 以 endsAt（结束时间戳）为准，页面刷新/切后台后回来仍能恢复；
 * - 不依赖系统通知，只在应用内展示；完成时震动 + toast；
 * - 默认 90 秒，可按组记录的「休息（秒）」覆盖。
 */
export const REST_TIMER_KEY = 'fitlog.restTimer.v1';
export const DEFAULT_REST_SECONDS = 90;
export const MIN_REST_SECONDS = 15;
export const MAX_REST_SECONDS = 900;

export function clampRestSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return DEFAULT_REST_SECONDS;
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(number)));
}

/** 格式化 mm:ss（超过 59 分钟按 mm:ss 继续，例如 90:00）。 */
export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function createRestTimer({ durationSec = DEFAULT_REST_SECONDS, now = Date.now() } = {}) {
  const duration = clampRestSeconds(durationSec);
  return {
    durationSec: duration,
    startedAt: now,
    endsAt: now + duration * 1000
  };
}

export function remainingSeconds(timer, now = Date.now()) {
  if (!timer || !timer.endsAt) return 0;
  return Math.max(0, Math.ceil((Number(timer.endsAt) - now) / 1000));
}

export function isRestFinished(timer, now = Date.now()) {
  return !timer || remainingSeconds(timer, now) <= 0;
}

/** 加/减休息时间；不会把结束时间减到过去。 */
export function adjustRestTimer(timer, deltaSec, now = Date.now()) {
  if (!timer || !timer.endsAt) return timer;
  const deltaMs = Number(deltaSec) * 1000;
  const nextEndsAt = Math.max(now, Number(timer.endsAt) + deltaMs);
  return {
    ...timer,
    endsAt: nextEndsAt,
    durationSec: Math.max(0, Math.round((nextEndsAt - Number(timer.startedAt || now)) / 1000))
  };
}

export function saveRestTimer(timer) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!timer) {
      localStorage.removeItem(REST_TIMER_KEY);
      return;
    }
    localStorage.setItem(REST_TIMER_KEY, JSON.stringify(timer));
  } catch {
    /* ignore */
  }
}

export function loadRestTimer(now = Date.now()) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(REST_TIMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.endsAt !== 'number') return null;
    if (isRestFinished(parsed, now)) {
      localStorage.removeItem(REST_TIMER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRestTimer() {
  saveRestTimer(null);
}
