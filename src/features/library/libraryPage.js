/**
 * 动作图鉴列表页（#/library）：
 * - 实时搜索（150ms 防抖）+ 匹配原因展示
 * - 肌群 / 器械 / 动作模式筛选（底部抽屉）
 * - 结果卡片、无结果相近动作 + 新增动作建议（仅本机原型记录）
 * - 首次进入展示「按肌群浏览」与常练动作
 */
import { el, clear } from '../../app/dom.js';
import { navigate } from '../../app/router.js';
import {
  screen,
  sectionTitle,
  card,
  button,
  chip,
  badge,
  textInput,
  emptyState,
  sheet,
  toast,
  icon,
  callout,
  textarea,
  field
} from '../../ui/index.js';
import {
  EXERCISES,
  EQUIPMENT_OPTIONS,
  PATTERN_OPTIONS,
  equipmentLabel,
  patternLabel,
  difficultyLabel
} from '../../data/exercises/index.js';
import { MUSCLE_GROUPS, getMuscle, groupName, muscleName } from '../../data/muscles.js';
import { searchExercises, listPopularExercises } from '../search/engine.js';

/** 原型阶段：动作建议只写入本机 localStorage，绝不写入动作库。 */
const SUGGESTION_STORAGE_KEY = 'fitlog.exerciseSuggestions.v1';
const DEBOUNCE_MS = 150;

function loadLocalSuggestions() {
  try {
    const raw = localStorage.getItem(SUGGESTION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalSuggestion(entry) {
  try {
    const list = loadLocalSuggestions();
    list.unshift(entry);
    localStorage.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
    return true;
  } catch {
    return false;
  }
}

function exerciseGroupIds(exercise) {
  const ids = new Set();
  for (const muscleId of [...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])]) {
    const muscle = getMuscle(muscleId);
    if (muscle) ids.add(muscle.groupId);
  }
  return ids;
}

function exerciseMetaText(exercise) {
  const muscles = (exercise.primaryMuscles || []).map((id) => muscleName(id)).filter(Boolean);
  return muscles.length ? muscles.join(' / ') : '肌群待补充';
}

/** 结果卡片：链接式按钮，保证键盘可访问。 */
export function exerciseCard(exercise, { reasons = [], highlight = false } = {}) {
  const status = exercise.contentStatus || 'approved';
  return el(
    'button',
    {
      className: `exercise-card card ${highlight ? 'exercise-card--highlight' : ''}`.trim(),
      type: 'button',
      onClick: () => navigate(`/library/${exercise.id}`),
      'aria-label': `查看动作：${exercise.name}`
    },
    el(
      'div',
      { className: 'exercise-card__head' },
      el(
        'div',
        { className: 'exercise-card__titles' },
        el('span', { className: 'exercise-card__name', textContent: exercise.name }),
        exercise.enName ? el('span', { className: 'exercise-card__en', textContent: exercise.enName }) : null
      ),
      el('span', { className: 'exercise-card__chevron' }, icon('chevron-right', { size: 18 }))
    ),
    el(
      'div',
      { className: 'exercise-card__badges' },
      badge({ label: difficultyLabel(exercise.difficulty), tone: 'neutral' }),
      badge({ label: equipmentLabel(exercise.equipment), tone: 'info' }),
      badge({ label: patternLabel(exercise.pattern), tone: 'outline' }),
      exercise.unilateral ? badge({ label: '可单侧', tone: 'outline' }) : null,
      status !== 'approved'
        ? badge({ label: status === 'pending-review' ? '资料审核中' : '资料暂不可用', tone: 'warning' })
        : null
    ),
    el(
      'div',
      { className: 'exercise-card__meta' },
      el('span', { className: 'exercise-card__meta-item' }, icon('target', { size: 14 }), exerciseMetaText(exercise)),
      el('span', { className: 'exercise-card__meta-item' }, icon('dumbbell', { size: 14 }), equipmentLabel(exercise.equipment))
    ),
    reasons.length
      ? el(
          'div',
          { className: 'exercise-card__reasons' },
          reasons.slice(0, 2).map((reason) =>
            el('span', { className: 'match-reason' }, icon('sparkles', { size: 12 }), reason)
          )
        )
      : null
  );
}

export function libraryPage(ctx) {
  const initialQuery = (ctx && ctx.query && ctx.query.get('q')) || '';
  const state = {
    query: initialQuery,
    equipment: (ctx && ctx.query && ctx.query.get('equipment')) || '',
    pattern: (ctx && ctx.query && ctx.query.get('pattern')) || '',
    group: (ctx && ctx.query && ctx.query.get('group')) || ''
  };

  const resultsHost = el('div', { className: 'library-results' });
  const countEl = el('p', { className: 'library-count', 'aria-live': 'polite' });
  const activeFiltersHost = el('div', { className: 'library-filter-row' });
  const hintsHost = el('div', { className: 'library-hints' });
  const filterTriggerHost = el('span', { className: 'library-toolbar__action' });

  let debounceTimer = null;

  const searchInput = textInput({
    value: state.query,
    placeholder: '搜索动作：高位下拉 / lat pulldown / gwxl',
    ariaLabel: '搜索动作',
    onChange: (value) => {
      state.query = value;
      scheduleRender();
    },
    onKeydown: (event) => {
      if (event.key === 'Enter') {
        clearTimeout(debounceTimer);
        renderResults();
      }
    }
  });

  function hasFilters() {
    return Boolean(state.group || state.equipment || state.pattern);
  }

  function filteredSource() {
    if (!state.group) return EXERCISES;
    return EXERCISES.filter((exercise) => exerciseGroupIds(exercise).has(state.group));
  }

  function computeResult() {
    return searchExercises(state.query, {
      exercises: filteredSource(),
      equipment: state.equipment || null,
      pattern: state.pattern || null
    });
  }

  function scheduleRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderResults();
    }, DEBOUNCE_MS);
  }

  function removeFilter(key) {
    state[key] = '';
    renderResults();
  }

  function filterChipSpecs() {
    const specs = [];
    if (state.group) specs.push({ key: 'group', label: `肌群：${groupName(state.group)}` });
    if (state.equipment) specs.push({ key: 'equipment', label: `器械：${equipmentLabel(state.equipment)}` });
    if (state.pattern) specs.push({ key: 'pattern', label: `模式：${patternLabel(state.pattern)}` });
    return specs;
  }

  function renderFilterTrigger() {
    clear(filterTriggerHost);
    const count = filterChipSpecs().length;
    filterTriggerHost.appendChild(
      button({
        label: count ? `筛选 (${count})` : '筛选',
        variant: 'secondary',
        size: 'sm',
        iconName: 'filter',
        onClick: openFilterSheet
      })
    );
  }

  function renderActiveFilters() {
    clear(activeFiltersHost);
    const specs = filterChipSpecs();
    activeFiltersHost.classList.toggle('hidden', specs.length === 0);
    if (!specs.length) return;
    for (const spec of specs) {
      activeFiltersHost.appendChild(
        chip({
          label: `${spec.label} ✕`,
          selected: true,
          onClick: () => removeFilter(spec.key),
          tone: 'accent'
        })
      );
    }
    activeFiltersHost.appendChild(
      button({
        label: '清除全部',
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          state.group = '';
          state.equipment = '';
          state.pattern = '';
          renderResults();
        }
      })
    );
  }

  function renderQuickHints() {
    clear(hintsHost);
    const show = !state.query && !hasFilters();
    hintsHost.classList.toggle('hidden', !show);
    if (!show) return;
    hintsHost.appendChild(el('span', { className: 'library-hints__label', textContent: '试试：' }));
    for (const hint of ['高位下拉', '卧推', '深蹲', 'gaoweixiala']) {
      hintsHost.appendChild(
        chip({
          label: hint,
          onClick: () => {
            state.query = hint;
            searchInput.value = hint;
            searchInput.focus({ preventScroll: true });
            renderResults();
          }
        })
      );
    }
  }

  function renderNoResults(result) {
    const title = state.query ? '没有找到匹配的动作' : '当前筛选下没有动作';
    const text = state.query
      ? `动作库中没有与「${state.query}」匹配的动作。动作库是搜索的唯一可信源，不会临时生成新动作；可以提交「新增动作建议」，或查看下面的相近动作。`
      : '可以放宽筛选条件，或返回全部动作浏览。';
    resultsHost.appendChild(
      emptyState({
        title,
        text,
        iconName: 'search',
        action: el(
          'div',
          { className: 'library-empty-actions' },
          button({
            label: '新增动作建议',
            variant: 'secondary',
            size: 'sm',
            iconName: 'plus',
            onClick: openSuggestionSheet
          }),
          hasFilters()
            ? button({
                label: '清除筛选',
                variant: 'ghost',
                size: 'sm',
                onClick: () => {
                  state.group = '';
                  state.equipment = '';
                  state.pattern = '';
                  renderResults();
                }
              })
            : null
        )
      })
    );

    if (result.suggestions.length) {
      resultsHost.appendChild(
        sectionTitle({
          title: '动作库中的相近动作',
          hint: '以下均为动作库已有动作，仅供参考'
        })
      );
      const list = el('div', { className: 'suggestion-list' });
      for (const suggestion of result.suggestions) {
        list.appendChild(
          el(
            'button',
            {
              className: 'suggestion-item card',
              type: 'button',
              onClick: () => navigate(`/library/${suggestion.exercise.id}`),
              'aria-label': `查看相近动作：${suggestion.exercise.name}`
            },
            el('span', { className: 'suggestion-item__icon' }, icon('sparkles', { size: 16 })),
            el(
              'span',
              { className: 'suggestion-item__main' },
              el('span', { className: 'suggestion-item__name', textContent: suggestion.exercise.name }),
              el('span', { className: 'suggestion-item__reason', textContent: suggestion.reason })
            ),
            icon('chevron-right', { size: 16 })
          )
        );
      }
      resultsHost.appendChild(list);
    }
    resultsHost.appendChild(
      el('p', { className: 'library-footer-note', textContent: '原型：建议仅保存在本机，不会写入动作库；数据不会上传云端。' })
    );
  }

  function renderLanding() {
    resultsHost.appendChild(
      sectionTitle({
        title: '按肌群浏览',
        hint: '动作 → 肌群为通常涉及的映射，不是精确激活剂量'
      })
    );
    const grid = el('div', { className: 'browse-grid' });
    for (const group of MUSCLE_GROUPS) {
      const count = EXERCISES.filter((exercise) => exerciseGroupIds(exercise).has(group.id)).length;
      grid.appendChild(
        el(
          'button',
          {
            className: 'browse-tile',
            type: 'button',
            onClick: () => {
              state.group = group.id;
              renderResults();
            },
            'aria-label': `浏览${group.name}动作，共 ${count} 个`
          },
          el(
            'span',
            { className: 'browse-tile__top' },
            el('span', { className: 'browse-tile__name', textContent: group.name }),
            el('span', { className: 'browse-tile__count', textContent: `${count} 个` })
          ),
          el('span', { className: 'browse-tile__hint', textContent: '查看动作' }),
          icon('chevron-right', { size: 16 })
        )
      );
    }
    resultsHost.appendChild(grid);

    const popular = listPopularExercises(6);
    if (popular.length) {
      resultsHost.appendChild(
        sectionTitle({
          title: '热门动作',
          hint: '常练动作，可直接查看要点'
        })
      );
      const list = el('div', { className: 'library-list' });
      for (const exercise of popular) list.appendChild(exerciseCard(exercise));
      resultsHost.appendChild(list);
    }

    resultsHost.appendChild(
      card({
        children: [
          el('p', { className: 'library-footer-note', textContent: '原型：数据仅保存在本机；动作库是搜索的唯一可信源。' }),
          el('p', {
            className: 'library-footer-note',
            textContent: '动作要点为通用训练教学信息，不构成医疗诊断或康复处方；如有疼痛或医嘱限制，请先咨询专业人士。'
          })
        ]
      })
    );
  }

  function renderResults() {
    const result = computeResult();
    clear(resultsHost);
    renderActiveFilters();
    renderFilterTrigger();
    renderQuickHints();

    const count = result.results.length;
    if (!state.query && !hasFilters()) {
      countEl.textContent = `动作库共 ${EXERCISES.length} 个动作`;
      renderLanding();
      return;
    }

    if (state.query) {
      countEl.textContent = `「${state.query}」找到 ${count} 个动作`;
    } else {
      countEl.textContent = `${hasFilters() ? '筛选结果' : '全部动作'} · ${count} 个`;
    }

    if (!count) {
      renderNoResults(result);
      return;
    }

    const headingTitle = state.query
      ? `搜索结果（${count}）`
      : state.group
        ? `${groupName(state.group)}动作（${count}）`
        : `筛选结果（${count}）`;
    resultsHost.appendChild(
      sectionTitle({
        title: headingTitle,
        hint: state.query ? '按相关度排序：精确名 > 别名 > 英文 > 拼音 > 相关 > 近似' : '点击卡片查看动作详情与安全提示'
      })
    );
    const list = el('div', { className: 'library-list' });
    for (const row of result.results) {
      list.appendChild(exerciseCard(row.exercise, { reasons: row.matchReasons }));
    }
    resultsHost.appendChild(list);
    resultsHost.appendChild(
      el('p', { className: 'library-footer-note', textContent: '原型：数据仅保存在本机；匹配结果只来自动作库。' })
    );
  }

  // ---------- 筛选抽屉 ----------

  function filterSection(title, options, key, refresh) {
    const wrap = el('div', { className: 'sheet-section' });
    wrap.appendChild(el('h3', { className: 'sheet-section__title', textContent: title }));
    const chips = el('div', { className: 'sheet-chips' });
    for (const option of options) {
      const value = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : option.label;
      chips.appendChild(
        chip({
          label,
          selected: state[key] === value,
          onClick: () => {
            state[key] = state[key] === value ? '' : value;
            renderResults();
            refresh();
          }
        })
      );
    }
    wrap.appendChild(chips);
    return wrap;
  }

  function openFilterSheet() {
    const body = el('div', { className: 'stack' });
    let dialog = null;

    function refresh() {
      clear(body);
      body.append(
        el('p', { className: 'sheet-intro', textContent: '可组合筛选；与搜索关键词取交集。' }),
        filterSection(
          '肌群',
          MUSCLE_GROUPS.map((group) => ({ value: group.id, label: group.name })),
          'group',
          refresh
        ),
        filterSection('器械', EQUIPMENT_OPTIONS, 'equipment', refresh),
        filterSection('动作模式', PATTERN_OPTIONS, 'pattern', refresh)
      );
    }

    refresh();
    dialog = sheet({
      title: '筛选动作',
      children: body,
      footer: el(
        'div',
        { className: 'dialog__actions' },
        button({
          label: '清除全部',
          variant: 'secondary',
          onClick: () => {
            state.group = '';
            state.equipment = '';
            state.pattern = '';
            renderResults();
            refresh();
          }
        }),
        button({
          label: '查看结果',
          variant: 'primary',
          onClick: () => dialog.close()
        })
      )
    });
    return dialog;
  }

  // ---------- 新增动作建议（原型：仅本机） ----------

  function openSuggestionSheet() {
    let value = '';
    const input = textarea({
      placeholder: '例如：想查「绳索面拉」，但动作库里没有',
      rows: 3,
      maxLength: 120,
      ariaLabel: '新增动作建议内容',
      onChange: (text) => {
        value = text;
      }
    });
    const dialog = sheet({
      title: '新增动作建议',
      children: [
        callout({
          tone: 'info',
          title: '原型说明',
          children: '建议只保存在本机，不会写入动作库，也不会由系统自动生成动作。正式版会进入内容审核流程。'
        }),
        field({
          label: '你希望补充的动作名称 / 描述',
          hint: '最多 120 字。请写动作名称或简要描述，便于内容审核。',
          children: input
        })
      ],
      footer: button({
        label: '提交建议',
        variant: 'primary',
        full: true,
        onClick: () => {
          const text = value.trim();
          if (text.length < 2) {
            toast('请至少输入 2 个字描述想补充的动作', { tone: 'danger' });
            return;
          }
          const entry = {
            content: text,
            query: state.query,
            createdAt: new Date().toISOString()
          };
          const saved = saveLocalSuggestion(entry);
          dialog.close();
          if (saved) {
            toast('建议已记录在本机（原型不会写入动作库）', { tone: 'success' });
          } else {
            toast('本机存储不可用，建议未保存', { tone: 'danger' });
          }
        }
      })
    });
    return dialog;
  }

  const page = screen({
    title: '动作图鉴',
    subtitle: '按名称、别名、英文、拼音或首字母搜索',
    children: [
      el(
        'div',
        { className: 'library-search' },
        el('span', { className: 'library-search__icon' }, icon('search', { size: 18 })),
        searchInput
      ),
      hintsHost,
      el('div', { className: 'library-toolbar' }, countEl, filterTriggerHost),
      activeFiltersHost,
      resultsHost
    ]
  });

  // 首次渲染（页面尚未插入 DOM，直接填充结果区即可）
  renderResults();

  return page;
}
