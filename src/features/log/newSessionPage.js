/**
 * 新建训练页（#/log/new）。
 *
 * 流程：
 * 1) 若设置里还没有训练目标，先让用户选目标（与首页 onboarding 同一套 goal-option 样式）；
 * 2) 搜索 / 按肌群、器械筛选动作，点击加入，可连续加多个；
 * 3) 底部 sticky 操作条显示已选数量与「开始记录」，点击后创建草稿并进入记录页。
 */
import { el, clear } from '../../app/dom.js';
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
  confirmDialog
} from '../../ui/index.js';
import {
  getDraft,
  getSettings,
  completeOnboarding,
  saveDraft,
  discardDraft,
  GOALS,
  getGoalLabel
} from '../../app/store.js';
import { navigate } from '../../app/router.js';
import { relativeTime } from '../../app/format.js';
import { createExercisePicker } from './exercisePicker.js';
import { createDraftSession, addExerciseToSession, countCompletedSets } from './sessionOps.js';
import { exerciseSnapshotLabels } from './logShared.js';

export function newSessionPage() {
  const settings = getSettings();
  let goal = settings.goal || null;
  let goalEditing = false;
  let selectedIds = [];
  let picker = null;
  let pickerGoal = goal;

  const root = screen({
    title: '新建训练',
    subtitle: '选好动作后开始记录，每次修改都会自动保存',
    back: '/history',
    className: 'log-screen log-new-screen'
  });
  const body = root.querySelector('.screen__body');

  // ---------- 底部 sticky 操作条 ----------
  const bottomCount = el('span', { className: 'log-bottom-count', textContent: '已选 0 个动作' });
  const bottomHint = el('span', { className: 'log-bottom-hint', textContent: '可连续添加多个动作' });
  const bottomInfo = el('div', { className: 'log-bottom-info' }, bottomCount, bottomHint);
  const startButton = button({
    label: '开始记录',
    variant: 'primary',
    size: 'lg',
    iconName: 'check',
    disabled: true,
    onClick: startSession
  });
  root.appendChild(
    bottomBar({
      className: 'log-bottom-bar',
      children: [bottomInfo, startButton]
    })
  );

  // ---------- 目标选择 ----------
  function goalOption(option) {
    const isActive = goal === option.value;
    return el(
      'button',
      {
        className: `goal-option goal-option--row ${isActive ? 'is-selected' : ''}`.trim(),
        type: 'button',
        'aria-pressed': String(isActive),
        onClick: () => {
          goal = option.value;
          goalEditing = false;
          completeOnboarding(option.value);
          toast(`本次目标：${option.label}`, { tone: 'success' });
          picker = null;
          render();
        }
      },
      el(
        'span',
        { className: 'goal-option__main' },
        el('span', { className: 'goal-option__label', textContent: option.label }),
        el('span', { className: 'goal-option__hint', textContent: option.hint })
      ),
      el('span', { className: 'goal-option__check' }, icon('check', { size: 18 }))
    );
  }

  function goalGateCard() {
    const options = el('div', { className: 'goal-list' }, GOALS.map((option) => goalOption(option)));
    const heading = goalEditing ? '更换本次训练目标' : '先选一个训练目标';
    const text = goalEditing
      ? '目标会记录到本次训练，用于分析建议的侧重点；随时可以在「我的」里修改默认目标。'
      : '目标只影响分析与建议的侧重点，可以随时修改。选好后就可以挑今天要练的动作了。';
    return card({
      className: 'onboarding-card log-goal-card',
      children: [
        el('div', { className: 'onboarding-card__head' }, badge({ label: goalEditing ? '更换目标' : '开始之前', tone: 'accent' })),
        el('h2', { className: 'onboarding-card__title', textContent: heading }),
        el('p', { className: 'onboarding-card__text', textContent: text }),
        options,
        goalEditing
          ? el(
              'div',
              { className: 'log-goal-card__cancel' },
              button({
                label: '返回',
                variant: 'ghost',
                size: 'sm',
                onClick: () => {
                  goalEditing = false;
                  render();
                }
              })
            )
          : null
      ]
    });
  }

  function goalLine() {
    return el(
      'div',
      { className: 'log-goal-line' },
      el('span', { className: 'muted text-sm', textContent: '本次目标' }),
      badge({ label: getGoalLabel(goal), tone: 'accent', iconName: 'target' }),
      button({
        label: '更换',
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          goalEditing = true;
          render();
        }
      })
    );
  }

  // ---------- 草稿提示 ----------
  function draftCard() {
    const draft = getDraft();
    if (!draft) return null;
    const sets = countCompletedSets(draft);
    const exerciseCount = (draft.exercises || []).length;
    return card({
      className: 'resume-card',
      children: [
        el(
          'div',
          { className: 'resume-card__head' },
          el('div', { className: 'resume-card__icon' }, icon('timer', { size: 20 })),
          el(
            'div',
            { className: 'resume-card__text' },
            el('div', { className: 'resume-card__title', textContent: '有训练还没结束' }),
            el('div', {
              className: 'resume-card__sub',
              textContent: `${exerciseCount} 个动作 · 已记录 ${sets} 组 · ${relativeTime(draft.startedAt)}开始`
            })
          )
        ),
        button({ label: '继续记录', size: 'sm', onClick: () => navigate(`/log/${draft.id}`) })
      ]
    });
  }

  // ---------- 已选动作 ----------
  const selectedWrap = el('div', { className: 'log-selected' });

  function renderSelected() {
    clear(selectedWrap);
    if (!selectedIds.length) {
      selectedWrap.hidden = true;
      return;
    }
    selectedWrap.hidden = false;
    const list = el('div', { className: 'log-selected__list' });
    for (const id of selectedIds) {
      const exercise = picker ? picker.getSelectedExercises().find((item) => item.id === id) : null;
      if (!exercise) continue;
      list.appendChild(
        el(
          'button',
          {
            className: 'log-selected-chip',
            type: 'button',
            'aria-label': `移出 ${exercise.name}`,
            onClick: () => {
              picker.setSelectedIds(selectedIds.filter((item) => item !== exercise.id));
            }
          },
          el('span', { textContent: exercise.name }),
          icon('close', { size: 14 })
        )
      );
    }
    selectedWrap.append(
      el(
        'div',
        { className: 'log-selected__head' },
        el('span', { className: 'log-selected__title', textContent: `已选 ${selectedIds.length} 个动作` }),
        button({
          label: '清空',
          variant: 'ghost',
          size: 'sm',
          onClick: () => picker && picker.clearSelection()
        })
      ),
      list
    );
  }

  // ---------- 动作选择器 ----------
  const pickerWrap = el('div', { className: 'log-picker-wrap' });

  function mountPicker() {
    if (!goal) {
      pickerWrap.replaceChildren();
      return;
    }
    if (!picker || pickerGoal !== goal) {
      pickerGoal = goal;
      picker = createExercisePicker({
        selectedIds,
        onChange: (_exercises, ids) => {
          selectedIds = ids;
          renderSelected();
          updateBottom();
        }
      });
    }
    pickerWrap.replaceChildren(picker.root);
    renderSelected();
  }

  // ---------- 底部状态 ----------
  function updateBottom() {
    bottomCount.textContent = `已选 ${selectedIds.length} 个动作`;
    if (!goal) {
      bottomHint.textContent = '先选择训练目标';
      startButton.disabled = true;
      startButton.querySelector('.btn__label').textContent = '先选目标';
      return;
    }
    bottomHint.textContent = selectedIds.length ? '点击开始后自动保存草稿' : '搜索或筛选后点击动作加入';
    startButton.disabled = selectedIds.length === 0;
    startButton.querySelector('.btn__label').textContent = '开始记录';
  }

  // ---------- 开始训练 ----------
  function createAndGo() {
    const session = createDraftSession({ goal });
    for (const exercise of selectedExercisesNow()) {
      addExerciseToSession(session, exercise, { ...exerciseSnapshotLabels(exercise) });
    }
    saveDraft(session);
    toast('训练已开始，记录会自动保存', { tone: 'success' });
    navigate(`/log/${session.id}`);
  }

  function selectedExercisesNow() {
    if (!picker) return [];
    return picker.getSelectedExercises();
  }

  function startSession() {
    if (!goal) {
      toast('先选择本次训练目标', { tone: 'danger' });
      return;
    }
    if (!selectedIds.length) {
      toast('先选择至少 1 个动作', { tone: 'danger' });
      return;
    }
    const existingDraft = getDraft();
    if (existingDraft && existingDraft.id) {
      const continueExisting = () => navigate(`/log/${existingDraft.id}`);
      confirmDialog({
        title: '已有未结束的训练',
        message: '检测到一次未完成的训练草稿。开始新的训练会放弃旧草稿，是否继续？',
        confirmLabel: '放弃旧草稿并开始',
        cancelLabel: '继续上次训练',
        tone: 'danger',
        onConfirm: () => {
          discardDraft(existingDraft.id);
          createAndGo();
        },
        onCancel: continueExisting
      });
      return;
    }
    createAndGo();
  }

  // ---------- 渲染 ----------
  function render() {
    const children = [];
    const draft = getDraft();
    if (draft) children.push(draftCard());
    if (goal && !goalEditing) children.push(goalLine());
    else children.push(goalGateCard());

    if (goal && !goalEditing) {
      children.push(selectedWrap);
      children.push(
        sectionTitle({
          title: '选择动作',
          hint: '搜索或按肌群 / 器械筛选；点击动作加入，可连续添加多个'
        })
      );
      children.push(pickerWrap);
      children.push(
        callout({
          tone: 'info',
          title: '原型说明',
          children: [
            '训练记录只保存在本机；离开页面后可从「记录」继续这次训练。动作库按审核过的动作与肌群映射提供，不会临时生成动作。'
          ]
        })
      );
    }
    body.replaceChildren(...children);
    mountPicker();
    updateBottom();
  }

  render();
  return root;
}
