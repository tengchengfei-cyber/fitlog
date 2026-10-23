/**
 * 动作库聚合入口（唯一可信结果源）。
 * 动作数据按身体区域分文件维护：upper.js / lower.js（内容小组负责），本文件负责合并、去重、建索引。
 * 若某个分片暂未就绪或存在语法错误，不影响其它分片加载，并记录到 DATA_LOAD_ERRORS 供设置页自检展示。
 */

export const DATA_VERSION = 'data-2026.10.22';

export const DATA_LOAD_ERRORS = [];
let upperExercises = [];
let lowerExercises = [];
let importedExercises = [];

try {
  const mod = await import('./upper.js');
  upperExercises = Array.isArray(mod.upperExercises) ? mod.upperExercises : [];
} catch (err) {
  DATA_LOAD_ERRORS.push({ source: 'upper.js', message: String(err && err.message ? err.message : err) });
  console.warn('[data] upper.js 加载失败：', err);
}

try {
  const mod = await import('./lower.js');
  lowerExercises = Array.isArray(mod.lowerExercises) ? mod.lowerExercises : [];
} catch (err) {
  DATA_LOAD_ERRORS.push({ source: 'lower.js', message: String(err && err.message ? err.message : err) });
  console.warn('[data] lower.js 加载失败：', err);
}

// 用户导入的动作扩展包（仅浏览器本机；统一 pending-review，不冒充官方审核内容）。
try {
  const { loadImportedExercises } = await import('../importedExercises.js');
  importedExercises = loadImportedExercises();
} catch (err) {
  DATA_LOAD_ERRORS.push({ source: 'importedExercises', message: String(err && err.message ? err.message : err) });
  console.warn('[data] 导入动作加载失败：', err);
}

function mergeExercises(lists) {
  const seen = new Map();
  const merged = [];
  for (const list of lists) {
    for (const ex of list || []) {
      if (!ex || !ex.id) continue;
      if (seen.has(ex.id)) {
        console.warn('[data] 动作 id 重复，已忽略后者：', ex.id);
        continue;
      }
      seen.set(ex.id, ex);
      merged.push(ex);
    }
  }
  return merged;
}

export const EXERCISES = mergeExercises([upperExercises, lowerExercises, importedExercises]);
export const EXERCISES_BY_ID = Object.fromEntries(EXERCISES.map((ex) => [ex.id, ex]));

export const DATA_SOURCES = {
  upper: upperExercises.length,
  lower: lowerExercises.length,
  imported: importedExercises.length,
  total: EXERCISES.length
};

export function getExercise(id) {
  return EXERCISES_BY_ID[id] || null;
}

export const EQUIPMENT = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  machine: '固定器械',
  'smith-machine': '史密斯机',
  cable: '龙门架 / 绳索',
  bodyweight: '自重',
  kettlebell: '壶铃',
  'ez-bar': 'EZ 曲杆',
  'pull-up-bar': '单杠',
  'resistance-band': '弹力带',
  'cardio-machine': '有氧器械'
};

export const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT).map(([value, label]) => ({ value, label }));

export const MOVEMENT_PATTERNS = {
  'horizontal-push': '水平推',
  'vertical-push': '垂直推',
  'horizontal-pull': '水平拉',
  'vertical-pull': '垂直拉',
  squat: '深蹲',
  hinge: '髋铰链',
  lunge: '单腿蹲',
  'hip-extension': '伸髋',
  'hip-abduction': '髋外展',
  'calf-raise': '提踵',
  'arms-flexion': '屈臂',
  'arms-extension': '伸臂',
  'core-flexion': '核心屈曲',
  'core-anti-extension': '核心抗伸展',
  'core-anti-lateral': '核心抗侧屈',
  carry: '负重行走',
  cardio: '有氧',
  mobility: '活动度'
};

export const PATTERN_OPTIONS = Object.entries(MOVEMENT_PATTERNS).map(([value, label]) => ({ value, label }));

export const DIFFICULTY_LABELS = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高阶'
};

export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }));

export function equipmentLabel(id) {
  return EQUIPMENT[id] || id || '其他';
}

export function patternLabel(id) {
  return MOVEMENT_PATTERNS[id] || id || '其他';
}

export function difficultyLabel(id) {
  return DIFFICULTY_LABELS[id] || id || '未标注';
}

export function isExerciseReady() {
  return EXERCISES.length > 0;
}

/** 替代动作 id → 动作对象（过滤不存在项） */
export function resolveAlternatives(exercise) {
  return (exercise && exercise.alternatives ? exercise.alternatives : [])
    .map((id) => getExercise(id))
    .filter(Boolean);
}
