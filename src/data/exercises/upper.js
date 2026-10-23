// 上半身动作库汇总入口（胸 / 背 / 肩 / 手臂，共 35 个动作）
// 契约见 docs/CONTRACTS.md 3.2-3.6；由 Lead 的 src/data/exercises/index.js 与下半身动作合并。
// 跨文件引用约定：本文件的 alternatives 只引用上半身动作，避免与 content-lower 并行时产生悬空引用。

import { chestExercises } from './upper-chest.js';
import { backExercises } from './upper-back.js';
import { shouldersExercises } from './upper-shoulders.js';
import { armsExercises } from './upper-arms.js';

export const upperExercises = [
  ...chestExercises,
  ...backExercises,
  ...shouldersExercises,
  ...armsExercises
];

export default upperExercises;
