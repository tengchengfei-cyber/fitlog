/**
 * 确定性动作搜索（纯函数、可重复、不依赖模型）。
 *
 * 设计要点：
 * - 动作库（src/data/exercises/index.js）是唯一可信结果源；本模块不生成/编造动作。
 * - 输入做统一归一化：小写、去空格、去常见标点，因此「lat pulldown」与「latpulldown」等价，
 *   「gao wei xia la」与「gaoweixiala」等价。
 * - 排序权重严格按契约 4.3：
 *   精确中文名 > 名称前缀 > 名称包含 > 已审核中文别名 > 已审核错别字别名 >
 *   英文名/英文别名 > 拼音全拼 > 拼音首字母 > 器械/肌群/模式等相关 > 编辑距离模糊。
 * - 同分时按「名称长度升序 → 拼音全拼字典序 → id 字典序」排序，保证任意输入顺序下结果确定。
 * - 无结果时只返回动作库中已知的近似动作（suggestions），并给出中文原因。
 *
 * @see docs/CONTRACTS.md 4.3
 */
import { EXERCISES, EQUIPMENT, MOVEMENT_PATTERNS } from '../../data/exercises/index.js';
import { MUSCLES_BY_ID, groupName } from '../../data/muscles.js';

export const SEARCH_VERSION = 'search-2026.10.1';
export const MAX_RESULTS = 20;
export const MAX_SUGGESTIONS = 3;

/** 契约验收查询中出现的热门动作（不存在时由调用方自动过滤）。 */
export const POPULAR_EXERCISE_IDS = [
  'lat-pulldown',
  'barbell-bench-press',
  'barbell-squat',
  'dumbbell-row',
  'plank',
  'romanian-deadlift',
  'dumbbell-bench-press',
  'seated-cable-row'
];

const CJK_RE = /[\u3400-\u9fff]/;

/**
 * 权重分层：每一层内部再按精确/前缀/包含递减，保证跨层顺序与契约一致。
 * 器械/肌群等相关匹配使用 filter 类型（结构化元数据命中），真正的编辑距离近似使用 fuzzy。
 */
const SCORE = {
  NAME_EXACT: 1000,
  NAME_PREFIX: 960,
  NAME_CONTAINS: 920,
  ALIAS_EXACT: 900,
  ALIAS_PREFIX: 880,
  ALIAS_CONTAINS: 860,
  TYPO_EXACT: 850,
  TYPO_PREFIX: 830,
  TYPO_CONTAINS: 810,
  EN_NAME_EXACT: 800,
  EN_NAME_PREFIX: 780,
  EN_NAME_CONTAINS: 760,
  EN_ALIAS_EXACT: 750,
  EN_ALIAS_PREFIX: 730,
  EN_ALIAS_CONTAINS: 710,
  PINYIN_EXACT: 600,
  PINYIN_PREFIX: 580,
  PINYIN_CONTAINS: 560,
  INITIALS_EXACT: 520,
  INITIALS_PREFIX: 500,
  INITIALS_CONTAINS: 480,
  RELATED_EXACT: 420,
  RELATED_CONTAINS: 400,
  FUZZY_ZH: 120,
  FUZZY_PINYIN: 110
};

/** 统一归一化：小写、去空白、去常见中英文标点。 */
export function normalizeText(value) {
  return String(value === null || value === undefined ? '' : value)
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[·・.,，。!！?？、:：;；'"“”‘’()（）[\]【】{}<>《》\-_/\\|+*=~`^$#@%&]+/g, '');
}

/** 有界编辑距离（超过 max 立即返回 max+1，便于剪枝）。 */
export function levenshtein(a, b, max = Infinity) {
  if (a === b) return 0;
  const aLength = a.length;
  const bLength = b.length;
  if (Math.abs(aLength - bLength) > max) return max + 1;
  if (aLength === 0) return bLength;
  if (bLength === 0) return aLength;

  let prev = new Array(bLength + 1);
  let curr = new Array(bLength + 1);
  for (let j = 0; j <= bLength; j += 1) prev[j] = j;

  for (let i = 1; i <= aLength; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    const codeA = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLength; j += 1) {
      const cost = codeA === b.charCodeAt(j - 1) ? 0 : 1;
      const next = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr[j] = next;
      if (next < rowMin) rowMin = next;
    }
    if (rowMin > max) return max + 1;
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[bLength] > max ? max + 1 : prev[bLength];
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/** 去掉 query 首尾空白后的原始输入（用于展示/返回），空值转 ''。 */
function normalizeQueryInput(query) {
  return query === null || query === undefined ? '' : String(query).trim();
}

function clampLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MAX_RESULTS;
  return Math.min(Math.max(Math.trunc(numeric), 1), MAX_RESULTS);
}

function passesFilters(exercise, filters) {
  if (filters.equipment && exercise.equipment !== filters.equipment) return false;
  if (filters.pattern && exercise.pattern !== filters.pattern) return false;
  if (filters.muscle) {
    const primary = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
    const secondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
    if (!primary.includes(filters.muscle) && !secondary.includes(filters.muscle)) return false;
  }
  return true;
}

/** 统计动作满足了几项当前筛选（供 suggestions 排序与原因使用）。 */
function countFilterHits(exercise, filters) {
  let hits = 0;
  if (filters.equipment && exercise.equipment === filters.equipment) hits += 1;
  if (filters.pattern && exercise.pattern === filters.pattern) hits += 1;
  if (filters.muscle) {
    const primary = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
    const secondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
    if (primary.includes(filters.muscle) || secondary.includes(filters.muscle)) hits += 1;
  }
  return hits;
}

function filterReasonText(filters) {
  const parts = [];
  if (filters.equipment) parts.push(`器械「${EQUIPMENT[filters.equipment] || filters.equipment}」`);
  if (filters.pattern) parts.push(`动作模式「${MOVEMENT_PATTERNS[filters.pattern] || filters.pattern}」`);
  if (filters.muscle) {
    const muscle = MUSCLES_BY_ID[filters.muscle];
    parts.push(`肌群「${muscle ? muscle.name : filters.muscle}」`);
  }
  return parts.join('、');
}

/**
 * 名称/别名/拼音等文本字段的三档匹配（精确 / 前缀 / 包含）。
 * 单字符查询只允许前缀命中，避免「包含」把结果放大到无关动作。
 */
function matchField(query, field, exactScore, prefixScore, containsScore, matchType, reasonPrefix, reasonValue) {
  if (!field) return null;
  if (field === query) {
    return { score: exactScore, matchType, reason: `${reasonPrefix}：${reasonValue}` };
  }
  if (field.startsWith(query)) {
    return { score: prefixScore, matchType, reason: `${reasonPrefix}（前缀）：${reasonValue}` };
  }
  if (query.length >= 2 && field.includes(query)) {
    return { score: containsScore, matchType, reason: `${reasonPrefix}（包含）：${reasonValue}` };
  }
  return null;
}

/** 器械 / 动作模式 / 肌群 / 标签等相关匹配（结构化筛选元数据）。 */
function relatedHits(exercise, query) {
  const hits = [];
  const seen = new Set();

  const add = (label, kind) => {
    const normalized = normalizeText(label);
    if (!normalized) return;
    let score = 0;
    if (normalized === query) score = SCORE.RELATED_EXACT;
    else if (normalized.includes(query)) score = SCORE.RELATED_CONTAINS;
    if (!score) return;
    const reason = `相关：${kind}「${label}」`;
    if (seen.has(reason)) return;
    seen.add(reason);
    hits.push({ score, matchType: 'filter', reason });
  };

  const equipment = EQUIPMENT[exercise.equipment];
  if (equipment) add(equipment, '器械');

  const pattern = MOVEMENT_PATTERNS[exercise.pattern];
  if (pattern) add(pattern, '动作模式');

  for (const muscleId of Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : []) {
    const muscle = MUSCLES_BY_ID[muscleId];
    if (!muscle) continue;
    add(muscle.name, '主要肌群');
    add(groupName(muscle.groupId), '肌群');
  }
  for (const muscleId of Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : []) {
    const muscle = MUSCLES_BY_ID[muscleId];
    if (!muscle) continue;
    add(muscle.name, '次要肌群');
  }
  for (const tag of Array.isArray(exercise.tags) ? exercise.tags : []) {
    add(tag, '标签');
  }
  return hits;
}

/**
 * 编辑距离模糊匹配。
 * - 中文：仅当查询与目标名称都 > 4 个字符时才允许 1 次编辑（短名称 1 次编辑歧义太大，
 *   这正是「长度 ≤4 时阈值 ≤0」的实现）；错误别名优先命中 typoAliases，不算模糊。
 * - 拼音全拼：允许距离 ≤2（查询长度 ≥3 时启用）。
 */
function fuzzyHits(exercise, query) {
  const hits = [];
  if (CJK_RE.test(query)) {
    const targets = [
      exercise.name,
      ...(Array.isArray(exercise.aliasesZh) ? exercise.aliasesZh : []),
      ...(Array.isArray(exercise.typoAliases) ? exercise.typoAliases : [])
    ];
    for (const raw of targets) {
      const target = normalizeText(raw);
      if (!target || target === query) continue;
      const threshold = query.length > 4 && target.length > 4 ? 1 : 0;
      if (!threshold) continue;
      const distance = levenshtein(query, target, threshold);
      if (distance <= threshold) {
        hits.push({
          score: SCORE.FUZZY_ZH - distance * 10,
          matchType: 'fuzzy',
          reason: `模糊匹配：${raw}（编辑距离 ${distance}）`
        });
      }
    }
    return hits;
  }

  const pinyin = normalizeText(exercise.pinyinFull);
  if (pinyin && query.length >= 3) {
    const distance = levenshtein(query, pinyin, 2);
    if (distance <= 2) {
      hits.push({
        score: SCORE.FUZZY_PINYIN - distance * 10,
        matchType: 'fuzzy',
        reason: `拼音近似：${exercise.pinyinFull}（编辑距离 ${distance}）`
      });
    }
  }
  return hits;
}

/**
 * 对单个动作计算最佳匹配。
 * @returns {{score: number, matchType: string, reasons: string[]}|null}
 */
function matchExercise(exercise, query) {
  const hits = [];

  const name = normalizeText(exercise.name);
  if (name) {
    const hit = matchField(
      query,
      name,
      SCORE.NAME_EXACT,
      SCORE.NAME_PREFIX,
      SCORE.NAME_CONTAINS,
      'exact-name',
      '精确命中名称',
      exercise.name
    );
    if (hit) hits.push(hit);
    // 名称包含的 reason 更直观地展示查询词
    if (hit && hit.score === SCORE.NAME_CONTAINS) hit.reason = `名称包含：${query}`;
  }

  for (const rawAlias of Array.isArray(exercise.aliasesZh) ? exercise.aliasesZh : []) {
    const hit = matchField(
      query,
      normalizeText(rawAlias),
      SCORE.ALIAS_EXACT,
      SCORE.ALIAS_PREFIX,
      SCORE.ALIAS_CONTAINS,
      'alias',
      '命中别名',
      rawAlias
    );
    if (hit) hits.push(hit);
  }

  for (const rawTypo of Array.isArray(exercise.typoAliases) ? exercise.typoAliases : []) {
    const hit = matchField(
      query,
      normalizeText(rawTypo),
      SCORE.TYPO_EXACT,
      SCORE.TYPO_PREFIX,
      SCORE.TYPO_CONTAINS,
      'typo',
      '近似匹配（错别字）',
      rawTypo
    );
    if (hit) hits.push(hit);
  }

  const enName = normalizeText(exercise.enName);
  if (enName) {
    const hit = matchField(
      query,
      enName,
      SCORE.EN_NAME_EXACT,
      SCORE.EN_NAME_PREFIX,
      SCORE.EN_NAME_CONTAINS,
      'english',
      '命中英文名',
      exercise.enName
    );
    if (hit) hits.push(hit);
  }

  for (const rawAlias of Array.isArray(exercise.aliasesEn) ? exercise.aliasesEn : []) {
    const hit = matchField(
      query,
      normalizeText(rawAlias),
      SCORE.EN_ALIAS_EXACT,
      SCORE.EN_ALIAS_PREFIX,
      SCORE.EN_ALIAS_CONTAINS,
      'english',
      '命中英文别名',
      rawAlias
    );
    if (hit) hits.push(hit);
  }

  const pinyinFull = normalizeText(exercise.pinyinFull);
  if (pinyinFull) {
    const hit = matchField(
      query,
      pinyinFull,
      SCORE.PINYIN_EXACT,
      SCORE.PINYIN_PREFIX,
      SCORE.PINYIN_CONTAINS,
      'pinyin',
      '匹配拼音',
      exercise.pinyinFull
    );
    if (hit) hits.push(hit);
  }

  const pinyinInitials = normalizeText(exercise.pinyinInitials);
  if (pinyinInitials && query.length >= 2) {
    const hit = matchField(
      query,
      pinyinInitials,
      SCORE.INITIALS_EXACT,
      SCORE.INITIALS_PREFIX,
      SCORE.INITIALS_CONTAINS,
      'initials',
      '匹配拼音首字母',
      exercise.pinyinInitials
    );
    if (hit) hits.push(hit);
  }

  hits.push(...relatedHits(exercise, query));
  hits.push(...fuzzyHits(exercise, query));

  if (!hits.length) return null;

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.reason.length !== b.reason.length) return a.reason.length - b.reason.length;
    return a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0;
  });

  const reasons = [];
  const seenReasons = new Set();
  for (const hit of hits) {
    if (seenReasons.has(hit.reason)) continue;
    seenReasons.add(hit.reason);
    reasons.push(hit.reason);
    if (reasons.length >= 3) break;
  }

  return { score: hits[0].score, matchType: hits[0].matchType, reasons };
}

/** 确定性排序：相关度 → 名称长度 → 拼音全拼 → id。 */
function compareRanked(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const nameA = a.exercise && a.exercise.name ? String(a.exercise.name) : '';
  const nameB = b.exercise && b.exercise.name ? String(b.exercise.name) : '';
  if (nameA.length !== nameB.length) return nameA.length - nameB.length;
  const pinyinA = a.exercise && a.exercise.pinyinFull ? String(a.exercise.pinyinFull) : '';
  const pinyinB = b.exercise && b.exercise.pinyinFull ? String(b.exercise.pinyinFull) : '';
  if (pinyinA !== pinyinB) return pinyinA < pinyinB ? -1 : 1;
  const idA = a.exercise && a.exercise.id ? String(a.exercise.id) : '';
  const idB = b.exercise && b.exercise.id ? String(b.exercise.id) : '';
  return idA < idB ? -1 : idA > idB ? 1 : 0;
}

/** query 中出现在名称里的中文字（去重、保持顺序）。 */
function sharedCjkChars(query, name) {
  const chars = [];
  const seen = new Set();
  for (const char of String(name || '')) {
    if (!CJK_RE.test(char) || seen.has(char)) continue;
    seen.add(char);
    if (query.includes(char)) chars.push(char);
  }
  return chars;
}

function compareSuggestions(a, b) {
  if (b.relevance !== a.relevance) return b.relevance - a.relevance;
  return compareRanked(a, b);
}

function popularFallback(allExercises, limit) {
  const picked = [];
  const seen = new Set();
  for (const id of POPULAR_EXERCISE_IDS) {
    const exercise = allExercises.find((candidate) => candidate && candidate.id === id);
    if (!exercise || seen.has(exercise.id)) continue;
    seen.add(exercise.id);
    picked.push({ exercise, reason: '常练动作参考：动作库暂无相近项，可先查看常练动作' });
    if (picked.length >= limit) break;
  }
  if (picked.length) return picked;
  // 最后兜底：按确定性顺序取前几个已知动作（仍然只来自动作库）
  const sorted = [...allExercises].sort((a, b) => compareRanked({ exercise: a, score: 0 }, { exercise: b, score: 0 }));
  return sorted.slice(0, limit).map((exercise) => ({
    exercise,
    reason: '常练动作参考：动作库暂无相近项，可先查看常练动作'
  }));
}

/**
 * 无结果时给出最多 3 个「已知近似动作」。
 * 优先编辑距离/拼音/首字/相同字，其次当前筛选相关，最后回落到常练动作（绝不编造动作）。
 */
function buildSuggestions({ query, filters, allExercises, limit }) {
  const scored = [];
  const hasQuery = Boolean(query);
  const activeFilterCount = ['equipment', 'pattern', 'muscle'].filter((key) => Boolean(filters[key])).length;

  if (hasQuery) {
    // 短关键词不做 2 次编辑的「近似推荐」，避免「高翻 → 卷腹」这类噪声。
    const maxNameDistance = query.length >= 4 ? 2 : 1;
    for (const exercise of allExercises) {
      if (!exercise || !exercise.id) continue;
      const name = normalizeText(exercise.name);
      const pinyin = normalizeText(exercise.pinyinFull);
      const nameDistance = name ? levenshtein(query, name, maxNameDistance + 2) : Number.POSITIVE_INFINITY;
      const pinyinDistance = pinyin ? levenshtein(query, pinyin, 5) : Number.POSITIVE_INFINITY;
      const firstCharHit = Boolean(name) && name[0] === query[0];
      const nameContained = name.length >= 2 && (query.includes(name) || name.includes(query)) && name !== query;
      const shared = sharedCjkChars(query, exercise.name);
      const filterHits = countFilterHits(exercise, filters);
      const fullyFiltered = activeFilterCount > 0 && filterHits === activeFilterCount;

      let relevance = 0;
      let reason = '';
      if (nameContained) {
        relevance = 850;
        reason = `名称包含：${exercise.name}`;
      } else if (nameDistance <= maxNameDistance) {
        relevance = 900 - nameDistance * 120;
        reason = `名称接近：${exercise.name}（编辑距离 ${nameDistance}）`;
      } else if (pinyinDistance <= 3) {
        relevance = 800 - pinyinDistance * 100;
        reason = `拼音接近：${exercise.pinyinFull}（编辑距离 ${pinyinDistance}）`;
      } else if (filterHits > 0) {
        relevance = 600 + filterHits * 40;
        reason = `符合当前筛选（${filterReasonText(filters)}）的已知动作`;
      } else if (firstCharHit) {
        relevance = 500;
        reason = `名称首字相同：「${normalizeQueryInput(exercise.name)[0] || ''}」`;
      } else if (shared.length) {
        relevance = 400 + shared.length * 10;
        reason = `与「${query}」含相同字：${shared.join('、')}`;
      } else {
        continue;
      }
      // 优先展示仍然符合当前筛选的近似项，其次才是「筛选外」的近似项。
      if (fullyFiltered) {
        relevance += 300;
      } else if (activeFilterCount > 0) {
        reason += '（不在当前筛选内）';
      }
      scored.push({ exercise, relevance, reason });
    }
    scored.sort(compareSuggestions);
  } else if (filters.equipment || filters.pattern || filters.muscle) {
    for (const exercise of allExercises) {
      if (!exercise || !exercise.id) continue;
      const filterHits = countFilterHits(exercise, filters);
      if (!filterHits) continue;
      scored.push({
        exercise,
        relevance: filterHits * 100,
        reason: `当前筛选无匹配，可查看符合「${filterReasonText(filters)}」已知动作`
      });
    }
    scored.sort(compareSuggestions);
  }

  if (scored.length) {
    return scored.slice(0, limit).map(({ exercise, reason }) => ({ exercise, reason }));
  }
  return popularFallback(allExercises, limit);
}

/**
 * 搜索动作库（纯确定性）。
 *
 * @param {string} query 关键词；空字符串表示只按筛选浏览
 * @param {{
 *   equipment?: string|null,
 *   pattern?: string|null,
 *   muscle?: string|null,
 *   limit?: number,
 *   exercises?: object[]
 * }} [options] exercises 仅用于测试注入数据源，默认使用动作库
 * @returns {{
 *   query: string,
 *   results: Array<{exercise: object, score: number, matchType: string, matchReasons: string[]}>,
 *   suggestions: Array<{exercise: object, reason: string}>,
 *   filtersApplied: {equipment?: string, pattern?: string, muscle?: string}
 * }}
 */
export function searchExercises(query, options = {}) {
  const source = Array.isArray(options.exercises) ? options.exercises : EXERCISES;
  const rawQuery = normalizeQueryInput(query);
  const normalizedQuery = normalizeText(rawQuery);

  const filters = {
    equipment: options.equipment || null,
    pattern: options.pattern || null,
    muscle: options.muscle || null
  };
  const limit = clampLimit(options.limit);

  const pool = source.filter((exercise) => exercise && exercise.id && passesFilters(exercise, filters));
  const filterReasons = [];
  if (filters.equipment) filterReasons.push(`筛选：器械「${EQUIPMENT[filters.equipment] || filters.equipment}」`);
  if (filters.pattern) filterReasons.push(`筛选：动作模式「${MOVEMENT_PATTERNS[filters.pattern] || filters.pattern}」`);
  if (filters.muscle) {
    const muscle = MUSCLES_BY_ID[filters.muscle];
    filterReasons.push(`筛选：肌群「${muscle ? muscle.name : filters.muscle}」`);
  }

  let results = [];
  if (!normalizedQuery) {
    results = pool.map((exercise) => ({
      exercise,
      score: 0,
      matchType: 'filter',
      matchReasons: filterReasons.slice()
    }));
    results.sort(compareRanked);
  } else {
    for (const exercise of pool) {
      const matched = matchExercise(exercise, normalizedQuery);
      if (!matched) continue;
      results.push({
        exercise,
        score: matched.score,
        matchType: matched.matchType,
        matchReasons: matched.reasons
      });
    }
    results.sort(compareRanked);
  }
  results = results.slice(0, limit);

  const suggestions = results.length === 0
    ? buildSuggestions({
        query: normalizedQuery,
        filters,
        allExercises: source.filter((exercise) => exercise && exercise.id),
        limit: MAX_SUGGESTIONS
      })
    : [];

  const filtersApplied = {};
  if (filters.equipment) filtersApplied.equipment = filters.equipment;
  if (filters.pattern) filtersApplied.pattern = filters.pattern;
  if (filters.muscle) filtersApplied.muscle = filters.muscle;

  return {
    query: rawQuery,
    results,
    suggestions,
    filtersApplied
  };
}

/** 首次进入图鉴时展示的常练动作（全部来自动作库）。 */
export function listPopularExercises(limit = 6, exercises = EXERCISES) {
  const source = Array.isArray(exercises) ? exercises : EXERCISES;
  const picked = [];
  const seen = new Set();
  for (const id of POPULAR_EXERCISE_IDS) {
    const exercise = source.find((candidate) => candidate && candidate.id === id);
    if (!exercise || seen.has(exercise.id)) continue;
    seen.add(exercise.id);
    picked.push(exercise);
    if (picked.length >= limit) break;
  }
  if (picked.length < limit) {
    const rest = source
      .filter((exercise) => exercise && exercise.id && !seen.has(exercise.id))
      .sort((a, b) => compareRanked({ exercise: a, score: 0 }, { exercise: b, score: 0 }));
    for (const exercise of rest) {
      picked.push(exercise);
      if (picked.length >= limit) break;
    }
  }
  return picked;
}
