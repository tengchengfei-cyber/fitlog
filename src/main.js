/**
 * 应用入口：注册 hash 路由、底部导航状态、PWA 注册、在线状态。
 */
import { initRouter } from './app/router.js';
import { maybeSeedDemoData } from './dev/demoData.js';
import { initCloudSync } from './features/sync/engine.js';
import { handleAuthRedirect } from './features/sync/redirect.js';

// 处理 Supabase 邮箱登录链接回调（magic link / 确认邮箱）：在路由初始化前拦截 hash 中的 token。
await handleAuthRedirect();

// 演示数据：仅在 URL 带 ?demo=1 且本机尚无数据时载入，不覆盖真实记录。
await maybeSeedDemoData();

const routes = [
  {
    path: '/',
    load: () => import('./features/home/homePage.js'),
    exportName: 'homePage',
    tab: 'home'
  },
  {
    path: '/library',
    load: () => import('./features/library/libraryPage.js'),
    exportName: 'libraryPage',
    tab: 'library'
  },
  {
    path: '/library/:exerciseId',
    load: () => import('./features/library/exerciseDetailPage.js'),
    exportName: 'exerciseDetailPage',
    tab: null
  },
  {
    path: '/log/new',
    load: () => import('./features/log/newSessionPage.js'),
    exportName: 'newSessionPage',
    tab: null
  },
  {
    path: '/log/active',
    load: () => import('./features/log/activeSessionPage.js'),
    exportName: 'activeSessionPage',
    tab: null
  },
  {
    path: '/log/:sessionId',
    load: () => import('./features/log/activeSessionPage.js'),
    exportName: 'activeSessionPage',
    tab: null
  },
  {
    path: '/history',
    load: () => import('./features/log/historyPage.js'),
    exportName: 'historyPage',
    tab: 'history'
  },
  {
    path: '/history/:sessionId',
    load: () => import('./features/log/sessionDetailPage.js'),
    exportName: 'sessionDetailPage',
    tab: null
  },
  {
    path: '/analysis/:sessionId',
    load: () => import('./features/analysis/analysisPage.js'),
    exportName: 'analysisPage',
    tab: null
  },
  {
    path: '/settings',
    load: () => import('./features/settings/settingsPage.js'),
    exportName: 'settingsPage',
    tab: 'settings'
  }
];

const root = document.getElementById('app');
const tabItems = Array.from(document.querySelectorAll('.tabbar__item'));

function updateChrome(ctx) {
  const activeTab = ctx.route ? ctx.route.tab : null;
  document.body.classList.toggle('tabbar-hidden', !activeTab);
  for (const item of tabItems) {
    const isActive = item.dataset.tab === activeTab;
    item.classList.toggle('is-active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  }
}

initRouter({ routes, root, onRouteChange: updateChrome });

// 云同步（可选）：仅在用户配置 Supabase 且已登录时才会联网；默认完全本地。
initCloudSync();

// ---------- 在线 / 离线状态 ----------

const offlineBar = document.getElementById('offline-bar');

function updateOnlineState() {
  if (!offlineBar) return;
  offlineBar.hidden = navigator.onLine;
}

window.addEventListener('online', () => {
  updateOnlineState();
  document.dispatchEvent(new CustomEvent('fitlog-online'));
});
window.addEventListener('offline', () => {
  updateOnlineState();
  document.dispatchEvent(new CustomEvent('fitlog-offline'));
});
updateOnlineState();

// ---------- PWA：安装提示与 Service Worker ----------

window.__fitlogInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__fitlogInstallPrompt = event;
  document.dispatchEvent(new CustomEvent('fitlog-installable'));
});

window.addEventListener('appinstalled', () => {
  window.__fitlogInstallPrompt = null;
  document.dispatchEvent(new CustomEvent('fitlog-installed'));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[pwa] Service Worker 注册失败（离线能力不可用）', err);
    });
  });
}
