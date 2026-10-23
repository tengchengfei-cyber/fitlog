/**
 * 动作选择器（新建训练页与「添加动作」抽屉共用）。
 *
 * - 搜索复用 src/features/search/engine.js 的确定性搜索（实时结果 + 匹配原因）；
 * - 支持按肌群组 / 器械筛选浏览（空查询时直接浏览筛选结果）；
 * - 点击结果卡片加入 / 移出本次选择；已选数量与已选动作由调用方渲染；
 * - 不生成任何动作库之外的动作：无结果时只展示引擎给出的「已知近似动作」。
 */
import { el, clear } from '../../app/dom.js';
import { textInput, chip, badge, callout, icon, button } from '../../ui/index.js';
import { searchExercises } from '../search/engine.js';
import { EXERCISES, EQUIPMENT_OPTIONS, equipmentLabel } from '../../data/exercises/index.js';
import { MUSCLE_GROUPS, MUSCLES_BY_ID } from '../../data/muscles.js';

const EXERCISES_BY_ID = Object.fromEntries(EXERCISES.map((exercise) => [exercise.id, exercise]));

/** 肌群组 → 该组全部 muscleId（动作的主/次肌群命中任一即属于该组）。 */
const GROUP_MUSCLE_IDS = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group.id, []]));
for (const muscle of Object.values(MUSCLES_BY_ID)) {
  if (!GROUP_MUSCLE_IDS[muscle.groupId]) GROUP_MUSCLE_IDS[muscle.groupId] = [];
  GROUP_MUSCLE_IDS[muscle.groupId].push(muscle.id);
}

const GROUP_MUSCLE_SETS = Object.fromEntries(
  Object.entries(GROUP_MUSCLE_IDS).map(([groupId, ids]) => [groupId, new Set(ids)])
);

function exerciseBelongsToGroup(exercise, groupId) {
  const muscleIds = GROUP_MUSCLE_SETS[groupId];
  if (!muscleIds) return true;
  const primary = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
  const secondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
  return primary.some((id) => muscleIds.has(id)) || secondary.some((id) => muscleIds.has(id));
}

function primaryMuscleNames(exercise, limit = 2) {
  return (Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [])
    .map((id) => MUSCLES_BY_ID[id])
    .filter(Boolean)
    .map((muscle) => muscle.name)
    .slice(0, limit);
}

function difficultyText(difficulty) {
  return { beginner: '入门', intermediate: '进阶', advanced: '高阶' }[difficulty] || '';
}

/**
 * 创建动作选择器。
 * @param {{
 *   selectedIds?: string[],
 *   lockedIds?: string[],
 *   onChange?: (selectedExercises: object[], selectedIds: string[]) => void,
 *   placeholder?: string,
 *   autoFocus?: boolean
 * }} [options]
 */
export function createExercisePicker(options = {}) {
  const state = {
    query: '',
    equipment: null,
    muscleGroup: null,
    selectedIds: new Set(Array.isArray(options.selectedIds) ? options.selectedIds : []),
    lockedIds: new Set(Array.isArray(options.lockedIds) ? options.lockedIds : [])
  };

  const filtersEl = el('div', { className: 'log-filters' });
  const resultsEl = el('div', { className: 'log-results', 'aria-live': 'polite' });
  const summaryEl = el('p', { className: 'log-picker__summary muted text-xs', 'aria-live': 'polite' });

  const searchInput = textInput({
    value: '',
    placeholder: options.placeholder || '搜索动作：深蹲 / 卧推 / lat pulldown / gwxl',
    type: 'search',
    inputMode: 'search',
    enterKeyHint: 'search',
    ariaLabel: '搜索动作',
    onChange: (value) => {
      state.query = value;
      renderResults();
    }
  });

  const searchWrap = el(
    'div',
    { className: 'log-search' },
    el('span', { className: 'log-search__icon' }, icon('search', { size: 18 })),
    searchInput
  );

  function getSelectedIds() {
    return Array.from(state.selectedIds);
  }

  function getSelectedExercises() {
    return getSelectedIds()
      .map((id) => EXERCISES_BY_ID[id])
      .filter(Boolean);
  }

  function notifyChange() {
    if (typeof options.onChange === 'function') {
      options.onChange(getSelectedExercises(), getSelectedIds());
    }
  }

  function isSelected(exerciseId) {
    return state.selectedIds.has(exerciseId);
  }

  function isLocked(exerciseId) {
    return state.lockedIds.has(exerciseId);
  }

  function toggle(exercise) {
    if (!exercise || isLocked(exercise.id)) return;
    if (state.selectedIds.has(exercise.id)) state.selectedIds.delete(exercise.id);
    else state.selectedIds.add(exercise.id);
    renderResults();
    renderSummary();
    notifyChange();
  }

  function setSelectedIds(ids) {
    state.selectedIds = new Set(Array.isArray(ids) ? ids : []);
    renderResults();
    renderSummary();
    notifyChange();
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function renderFilters() {
    clear(filtersEl);

    const muscleRow = el(
      'div',
      { className: 'log-filter-row', role: 'group', 'aria-label': '按肌群筛选' },
      [
        chip({
          label: '全部肌群',
          selected: !state.muscleGroup,
          onClick: () => {
            state.muscleGroup = null;
            renderFilters();
            renderResults();
          }
        }),
        ...MUSCLE_GROUPS.map((group) =>
          chip({
            label: group.name,
            selected: state.muscleGroup === group.id,
            onClick: () => {
              state.muscleGroup = state.muscleGroup === group.id ? null : group.id;
              renderFilters();
              renderResults();
            }
          })
        )
      ]
    );

    const equipmentRow = el(
      'div',
      { className: 'log-filter-row', role: 'group', 'aria-label': '按器械筛选' },
      [
        chip({
          label: '全部器械',
          selected: !state.equipment,
          onClick: () => {
            state.equipment = null;
            renderFilters();
            renderResults();
          }
        }),
        ...EQUIPMENT_OPTIONS.map((item) =>
          chip({
            label: item.label,
            selected: state.equipment === item.value,
            onClick: () => {
              state.equipment = state.equipment === item.value ? null : item.value;
              renderFilters();
              renderResults();
            }
          })
        )
      ]
    );

    filtersEl.append(muscleRow, equipmentRow);
  }

  function filterSource() {
    if (!state.muscleGroup) return undefined;
    return EXERCISES.filter((exercise) => exercise && exerciseBelongsToGroup(exercise, state.muscleGroup));
  }

  function renderExerciseCard(exercise, matchReasons = []) {
    const selected = isSelected(exercise.id);
    const locked = isLocked(exercise.id);
    const muscles = primaryMuscleNames(exercise);
    const className = ['log-result', selected ? 'is-selected' : '', locked ? 'is-locked' : '']
      .filter(Boolean)
      .join(' ');
    const button = el(
      'button',
      {
        className,
        type: 'button',
        'aria-pressed': String(selected),
        disabled: locked,
        onClick: () => toggle(exercise)
      },
      el(
        'span',
        { className: 'log-result__main' },
        el(
          'span',
          { className: 'log-result__title-row' },
          el('span', { className: 'log-result__name', textContent: exercise.name }),
          exercise.enName ? el('span', { className: 'log-result__en', textContent: exercise.enName }) : null
        ),
        el(
          'span',
          { className: 'log-result__meta' },
          badge({ label: equipmentLabel(exercise.equipment), tone: 'neutral' }),
          muscles.length ? el('span', { className: 'log-result__muscles', textContent: muscles.join('、') }) : null,
          difficultyText(exercise.difficulty)
            ? el('span', { className: 'log-result__difficulty', textContent: difficultyText(exercise.difficulty) })
            : null
        ),
        matchReasons.length
          ? el('span', { className: 'log-result__reasons', textContent: matchReasons.join(' · ') })
          : null
      ),
      el(
        'span',
        { className: `log-result__add ${selected ? 'is-selected' : ''}` },
        icon(selected ? 'check' : 'plus', { size: 18 }),
        el('span', { className: 'log-result__add-text', textContent: locked ? '已在训练中' : selected ? '已加入' : '加入' })
      )
    );
    return button;
  }

  function renderSuggestions(response) {
    const wrap = el('div', { className: 'log-picker__empty' });
    const query = response && response.query ? response.query : state.query;
    wrap.append(
      callout({
        tone: 'info',
        title: `动作库里没有找到「${query}」`,
        children: [
          el('p', {
            textContent:
              '下面是动作库中已知的相近动作，可直接加入本次训练。原型不会临时生成动作；如需新增动作，可在「我的」页面提交建议。'
          })
        ]
      })
    );
    if (response && response.suggestions.length) {
      wrap.append(
        el(
          'div',
          { className: 'log-suggestion-list' },
          response.suggestions.map((suggestion) =>
            el(
              'div',
              { className: 'log-suggestion' },
              el(
                'div',
                { className: 'log-suggestion__main' },
                el('span', { className: 'log-suggestion__name', textContent: suggestion.exercise.name }),
                el('span', { className: 'log-suggestion__reason', textContent: suggestion.reason })
              ),
              button({
                label: isLocked(suggestion.exercise.id)
                  ? '已在训练中'
                  : isSelected(suggestion.exercise.id)
                    ? '已加入'
                    : '加入',
                size: 'sm',
                variant: 'secondary',
                iconName: isSelected(suggestion.exercise.id) ? 'check' : 'plus',
                onClick: () => toggle(suggestion.exercise)
              })
            )
          )
        )
      );
    }
    return wrap;
  }

  function renderResults() {
    clear(resultsEl);
    if (!EXERCISES.length) {
      resultsEl.append(
        callout({
          tone: 'warning',
          title: '动作库数据暂未就绪',
          children: ['动作数据仍在加载或加载失败，请稍后刷新页面重试。']
        })
      );
      renderSummary(0);
      return;
    }
    const response = searchExercises(state.query, {
      equipment: state.equipment,
      exercises: filterSource()
    });
    const results = response.results;
    if (!results.length) {
      resultsEl.append(renderSuggestions(response));
      renderSummary(0);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const result of results) {
      fragment.appendChild(renderExerciseCard(result.exercise, result.matchReasons));
    }
    resultsEl.appendChild(fragment);
    renderSummary(results.length);
  }

  function renderSummary(resultCount = null) {
    const parts = [];
    if (resultCount !== null) parts.push(`${resultCount} 个结果`);
    if (state.muscleGroup) {
      const group = MUSCLE_GROUPS.find((item) => item.id === state.muscleGroup);
      if (group) parts.push(`肌群：${group.name}`);
    }
    if (state.equipment) parts.push(`器械：${equipmentLabel(state.equipment)}`);
    parts.push(`已选 ${state.selectedIds.size} 个动作`);
    summaryEl.textContent = parts.join(' · ');
  }

  const root = el('div', { className: 'log-picker' }, searchWrap, filtersEl, summaryEl, resultsEl);

  renderFilters();
  renderResults();
  renderSummary();

  return {
    root,
    getSelectedIds,
    getSelectedExercises,
    setSelectedIds,
    clearSelection,
    refresh: () => {
      renderFilters();
      renderResults();
      renderSummary();
    },
    focus: () => {
      searchInput.focus();
    }
  };
}
