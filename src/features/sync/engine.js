/**
 * 云同步引擎（Supabase 免费版，可选）。
 *
 * 默认本地模式不做任何联网；配置并登录后才同步。
 * 同步范围：训练记录、草稿、分析快照、训练偏好。
 * 不同步：AI 模型配置/API Key、知识库、导入动作。
 */
import * as store from '../../app/store.js';
import {
  cloudHostLabel,
  clearAuthSession,
  clearCloudConfig,
  isCloudConfigured,
  isManagedCloudConfig,
  loadAuthSession,
  loadCloudConfig,
  loadSyncMeta,
  saveCloudConfig,
  saveSyncMeta
} from './config.js';
import { ensureSession, sendEmailOtp, signOutRemote, verifyEmailOtp } from './auth.js';
import { applySyncDataToState, buildSyncPayload, mergeSyncData } from './merge.js';

const listeners = new Set();
let storeUnsub = null;
let initialised = false;
let applyingRemote = false;
let pushTimer = null;
let syncing = false;

function emit() {
  const status = getCloudStatus();
  for (const listener of listeners) {
    try {
      listener(status);
    } catch (err) {
      console.warn('[sync] 状态订阅者失败', err);
    }
  }
  if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('fitlog-cloud-status', { detail: status }));
  }
}

export function subscribeCloudStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCloudStatus() {
  const config = loadCloudConfig();
  const session = loadAuthSession();
  const meta = loadSyncMeta();
  return {
    configured: isCloudConfigured(config),
    managed: isManagedCloudConfig(),
    host: cloudHostLabel(config),
    loggedIn: Boolean(session && session.user && session.user.id),
    email: (session && session.user && session.user.email) || '',
    lastSyncedAt: meta.lastSyncedAt || null,
    lastError: meta.lastError || null,
    lastAttemptAt: meta.lastAttemptAt || null,
    syncing
  };
}

export function configureCloud({ supabaseUrl, anonKey }) {
  const previous = loadCloudConfig();
  const next = saveCloudConfig({ supabaseUrl, anonKey });
  if (previous.supabaseUrl !== next.supabaseUrl || previous.anonKey !== next.anonKey) {
    clearAuthSession();
    saveSyncMeta({ lastSyncedAt: null, lastError: null });
  }
  emit();
  return next;
}

export function disconnectCloud() {
  clearCloudConfig();
  emit();
}

// ---------- 远程数据 ----------

function restHeaders(config, session, extra = {}) {
  return {
    apikey: config.anonKey,
    authorization: `Bearer ${session.accessToken}`,
    'content-type': 'application/json',
    ...extra
  };
}

async function pullRemote(config, session, { fetchImpl } = {}) {
  const url =
    `${String(config.supabaseUrl).replace(/\/+$/, '')}/rest/v1/user_data` +
    `?select=user_id,data,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}`;
  const fetchFn = fetchImpl || fetch;
  const response = await fetchFn(url, {
    method: 'GET',
    headers: restHeaders(config, session, { accept: 'application/json' })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`读取云端数据失败（${response.status}）：${text.slice(0, 200)}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function pushRemote(config, session, payload, { fetchImpl } = {}) {
  const url = `${String(config.supabaseUrl).replace(/\/+$/, '')}/rest/v1/user_data`;
  const fetchFn = fetchImpl || fetch;
  const response = await fetchFn(url, {
    method: 'POST',
    headers: restHeaders(config, session, {
      prefer: 'resolution=merge-duplicates,return=minimal'
    }),
    body: JSON.stringify({
      user_id: session.user.id,
      data: payload,
      updated_at: payload.updatedAt || new Date().toISOString()
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`保存云端数据失败（${response.status}）：${text.slice(0, 200)}`);
  }
}

// ---------- 用户操作 ----------

export async function sendLoginCode(email, { fetchImpl } = {}) {
  const config = loadCloudConfig();
  if (!isCloudConfigured(config)) return { ok: false, error: '请先填写并保存 Supabase 项目地址与 anon key' };
  return sendEmailOtp(config, email, { fetchImpl });
}

export async function verifyLoginCode(email, code, { fetchImpl } = {}) {
  const config = loadCloudConfig();
  if (!isCloudConfigured(config)) return { ok: false, error: '请先配置云同步' };
  const result = await verifyEmailOtp(config, email, code, { fetchImpl });
  if (!result.ok) return result;
  try {
    await syncNow({ fetchImpl, reason: 'login' });
  } catch (err) {
    return { ok: true, session: result.session, warning: String(err && err.message ? err.message : err) };
  }
  return { ok: true, session: result.session };
}

export async function logoutCloud({ fetchImpl } = {}) {
  const config = loadCloudConfig();
  const session = loadAuthSession();
  if (config && isCloudConfigured(config)) await signOutRemote(config, session, { fetchImpl });
  else clearAuthSession();
  saveSyncMeta({ lastError: null });
  emit();
  return true;
}

export async function deleteCloudTrainingData({ fetchImpl } = {}) {
  const config = loadCloudConfig();
  if (!isCloudConfigured(config)) throw new Error('云同步未配置');
  const session = await ensureSession(config, { fetchImpl });
  if (!session) throw new Error('请先登录');
  const url =
    `${String(config.supabaseUrl).replace(/\/+$/, '')}/rest/v1/user_data` +
    `?user_id=eq.${encodeURIComponent(session.user.id)}`;
  const fetchFn = fetchImpl || fetch;
  const response = await fetchFn(url, {
    method: 'DELETE',
    headers: restHeaders(config, session, { prefer: 'return=minimal' })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`删除云端数据失败（${response.status}）：${text.slice(0, 200)}`);
  }
  saveSyncMeta({ lastSyncedAt: null, lastError: null, lastDeletedAt: new Date().toISOString() });
  emit();
  return true;
}

/**
 * 立即同步：拉取云端 → 与本地合并 → 写回本地 → 推送合并结果。
 * @returns {Promise<{stats: object, pushedAt: string}>}
 */
export async function syncNow({ fetchImpl, reason = 'manual' } = {}) {
  const config = loadCloudConfig();
  if (!isCloudConfigured(config)) throw new Error('云同步未配置');
  const session = await ensureSession(config, { fetchImpl });
  if (!session) throw new Error('登录已过期，请重新登录');
  if (syncing) return { stats: {}, pushedAt: loadSyncMeta().lastSyncedAt || null, skipped: true };
  syncing = true;
  emit();
  try {
    const remote = await pullRemote(config, session, { fetchImpl });
    const localPayload = buildSyncPayload(store.getState());
    const merged = mergeSyncData(localPayload, (remote && remote.data) || {});
    applyingRemote = true;
    store.update((state) => applySyncDataToState(state, merged.data));
    applyingRemote = false;

    const pushPayload = { ...merged.data, updatedAt: new Date().toISOString() };
    await pushRemote(config, session, pushPayload, { fetchImpl });
    saveSyncMeta({ lastSyncedAt: pushPayload.updatedAt, lastError: null, lastAttemptAt: new Date().toISOString(), lastReason: reason });
    emit();
    return { stats: merged.stats, pushedAt: pushPayload.updatedAt };
  } catch (err) {
    saveSyncMeta({ lastError: String(err && err.message ? err.message : err), lastAttemptAt: new Date().toISOString() });
    emit();
    throw err;
  } finally {
    syncing = false;
    applyingRemote = false;
    emit();
  }
}

/** 训练数据变化后延迟推送（只在已配置且登录时生效）。 */
function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    const config = loadCloudConfig();
    if (!isCloudConfigured(config) || !loadAuthSession()) return;
    try {
      await syncNow({ reason: 'auto' });
    } catch (err) {
      console.warn('[sync] 自动同步失败，等待下次重试', err);
    }
  }, 1800);
}

/**
 * 启动时调用一次：订阅本机数据变化 + 自动同步。
 * 未配置/未登录时完全不做网络请求。
 */
export function initCloudSync() {
  if (initialised) return;
  initialised = true;
  storeUnsub = store.subscribe(() => {
    if (applyingRemote) return;
    const config = loadCloudConfig();
    if (!isCloudConfigured(config) || !loadAuthSession()) return;
    schedulePush();
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      const config = loadCloudConfig();
      if (isCloudConfigured(config) && loadAuthSession()) {
        syncNow({ reason: 'online' }).catch(() => {});
      }
    });
  }
  const config = loadCloudConfig();
  if (isCloudConfigured(config) && loadAuthSession()) {
    syncNow({ reason: 'startup' }).catch(() => {});
  }
  return () => {
    if (storeUnsub) storeUnsub();
    storeUnsub = null;
    if (pushTimer) clearTimeout(pushTimer);
  };
}

/** 供测试/调试读取内部状态。 */
export function _syncInternals() {
  return { initialised, syncing, applyingRemote };
}
