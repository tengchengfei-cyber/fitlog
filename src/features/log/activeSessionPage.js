/**
 * 训练记录 / 编辑页。
 *
 * 路由：
 * - #/log/active         → 继续最近一份草稿
 * - #/log/:sessionId     → 草稿：继续记录；已完成：编辑模式（保存用 updateSession）
 *
 * 交互要点（契约 4.4）：
 * - 所有草稿修改立即 store.saveDraft，顶部显示「已自动保存」状态；
 * - 每组重量 / 次数 / RPE / 休息用 numberStepper（可手输、±步进）；
 * - 组行支持复制本组、删除；动作卡支持加组、复制上一组、上移 / 下移 / 删除、计划组数、备注；
 * - 底部 sticky 操作条放主 CTA（结束训练 / 保存修改）与添加动作；
 * - 结束训练先弹 sheet：数据完整度 + 训练后状态自查（ok / discomfort / red-flag）+ 备注；
 *   0 个完成组禁止结束；完成后 completeSession → 动态 import 分析模块生成快照 → 跳分析页；
 *   分析模块不可用时仍保存训练并跳历史。
 */
import { el, clear } from '../../app/dom.js';
import {
  screen,
  card,
  button,
  badge,
  callout,
  toast,
  icon,
  bottomBar,
  confirmDialog,
  sheet,
  disclosure,
  statTile,
  textarea,
  numberStepper,
  emptyState,
  sectionTitle
} from '../../ui/index.js';
import {
  getDraft,
  getSession,
  saveDraft,
  updateSession,
  completeSession,
  discardDraft,
  getAnalysis,
  getGoalLabel
} from '../../app/store.js';
import { navigate } from '../../app/router.js';
import { formatDate, formatDateTime, formatTime } from '../../app/format.js';
import {
  cloneAsEditableSession,
  sessionStats,
  canFinish,
  coverage,
  addSet,
  duplicateSet,
  duplicatePreviousSet,
  removeSet,
  updateSet,
  setPlannedSets,
  moveExercise,
  removeExercise,
  addExerciseToSession,
  exerciseSetCounts,
  prepareCompletion
} from './sessionOps.js';
import {
  ANALYSIS_UNAVAILABLE_MESSAGE,
  POST_CHECK_OPTIONS,
  exerciseSnapshotLabels,
  generateAnalysisSnapshot,
  sessionExerciseSubtitle,
  savedAtText,
  sessionVolumeMeta
} from './logShared.js';
import { createExercisePicker } from './exercisePicker.js';
import {
  adjustRestTimer,
  clearRestTimer,
  createRestTimer,
  formatClock,
  loadRestTimer,
  remainingSeconds,
  saveRestTimer
} from './restTimer.js';

// ---------- 小组件（页面内复用） ----------

function iconAction(iconName, label, onClick, { className = '', disabled = false } = {}) {
  return el(
    'button',
    {
      className: `log-icon-btn ${className}`.trim(),
      type: 'button',
      'aria-label': label,
      title: label,
      disabled,
      onClick
    },
    icon(iconName, { size: 18 })
  );
}

function statValueNode(tile) {
  return tile.querySelector('.stat__value');
}

/** 找不到会话 / 没有草稿时的兜底页。 */
function fallbackPage({ title, text, sessionId }) {
  return screen({
    title: '记录训练',
    back: '/history',
    className: 'log-screen',
    children: [
      card({
        children: emptyState({
          iconName: sessionId ? 'search' : 'history',
          title,
          text,
          action: el(
            'div',
            { className: 'log-empty-actions' },
            button({
              label: '新建训练',
              variant: 'primary',
              iconName: 'plus',
              onClick: () => navigate('/log/new')
            }),
            button({
              label: '训练历史',
              variant: 'ghost',
              onClick: () => navigate('/history')
            })
          )
        })
      })
    ]
  });
}

// ---------- 页面 ----------

export function activeSessionPage(ctx = {}) {
  const params = ctx.params || {};
  const requested = params.sessionId ? getSession(params.sessionId) : getDraft();

  if (!requested) {
    return fallbackPage({
      title: params.sessionId ? '没有找到这次训练' : '还没有进行中的训练',
      text: params.sessionId
        ? '它可能已被删除，或链接已失效。可以回到历史列表，或新建一次训练。'
        : '可以先新建一次训练：选好动作后会自动保存草稿，随时回来继续记录。',
      sessionId: Boolean(params.sessionId)
    });
  }

  const editMode = requested.status === 'completed';
  // 草稿直接操作 store 中的对象（saveDraft 按 id 更新）；已完成训练先深拷贝，
  // 只有点「保存修改」才 updateSession，避免未保存的修改写进历史。
  const session = editMode ? cloneAsEditableSession(requested) : requested;

  const root = screen({
    title: editMode ? '编辑训练记录' : '记录训练',
    subtitle: editMode
      ? `已完成训练 · ${formatDateTime(session.endedAt)}`
      : `目标 ${getGoalLabel(session.goal)} · 开始于 ${formatDate(session.startedAt)} ${formatTime(session.startedAt)}`,
    back: editMode ? `/history/${session.id}` : '/history',
    className: 'log-screen log-active-screen'
  });
  const body = root.querySelector('.screen__body');

  // ---------- 顶部状态 ----------
  const modeBadge = editMode
    ? badge({ label: '编辑模式', tone: 'warning' })
    : badge({ label: '草稿自动保存', tone: 'success', iconName: 'check' });
  const autosaveEl = el('span', {
    className: 'log-autosave',
    role: 'status',
    'aria-live': 'polite',
    textContent: editMode ? '修改后请点「保存修改」' : '已自动保存'
  });
  const statusRow = el('div', { className: 'log-status-row' }, modeBadge, autosaveEl);

  // ---------- 统计条 ----------
  const statExerciseTile = statTile({ label: '动作', value: '0', hint: '个' });
  const statSetsTile = statTile({ label: '完成组数', value: '0', hint: '组' });
  const statVolumeTile = statTile({ label: '已记录组估算吨位', value: '—', hint: '仅统计有重量与次数的组' });
  const statVolumeLabelNode = statVolumeTile.querySelector('.stat__label');
  const statVolumeHintNode = statVolumeTile.querySelector('.stat__hint');
  const strategyRow = el('div', { className: 'grid-3' }, statExerciseTile, statSetsTile, statVolumeTile);

  // ---------- 动作列表 / 添加动作 ----------
  const listEl = el('div', { className: 'log-exercise-list' });
  const addExerciseButton = button({
    label: '添加动作',
    variant: 'secondary',
    iconName: 'plus',
    full: true,
    onClick: openAddExerciseSheet
  });

  // ---------- 底部 sticky 操作条 ----------
  const bottomMain = el('span', { className: 'log-bottom-count', textContent: '0 个动作 · 0 组' });
  const bottomSub = el('span', {
    className: 'log-bottom-hint',
    textContent: editMode ? '修改后请保存' : '草稿随时自动保存'
  });
  const bottomPrimary = editMode
    ? button({
        label: '保存修改',
        variant: 'primary',
        size: 'lg',
        iconName: 'check',
        onClick: saveEdit
      })
    : button({
        label: '结束训练',
        variant: 'primary',
        size: 'lg',
        iconName: 'check',
        onClick: openFinishSheet
      });
  const bottomAdd = iconAction('plus', '添加动作', openAddExerciseSheet);
  root.appendChild(
    bottomBar({
      className: 'log-bottom-bar log-bottom-bar--active',
      children: [
        el('div', { className: 'log-bottom-info' }, bottomMain, bottomSub),
        el('div', { className: 'log-bottom-actions' }, bottomPrimary, bottomAdd)
      ]
    })
  );

  // ---------- 组间休息倒计时 ----------
  const restTimeEl = el('span', { className: 'rest-timer__time', textContent: '01:30' });
  const restHintEl = el('span', { className: 'rest-timer__hint', textContent: '组间休息' });
  const restBar = el(
    'div',
    {
      className: 'rest-timer',
      hidden: true,
      role: 'status',
      'aria-live': 'polite',
      'aria-label': '组间休息倒计时'
    },
    el(
      'div',
      { className: 'rest-timer__main' },
      icon('timer', { size: 18 }),
      el('div', { className: 'rest-timer__text' }, restHintEl, restTimeEl)
    ),
    el(
      'div',
      { className: 'rest-timer__actions' },
      button({
        label: '+15s',
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          if (!restTimer) return;
          restTimer = adjustRestTimer(restTimer, 15);
          saveRestTimer(restTimer);
          restFinishedNotified = false;
          restBar.classList.remove('is-done');
          ensureRestTicker();
          renderRestTimer();
        }
      }),
      button({
        label: '跳过',
        variant: 'secondary',
        size: 'sm',
        onClick: () => stopRestTimer()
      })
    )
  );
  root.appendChild(restBar);

  let restTimer = null;
  let restInterval = null;
  let restHideTimeout = null;
  let restFinishedNotified = false;

  function ensureRestTicker() {
    if (restInterval) return;
    restInterval = setInterval(renderRestTimer, 500);
  }

  function clearRestTicker() {
    if (restInterval) {
      clearInterval(restInterval);
      restInterval = null;
    }
    if (restHideTimeout) {
      clearTimeout(restHideTimeout);
      restHideTimeout = null;
    }
  }

  function hideRestBar() {
    restBar.hidden = true;
    restBar.classList.remove('is-done');
  }

  function stopRestTimer() {
    clearRestTicker();
    restTimer = null;
    restFinishedNotified = false;
    clearRestTimer();
    hideRestBar();
  }

  function startRestTimer(seconds = 90) {
    if (editMode) return;
    clearRestTicker();
    restTimer = createRestTimer({ durationSec: seconds });
    saveRestTimer(restTimer);
    restFinishedNotified = false;
    restBar.hidden = false;
    restBar.classList.remove('is-done');
    restHintEl.textContent = '组间休息';
    renderRestTimer();
    ensureRestTicker();
  }

  function renderRestTimer() {
    if (!restTimer) {
      hideRestBar();
      return;
    }
    const left = remainingSeconds(restTimer);
    restTimeEl.textContent = formatClock(left);
    restBar.hidden = false;
    if (left > 0) {
      restBar.classList.remove('is-done');
      return;
    }
    restBar.classList.add('is-done');
    restHintEl.textContent = '休息结束 · 开始下一组';
    if (!restFinishedNotified) {
      restFinishedNotified = true;
      clearRestTimer();
      clearInterval(restInterval);
      restInterval = null;
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([80, 60, 80]);
      } catch {
        /* ignore */
      }
      toast('组间休息结束，可以开始下一组', { tone: 'success', duration: 3200 });
      restHideTimeout = setTimeout(() => {
        hideRestBar();
        restTimer = null;
      }, 7000);
    }
  }

  const savedRestTimer = editMode ? null : loadRestTimer();
  if (savedRestTimer) {
    restTimer = savedRestTimer;
    restBar.hidden = false;
    renderRestTimer();
    ensureRestTicker();
  }

  // 离开页面时停止 ticker（倒计时状态已持久化，下次进入可恢复）
  if (typeof window !== 'undefined') {
    window.addEventListener(
      'hashchange',
      () => {
        clearRestTicker();
      },
      { once: true }
    );
  }


  // ---------- 自动保存 ----------

  function markSaved() {
    autosaveEl.textContent = `已自动保存 · ${savedAtText()}`;
    autosaveEl.dataset.state = 'saved';
  }

  function markDirty() {
    autosaveEl.textContent = '有未保存修改';
    autosaveEl.dataset.state = 'dirty';
  }

  /**
   * 写回 store：草稿立即 saveDraft；已完成训练的编辑只标记「未保存修改」。
   * structural=true 时重建动作列表（加/删/复制/排序等结构变化）。
   */
  function persist({ structural = false } = {}) {
    if (editMode) {
      markDirty();
    } else {
      saveDraft(session);
      markSaved();
    }
    refreshStats();
    if (structural) renderExerciseList();
  }

  function refreshStats() {
    const stats = sessionStats(session);
    const volume = sessionVolumeMeta(session);
    statValueNode(statExerciseTile).textContent = String(stats.exerciseCount);
    statValueNode(statSetsTile).textContent = String(stats.completedSetCount);
    statValueNode(statVolumeTile).textContent = volume.valueText;
    if (statVolumeLabelNode) statVolumeLabelNode.textContent = volume.label;
    if (statVolumeHintNode) statVolumeHintNode.textContent = volume.hint;
    bottomMain.textContent = `${stats.exerciseCount} 个动作 · ${stats.completedSetCount} 组`;
  }

  // ---------- 组行 ----------

  function setField(label, stepper) {
    return el(
      'div',
      { className: 'log-set__field' },
      el('span', { className: 'log-set__field-label', textContent: label }),
      stepper
    );
  }

  function renderSetRow(sessionExercise, set, index) {
    const number = index + 1;
    const noteArea = textarea({
      value: set.note || '',
      placeholder: '本组备注（可选）：动作感受、疼痛、调整…',
      rows: 2,
      ariaLabel: `第 ${number} 组备注`,
      onChange: (value) => {
        updateSet(sessionExercise, set.id, { note: value });
        persist();
      }
    });
    const noteWrap = el('div', { className: 'log-set__note' }, noteArea);
    noteWrap.hidden = !set.note;
    const noteButton = iconAction('text', '备注', () => {
      noteWrap.hidden = !noteWrap.hidden;
      if (!noteWrap.hidden) noteArea.focus();
    });

    return el(
      'div',
      { className: 'log-set', dataset: { setId: set.id } },
      el(
        'div',
        { className: 'log-set__head' },
        el('span', { className: 'log-set__index', textContent: `第 ${number} 组` }),
        el(
          'button',
          {
            className: `log-toggle ${set.perSide ? 'is-on' : ''}`.trim(),
            type: 'button',
            'aria-pressed': String(set.perSide),
            'aria-label': `第 ${number} 组按单侧记录`,
            onClick: (event) => {
              const next = !set.perSide;
              updateSet(sessionExercise, set.id, { perSide: next });
              event.currentTarget.classList.toggle('is-on', next);
              persist();
            }
          },
          '单侧'
        ),
        el(
          'div',
          { className: 'log-set__actions' },
          noteButton,
          iconAction('copy', '复制本组', () => {
            duplicateSet(sessionExercise, set.id);
            persist({ structural: true });
            toast('已复制这一组', { tone: 'success', duration: 1400 });
          }),
          iconAction('trash', '删除本组', () => {
            removeSet(sessionExercise, set.id);
            persist({ structural: true });
          })
        )
      ),
      el(
        'div',
        { className: 'log-set__grid' },
        setField(
          '重量 (kg)',
          numberStepper({
            value: set.weightKg,
            min: 0,
            max: 500,
            step: 2.5,
            ariaLabel: `第 ${number} 组重量（kg）`,
            onChange: (value) => {
              updateSet(sessionExercise, set.id, { weightKg: value });
              persist();
            }
          })
        ),
        setField(
          '次数',
          numberStepper({
            value: set.reps,
            min: 0,
            max: 200,
            step: 1,
            ariaLabel: `第 ${number} 组次数`,
            onChange: (value) => {
              updateSet(sessionExercise, set.id, { reps: value });
              persist();
            }
          })
        )
      ),
      el(
        'div',
        { className: 'log-set__grid' },
        setField(
          'RPE（可选）',
          numberStepper({
            value: set.rpe,
            min: 1,
            max: 10,
            step: 0.5,
            ariaLabel: `第 ${number} 组 RPE`,
            onChange: (value) => {
              updateSet(sessionExercise, set.id, { rpe: value });
              persist();
            }
          })
        ),
        setField(
          '休息（秒，可选）',
          numberStepper({
            value: set.restSec,
            min: 0,
            max: 600,
            step: 15,
            ariaLabel: `第 ${number} 组休息秒数`,
            onChange: (value) => {
              updateSet(sessionExercise, set.id, { restSec: value });
              persist();
            }
          })
        )
      ),
      noteWrap
    );
  }

  // ---------- 动作卡 ----------

  function confirmRemoveExercise(sessionExercise) {
    const counts = exerciseSetCounts(sessionExercise);
    confirmDialog({
      title: '删除这个动作？',
      message: `将删除「${sessionExercise.exerciseName}」及其已记录的 ${counts.completedSets} 组数据，此操作不可撤销。`,
      confirmLabel: '删除动作',
      cancelLabel: '取消',
      tone: 'danger',
      onConfirm: () => {
        removeExercise(session, sessionExercise.id);
        persist({ structural: true });
        toast('已删除动作', { tone: 'success' });
      }
    });
  }

  function renderExerciseCard(sessionExercise, index) {
    const counts = exerciseSetCounts(sessionExercise);
    const isFirst = index === 0;
    const isLast = index === session.exercises.length - 1;

    const plannedTag = el('span', {
      className: 'log-plan__tag',
      textContent: counts.plannedSets === null ? '计划未设定' : `计划 ${counts.plannedSets} 组`
    });
    const completedTag = el('span', {
      className: 'log-plan__tag log-plan__tag--done',
      textContent: `已完成 ${counts.completedSets} 组`
    });
    const plannedStepper = numberStepper({
      value: counts.plannedSets,
      min: 0,
      max: 20,
      step: 1,
      ariaLabel: `${sessionExercise.exerciseName} 计划组数`,
      onChange: (value) => {
        setPlannedSets(sessionExercise, value);
        plannedTag.textContent = value === null ? '计划未设定' : `计划 ${value} 组`;
        persist();
      }
    });

    const setsWrap = el('div', { className: 'log-sets' });
    if (!sessionExercise.sets.length) {
      setsWrap.appendChild(
        el('p', {
          className: 'log-sets__empty',
          textContent: '还没有完成组。点「加组」或「复制上一组」记录至少 1 组后，才能结束训练。'
        })
      );
    } else {
      sessionExercise.sets.forEach((set, setIndex) => {
        setsWrap.appendChild(renderSetRow(sessionExercise, set, setIndex));
      });
    }

    const noteSummary = sessionExercise.note
      ? `动作备注：${sessionExercise.note.length > 24 ? `${sessionExercise.note.slice(0, 24)}…` : sessionExercise.note}`
      : '动作备注（可选）';
    const noteField = disclosure({
      summary: noteSummary,
      iconName: 'text',
      children: [
        textarea({
          value: sessionExercise.note || '',
          placeholder: '这个动作的调整、器械设置、左右差异…',
          rows: 2,
          ariaLabel: `${sessionExercise.exerciseName} 动作备注`,
          onChange: (value) => {
            sessionExercise.note = value;
            persist();
          }
        })
      ]
    });

    return el(
      'div',
      { className: 'card card--padded log-exercise', dataset: { sessionExerciseId: sessionExercise.id } },
      el(
        'div',
        { className: 'log-exercise__head' },
        el(
          'div',
          { className: 'log-exercise__title-wrap' },
          el('span', { className: 'log-exercise__index', textContent: String(index + 1).padStart(2, '0') }),
          el(
            'div',
            { className: 'log-exercise__titles' },
            el('h3', { className: 'log-exercise__title', textContent: sessionExercise.exerciseName }),
            el('p', {
              className: 'log-exercise__meta',
              textContent: sessionExerciseSubtitle(sessionExercise)
            })
          )
        ),
        el(
          'div',
          { className: 'log-exercise__actions' },
          iconAction(
            'chevron-down',
            '上移',
            () => {
              if (moveExercise(session, sessionExercise.id, -1)) persist({ structural: true });
            },
            { className: 'is-up', disabled: isFirst }
          ),
          iconAction(
            'chevron-down',
            '下移',
            () => {
              if (moveExercise(session, sessionExercise.id, 1)) persist({ structural: true });
            },
            { disabled: isLast }
          ),
          iconAction('trash', '删除动作', () => confirmRemoveExercise(sessionExercise))
        )
      ),
      el(
        'div',
        { className: 'log-plan' },
        el(
          'div',
          { className: 'log-plan__edit' },
          el('span', { className: 'log-plan__label', textContent: '计划组数' }),
          plannedStepper
        ),
        el('div', { className: 'log-plan__tags' }, plannedTag, completedTag)
      ),
      setsWrap,
      el(
        'div',
        { className: 'log-exercise__footer' },
        button({
          label: '加组',
          variant: 'secondary',
          size: 'sm',
          iconName: 'plus',
          onClick: () => {
            const added = addSet(sessionExercise, {});
            persist({ structural: true });
            const previous = sessionExercise.sets[sessionExercise.sets.length - 2];
            const restSec = added?.restSec ?? previous?.restSec ?? 90;
            if (restSec > 0) startRestTimer(restSec);
          }
        }),
        button({
          label: '复制上一组',
          variant: 'ghost',
          size: 'sm',
          iconName: 'copy',
          disabled: counts.completedSets === 0,
          onClick: () => {
            const copy = duplicatePreviousSet(sessionExercise);
            if (!copy) return;
            persist({ structural: true });
            const restSec = copy.restSec ?? 90;
            if (restSec > 0) startRestTimer(restSec);
          }
        })
      ),
      noteField
    );
  }

  function renderExerciseList() {
    clear(listEl);
    if (!session.exercises.length) {
      listEl.appendChild(
        card({
          children: emptyState({
            iconName: 'dumbbell',
            title: '还没有动作',
            text: '点「添加动作」从动作库选择；也可以结束这次训练后重新开始。',
            action: button({ label: '添加动作', variant: 'secondary', iconName: 'plus', onClick: openAddExerciseSheet })
          })
        })
      );
      refreshStats();
      return;
    }
    session.exercises.forEach((sessionExercise, index) => {
      listEl.appendChild(renderExerciseCard(sessionExercise, index));
    });
    refreshStats();
  }

  // ---------- 添加动作 ----------

  function openAddExerciseSheet() {
    const existingIds = session.exercises.map((item) => item.exerciseId);
    const picker = createExercisePicker({ selectedIds: [], lockedIds: existingIds });
    const handle = sheet({
      title: '添加动作',
      children: [
        el('p', {
          className: 'muted text-sm mb-2',
          textContent: '已在本次训练中的动作会标记为「已在训练中」，不会重复添加。'
        }),
        picker.root
      ],
      footer: el(
        'div',
        { className: 'log-sheet-actions' },
        button({ label: '取消', variant: 'secondary', onClick: () => handle.close() }),
        button({
          label: '加入所选动作',
          variant: 'primary',
          iconName: 'plus',
          onClick: () => {
            const selected = picker.getSelectedExercises();
            let added = 0;
            for (const exercise of selected) {
              if (addExerciseToSession(session, exercise, exerciseSnapshotLabels(exercise))) added += 1;
            }
            if (!added) {
              toast('请先选择要加入的动作', { tone: 'danger' });
              return;
            }
            persist({ structural: true });
            toast(`已加入 ${added} 个动作`, { tone: 'success' });
            handle.close();
          }
        })
      )
    });
  }

  // ---------- 结束训练 ----------

  function completenessBlock() {
    const cov = coverage(session);
    const stats = sessionStats(session);
    const block = el('div', { className: 'log-completeness' });
    const head = el(
      'div',
      { className: 'log-completeness__head' },
      el(
        'div',
        { className: 'log-completeness__title' },
        el('span', { className: 'strong', textContent: '数据完整度' }),
        badge({
          label: cov.levelLabel,
          tone: cov.level === 'complete' ? 'success' : cov.level === 'partial' ? 'warning' : 'neutral'
        })
      ),
      el('p', {
        className: 'muted text-xs',
        textContent: `${stats.exerciseCount} 个动作 · 完成 ${cov.totalSets} 组${
          stats.durationMin !== null ? ` · 用时约 ${stats.durationMin} 分钟` : ''
        }`
      })
    );
    block.appendChild(head);

    const rows = el('div', { className: 'log-completeness__rows' });
    const addRow = (label, value, tone) => {
      rows.appendChild(
        el(
          'div',
          { className: `log-completeness__row ${tone ? `is-${tone}` : ''}`.trim() },
          el('span', { textContent: label }),
          el('span', { className: 'num', textContent: value })
        )
      );
    };
    addRow('已记录重量 + 次数', `${cov.weightRepsSets} / ${cov.totalSets} 组`, cov.weightRepsCoverage === 1 ? 'ok' : 'warn');
    addRow('已记录 RPE', `${cov.rpeSets} / ${cov.totalSets} 组`, cov.rpeCoverage === 1 ? 'ok' : 'warn');
    addRow('已记录休息时间', `${cov.restSets} / ${cov.totalSets} 组`, cov.restCoverage === 1 ? 'ok' : 'warn');
    if (cov.missingWeightOrReps > 0) {
      addRow('缺重量或次数', `${cov.missingWeightOrReps} 组`, 'warn');
    }
    if (cov.missingRpe > 0) {
      addRow('缺 RPE', `${cov.missingRpe} 组`, 'warn');
    }
    block.appendChild(rows);

    if (cov.level === 'sets-only') {
      block.appendChild(
        callout({
          tone: 'warning',
          children: [
            '这次只记录了组数：可以正常完成训练，但分析不会对负荷 / 强度做判断，只会陈述完成组数与肌群分布。'
          ]
        })
      );
    } else if (cov.level === 'complete') {
      block.appendChild(
        callout({
          tone: 'success',
          children: ['重量、次数与 RPE 都记录完整，分析会基于这些数据给出更具体的事实描述。']
        })
      );
    } else {
      block.appendChild(
        callout({
          tone: 'info',
          children: [
            '仍有部分组的重量 / 次数 / RPE 未填写，可以完成，但分析会标注数据不完整，不做过度推断。'
          ]
        })
      );
    }
    return block;
  }

  function openFinishSheet() {
    const readiness = canFinish(session);
    if (!readiness.ok) {
      toast(readiness.message, { tone: 'danger', duration: 3200 });
      return;
    }
    const cov = coverage(session);
    let postStatus = (session.postCheck && session.postCheck.status) || 'ok';
    let postNote = '';
    let finishing = false;

    const optionsWrap = el('div', {
      className: 'log-post-check',
      role: 'radiogroup',
      'aria-label': '训练后状态自查'
    });
    const postCalloutWrap = el('div', { className: 'log-post-callout' });
    const noteArea = textarea({
      value: '',
      placeholder: '补充说明（可选）：哪个动作、什么感觉、持续多久…',
      rows: 2,
      ariaLabel: '训练后状态备注',
      onChange: (value) => {
        postNote = value;
      }
    });

    function renderPostState() {
      clear(postCalloutWrap);
      if (postStatus === 'red-flag') {
        postCalloutWrap.appendChild(
          callout({
            tone: 'danger',
            title: '你记录了需要谨慎对待的信号',
            children: [
              '完成后会保存训练并生成分析，分析页会置顶「停止训练并寻求专业医疗意见」的提示，且不提供加练建议。如症状明显或正在加重，请先处理身体状况，不要继续训练。'
            ]
          })
        );
      } else if (postStatus === 'discomfort') {
        postCalloutWrap.appendChild(
          callout({
            tone: 'warning',
            title: '你记录了轻中度不适',
            children: [
              '本次分析会使用降级措辞，不给出加量建议。如果不适持续、加重或反复出现，请停止训练并咨询专业医疗人员。'
            ]
          })
        );
      }
    }

    function renderOptions() {
      clear(optionsWrap);
      for (const option of POST_CHECK_OPTIONS) {
        const active = postStatus === option.value;
        optionsWrap.appendChild(
          el(
            'button',
            {
              className: `log-check-option ${active ? 'is-selected' : ''} ${option.value === 'red-flag' ? 'is-danger' : ''}`.trim(),
              type: 'button',
              role: 'radio',
              'aria-checked': String(active),
              onClick: () => {
                postStatus = option.value;
                renderOptions();
                renderPostState();
              }
            },
            el('span', { className: 'log-check-option__dot' }),
            el(
              'span',
              { className: 'log-check-option__main' },
              el('span', { className: 'log-check-option__label', textContent: option.label }),
              el('span', { className: 'log-check-option__hint', textContent: option.hint })
            )
          )
        );
      }
    }

    const confirmButton = button({
      label: '完成训练',
      variant: 'primary',
      size: 'lg',
      iconName: 'check',
      onClick: () => doComplete()
    });
    const setsOnlyLabel = cov.weightRepsSets === 0 ? '只记录组数完成' : null;
    const setsOnlyButton = setsOnlyLabel
      ? button({
          label: setsOnlyLabel,
          variant: 'secondary',
          size: 'lg',
          onClick: () => doComplete()
        })
      : null;

    const handle = sheet({
      title: '结束训练',
      children: [
        completenessBlock(),
        el('div', { className: 'log-sheet-section' },
          sectionTitle({ title: '训练后状态自查', hint: '用于让分析给出恰当的安全提示；不构成医疗诊断' }),
          optionsWrap,
          postCalloutWrap,
          el('div', { className: 'mt-3' }, noteArea)
        )
      ],
      footer: el(
        'div',
        { className: 'log-sheet-actions log-sheet-actions--stack' },
        setsOnlyButton,
        confirmButton,
        button({ label: '再检查一下', variant: 'ghost', onClick: () => handle.close() })
      )
    });

    async function doComplete() {
      if (finishing) return;
      finishing = true;
      confirmButton.disabled = true;
      if (setsOnlyButton) setsOnlyButton.disabled = true;
      const ready = prepareCompletion(session, { status: postStatus, note: postNote });
      if (!ready.ok) {
        finishing = false;
        confirmButton.disabled = false;
        if (setsOnlyButton) setsOnlyButton.disabled = false;
        toast(ready.message, { tone: 'danger' });
        return;
      }
      // 先保存训练（草稿 → 已完成），即使分析失败也不丢训练记录。
      completeSession(session);
      handle.close();
      let analysisOk = false;
      const aiNotice = toast('训练已保存，正在生成分析…（若已配置模型，可能需要几秒）', { duration: 5000 });
      try {
        await generateAnalysisSnapshot(session);
        analysisOk = true;
      } catch (err) {
        console.error('[log] 分析快照生成失败（训练已保存）', err);
      }
      if (analysisOk) {
        toast('训练已完成，正在打开分析', { tone: 'success' });
        navigate(`/analysis/${session.id}`);
      } else {
        toast(ANALYSIS_UNAVAILABLE_MESSAGE, { tone: 'danger', duration: 3200 });
        navigate('/history');
      }
    }

    renderOptions();
    renderPostState();
  }

  // ---------- 已完成训练的保存 ----------

  function saveEdit() {
    const readiness = canFinish(session);
    if (!readiness.ok) {
      toast(readiness.message, { tone: 'danger' });
      return;
    }
    updateSession(session);
    toast('修改已保存', { tone: 'success' });
    const analysis = getAnalysis(session.id);
    if (analysis) {
      confirmDialog({
        title: '分析快照需要更新',
        message: '该训练已有分析快照，分析基于上次保存的版本。是否前往分析页重新生成？',
        confirmLabel: '前往分析页',
        cancelLabel: '返回详情',
        onConfirm: () => navigate(`/analysis/${session.id}`),
        onCancel: () => navigate(`/history/${session.id}`)
      });
    } else {
      navigate(`/history/${session.id}`);
    }
  }

  // ---------- 放弃草稿 ----------

  function confirmDiscardDraft() {
    confirmDialog({
      title: '放弃这次训练？',
      message: '本次训练的所有记录会被删除，且不可恢复。',
      confirmLabel: '放弃训练',
      cancelLabel: '继续记录',
      tone: 'danger',
      onConfirm: () => {
        discardDraft(session.id);
        toast('已放弃本次训练', { tone: 'success' });
        navigate('/history');
      }
    });
  }

  // ---------- 组装页面 ----------
  renderExerciseList();

  const children = [statusRow, strategyRow, listEl, addExerciseButton];
  if (session.note || !editMode) {
    children.push(
      disclosure({
        summary: session.note ? `本次训练备注：${session.note}` : '本次训练备注（可选）',
        iconName: 'text',
        children: [
          textarea({
            value: session.note || '',
            placeholder: '训练整体感受、场地、天气…（会保存到训练记录）',
            rows: 2,
            ariaLabel: '本次训练备注',
            onChange: (value) => {
              session.note = value;
              persist();
            }
          })
        ]
      })
    );
  }
  if (!editMode) {
    children.push(
      el(
        'div',
        { className: 'log-danger-zone' },
        button({
          label: '放弃本次训练',
          variant: 'ghost',
          size: 'sm',
          iconName: 'trash',
          onClick: confirmDiscardDraft
        }),
        el('p', {
          className: 'muted text-xs',
          textContent: '放弃会删除本次草稿；已完成的训练不受影响。'
        })
      )
    );
  }
  body.replaceChildren(...children);

  if (!editMode) {
    autosaveEl.textContent = `已自动保存 · ${savedAtText(session.updatedAt || new Date())}`;
    autosaveEl.dataset.state = 'saved';
  } else {
    autosaveEl.dataset.state = 'idle';
  }

  return root;
}
