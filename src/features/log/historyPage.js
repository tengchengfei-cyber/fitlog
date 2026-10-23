/**
 * 训练历史页（#/history，底部 tab「记录」）。
 *
 * - 按「今天 / 昨天 / 更早」分组展示已完成训练；
 * - 每条显示日期、目标、动作数、完成组数、总吨位与分析入口；
 * - 顶部展示未完成草稿（继续 / 放弃）；空状态引导去新建训练或动作库。
 */
import { el } from '../../app/dom.js';
import {
  screen,
  sectionTitle,
  card,
  button,
  badge,
  emptyState,
  toast,
  icon,
  confirmDialog,
  listItem
} from '../../ui/index.js';
import { listSessions, getDraft, discardDraft } from '../../app/store.js';
import { navigate } from '../../app/router.js';
import { formatDate, formatTime, relativeTime } from '../../app/format.js';
import { groupSessionsByDate, sessionStats } from './sessionOps.js';
import { analysisState, goalBadge, sessionTitleText, sessionVolumeMeta } from './logShared.js';

export function historyPage() {
  const root = screen({
    title: '训练历史',
    subtitle: '查看每次训练的动作、组数与复盘',
    className: 'log-screen log-history-screen',
    actions: [
      button({
        label: '新建',
        variant: 'primary',
        size: 'sm',
        iconName: 'plus',
        onClick: () => navigate('/log/new')
      })
    ]
  });
  const body = root.querySelector('.screen__body');

  // ---------- 草稿卡 ----------
  function draftCard() {
    const draft = getDraft();
    if (!draft) return null;
    const stats = sessionStats(draft);
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
            el('div', { className: 'resume-card__title', textContent: '未完成的训练' }),
            el('div', {
              className: 'resume-card__sub',
              textContent: `${stats.exerciseCount} 个动作 · 已记录 ${stats.completedSetCount} 组 · ${relativeTime(
                draft.startedAt
              )}开始 · 已自动保存`
            })
          )
        ),
        el(
          'div',
          { className: 'log-draft-actions' },
          button({ label: '继续记录', size: 'sm', onClick: () => navigate(`/log/${draft.id}`) }),
          button({
            label: '放弃',
            variant: 'ghost',
            size: 'sm',
            onClick: () => confirmDiscard(draft)
          })
        )
      ]
    });
  }

  function confirmDiscard(draft) {
    confirmDialog({
      title: '放弃这次训练？',
      message: '未完成的训练记录会被删除，且不可恢复。',
      confirmLabel: '放弃训练',
      cancelLabel: '继续记录',
      tone: 'danger',
      onConfirm: () => {
        discardDraft(draft.id);
        toast('已放弃本次训练', { tone: 'success' });
        renderBody();
      }
    });
  }

  // ---------- 历史条目 ----------
  function historyItem(session) {
    const stats = sessionStats(session);
    const volume = sessionVolumeMeta(session);
    const { hasAnalysis } = analysisState(session);
    const metaBadges = [goalBadge(session.goal)];
    if (hasAnalysis) metaBadges.push(badge({ label: '已分析', tone: 'info', iconName: 'chart' }));
    const subtitleParts = [
      `${formatDate(session.startedAt)} ${formatTime(session.startedAt)}`,
      `${stats.exerciseCount} 个动作`,
      `${stats.completedSetCount} 组${volume.isComplete ? '' : `（${volume.coverageText}）`}`
    ];
    return listItem({
      title: sessionTitleText(session),
      meta: el('span', { className: 'log-history-badges' }, metaBadges),
      subtitle: subtitleParts.join(' · '),
      trailing: el(
        'span',
        { className: 'log-history-item__trailing' },
        el('span', {
          className: 'log-history-item__volume num',
          title: volume.coverageText,
          textContent: `${volume.isComplete ? '' : '≈ '}${volume.valueText}`
        }),
        icon('chevron-right', { size: 18 })
      ),
      href: `/history/${session.id}`
    });
  }

  function groupSection(group) {
    return el(
      'section',
      { className: 'log-history-group' },
      sectionTitle({
        title: group.title,
        hint: `${group.sessions.length} 次`
      }),
      el('div', { className: 'card log-history-list' }, group.sessions.map((session) => historyItem(session)))
    );
  }

  function emptyStateCard() {
    return card({
      children: emptyState({
        iconName: 'history',
        title: '还没有训练记录',
        text: '完成第一次训练后，这里会显示每次训练的动作、组数、吨位与复盘入口。',
        action: el(
          'div',
          { className: 'log-empty-actions' },
          button({
            label: '开始第一次训练',
            variant: 'primary',
            iconName: 'plus',
            onClick: () => navigate('/log/new')
          }),
          button({
            label: '浏览动作库',
            variant: 'ghost',
            onClick: () => navigate('/library')
          })
        )
      })
    });
  }

  // ---------- 渲染 ----------
  function renderBody() {
    const sessions = listSessions();
    const draft = getDraft();
    const children = [];
    const draftEl = draftCard();
    if (draftEl) children.push(draftEl);

    if (!sessions.length) {
      children.push(emptyStateCard());
    } else {
      const groups = groupSessionsByDate(sessions);
      for (const group of groups) children.push(groupSection(group));
      children.push(
        el('p', {
          className: 'log-history-note muted text-xs',
          textContent:
            '列表按训练开始时间倒序；吨位按「重量 × 次数」估算（单侧组按两侧计，不含热身组），仅用于回顾，不是精确消耗。' +
      '只有全部正式组都记录重量与次数时才显示为完整总量；带「≈」表示仅为已记录组的估算值。'
        })
      );
    }

    if (draft) {
      children.push(
        el('p', {
          className: 'log-history-note muted text-xs',
          textContent: '原型的训练记录只保存在本机；登录、云端同步与多设备隔离将在阶段 1 实现。'
        })
      );
    }
    body.replaceChildren(...children);
  }

  renderBody();
  return root;
}
