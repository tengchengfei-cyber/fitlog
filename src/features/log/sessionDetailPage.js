/**
 * 训练详情页（#/history/:sessionId）。
 *
 * - 已完成训练：统计概览、训练后状态自查、逐动作的组数据与备注；
 * - 操作：查看 / 生成分析（跳分析页）、编辑（进编辑模式）、复制本次训练、删除（二次确认）；
 * - 分析快照早于训练最后修改时，提示「分析基于上次保存的版本」并可前往分析页重算；
 * - 草稿（异常入口）展示「继续记录 / 放弃」。
 */
import { el } from '../../app/dom.js';
import {
  screen,
  sectionTitle,
  card,
  button,
  badge,
  callout,
  toast,
  icon,
  bottomBar,
  confirmDialog,
  emptyState,
  statTile,
  disclosure
} from '../../ui/index.js';
import { getSession, deleteSession, repeatSession } from '../../app/store.js';
import { navigate } from '../../app/router.js';
import { formatDate, formatDateTime, formatTime } from '../../app/format.js';
import { exerciseSetCounts, sessionStats } from './sessionOps.js';
import {
  analysisMetaText,
  analysisState,
  durationLabel,
  goalBadge,
  postCheckBadge,
  postCheckCallout,
  safetyDisclaimerText,
  sessionExerciseSubtitle,
  sessionTitleText,
  sessionVolumeMeta,
  setWeightLabel
} from './logShared.js';

function iconAction(iconName, label, onClick, { className = '', danger = false } = {}) {
  return el(
    'button',
    {
      className: `log-icon-btn ${danger ? 'log-icon-btn--danger' : ''} ${className}`.trim(),
      type: 'button',
      'aria-label': label,
      title: label,
      onClick
    },
    icon(iconName, { size: 18 })
  );
}

function notFoundPage() {
  return screen({
    title: '训练详情',
    back: '/history',
    className: 'log-screen',
    children: [
      card({
        children: emptyState({
          iconName: 'search',
          title: '没有找到这次训练',
          text: '它可能已被删除，或链接已失效。',
          action: button({
            label: '返回训练历史',
            variant: 'secondary',
            onClick: () => navigate('/history')
          })
        })
      })
    ]
  });
}

// ---------- 只读组行 ----------

function readOnlySetRow(set, index) {
  const cells = [
    el('span', { className: 'log-readonly-set__index', textContent: `第 ${index + 1} 组` }),
    el('span', { className: 'log-readonly-set__weight num', textContent: setWeightLabel(set) }),
    el('span', { className: 'log-readonly-set__reps num', textContent: set.reps === null || set.reps === undefined ? '次数 —' : `× ${set.reps}` })
  ];
  if (set.rpe !== null && set.rpe !== undefined) {
    cells.push(el('span', { className: 'log-readonly-set__tag', textContent: `RPE ${set.rpe}` }));
  }
  if (set.restSec !== null && set.restSec !== undefined) {
    cells.push(el('span', { className: 'log-readonly-set__tag', textContent: `休息 ${set.restSec} 秒` }));
  }
  if (set.perSide) cells.push(badge({ label: '单侧', tone: 'outline' }));
  if (set.kind === 'warmup') cells.push(badge({ label: '热身', tone: 'info' }));

  return el(
    'div',
    { className: 'log-readonly-set' },
    el('div', { className: 'log-readonly-set__cells' }, cells),
    set.note ? el('p', { className: 'log-readonly-set__note', textContent: set.note }) : null
  );
}

function readOnlyExerciseCard(sessionExercise) {
  const counts = exerciseSetCounts(sessionExercise);
  const plannedText = counts.plannedSets === null ? '计划未设定' : `计划 ${counts.plannedSets} 组`;
  const setsWrap = el('div', { className: 'log-readonly-sets' });
  if (!sessionExercise.sets || !sessionExercise.sets.length) {
    setsWrap.appendChild(el('p', { className: 'muted text-sm', textContent: '这次训练没有记录完成组。' }));
  } else {
    sessionExercise.sets.forEach((set, index) => setsWrap.appendChild(readOnlySetRow(set, index)));
  }

  return el(
    'div',
    { className: 'card card--padded log-readonly-exercise' },
    el(
      'div',
      { className: 'log-readonly-exercise__head' },
      el(
        'div',
        { className: 'log-readonly-exercise__titles' },
        el('h3', { className: 'log-readonly-exercise__title', textContent: sessionExercise.exerciseName }),
        el('p', {
          className: 'log-readonly-exercise__meta',
          textContent: sessionExerciseSubtitle(sessionExercise)
        })
      ),
      el('span', {
        className: 'log-readonly-exercise__counts',
        textContent: `${plannedText} · 已完成 ${counts.completedSets} 组`
      })
    ),
    setsWrap,
    sessionExercise.note
      ? el(
          'div',
          { className: 'log-readonly-exercise__note' },
          icon('text', { size: 15 }),
          el('span', { textContent: sessionExercise.note })
        )
      : null
  );
}

// ---------- 页面 ----------

export function sessionDetailPage(ctx = {}) {
  const params = ctx.params || {};
  const session = params.sessionId ? getSession(params.sessionId) : null;
  if (!session) return notFoundPage();

  // 草稿：给出继续 / 放弃，而不是详情
  if (session.status === 'draft') {
    const stats = sessionStats(session);
    return screen({
      title: '未完成的训练',
      subtitle: `${formatDate(session.startedAt)} ${formatTime(session.startedAt)} · 已自动保存`,
      back: '/history',
      className: 'log-screen log-detail-screen',
      children: [
        card({
          className: 'resume-card',
          children: [
            el(
              'div',
              { className: 'resume-card__head' },
              el('div', { className: 'resume-card__icon' }, icon('timer', { size: 20 })),
              el(
                'div',
                { className: 'resume-card__text' },
                el('div', { className: 'resume-card__title', textContent: sessionTitleText(session) }),
                el('div', {
                  className: 'resume-card__sub',
                  textContent: `${stats.exerciseCount} 个动作 · 已记录 ${stats.completedSetCount} 组`
                })
              )
            )
          ]
        }),
        button({
          label: '继续记录',
          variant: 'primary',
          size: 'lg',
          full: true,
          iconName: 'play',
          onClick: () => navigate(`/log/${session.id}`)
        }),
        el(
          'p',
          { className: 'muted text-xs text-center' },
          '这次训练还是草稿，结束训练后才会写入历史并生成分析。'
        )
      ]
    });
  }

  const stats = sessionStats(session);
  const analysis = analysisState(session);
  const postCheck = session.postCheck || { status: 'ok', note: '' };
  const analysisAvailable = analysis.hasAnalysis;

  const root = screen({
    title: '训练详情',
    subtitle: `${formatDate(session.startedAt)} ${formatTime(session.startedAt)} · ${session.endedAt ? formatTime(session.endedAt) : ''}`,
    back: '/history',
    className: 'log-screen log-detail-screen'
  });
  const body = root.querySelector('.screen__body');

  // 概览
  const volume = sessionVolumeMeta(session);
  const overviewCard = card({
    children: [
      el(
        'div',
        { className: 'log-detail__head' },
        el(
          'div',
          { className: 'log-detail__titles' },
          el('h2', { className: 'log-detail__title', textContent: sessionTitleText(session, 3) }),
          el(
            'div',
            { className: 'log-detail__badges' },
            goalBadge(session.goal),
            postCheckBadge(postCheck.status)
          )
        ),
        el('span', {
          className: 'log-detail__time muted text-xs',
          textContent: `结束于 ${session.endedAt ? formatDateTime(session.endedAt) : '—'}`
        })
      ),
      el(
        'div',
        { className: 'grid-2 mt-3' },
        statTile({ label: '动作', value: String(stats.exerciseCount), hint: '个' }),
        statTile({ label: '完成组数', value: String(stats.completedSetCount), hint: '组（含热身）' }),
        statTile({ label: volume.label, value: volume.valueText, hint: volume.hint }),
        statTile({ label: '时长', value: durationLabel(stats.durationMin), hint: '开始到结束' })
      )
    ]
  });

  body.appendChild(overviewCard);

  const safetyCallout = postCheckCallout(session);
  if (safetyCallout) body.appendChild(safetyCallout);

  if (session.note) {
    body.appendChild(
      card({
        children: [
          el('h3', { className: 'log-detail__section-label', textContent: '本次训练备注' }),
          el('p', { className: 'text-secondary text-sm', textContent: session.note })
        ]
      })
    );
  }

  // 动作与组
  body.appendChild(
    sectionTitle({
      title: '动作与组',
      hint: `${stats.exerciseCount} 个动作 · ${stats.completedSetCount} 组`
    })
  );
  if (!session.exercises || !session.exercises.length) {
    body.appendChild(card({ children: el('p', { className: 'muted text-sm', textContent: '这次训练没有动作记录。' }) }));
  } else {
    for (const sessionExercise of session.exercises) {
      body.appendChild(readOnlyExerciseCard(sessionExercise));
    }
  }

  // 分析
  body.appendChild(sectionTitle({ title: '分析', hint: '基于规则与证据条目的复盘' }));
  const analysisChildren = [];
  if (analysisAvailable) {
    analysisChildren.push(
      el(
        'div',
        { className: 'log-analysis-status' },
        badge({ label: '分析已生成', tone: 'success', iconName: 'chart' }),
        el('p', { className: 'muted text-xs', textContent: analysisMetaText(analysis.meta) })
      )
    );
    if (analysis.stale) {
      analysisChildren.push(
        callout({
          tone: 'warning',
          title: '分析基于上次保存的版本',
          children: ['这次训练在生成分析之后被修改过。可以前往分析页重新生成，让复盘与最新记录一致。']
        })
      );
    }
    analysisChildren.push(
      button({
        label: analysis.stale ? '前往分析页重新生成' : '查看完整分析',
        variant: 'secondary',
        iconName: 'chart',
        full: true,
        onClick: () => navigate(`/analysis/${session.id}`)
      })
    );
  } else {
    analysisChildren.push(
      callout({
        tone: 'info',
        title: '还没有分析快照',
        children: [
          '分析会依据本次记录的组数、重量与训练后状态自查生成规则化复盘；同一份记录可由相同输入复现。'
        ]
      })
    );
    analysisChildren.push(
      button({
        label: '生成分析',
        variant: 'secondary',
        iconName: 'chart',
        full: true,
        onClick: () => navigate(`/analysis/${session.id}`)
      })
    );
  }
  analysisChildren.push(
    disclosure({
      summary: '分析与免责声明',
      iconName: 'shield',
      children: [
        el('p', { textContent: safetyDisclaimerText() }),
        el('p', {
          className: 'mt-2',
          textContent:
            '分析中的肌群分布是「动作通常涉及的肌群映射」估计的直接 / 间接训练暴露，不是精确激活程度或个体剂量。'
        })
      ]
    })
  );
  body.appendChild(card({ children: analysisChildren }));

  // ---------- 操作（底部 sticky） ----------
  function copySession() {
    const draft = repeatSession(session.id);
    if (!draft) {
      toast('复制失败，请稍后重试', { tone: 'danger' });
      return;
    }
    toast('已复制为新的训练草稿', { tone: 'success' });
    navigate(`/log/${draft.id}`);
  }

  function deleteSessionById() {
    confirmDialog({
      title: '删除这次训练？',
      message: `将删除 ${formatDate(session.startedAt)} 的训练记录${
        analysisAvailable ? '及其分析快照' : ''
      }，且不可恢复。`,
      confirmLabel: '删除训练',
      cancelLabel: '取消',
      tone: 'danger',
      onConfirm: () => {
        deleteSession(session.id);
        toast('训练已删除', { tone: 'success' });
        navigate('/history');
      }
    });
  }

  const primary = button({
    label: analysisAvailable ? '查看分析' : '生成分析',
    variant: 'primary',
    size: 'lg',
    iconName: 'chart',
    onClick: () => navigate(`/analysis/${session.id}`)
  });
  const actions = el(
    'div',
    { className: 'log-bottom-actions' },
    iconAction('edit', '编辑这次训练', () => navigate(`/log/${session.id}`)),
    iconAction('copy', '复制本次训练', copySession),
    iconAction('trash', '删除这次训练', deleteSessionById, { danger: true })
  );
  root.appendChild(
    bottomBar({
      className: 'log-bottom-bar log-bottom-bar--detail',
      children: [primary, actions]
    })
  );

  return root;
}
