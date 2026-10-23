/**
 * 演示数据（仅用于原型演示与视觉验收，不会自动写入用户数据）。
 *
 * 使用方式：
 *   - 浏览器打开 `http://127.0.0.1:5180/?demo=1#/`：若本机还没有任何记录，会载入一组演示训练；
 *   - 设置页「载入演示数据」按钮（仅空数据状态可用）。
 *
 * 数据口径：全部为虚构示例，不代表任何真实个人的训练；用于展示历史聚合、分析快照与安全拦截。
 */
import {
  completeSession,
  saveDraft,
  saveSettings,
  getSettings,
  listSessions,
  getDraft,
  saveAnalysis
} from '../app/store.js';
import { newId } from '../app/format.js';
import {
  EXERCISES,
  getExercise,
  equipmentLabel,
  patternLabel
} from '../data/exercises/index.js';
import { MUSCLES, MUSCLES_BY_ID } from '../data/muscles.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function isoAt(daysAgo, hour, minute = 0) {
  const date = new Date(Date.now() - daysAgo * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildSessionExercise(exerciseId, sets, options = {}) {
  const exercise = getExercise(exerciseId);
  if (!exercise) {
    console.warn('[demo] 动作不存在，已跳过：', exerciseId);
    return null;
  }
  const exerciseRowId = newId('se');
  return {
    id: exerciseRowId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    equipmentLabel: equipmentLabel(exercise.equipment),
    patternLabel: patternLabel(exercise.pattern),
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    order: 0,
    sideMode: exercise.unilateral ? 'unilateral' : 'bilateral',
    plannedSets: sets.length,
    note: options.note || '',
    sets: sets.map((set, index) => ({
      id: newId('set'),
      order: index,
      kind: set.kind || 'working',
      weightKg: set.weightKg ?? null,
      reps: set.reps ?? null,
      perSide: Boolean(set.perSide),
      rpe: set.rpe ?? null,
      rir: set.rir ?? null,
      restSec: set.restSec ?? null,
      note: set.note || '',
      completed: true,
      completedAt: isoAt(0, 19, 0)
    }))
  };
}

const DEMO_SESSIONS = [
  {
    id: 's_demo_back',
    daysAgo: 0,
    hour: 19,
    durationMin: 58,
    goal: 'hypertrophy',
    title: '背部 · 垂直拉 + 水平拉',
    exercises: [
      ['lat-pulldown', [
        { weightKg: 60, reps: 10, rpe: 7.5, restSec: 90 },
        { weightKg: 65, reps: 8, rpe: 8, restSec: 90 },
        { weightKg: 65, reps: 8, rpe: 8.5, restSec: 120 }
      ]],
      ['seated-cable-row', [
        { weightKg: 50, reps: 12, rpe: 7, restSec: 90 },
        { weightKg: 55, reps: 10, rpe: 8, restSec: 90 },
        { weightKg: 55, reps: 10, rpe: 8.5, restSec: 120 }
      ]],
      ['face-pull', [
        { weightKg: 20, reps: 15, rpe: 6, restSec: 60 },
        { weightKg: 20, reps: 15, rpe: 6.5, restSec: 60 }
      ]]
    ]
  },
  {
    id: 's_demo_chest',
    daysAgo: 2,
    hour: 18,
    durationMin: 52,
    goal: 'hypertrophy',
    title: '胸部 + 肩部',
    exercises: [
      ['barbell-bench-press', [
        { weightKg: 60, reps: 8, rpe: 8, restSec: 120 },
        { weightKg: 60, reps: 8, rpe: 8.5, restSec: 120 },
        { weightKg: 60, reps: 7, rpe: 9, restSec: 150 }
      ]],
      ['incline-dumbbell-bench-press', [
        { weightKg: 22.5, reps: 10, rpe: 8, restSec: 90 },
        { weightKg: 22.5, reps: 10, rpe: 8, restSec: 90 },
        { weightKg: 22.5, reps: 9, rpe: 9, restSec: 120 }
      ]],
      ['lateral-raise', [
        { weightKg: 8, reps: 15, rpe: 7, restSec: 60 },
        { weightKg: 8, reps: 15, rpe: 7.5, restSec: 60 },
        { weightKg: 8, reps: 13, rpe: 8.5, restSec: 60 }
      ]],
      ['cable-triceps-pushdown', [
        { weightKg: 25, reps: 12, rpe: 7.5, restSec: 60 },
        { weightKg: 25, reps: 12, rpe: 8, restSec: 60 }
      ]]
    ]
  },
  {
    id: 's_demo_legs',
    daysAgo: 4,
    hour: 19,
    durationMin: 66,
    goal: 'strength',
    title: '腿部 · 深蹲主导',
    exercises: [
      ['barbell-squat', [
        { weightKg: 80, reps: 5, rpe: 8, restSec: 180 },
        { weightKg: 80, reps: 5, rpe: 8, restSec: 180 },
        { weightKg: 82.5, reps: 5, rpe: 8.5, restSec: 180 },
        { weightKg: 82.5, reps: 4, rpe: 9, restSec: 180 }
      ]],
      ['romanian-deadlift', [
        { weightKg: 70, reps: 8, rpe: 8, restSec: 120 },
        { weightKg: 70, reps: 8, rpe: 8.5, restSec: 120 },
        { weightKg: 70, reps: 7, rpe: 9, restSec: 120 }
      ]],
      ['leg-press', [
        { weightKg: 120, reps: 12, rpe: 8, restSec: 120 },
        { weightKg: 120, reps: 12, rpe: 8.5, restSec: 120 }
      ]],
      ['standing-calf-raise', [
        { weightKg: 40, reps: 15, rpe: 8, restSec: 60 },
        { weightKg: 40, reps: 15, rpe: 8, restSec: 60 }
      ]]
    ]
  },
  {
    id: 's_demo_core',
    daysAgo: 6,
    hour: 18,
    durationMin: 32,
    goal: 'general',
    title: '核心 · 仅记录组数（演示数据缺口）',
    note: '今天时间紧，只记录了组数，没有填重量和次数。',
    exercises: [
      ['plank', [
        { note: '约 40 秒', restSec: 60 },
        { note: '约 40 秒', restSec: 60 },
        { note: '约 35 秒', restSec: 60 }
      ]],
      ['dead-bug', [
        { reps: 10, restSec: 60 },
        { reps: 10, restSec: 60 },
        { reps: 10, restSec: 60 }
      ]],
      ['hanging-leg-raise', [
        { reps: 8, restSec: 90 },
        { reps: 8, restSec: 90 }
      ]]
    ]
  },
  {
    id: 's_demo_partial',
    daysAgo: 5,
    hour: 18,
    durationMin: 40,
    goal: 'hypertrophy',
    title: '胸部（部分数据，演示估算口径）',
    note: '本次只补记了部分组的重量与次数，其余组只记了完成情况。',
    exercises: [
      ['incline-dumbbell-bench-press', [
        { weightKg: 22.5, reps: 10, rpe: 8, restSec: 90 },
        { weightKg: 22.5, reps: 10, rpe: 8.5, restSec: 90 },
        { reps: 9, note: '漏记重量' },
        { reps: 8, note: '漏记重量' }
      ]]
    ]
  },
  {
    id: 's_demo_negation',
    daysAgo: 3,
    hour: 19,
    durationMin: 35,
    goal: 'strength',
    title: '腿部训练（演示：否定语境不误判）',
    note: '训练中不慎胸痛，休息后缓解；本次记录仅用于演示安全拦截。',
    exercises: [
      ['barbell-squat', [
        { weightKg: 75, reps: 5, rpe: 8, restSec: 180 },
        { weightKg: 75, reps: 5, rpe: 8, restSec: 180 }
      ]],
      ['leg-press', [
        { weightKg: 110, reps: 12, rpe: 7.5, restSec: 120 },
        { weightKg: 110, reps: 12, rpe: 8, restSec: 120 }
      ]]
    ]
  },
  {
    id: 's_demo_redflag',
    daysAgo: 8,
    hour: 20,
    durationMin: 24,
    goal: 'hypertrophy',
    title: '肩部训练（演示：安全拦截）',
    postCheck: {
      status: 'red-flag',
      note: '训练后半段出现胸闷和头晕，已停止训练并休息。'
    },
    exercises: [
      ['dumbbell-shoulder-press', [
        { weightKg: 20, reps: 8, rpe: 8, restSec: 120 },
        { weightKg: 20, reps: 8, rpe: 8.5, restSec: 120 }
      ]],
      ['lateral-raise', [
        { weightKg: 8, reps: 15, rpe: 7.5, restSec: 60 },
        { weightKg: 8, reps: 15, rpe: 8, restSec: 60 }
      ]]
    ]
  },
  {
    id: 's_demo_fullbody',
    daysAgo: 10,
    hour: 17,
    durationMin: 45,
    goal: 'general',
    title: '全身 · 壶铃与行走',
    exercises: [
      ['kettlebell-swing', [
        { weightKg: 16, reps: 15, rpe: 7, restSec: 60 },
        { weightKg: 16, reps: 15, rpe: 7, restSec: 60 },
        { weightKg: 16, reps: 15, rpe: 7.5, restSec: 60 }
      ]],
      ['farmer-carry', [
        { weightKg: 24, reps: 30, note: '约 30 米/趟', restSec: 90 },
        { weightKg: 24, reps: 30, note: '约 30 米/趟', restSec: 90 }
      ]]
    ]
  }
];

function buildSession(spec) {
  const startedAt = isoAt(spec.daysAgo, spec.hour);
  const endedAt = new Date(startedAt).getTime() + (spec.durationMin || 45) * 60 * 1000;
  const exercises = spec.exercises
    .map(([exerciseId, sets], index) => {
      const row = buildSessionExercise(exerciseId, sets);
      if (row) row.order = index;
      return row;
    })
    .filter(Boolean);
  if (!exercises.length) return null;
  return {
    id: spec.id,
    schemaVersion: 1,
    status: 'completed',
    startedAt,
    endedAt: new Date(endedAt).toISOString(),
    goal: spec.goal,
    title: spec.title,
    note: spec.note || '',
    postCheck: spec.postCheck || { status: 'ok', note: '' },
    exercises,
    createdAt: startedAt,
    updatedAt: new Date(endedAt).toISOString()
  };
}

/** 生成并保存演示分析快照（与训练记录完成流程使用同一套规则层/文案层）。 */
async function seedAnalyses(sessions) {
  const [{ analyzeSession, RULES_ENGINE_VERSION }, narrative, evidence, stretches] = await Promise.all([
    import('../features/analysis/rules.js'),
    import('../features/analysis/narrative.js'),
    import('../data/evidence.js'),
    import('../data/stretches.js')
  ]);
  const now = new Date().toISOString();
  const allSessions = listSessions();
  for (const session of sessions) {
    const facts = analyzeSession({
      session,
      sessions: allSessions,
      exercises: EXERCISES,
      muscles: { MUSCLES, MUSCLES_BY_ID },
      evidence: { EVIDENCE_RULES: evidence.EVIDENCE_RULES },
      now
    });
    const narrativeResult = narrative.generateNarrative(facts, {
      evidence: { EVIDENCE_RULES: evidence.EVIDENCE_RULES },
      stretches: stretches.stretchesFor,
      now
    });
    saveAnalysis(session.id, {
      facts,
      narrative: narrativeResult,
      meta: {
        engine: 'template',
        rulesVersion: facts.rulesVersion || RULES_ENGINE_VERSION,
        dataVersion: facts.dataVersion,
        promptVersion: narrative.PROMPT_VERSION,
        model: null,
        providerLabel: null,
        knowledgeSources: [],
        aiFallbackReason: 'not-configured',
        aiError: null,
        generatedAt: facts.generatedAt
      }
    });
  }
}

/** 写入演示数据（会覆盖/追加；仅在空数据或明确允许时调用）。 */
export async function seedDemoData({ allowExisting = false } = {}) {
  if (!allowExisting && (listSessions().length > 0 || getDraft())) {
    return { seeded: false, reason: 'existing-data' };
  }
  const sessions = DEMO_SESSIONS.map(buildSession).filter(Boolean);
  for (const session of sessions) {
    completeSession(session);
  }

  // 未完成草稿：模拟「练到一半」
  const draftExercise = buildSessionExercise('lat-pulldown', [
    { weightKg: 60, reps: 10, rpe: 7 },
    { weightKg: 65, reps: 8, rpe: 8 }
  ]);
  if (draftExercise) {
    const startedAt = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    const draft = {
      id: 's_demo_draft',
      schemaVersion: 1,
      status: 'draft',
      startedAt,
      endedAt: null,
      goal: 'hypertrophy',
      title: '背部训练（进行中）',
      note: '',
      postCheck: { status: 'ok', note: '' },
      exercises: [{ ...draftExercise, order: 0 }],
      createdAt: startedAt,
      updatedAt: startedAt
    };
    saveDraft(draft);
  }

  saveSettings({
    onboarded: true,
    goal: getSettings().goal || 'hypertrophy'
  });

  await seedAnalyses(sessions);
  return { seeded: true, sessions: sessions.length };
}

/** ?demo=1 时自动载入演示数据（已有数据则跳过，避免覆盖真实记录）。 */
export async function maybeSeedDemoData() {
  const params = new URLSearchParams(window.location.search);
  const wantsDemo = params.get('demo') === '1';
  if (!wantsDemo) return false;
  const result = await seedDemoData();
  if (result.seeded) {
    console.info('[demo] 已载入演示数据：', result.sessions, '次训练 + 1 个进行中草稿');
  }
  return result.seeded;
}
