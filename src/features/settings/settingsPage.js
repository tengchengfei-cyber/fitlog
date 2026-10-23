/**
 * 设置页：训练目标、AI 模型接入（BYOK）、知识库与动作扩展、媒体偏好、数据与隐私、PWA 安装、关于。
 *
 * 说明（产品主人 2026-10-22 指示）：
 * - 「证据与安全说明」不再作为设置页的独立板块展示；证据规则仅用于约束 AI 与建议依据，
 *   需要时在分析页的建议卡中展开查看；
 * - 新增 AI 模型接入（用户自带提供方/Key/协议）与知识库（内置知识 + 用户权威资料 + 动作扩展包）。
 */
import { el } from '../../app/dom.js';
import {
  screen,
  sectionTitle,
  card,
  listItem,
  button,
  iconButton,
  badge,
  callout,
  disclosure,
  toast,
  confirmDialog,
  icon,
  segmentedControl,
  divider,
  field,
  textInput,
  sheet
} from '../../ui/index.js';
import {
  getSettings,
  getState,
  saveSettings,
  listAllSessions,
  exportData,
  deleteAllData,
  GOALS,
  APP_VERSION
} from '../../app/store.js';
import { storageInfo } from '../../app/storage.js';
import { formatNumber, formatDate, formatDateTime } from '../../app/format.js';
import { EXERCISES, DATA_VERSION, DATA_LOAD_ERRORS, DATA_SOURCES } from '../../data/exercises/index.js';
import { navigate } from '../../app/router.js';
import {
  getCloudStatus,
  configureCloud,
  disconnectCloud,
  sendLoginCode,
  verifyLoginCode,
  logoutCloud,
  deleteCloudTrainingData,
  syncNow
} from '../sync/engine.js';
import { consumeAuthNotice } from '../sync/redirect.js';
import { startGithubLogin } from '../sync/auth.js';
import {
  AI_PROTOCOLS,
  AI_PROMPT_VERSION,
  protocolMeta,
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  isAiConfigured,
  maskApiKey,
  aiConfigSummary
} from '../ai/config.js';
import { testAiConnection } from '../ai/client.js';
import {
  KNOWLEDGE_MAX_FILES,
  KNOWLEDGE_MAX_CHARS_PER_FILE,
  knowledgeStats,
  listUserKnowledgeFiles,
  saveUserKnowledgeFile,
  deleteUserKnowledgeFile,
  exportUserKnowledgeFiles
} from '../ai/knowledge.js';
import {
  loadImportedExercises,
  saveImportedExercises,
  clearImportedExercises,
  importedExercisesMeta
} from '../../data/importedExercises.js';
import { parseExercisePack } from '../library/exercisePack.js';

// ---------- 通用小工具 ----------

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  return `${formatNumber(bytes / 1024, 1)} KB`;
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = el('a', { href: url, download: filename });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function readFileText(file) {
  if (file && typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

function showIssueSheet(title, messages) {
  const handle = sheet({
    title,
    children: el(
      'div',
      { className: 'stack stack--sm' },
      messages.slice(0, 12).map((message) => el('p', { className: 'text-secondary text-sm', textContent: `· ${message}` })),
      messages.length > 12 ? el('p', { className: 'muted text-xs', textContent: `还有 ${messages.length - 12} 条问题未显示` }) : null
    ),
    footer: button({ label: '知道了', variant: 'secondary', full: true, onClick: () => handle.close() })
  });
  return handle;
}

function hiddenFileInput(accept, onFile) {
  const input = el('input', {
    type: 'file',
    accept,
    className: 'hidden',
    'aria-label': '选择文件',
    onChange: async (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (file) await onFile(file);
    }
  });
  return input;
}

// ---------- 训练目标 ----------

function buildGoalSection() {
  const settings = getSettings();
  const grid = el('div', { className: 'goal-list' });
  const buttons = [];
  for (const goal of GOALS) {
    const active = settings.goal === goal.value;
    const btn = el(
      'button',
      {
        className: `goal-option goal-option--row ${active ? 'is-selected' : ''}`.trim(),
        type: 'button',
        'aria-pressed': String(active),
        onClick: () => {
          saveSettings({ goal: goal.value });
          for (const item of buttons) {
            const isActive = item.dataset.goal === goal.value;
            item.classList.toggle('is-selected', isActive);
            item.setAttribute('aria-pressed', String(isActive));
          }
          toast(`训练目标已更新：${goal.label}`, { tone: 'success' });
        },
        dataset: { goal: goal.value }
      },
      el(
        'div',
        { className: 'goal-option__main' },
        el('span', { className: 'goal-option__label', textContent: goal.label }),
        el('span', { className: 'goal-option__hint', textContent: goal.hint })
      ),
      el('span', { className: 'goal-option__check' }, icon('check', { size: 18 }))
    );
    buttons.push(btn);
    grid.appendChild(btn);
  }
  return card({
    children: [el('p', { className: 'muted text-sm mb-3', textContent: '目标只影响建议侧重点，不改变事实统计；可随时调整。' }), grid]
  });
}

// ---------- 账户与云同步（可选 Supabase 免费版） ----------

function buildCloudSection() {
  const wrapper = el('div', { className: 'stack' });
  const draft = {
    email: '',
    code: '',
    codeSent: false,
    busy: false,
    feedback: '',
    feedbackTone: 'muted',
    authNotice: consumeAuthNotice()
  };

  function render() {
    wrapper.replaceChildren(...buildNodes());
  }

  function authNoticeNode() {
    if (!draft.authNotice) return null;
    const tone = draft.authNotice.tone === 'danger' ? 'danger' : draft.authNotice.tone === 'success' ? 'success' : 'info';
    return callout({
      tone,
      title: tone === 'danger' ? '登录提示' : tone === 'success' ? '登录成功' : '提示',
      children: [el('p', { textContent: draft.authNotice.text })]
    });
  }

  function feedbackNode() {
    if (!draft.feedback) return null;
    return el('p', {
      className: draft.feedbackTone === 'danger' ? 'text-sm' : 'muted text-xs',
      style: draft.feedbackTone === 'danger' ? { color: 'var(--danger)' } : undefined,
      textContent: draft.feedback
    });
  }

  function canEditCloudConfig() {
    if (typeof window === 'undefined' || !window.location) return false;
    const host = window.location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') return true;
    // 部署后如果临时需要重新配置，可用 ?owner=1 打开设置页（普通用户不会看到）
    try {
      return new URLSearchParams(window.location.search).get('owner') === '1';
    } catch {
      return false;
    }
  }

  function buildNodes() {
    const status = getCloudStatus();
    const docsLink = el('p', {
      className: 'mt-2'
    }, el('a', {
      className: 'link text-xs',
      href: 'docs/CLOUD_SYNC_SETUP.md',
      target: '_blank',
      rel: 'noopener noreferrer',
      textContent: '查看免费 Supabase 5 分钟设置步骤（含数据库 RLS）'
    }));

    if (!status.configured) {
      if (!canEditCloudConfig()) {
        return [
          card({
            children: [
              el(
                'div',
                { className: 'row row--between row--wrap mb-3' },
                el('span', { className: 'strong', textContent: '本机模式' }),
                badge({ label: '云端未配置', tone: 'neutral' })
              ),
              el('p', {
                className: 'muted text-sm',
                textContent:
                  '应用提供方尚未为这个版本配置云端同步。所有训练记录、分析、AI 与知识库仍可正常使用，数据保存在本机浏览器；可导出 JSON 备份。'
              }),
              callout({
                tone: 'info',
                title: '不需要你填写任何服务器地址或密钥',
                children: '如果这是你自己部署的版本，请让部署者在构建时注入 Supabase 配置（见部署文档）；普通用户无需操作。'
              })
            ]
          })
        ];
      }
      const urlInput = textInput({
        value: '',
        placeholder: 'https://your-project.supabase.co',
        inputMode: 'url',
        onChange: (value) => {
          draft.supabaseUrl = value;
        }
      });
      const keyInput = textInput({
        value: '',
        type: 'password',
        placeholder: 'Supabase anon public key（可公开的客户端密钥）',
        onChange: (value) => {
          draft.anonKey = value;
        }
      });
      return [
        card({
          children: [
            el(
              'div',
              { className: 'row row--between row--wrap mb-3' },
              el('span', { className: 'strong', textContent: '部署者设置：云端连接（开发调试）' }),
              badge({ label: '仅本机/owner', tone: 'warning' })
            ),
            el('p', {
              className: 'muted text-sm',
              textContent:
                '普通用户不应该看到这个表单。正式发布前请在构建时注入 Supabase 配置（FITLOG_SUPABASE_URL / FITLOG_SUPABASE_ANON_KEY），用户只需要登录。这里仅用于本地开发或临时调试。'
            }),
            el(
              'div',
              { className: 'stack mt-3' },
              field({ label: 'Supabase Project URL', children: urlInput }),
              field({ label: 'anon public key', hint: 'Supabase 设计为可公开的客户端密钥；数据安全由数据库 RLS 保证', children: keyInput })
            ),
            el(
              'div',
              { className: 'row row--wrap mt-3' },
              button({
                label: '保存并连接',
                variant: 'primary',
                iconName: 'link',
                onClick: () => {
                  const configured = configureCloud({ supabaseUrl: draft.supabaseUrl, anonKey: draft.anonKey });
                  if (!configured.supabaseUrl || !configured.anonKey || configured.anonKey.length < 20) {
                    draft.feedback = '请填写有效的 Supabase URL 与 anon key';
                    draft.feedbackTone = 'danger';
                  } else {
                    draft.feedback = '已保存云同步配置，请用邮箱验证码登录';
                    draft.feedbackTone = 'muted';
                  }
                  render();
                }
              })
            ),
            feedbackNode(),
            docsLink,
            callout({
              tone: 'info',
              title: '免费额度与限制',
              children:
                'Supabase 免费版含邮箱登录与数据库，个人使用通常足够；免费项目可能因长期不活跃被暂停，且内置邮件发送有频率限制。你也可以完全不用云同步，继续本机使用。'
            })
          ]
        })
      ];
    }

    if (!status.loggedIn) {
      const emailInput = textInput({
        value: draft.email,
        type: 'email',
        placeholder: 'you@example.com',
        inputMode: 'email',
        onChange: (value) => {
          draft.email = value;
        }
      });
      const codeInput = draft.codeSent
        ? textInput({
            value: draft.code,
            placeholder: '邮箱收到的 6–8 位验证码',
            inputMode: 'numeric',
            onChange: (value) => {
              draft.code = value;
            }
          })
        : null;
      return [
        card({
          children: [
            el(
              'div',
              { className: 'row row--between row--wrap mb-3' },
              el('span', { className: 'strong', textContent: '登录' }),
              badge({ label: `已连接 ${status.host}`, tone: 'info' })
            ),
            authNoticeNode(),
            status.managed
              ? callout({
                  tone: 'info',
                  title: '云端已由应用提供方配置',
                  children:
                    '你不需要填写 Supabase URL 或 Key，直接登录即可。训练数据按账号隔离，应用提供方无法读取你的私人记录（数据库 RLS）。'
                })
              : null,
            el('p', {
              className: 'muted text-sm',
              textContent: status.managed
                ? '用 GitHub 账号登录即可跨设备同步训练记录；也可以用邮箱登录，两种方式登录后的云端数据相同。'
                : '推荐直接用 GitHub 账号登录：不需要邮箱验证码、不受邮件发送限制。也可以用邮箱登录（邮件里可能是验证码或确认链接）；两种方式登录后的云端数据相同。'
            }),
            el(
              'div',
              { className: 'row row--wrap mt-3' },
              button({
                label: '使用 GitHub 账号登录',
                variant: 'primary',
                iconName: 'user',
                onClick: () => {
                  const result = startGithubLogin('github');
                  if (!result.ok) {
                    draft.feedback = result.error || 'GitHub 登录失败';
                    draft.feedbackTone = 'danger';
                    render();
                  }
                }
              })
            ),
            status.managed
              ? null
              : el('p', {
                  className: 'muted text-xs mt-2',
                  textContent:
                    '首次使用需在 Supabase → Authentication → Providers 中开启 GitHub，并把 Client ID/Secret 填到 Supabase（详见 CLOUD_SYNC_SETUP 文档）；GitHub 授权后自动回到应用并同步。'
                }),
            divider({ space: 12 }),
            el('p', { className: 'muted text-sm', textContent: '或用邮箱登录：' }),
            el('div', { className: 'stack mt-3' }, field({ label: '邮箱', children: emailInput })),
            codeInput ? el('div', { className: 'stack mt-2' }, field({ label: '验证码', children: codeInput })) : null,
            el(
              'div',
              { className: 'row row--wrap mt-3' },
              button({
                label: draft.busy ? '发送中…' : draft.codeSent ? '重新发送登录邮件' : '发送登录邮件',
                variant: 'secondary',
                iconName: 'mail',
                disabled: draft.busy,
                onClick: async () => {
                  draft.busy = true;
                  draft.feedback = '正在发送验证码…';
                  draft.feedbackTone = 'muted';
                  render();
                  const result = await sendLoginCode(draft.email);
                  draft.busy = false;
                  if (result.ok) {
                    draft.codeSent = true;
                    draft.feedback = `登录邮件已发送到 ${result.email}：如有 6–8 位验证码可直接输入；如只有「Confirm your email」或登录链接，请点击邮件中的链接，会自动回到应用完成登录。`;
                  } else {
                    draft.feedback = result.error || '发送失败';
                    draft.feedbackTone = 'danger';
                  }
                  render();
                }
              }),
              draft.codeSent
                ? button({
                    label: draft.busy ? '验证中…' : '验证并登录',
                    variant: 'primary',
                    iconName: 'check',
                    disabled: draft.busy,
                    onClick: async () => {
                      draft.busy = true;
                      draft.feedback = '正在验证并同步…';
                      draft.feedbackTone = 'muted';
                      render();
                      const result = await verifyLoginCode(draft.email, draft.code);
                      draft.busy = false;
                      if (result.ok) {
                        draft.feedback = result.warning
                          ? `登录成功，但首次同步失败：${result.warning}（可稍后点「立即同步」重试）`
                          : '登录成功，已拉取云端记录。';
                        draft.feedbackTone = result.warning ? 'danger' : 'muted';
                      } else {
                        draft.feedback = result.error || '验证失败';
                        draft.feedbackTone = 'danger';
                      }
                      render();
                    }
                  })
                : null,
              status.managed
                ? null
                : button({
                    label: '断开服务器',
                    variant: 'ghost',
                    onClick: () => {
                      confirmDialog({
                        title: '断开云同步？',
                        message: '将清除本机的项目地址、anon key 与登录状态；本机训练数据保留。已上传的云端数据不会被删除。',
                        confirmLabel: '断开',
                        tone: 'danger',
                        onConfirm: () => {
                          disconnectCloud();
                          render();
                        }
                      });
                    }
                  })
            ),
            feedbackNode(),
            status.managed ? null : docsLink
          ]
        })
      ];
    }

    return [
      card({
        children: [
          el(
            'div',
            { className: 'row row--between row--wrap mb-3' },
            el('span', { className: 'strong', textContent: '已登录 · 云同步已启用' }),
            badge({ label: '在线同步', tone: 'success' })
          ),
          authNoticeNode(),
          listItem({
            title: status.email || '已登录',
            subtitle: `服务器：${status.host} · 最近同步：${status.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : '尚未同步'}`,
            leading: icon('user', { size: 18 })
          }),
          status.lastError
            ? callout({ tone: 'warning', title: '上次同步失败', children: [el('p', { textContent: status.lastError })] })
            : null,
          el(
            'div',
            { className: 'row row--wrap mt-3' },
            button({
              label: '立即同步',
              variant: 'primary',
              iconName: 'sync',
              onClick: async () => {
                draft.feedback = '正在同步…';
                draft.feedbackTone = 'muted';
                render();
                try {
                  const result = await syncNow({ reason: 'manual' });
                  draft.feedback = `同步完成：本地共 ${result.stats.sessionsTotal ?? '—'} 次训练、${result.stats.analysesTotal ?? '—'} 份分析快照。`;
                } catch (err) {
                  draft.feedback = `同步失败：${String(err && err.message ? err.message : err)}`;
                  draft.feedbackTone = 'danger';
                }
                render();
              }
            }),
            button({
              label: '退出登录',
              variant: 'secondary',
              iconName: 'logout',
              onClick: async () => {
                await logoutCloud();
                draft.feedback = '已退出登录，本机记录保留。';
                draft.feedbackTone = 'muted';
                render();
              }
            }),
            status.managed
              ? null
              : button({
                  label: '断开服务器',
                  variant: 'ghost',
                  onClick: () => {
                    confirmDialog({
                      title: '断开云同步？',
                      message: '将退出登录并清除本机保存的项目地址与 anon key；本机训练数据保留，已上传的云端数据不会被删除。',
                      confirmLabel: '断开',
                      tone: 'danger',
                      onConfirm: async () => {
                        await logoutCloud();
                        disconnectCloud();
                        render();
                      }
                    });
                  }
                })
          ),
          feedbackNode(),
          divider({ space: 12 }),
          callout({
            tone: 'warning',
            title: '同步范围与数据权利',
            children:
              '同步：训练记录、草稿、分析快照、训练偏好。不同步：AI 模型配置/API Key、知识库文件、用户导入动作（只留本机）。需要清空云端训练数据可点下方按钮；如需删除 Supabase 账户本身，请在 Supabase Dashboard 的用户管理中删除（客户端无权限删除 Auth 用户）。'
          }),
          el(
            'div',
            { className: 'mt-2' },
            button({
              label: '删除云端训练数据',
              variant: 'danger',
              iconName: 'trash',
              onClick: () => {
                confirmDialog({
                  title: '删除云端训练数据？',
                  message: '将删除你账号下的云端训练/草稿/分析快照（本机数据不受影响，之后若登录可能会再次上传本机数据）。此操作不可恢复。',
                  confirmLabel: '删除云端数据',
                  tone: 'danger',
                  onConfirm: async () => {
                    try {
                      await deleteCloudTrainingData();
                      draft.feedback = '云端训练数据已删除。';
                    } catch (err) {
                      draft.feedback = `删除失败：${String(err && err.message ? err.message : err)}`;
                      draft.feedbackTone = 'danger';
                    }
                    render();
                  }
                });
              }
            })
          )
        ]
      })
    ];
  }

  render();
  return wrapper;
}

// ---------- AI 模型接入（BYOK） ----------

function buildAiSection() {
  const config = loadAiConfig();
  const draft = { ...config };
  const statusWrap = el('div', { className: 'ai-status-row' });
  const feedback = el('p', { className: 'muted text-xs mt-2', textContent: '填写后可先「测试连接」，成功后再用于训练分析。' });

  const hintEl = el('p', { className: 'muted text-xs mt-2', textContent: protocolMeta(draft.protocol).hint });

  const providerInput = textInput({
    value: draft.providerLabel,
    placeholder: '例如：DeepSeek / 我的 Ollama / 公司网关',
    onChange: (value) => {
      draft.providerLabel = value;
    }
  });
  const baseUrlInput = textInput({
    value: draft.baseUrl,
    placeholder: 'https://api.example.com/v1',
    inputMode: 'url',
    onChange: (value) => {
      draft.baseUrl = value;
    }
  });
  const modelInput = textInput({
    value: draft.model,
    placeholder: '例如：deepseek-chat / gpt-4o-mini',
    onChange: (value) => {
      draft.model = value;
    }
  });
  const keyInput = textInput({
    type: 'password',
    value: draft.apiKey,
    placeholder: 'sk-...（只保存在本机，不进入导出）',
    autocomplete: 'off',
    onChange: (value) => {
      draft.apiKey = value;
    }
  });

  const protocolControl = segmentedControl({
    options: AI_PROTOCOLS.map((item) => ({ value: item.value, label: item.label })),
    value: draft.protocol,
    name: '模型协议',
    onChange: (value) => {
      const previous = protocolMeta(draft.protocol);
      draft.protocol = value;
      const meta = protocolMeta(value);
      if (!draft.baseUrl || draft.baseUrl === previous.defaultBaseUrl) {
        draft.baseUrl = meta.defaultBaseUrl;
        baseUrlInput.value = meta.defaultBaseUrl;
      }
      if (!draft.model || draft.model === previous.defaultModel) {
        draft.model = meta.defaultModel;
        modelInput.value = meta.defaultModel;
      }
      hintEl.textContent = meta.hint;
      refreshStatus();
    }
  });

  function refreshStatus() {
    const configured = isAiConfigured(draft);
    const nodes = [
      badge({ label: configured ? '已配置' : '未配置', tone: configured ? 'success' : 'warning' }),
      el('span', {
        className: 'muted text-xs',
        textContent: configured ? aiConfigSummary(draft) : '未配置时使用规则模板'
      })
    ];
    if (draft.apiKey) nodes.push(el('span', { className: 'muted text-xs', textContent: `Key：${maskApiKey(draft.apiKey)}` }));
    statusWrap.replaceChildren(...nodes);
  }

  function validateDraft() {
    if (!draft.baseUrl || !/^https?:\/\//i.test(draft.baseUrl.trim())) return 'Base URL 需要以 http:// 或 https:// 开头';
    if (!draft.model || !draft.model.trim()) return '请填写模型名称';
    if (!draft.apiKey || draft.apiKey.trim().length < 8) return '请填写有效的 API Key（至少 8 个字符）';
    return null;
  }

  async function persist({ test = false } = {}) {
    const error = validateDraft();
    if (error) {
      toast(error, { tone: 'danger' });
      return null;
    }
    const saved = saveAiConfig({
      protocol: draft.protocol,
      providerLabel: (draft.providerLabel || '').trim() || '我的模型',
      baseUrl: draft.baseUrl.trim(),
      model: draft.model.trim(),
      apiKey: draft.apiKey.trim(),
      temperature: draft.temperature
    });
    Object.assign(draft, saved);
    refreshStatus();
    if (!test) {
      toast('模型配置已保存在本机（仅此浏览器）', { tone: 'success' });
      return saved;
    }
    testButton.disabled = true;
    feedback.textContent = '正在测试连接…（浏览器直连，可能需要几秒）';
    const result = await testAiConnection(saved);
    testButton.disabled = false;
    if (result.ok) {
      feedback.textContent = `连接成功 · ${result.latencyMs} ms · 模型回复：${result.text || '（空）'}`;
      toast('模型连接成功', { tone: 'success' });
    } else {
      feedback.textContent = `连接失败：${result.error}。请检查 Base URL、模型名、Key 与提供方是否允许浏览器跨域（CORS）。`;
      toast('模型连接失败，请查看提示', { tone: 'danger', duration: 4000 });
    }
    return saved;
  }

  const testButton = button({
    label: '测试连接',
    variant: 'secondary',
    iconName: 'link',
    onClick: () => persist({ test: true })
  });

  refreshStatus();

  return card({
    children: [
      el(
        'div',
        { className: 'row row--between row--wrap mb-3' },
        el('span', { className: 'strong', textContent: '使用你自己的模型生成分析文案' }),
        statusWrap
      ),
      el('p', {
        className: 'muted text-sm mb-3',
        textContent:
          '自带密钥（BYOK）：填写提供方、协议、Base URL、模型名与 API Key。未配置时分析仍使用确定性规则模板，记录与安全提示不受影响。'
      }),
      el('div', { className: 'stack' }, protocolControl, hintEl),
      el(
        'div',
        { className: 'stack mt-3' },
        field({ label: '提供方名称（自定义）', hint: '只用于界面显示', children: providerInput }),
        field({ label: 'Base URL', hint: 'OpenAI 兼容通常以 /v1 结尾；Anthropic 填 https://api.anthropic.com', children: baseUrlInput }),
        field({ label: '模型名称', children: modelInput }),
        field({ label: 'API Key', hint: '只保存在本机 localStorage；清除本机数据时会一并删除', children: keyInput })
      ),
      el(
        'div',
        { className: 'row row--wrap mt-3' },
        button({ label: '保存配置', variant: 'primary', iconName: 'check', onClick: () => persist({ test: false }) }),
        testButton,
        button({
          label: '清除密钥',
          variant: 'ghost',
          iconName: 'trash',
          onClick: () => {
            confirmDialog({
              title: '清除模型配置？',
              message: '将删除本机保存的 Base URL、模型名与 API Key；分析会回到规则模板。',
              confirmLabel: '清除',
              tone: 'danger',
              onConfirm: () => {
                clearAiConfig();
                Object.assign(draft, {
                  protocol: 'openai',
                  providerLabel: '我的模型',
                  baseUrl: protocolMeta('openai').defaultBaseUrl,
                  model: protocolMeta('openai').defaultModel,
                  apiKey: ''
                });
                providerInput.value = draft.providerLabel;
                baseUrlInput.value = draft.baseUrl;
                modelInput.value = draft.model;
                keyInput.value = '';
                refreshStatus();
                feedback.textContent = '已清除模型配置。';
                toast('模型配置已清除', { tone: 'success' });
              }
            });
          }
        })
      ),
      feedback,
      callout({
        tone: 'warning',
        title: '密钥与隐私提醒',
        children:
          '配置与密钥只保存在本机浏览器，请求由浏览器直接发送到你填写的提供方（本项目没有服务器，也没有内置 Key）。请只在个人设备使用，并注意模型调用会产生提供方费用。浏览器直连需要提供方允许 CORS，否则会连接失败。分析时只发送结构化训练事实、允许的规则与检索到的知识片段，不发送原始训练备注和账号信息。'
      })
    ]
  });
}

// ---------- 知识库与动作扩展 ----------

function buildKnowledgeSection() {
  const wrapper = el('div', { className: 'stack' });

  function refresh() {
    wrapper.replaceChildren(...buildNodes());
  }

  function buildNodes() {
    const stats = knowledgeStats();
    const imported = importedExercisesMeta();
    const files = listUserKnowledgeFiles();
    const builtInCard = card({
      children: [
        el(
          'div',
          { className: 'row row--between mb-2' },
          el('span', { className: 'strong', textContent: '内置知识包' }),
          badge({ label: '只读', tone: 'neutral' })
        ),
        listItem({
          title: `动作库 ${EXERCISES.length} 个动作`,
          subtitle: `内置 ${DATA_SOURCES.upper + DATA_SOURCES.lower} 个 · 用户导入 ${imported.count} 个（待审核）`,
          leading: icon('dumbbell', { size: 18 })
        }),
        listItem({
          title: `证据规则 ${stats.builtIn.evidenceRules} 条`,
          subtitle: '仅用于约束 AI 表达与建议依据；不再在设置页展示全文',
          leading: icon('book', { size: 18 })
        }),
        listItem({
          title: `安全词条 ${stats.builtIn.redFlags} 类`,
          subtitle: '识别危险信号与安全拦截',
          leading: icon('shield', { size: 18 })
        }),
        listItem({
          title: `拉伸库 ${stats.builtIn.stretches} 条`,
          subtitle: '训练后放松建议来源',
          leading: icon('activity', { size: 18 })
        })
      ]
    });

    const knowledgeInput = hiddenFileInput('.md,.markdown,.txt,.json', handleKnowledgeFile);
    const userFilesCard = card({
      children: [
        el(
          'div',
          { className: 'row row--between mb-2' },
          el('span', { className: 'strong', textContent: '用户知识文件' }),
          button({ label: '添加资料', variant: 'secondary', size: 'sm', iconName: 'plus', onClick: () => knowledgeInput.click() })
        ),
        el('p', {
          className: 'muted text-sm',
          textContent:
            '可加入权威指南、教材摘录、教练笔记等（.md / .txt / .json）。文件只保存在本机；分析时只把匹配到的片段发送给模型。'
        }),
        files.length
          ? el(
              'div',
              { className: 'kb-file-list mt-2' },
              files.map((file) =>
                listItem({
                  title: file.name,
                  subtitle: `${formatNumber(file.textLength, 0)} 字符${file.sourceUrl ? ` · 来源：${file.sourceUrl}` : ' · 未填来源'}`,
                  leading: icon('text', { size: 18 }),
                  trailing: iconButton({
                    iconName: 'trash',
                    label: `删除 ${file.name}`,
                    onClick: () => {
                      confirmDialog({
                        title: '删除知识文件？',
                        message: `将删除「${file.name}」，模型上下文将不再包含该资料。`,
                        confirmLabel: '删除',
                        tone: 'danger',
                        onConfirm: () => {
                          deleteUserKnowledgeFile(file.id);
                          toast('知识文件已删除', { tone: 'success' });
                          refresh();
                        }
                      });
                    }
                  })
                })
              )
            )
          : el('p', { className: 'muted text-xs mt-2', textContent: '尚未添加用户资料。' }),
        el('p', {
          className: 'muted text-xs mt-2',
          textContent: `上限：最多 ${KNOWLEDGE_MAX_FILES} 份、单份 ${Math.round(KNOWLEDGE_MAX_CHARS_PER_FILE / 1000)}k 字符；超限内容不会被保存。`
        }),
        knowledgeInput
      ]
    });

    const packInput = hiddenFileInput('.json,application/json', handleExercisePack);
    const exercisePackCard = card({
      children: [
        el(
          'div',
          { className: 'row row--between row--wrap mb-2' },
          el('span', { className: 'strong', textContent: '动作扩展包（JSON）' }),
          badge({ label: imported.count ? `已导入 ${imported.count} 个` : '未导入', tone: imported.count ? 'info' : 'neutral' })
        ),
        el('p', {
          className: 'muted text-sm',
          textContent:
            '内置动作库是高频动作子集。你可以导入更多权威动作资料（JSON）补充动作库；导入动作统一标记为「待审核」，并记录来源，不冒充官方审核内容。导入后需要刷新页面。'
        }),
        imported.count && imported.names.length
          ? el('p', { className: 'muted text-xs mt-2', textContent: `最近导入：${imported.names.join('、')}${imported.count > imported.names.length ? ' 等' : ''}` })
          : null,
        el('p', { className: 'mt-2' }, el('a', { className: 'link text-xs', href: 'docs/EXERCISE_IMPORT_FORMAT.md', target: '_blank', rel: 'noopener noreferrer', textContent: '查看扩展包格式说明与示例' })),
        el(
          'div',
          { className: 'row row--wrap mt-3' },
          button({ label: '导入动作扩展包', variant: 'secondary', iconName: 'download', onClick: () => packInput.click() }),
          imported.count
            ? button({
                label: '清除已导入动作',
                variant: 'ghost',
                onClick: () => {
                  confirmDialog({
                    title: '清除已导入动作？',
                    message: '将删除你导入的全部动作（内置动作不受影响），已记录的训练快照仍保留。',
                    confirmLabel: '清除',
                    tone: 'danger',
                    onConfirm: () => {
                      clearImportedExercises();
                      toast('已清除导入动作，正在刷新…', { tone: 'success' });
                      setTimeout(() => window.location.reload(), 500);
                    }
                  });
                }
              })
            : null
        ),
        packInput
      ]
    });

    return [builtInCard, userFilesCard, exercisePackCard];
  }

  async function handleKnowledgeFile(file) {
    try {
      const text = await readFileText(file);
      if (!text || !text.trim()) {
        toast('文件为空，未添加', { tone: 'danger' });
        return;
      }
      if (text.length > KNOWLEDGE_MAX_CHARS_PER_FILE) {
        toast(`文件过大：${formatNumber(text.length, 0)} 字符，超过单份上限`, { tone: 'danger', duration: 4000 });
        return;
      }
      let name = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
      let sourceUrl = '';
      let note = '';
      const handle = sheet({
        title: '添加知识资料',
        children: el(
          'div',
          { className: 'stack' },
          field({
            label: '资料名称',
            children: textInput({
              value: name,
              maxLength: 80,
              onChange: (value) => {
                name = value;
              }
            })
          }),
          field({
            label: '来源（可选）',
            hint: '填写权威来源链接或书名，便于日后审核；仅保存在本机',
            children: textInput({
              value: '',
              placeholder: 'https://… 或《…》',
              inputMode: 'url',
              onChange: (value) => {
                sourceUrl = value;
              }
            })
          }),
          field({
            label: '备注（可选）',
            children: textInput({
              value: '',
              placeholder: '例如：仅用于训练量参考',
              onChange: (value) => {
                note = value;
              }
            })
          }),
          el('p', { className: 'muted text-xs', textContent: `已读取 ${formatNumber(text.length, 0)} 字符。保存后仅在分析时把匹配片段发送给模型。` })
        ),
        footer: el(
          'div',
          { className: 'dialog__actions' },
          button({ label: '取消', variant: 'secondary', onClick: () => handle.close() }),
          button({
            label: '保存到本机',
            variant: 'primary',
            onClick: () => {
              const result = saveUserKnowledgeFile({ name, text, sourceUrl, note });
              if (!result.ok) {
                toast(result.error || '保存失败', { tone: 'danger', duration: 4000 });
                return;
              }
              handle.close();
              toast('知识资料已添加（仅本机）', { tone: 'success' });
              refresh();
            }
          })
        )
      });
    } catch (err) {
      console.warn('[settings] 读取知识文件失败', err);
      toast('读取文件失败，请重试', { tone: 'danger' });
    }
  }

  async function handleExercisePack(file) {
    try {
      const text = await readFileText(file);
      const existing = [...EXERCISES, ...loadImportedExercises()];
      const result = parseExercisePack(text, { existingExercises: existing });
      if (!result.ok) {
        showIssueSheet('动作扩展包校验失败', result.errors);
        return;
      }
      const accepted = result.exercises.length;
      confirmDialog({
        title: `导入 ${accepted} 个动作？`,
        message:
          '导入动作会统一标记为「待审核」，来源记录为你提供的资料；不会被视为官方审核内容。导入后页面会刷新以加载新动作。',
        confirmLabel: '导入并刷新',
        onConfirm: () => {
          const merged = [...loadImportedExercises(), ...result.exercises];
          const unique = [...new Map(merged.map((exercise) => [exercise.id, exercise])).values()];
          if (!saveImportedExercises(unique)) {
            toast('保存失败：浏览器存储空间可能不足', { tone: 'danger', duration: 4000 });
            return;
          }
          toast(`已导入 ${accepted} 个动作（待审核），正在刷新…`, { tone: 'success', duration: 3000 });
          setTimeout(() => window.location.reload(), 600);
        }
      });
    } catch (err) {
      console.warn('[settings] 导入动作扩展包失败', err);
      toast('读取扩展包失败，请确认是 JSON 文件', { tone: 'danger' });
    }
  }

  refresh();
  return wrapper;
}

// ---------- 媒体偏好 ----------

function buildMediaSection() {
  const settings = getSettings();
  const hint = el('p', { className: 'muted text-xs mt-2' });
  const hints = {
    image: '动作详情默认展示示意图；正式示范图待授权审核。',
    video: '优先展示演示视频；未授权/不可用时自动降级为文字要领。',
    text: '以文字要领为主，适合弱网与快速浏览。'
  };
  hint.textContent = hints[settings.mediaPreference] || '';
  const control = segmentedControl({
    options: [
      { value: 'image', label: '图片', iconName: 'image' },
      { value: 'video', label: '视频', iconName: 'video' },
      { value: 'text', label: '文字', iconName: 'text' }
    ],
    value: settings.mediaPreference,
    onChange: (value) => {
      saveSettings({ mediaPreference: value });
      hint.textContent = hints[value] || '';
      toast('媒体偏好已保存', { tone: 'success' });
    },
    name: '媒体偏好'
  });
  return card({
    children: [
      el(
        'div',
        { className: 'row row--between mb-3' },
        el('span', { className: 'strong', textContent: '默认展示方式' }),
        badge({ label: '可在详情页临时切换', tone: 'neutral' })
      ),
      control,
      hint
    ]
  });
}

// ---------- 数据与隐私 ----------

function buildDataSection() {
  const info = storageInfo();
  const all = listAllSessions();
  const analysesCount = Object.keys(getState().analyses || {}).length;
  const imported = importedExercisesMeta();
  const knowledgeFiles = listUserKnowledgeFiles();

  return card({
    children: [
      listItem({
        title: '数据存储',
        subtitle: '原型阶段仅保存在本机浏览器（localStorage），不上传服务器',
        leading: icon('shield', { size: 18 })
      }),
      listItem({
        title: '本机数据量',
        subtitle: `${formatBytes(info.bytes)} · ${all.length} 次训练（含草稿）· ${analysesCount} 份分析快照 · ${knowledgeFiles.length} 份知识资料 · ${imported.count} 个导入动作`,
        leading: icon('chart', { size: 18 })
      }),
      divider({ space: 12 }),
      el(
        'div',
        { className: 'stack stack--sm' },
        button({
          label: '导出我的数据（JSON）',
          variant: 'secondary',
          iconName: 'download',
          full: true,
          onClick: () => {
            const payload = exportData();
            const aiConfig = loadAiConfig();
            payload.extras = {
              note: '导出包含知识资料与导入动作；出于安全，不包含 API Key。',
              aiConfig: { ...aiConfig, apiKey: null },
              knowledgeFiles: exportUserKnowledgeFiles(),
              importedExercises: loadImportedExercises()
            };
            const date = new Date().toISOString().slice(0, 10);
            downloadJson(payload, `fitlog-export-${date}.json`);
            toast('已导出本机数据 JSON（不含 API Key）', { tone: 'success' });
          }
        }),
        button({
          label: '删除全部本机数据',
          variant: 'danger',
          iconName: 'trash',
          full: true,
          onClick: () => {
            confirmDialog({
              title: '删除全部本机数据？',
              message:
                '将删除全部训练记录、草稿、分析快照、偏好设置、AI 模型配置与 API Key、知识库资料、导入动作，以及本机的云同步配置与登录状态；本机删除后无法恢复。若已启用云同步，云端数据不会被自动删除，可先在「账户与云同步」中点「删除云端训练数据」。',
              confirmLabel: '确认删除',
              tone: 'danger',
              onConfirm: () => {
                deleteAllData();
                toast('本机数据已删除', { tone: 'success' });
                navigate('/');
              }
            });
          }
        })
      ),
      callout({
        tone: 'warning',
        title: '原型阶段的数据边界',
        children:
          '当前未实现登录、云端同步与多设备可见；分析快照只保存在本机。API Key 与知识资料也仅在本机，换设备或清除浏览器数据后需要重新配置。'
      })
    ]
  });
}

// ---------- 安装与离线 ----------

function buildInstallSection() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (standalone) {
    return card({
      children: [
        el('div', { className: 'row' }, icon('check', { size: 18 }), el('span', { className: 'strong', textContent: '已作为独立应用运行' })),
        el('p', { className: 'muted text-sm mt-2', textContent: '当前处于 PWA 独立窗口模式，可离线打开已缓存页面。' })
      ]
    });
  }
  return card({
    children: [
      el(
        'div',
        { className: 'row row--between mb-3' },
        el('span', { className: 'strong', textContent: '安装到主屏幕' }),
        badge({ label: 'PWA', tone: 'accent' })
      ),
      el('p', {
        className: 'muted text-sm',
        textContent: isIos
          ? '在 Safari 中点击分享按钮 →「添加到主屏幕」，即可像 App 一样打开。'
          : '安装后可全屏打开，并在弱网/离线时浏览已缓存的动作与记录。'
      }),
      el(
        'div',
        { className: 'mt-3' },
        button({
          label: '添加到主屏幕',
          variant: 'secondary',
          iconName: 'download',
          full: true,
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
        })
      )
    ]
  });
}

// ---------- 关于 ----------

function buildAboutSection() {
  const imported = importedExercisesMeta();
  return disclosure({
    summary: '关于练迹 · 版本、数据口径与安全边界',
    iconName: 'info',
    children: el(
      'div',
      { className: 'stack stack--sm text-sm text-secondary' },
      el('p', { textContent: `版本：${APP_VERSION} · 数据模型 schemaVersion 1 · 动作数据 ${DATA_VERSION} · AI 提示词 ${AI_PROMPT_VERSION}` }),
      el('p', {
        textContent: `动作库：共 ${EXERCISES.length} 个（内置 ${DATA_SOURCES.upper + DATA_SOURCES.lower} 个；用户导入 ${imported.count} 个，全部为待审核）。可通过「知识库与动作扩展」导入更多权威动作资料。`
      }),
      el('p', {
        textContent:
          '统计口径：训练分布是「估计的直接/间接训练暴露」（主肌群每组 +1、次肌群 +0.5），不是肌电或精确剂量；只有全部正式组都记录重量与次数时才显示「总吨位」。'
      }),
      el('p', {
        textContent:
          '安全边界：本应用用于个人训练记录与一般性运动参考，不构成医疗诊断、治疗、康复处方或个体化营养建议；出现胸痛、呼吸困难、眩晕、麻木等信号时应停止训练并寻求专业医疗意见。'
      }),
      el('p', {
        textContent:
          '证据与依据：证据规则用于约束 AI 表达与建议依据，不再作为设置页独立板块展示；训练建议卡内仍可展开查看对应规则、来源与适用前提。'
      }),
      el('p', {
        textContent:
          '手机 App 形式：本应用是可安装的 PWA —— 在 Chrome/Edge 地址栏「安装」或设置页「添加到主屏幕」，iOS Safari 用分享菜单「添加到主屏幕」，即可像 App 一样全屏打开并离线使用。'
      }),
      el('p', {
        textContent:
          '账户与同步：默认完全本地；可选配置 Supabase 免费项目，用邮箱验证码登录，实现两台设备同步与按账号隔离。不配置时不需要登录、也不会联网。'
      }),
      el('p', {
        textContent: '原型阶段未完成：正式媒体授权与真机 10 次试用；云端同步依赖你自己创建的 Supabase 项目（免费版有额度与暂停策略）。'
      })
    )
  });
}

// ---------- 页面 ----------

export function settingsPage() {
  const errorsBlock = DATA_LOAD_ERRORS.length
    ? callout({
        tone: 'warning',
        title: '内容分片加载异常',
        children: DATA_LOAD_ERRORS.map((err) => el('div', { textContent: `${err.source}: ${err.message}` }))
      })
    : null;
  const cloud = getCloudStatus();
  const cloudLabel = cloud.loggedIn
    ? `云同步：${cloud.email || '已登录'}`
    : cloud.configured
      ? '云同步：已配置未登录'
      : '本机模式';

  return screen({
    title: '我的',
    subtitle: `原型 ${APP_VERSION} · 数据优先保存在本机`,
    children: [
      sectionTitle({ title: '训练目标', hint: '可以随时调整' }),
      buildGoalSection(),

      sectionTitle({ title: '账户与云同步（可选）', hint: 'GitHub / 邮箱登录' }),
      buildCloudSection(),

      disclosure({
        summary: '更多设置：AI 分析（自带密钥）、知识库、媒体、数据、安装与关于',
        iconName: 'settings',
        children: el(
          'div',
          { className: 'stack' },
          buildAiSection(),
          errorsBlock,
          buildKnowledgeSection(),
          buildMediaSection(),
          buildDataSection(),
          buildInstallSection(),
          buildAboutSection()
        )
      }),

      el('p', { className: 'muted text-xs text-center', textContent: '练迹 FitLog · 个人使用原型 · 不构成医疗建议' })
    ]
  });
}
