/**
 * 用户导入的动作扩展包（本机存储）。
 * 导入动作统一标记为 pending-review（用户提供、未经正式审核），并记录来源；
 * 搜索与记录可以使用，但详情页会显示待审核状态，避免把用户导入内容冒充为官方审核内容。
 */
export const IMPORTED_EXERCISES_KEY = 'fitlog.importedExercises.v1';
export const IMPORTED_EXERCISES_MAX = 200;

function storageAvailable() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

function sanitizeImported(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of list.slice(0, IMPORTED_EXERCISES_MAX)) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String(raw.id || '').trim();
    const name = String(raw.name || '').trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    result.push({
      ...raw,
      id,
      name,
      origin: 'imported',
      contentStatus: 'pending-review'
    });
  }
  return result;
}

export function loadImportedExercises() {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(IMPORTED_EXERCISES_KEY);
    if (!raw) return [];
    return sanitizeImported(JSON.parse(raw));
  } catch (err) {
    console.warn('[exercises] 读取导入动作失败', err);
    return [];
  }
}

export function saveImportedExercises(list) {
  if (!storageAvailable()) return false;
  try {
    localStorage.setItem(IMPORTED_EXERCISES_KEY, JSON.stringify(sanitizeImported(list)));
    return true;
  } catch (err) {
    console.warn('[exercises] 保存导入动作失败（可能超出浏览器配额）', err);
    return false;
  }
}

export function clearImportedExercises() {
  if (!storageAvailable()) return true;
  try {
    localStorage.removeItem(IMPORTED_EXERCISES_KEY);
    return true;
  } catch {
    return false;
  }
}

export function importedExercisesMeta() {
  const list = loadImportedExercises();
  return {
    count: list.length,
    names: list.slice(0, 8).map((exercise) => exercise.name),
    updatedAt: list.reduce((latest, exercise) => {
      const value = String(exercise.importedAt || exercise.updatedAt || '');
      return value > latest ? value : latest;
    }, '')
  };
}
