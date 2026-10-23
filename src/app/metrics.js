/**
 * 训练量/吨位的展示口径工具（Lead 维护）。
 *
 * 背景（项目总监 P1 整改）：
 * - 吨位只有在「全部正式组都同时记录重量与次数」时才是完整总量，才能称为「总吨位」；
 * - 存在缺失组时，只能展示「已记录组估算吨位」，并同时给出覆盖组数与比例；
 * - 单侧组按两侧计（与分析规则层、训练记录统计保持一致）。
 */

import { formatVolume } from './format.js';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

/**
 * 计算一次训练的吨位覆盖情况。
 * @param {object} session Session 对象（含 exercises[].sets[]）
 * @returns {{
 *   workingSetCount: number,   // 已完成的正式组数（不含热身组）
 *   coveredSets: number,       // 同时记录重量与次数的正式组数
 *   ratio: number,             // 覆盖比例 0..1
 *   volumeKg: number|null,     // 已记录组的估算吨位；无任何可计算组时为 null
 *   isComplete: boolean        // 是否 100% 覆盖（仅此时可称「总吨位」）
 * }}
 */
export function summarizeVolume(session) {
  let workingSetCount = 0;
  let coveredSets = 0;
  let volume = 0;

  for (const exercise of (session && session.exercises) || []) {
    for (const set of (exercise && exercise.sets) || []) {
      if (!set || set.kind === 'warmup' || set.completed === false) continue;
      workingSetCount += 1;
      if (!hasValue(set.weightKg) || !hasValue(set.reps)) continue;
      const weight = Number(set.weightKg);
      const reps = Number(set.reps);
      if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue;
      coveredSets += 1;
      volume += weight * reps * (set.perSide ? 2 : 1);
    }
  }

  return {
    workingSetCount,
    coveredSets,
    ratio: workingSetCount > 0 ? coveredSets / workingSetCount : 0,
    volumeKg: coveredSets > 0 ? round1(volume) : null,
    isComplete: workingSetCount > 0 && coveredSets === workingSetCount
  };
}

/**
 * 把覆盖情况转成可直接用于 UI 的文案（label / 数值 / 提示）。
 * @param {ReturnType<typeof summarizeVolume>} summary
 */
export function volumeMeta(summary) {
  const safe = summary || { workingSetCount: 0, coveredSets: 0, ratio: 0, volumeKg: null, isComplete: false };
  const coverageText =
    safe.workingSetCount === 0 ? '本次没有正式组' : `${safe.coveredSets}/${safe.workingSetCount} 组有重量×次数`;
  const label = safe.isComplete ? '总吨位' : '已记录组估算吨位';
  const valueText = safe.volumeKg === null ? '—' : formatVolume(safe.volumeKg);
  const hint = safe.isComplete
    ? '重量 × 次数的完整总量；单侧组按两侧计'
    : `仅统计已记录组（${coverageText}）；不是完整训练总量`;
  return { ...safe, label, valueText, coverageText, hint };
}

/** 便捷入口：直接从 Session 得到展示文案。 */
export function volumeMetaForSession(session) {
  return volumeMeta(summarizeVolume(session));
}
