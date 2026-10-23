/**
 * 首页：今日概览、开始训练、未完成训练恢复、近 7 天统计、最近训练、按肌群找动作。
 */
import { el } from '../../app/dom.js';
import {
  screen,
  sectionTitle,
  card,
  button,
  badge,
  callout,
  statTile,
  listItem,
  emptyState,
  toast,
  icon,
  iconButton,
  divider
} from '../../ui/index.js';
import {
  listSessions,
  getSettings,
  getDraft,
  completeOnboarding,
  saveSettings,
  GOALS,
  getGoalLabel,
  APP_VERSION
} from '../../app/store.js';
import { formatNumber, formatVolume, relativeTime } from '../../app/format.js';
import { getMuscle, MUSCLE_GROUPS } from '../../data/muscles.js';
import { EXERCISES, DATA_VERSION } from '../../data/exercises/index.js';
import { navigate } from '../../app/router.js';
import { seedDemoData } from '../../dev/demoData.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const INSTALL_TIP_KEY = 'fitlog.installTipDismissed.v1';

/** 手机 App 形式安装提示（仅未安装且未手动关闭时显示）。 */
function buildInstallTip() {
  try {
    if (localStorage.getItem(INSTALL_TIP_KEY) === '1') return null;
  } catch {
    return null;
  }
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return null;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const cardEl = card({
    className: 'install-tip',
    children: [
      el(
        'div',
        { className: 'row row--between' },
        el('div', { className: 'install-tip__title', textContent: '安装到手机主屏幕' }),
        badge({ label: 'App 形式', tone: 'accent' })
      ),
      el('p', {
        className: 'install-tip__text',
        textContent: isIos
          ? '用 Safari 分享菜单 →「添加到主屏幕」，即可像 App 一样全屏打开并离线使用。'
          : '安装后像 App 一样全屏打开；可离线浏览已缓存页面，训练数据仍在本机（或你配置的云端）。'
      }),
      el(
        'div',
        { className: 'row row--wrap mt-2' },
        button({
          label: '立即安装',
          variant: 'secondary',
          size: 'sm',
          iconName: 'download',
          onClick: async () => {
            const prompt = window.__fitlogInstallPrompt;
            if (prompt) {
              prompt.prompt();
              try {
                await prompt.userChoice;
              } finally {
                window.__fitlogInstallPrompt = null;
              }
            } else {
              toast(isIos ? '请用 Safari 分享菜单「添加到主屏幕」' : '请在浏览器菜单中选择「安装应用 / 添加到主屏幕」');
            }
          }
        }),
        button({
          label: '暂时不用',
          variant: 'ghost',
          size: 'sm',
          onClick: () => {
            try {
              localStorage.setItem(INSTALL_TIP_KEY, '1');
            } catch {
              /* ignore */
            }
            cardEl.remove();
          }
        })
      )
    ]
  });
  return cardEl;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function sessionStats(session) {
  let sets = 0;
  let volume = 0;
  for (const ex of session.exercises || []) {
    for (const set of ex.sets || []) {
      if (set.kind === 'warmup') continue;
      sets += 1;
      if (set.weightKg && set.reps) volume += set.weightKg * set.reps * (set.perSide ? 2 : 1);
    }
  }
  return { sets, volume };
}

function weekStats(sessions) {
  const cutoff = Date.now() - 7 * DAY_MS;
  const recent = sessions.filter((s) => new Date(s.startedAt).getTime() >= cutoff);
  let sets = 0;
  let volume = 0;
  const muscleGroups = new Set();
  for (const session of recent) {
    for (const ex of session.exercises || []) {
      const { sets: exSets } = sessionStats({ exercises: [ex] });
      sets += exSets;
      volume += sessionStats({ exercises: [ex] }).volume;
      for (const muscleId of ex.primaryMuscles || []) {
        const muscle = getMuscle(muscleId);
        if (muscle) muscleGroups.add(muscle.groupId);
      }
    }
  }
  return { sessions: recent.length, sets, volume, muscleGroups: muscleGroups.size };
}

function muscleGroupCounts() {
  const counts = new Map();
  for (const ex of EXERCISES) {
    for (const muscleId of ex.primaryMuscles || []) {
      const muscle = getMuscle(muscleId);
      if (!muscle) continue;
      counts.set(muscle.groupId, (counts.get(muscle.groupId) || 0) + 1);
    }
  }
  return counts;
}

function buildGoalPicker(onDone) {
  const selected = getSettings().goal;
  const grid = el('div', { className: 'goal-grid' });
  for (const goal of GOALS) {
    const isActive = goal.value === selected;
    grid.appendChild(
      el(
        'button',
        {
          className: `goal-option ${isActive ? 'is-selected' : ''}`.trim(),
          type: 'button',
          'aria-pressed': String(isActive),
          onClick: () => {
            completeOnboarding(goal.value);
            toast(`已设定目标：${goal.label}`, { tone: 'success' });
            if (onDone) onDone(goal.value);
          }
        },
        el('span', { className: 'goal-option__label', textContent: goal.label }),
        el('span', { className: 'goal-option__hint', textContent: goal.hint })
      )
    );
  }
  return grid;
}

export function homePage() {
  const settings = getSettings();
  const sessions = listSessions();
  const draft = getDraft();
  const stats = weekStats(sessions);
  const lastSession = sessions[0] || null;
  const groupCounts = muscleGroupCounts();
  const needsOnboarding = !settings.onboarded || !settings.goal;

  let root;

  const body = [];

  // 品牌行
  body.push(
    el(
      'div',
      { className: 'home-top' },
      el(
        'div',
        { className: 'brand' },
        el('span', { className: 'brand__mark', textContent: '练' }),
        el(
          'div',
          { className: 'brand__text' },
          el('div', { className: 'brand__name' }, '练迹', el('span', { className: 'brand__en', textContent: 'FitLog' })),
          el('div', { className: 'brand__sub', textContent: `${greeting()} · ${relativeTime(new Date().toISOString()).replace('今天 ', '')}` })
        )
      ),
      iconButton({ iconName: 'settings', label: '设置', href: '/settings' })
    )
  );

  // 安装提示（App 形式；可关闭）
  const installTip = buildInstallTip();
  if (installTip) body.push(installTip);

  // 目标设置卡片（首次使用）
  if (needsOnboarding) {
    const cardEl = card({
      className: 'onboarding-card',
      children: [
        el('div', { className: 'onboarding-card__head' }, badge({ label: '第一次使用', tone: 'accent' })),
        el('h2', { className: 'onboarding-card__title', textContent: '先选一个训练目标' }),
        el('p', { className: 'onboarding-card__text', textContent: '目标只影响建议的侧重点，可随时在「我的」中修改。' }),
        buildGoalPicker((goal) => {
          toast(`目标已保存：${getGoalLabel(goal)}`, { tone: 'success' });
          const next = homePage();
          root.replaceWith(next);
          root = next;
        })
      ]
    });
    body.push(cardEl);
  } else {
    body.push(
      el(
        'div',
        { className: 'home-goal-line' },
        el('span', { className: 'muted text-sm', textContent: '当前目标' }),
        badge({ label: getGoalLabel(settings.goal), tone: 'accent', iconName: 'target' })
      )
    );
  }

  // 未完成训练
  if (draft) {
    const draftSets = (draft.exercises || []).reduce(
      (sum, ex) => sum + (ex.sets || []).filter((set) => set.kind !== 'warmup').length,
      0
    );
    body.push(
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
              el('div', { className: 'resume-card__title', textContent: '有训练还没结束' }),
              el('div', {
                className: 'resume-card__sub',
                textContent: `${(draft.exercises || []).length} 个动作 · ${draftSets} 组 · ${relativeTime(draft.startedAt)}`
              })
            )
          ),
          button({ label: '继续记录', size: 'sm', onClick: () => navigate('/log/active') })
        ]
      })
    );
  }

  // 主 CTA
  body.push(
    el(
      'div',
      { className: 'hero-card' },
      el('div', { className: 'hero-card__glow' }),
      el(
        'div',
        { className: 'hero-card__content' },
        el('div', { className: 'hero-card__kicker' }, lastSession ? `上次训练 · ${relativeTime(lastSession.startedAt)}` : '第一次训练'),
        el('h2', { className: 'hero-card__title', textContent: lastSession ? '今天练点什么？' : '从一次训练开始' }),
        el('p', {
          className: 'hero-card__text',
          textContent: lastSession
            ? '记录动作与组数，结束后查看基于规则与证据的复盘。'
            : '搜索动作、记录组数即可，重量和次数后续补全也可以。'
        }),
        el(
          'div',
          { className: 'hero-card__actions' },
          button({ label: '开始训练', iconName: 'plus', size: 'lg', onClick: () => navigate('/log/new') }),
          button({
            label: '浏览动作库',
            variant: 'ghost',
            size: 'lg',
            onClick: () => navigate('/library')
          })
        )
      )
    )
  );

  // 近 7 天统计
  body.push(
    sectionTitle({ title: '近 7 天', hint: '来自本机已完成的训练记录' }),
    el(
      'div',
      { className: 'grid-3' },
      statTile({ label: '训练', value: `${stats.sessions}`, hint: '次' }),
      statTile({ label: '完成组数', value: `${stats.sets}`, hint: '组（不含热身）' }),
      statTile({
        label: '估算吨位',
        value: stats.volume > 0 ? formatVolume(stats.volume) : '—',
        hint: '仅统计有重量与次数的组'
      })
    ),
    el(
      'p',
      { className: 'muted text-xs home-stat-note' },
      stats.sessions === 0
        ? '还没有已完成训练。首次训练后，这里会显示训练频次与组数汇总。'
        : `近 7 天涉及 ${stats.muscleGroups} 个肌群组；组数是「估计的直接训练暴露」，不是精确生理剂量。吨位仅统计有重量与次数的组，不是完整总量。`
    )
  );

  // 最近训练
  body.push(sectionTitle({ title: '最近训练', action: button({ label: '全部', variant: 'ghost', size: 'sm', onClick: () => navigate('/history') }) }));
  if (sessions.length === 0) {
    body.push(
      emptyState({
        iconName: 'history',
        title: '还没有训练记录',
        text: '完成第一次训练后，这里会显示你的训练历史与分析入口。',
        action: el(
          'div',
          { className: 'row row--wrap home-empty-actions' },
          button({ label: '开始第一次训练', variant: 'secondary', size: 'sm', onClick: () => navigate('/log/new') }),
          button({
            label: '载入演示数据（可选）',
            variant: 'ghost',
            size: 'sm',
            onClick: async () => {
              const result = await seedDemoData();
              if (result.seeded) {
                toast('演示数据已载入，正在刷新…', { tone: 'success' });
                setTimeout(() => window.location.reload(), 500);
              } else {
                toast('已有训练数据，未载入演示数据');
              }
            }
          })
        )
      })
    );
  } else {
    const list = el('div', { className: 'card home-recent' });
    for (const session of sessions.slice(0, 3)) {
      const statsData = sessionStats(session);
      const names = (session.exercises || []).map((ex) => ex.exerciseName).filter(Boolean);
      const title = names.slice(0, 2).join(' · ') + (names.length > 2 ? ` 等 ${names.length} 个` : '');
      list.appendChild(
        listItem({
          title: title || '训练记录',
          subtitle: `${(session.exercises || []).length} 个动作 · ${statsData.sets} 组${statsData.volume > 0 ? ` · ${formatVolume(statsData.volume)}` : ''}`,
          meta: badge({ label: getGoalLabel(session.goal), tone: 'neutral' }),
          href: `/history/${session.id}`,
          leading: icon('activity', { size: 20 })
        })
      );
    }
    body.push(list);
  }

  // 按肌群找动作
  const muscleGroups = MUSCLE_GROUPS.filter((group) => (groupCounts.get(group.id) || 0) > 0);
  if (muscleGroups.length > 0) {
    body.push(
      sectionTitle({ title: '按肌群找动作', hint: `动作库已加载 ${EXERCISES.length} 个动作` }),
      el(
        'div',
        { className: 'muscle-chip-grid' },
        muscleGroups.map((group) =>
          el(
            'button',
            {
              className: 'muscle-chip',
              type: 'button',
              onClick: () => navigate(`/library?muscle=${group.id}`)
            },
            el('span', { className: 'muscle-chip__name', textContent: group.name }),
            el('span', { className: 'muscle-chip__count', textContent: `${groupCounts.get(group.id)} 个` })
          )
        )
      )
    );
  }

  // 安全与证据提示
  body.push(
    callout({
      tone: 'info',
      title: '关于本原型的分析',
      children: [
        '训练分布与建议来自「审核过的动作—肌群映射 + 确定性规则 + 可追溯证据条目」，属于估计值，不构成医疗建议。',
        el('div', { className: 'mt-2' }, button({ label: '查看证据库与免责声明', variant: 'ghost', size: 'sm', onClick: () => navigate('/settings') }))
      ]
    })
  );

  body.push(
    el(
      'div',
      { className: 'home-footer' },
      el('p', { textContent: `原型 ${APP_VERSION} · 内容版本 ${DATA_VERSION}` }),
      el('p', { textContent: '当前数据仅保存在本机；登录、云端同步与多设备隔离将在阶段 1 实现。' })
    )
  );

  root = screen({
    title: '',
    className: 'home-screen',
    children: [el('div', { className: 'home-body' }, body)]
  });
  root.querySelector('.screen__header').remove();
  return root;
}
