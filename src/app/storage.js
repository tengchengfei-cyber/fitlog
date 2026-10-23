/**
 * localStorage 持久化封装（原型阶段）。schema 版本迁移在此集中处理。
 * 未来接入云端同步时，只需替换本层为远端同步实现，保持相同接口。
 */

const STORAGE_KEY = 'fitlog.state.v1';
const SCHEMA_VERSION = 1;

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (err) {
    console.warn('[storage] 读取本地数据失败，将使用全新状态', err);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[storage] 写入本地数据失败（可能空间不足）', err);
    return false;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** 清除所有本应用前缀的本地数据（训练数据、模型配置/密钥、知识库、导入动作）。 */
export function clearAllAppData() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return false;
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith('fitlog.')) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn('[storage] 清除本机数据失败', err);
    return false;
  }
}

function migrate(state) {
  if (!state || typeof state !== 'object') return null;
  let next = { ...state };
  if (!next.schemaVersion) next.schemaVersion = SCHEMA_VERSION;
  // 预留：版本升级迁移链（v1 -> v2 ...）
  while (next.schemaVersion < SCHEMA_VERSION) {
    next = migrateOne(next);
  }
  return next;
}

function migrateOne(state) {
  const next = { ...state, schemaVersion: Number(state.schemaVersion || 0) + 1 };
  return next;
}

export function storageInfo() {
  let bytes = 0;
  try {
    bytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
  } catch {
    bytes = 0;
  }
  return { key: STORAGE_KEY, bytes, available: isStorageAvailable() };
}

export function isStorageAvailable() {
  try {
    const k = '__fitlog_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export { SCHEMA_VERSION, STORAGE_KEY };
