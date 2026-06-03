// ==UserScript==
// @name         DeepHire 自动投递
// @namespace    https://greasyfork.org/zh-CN/scripts/your-script-id
// @version      1.0
// @description  在 DeepHire 推荐页面自动点击「投递简历」按钮，支持进度显示、每日上限检测、面板拖拽折叠
// @author       Chu Julian (C.Julian)
// @license      MIT
// @match        https://www.deephire.cn/jobseeker/recommend*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * ============================================================
 *  DeepHire 自动投递 — 使用说明
 * ============================================================
 *
 * 【功能介绍】
 * 在 DeepHire 推荐页面（/jobseeker/recommend）自动批量投递简历，
 * 无需手动逐个点击，脚本会自动滚动列表、点击按钮、检测每日上限。
 *
 * 【主要特性】
 * • 浮动面板 — 右下角实时显示投递进度和百分比进度条
 * • 一键启停 — 点击「开始」自动投递，点击「停止」随时中断
 * • 每日上限检测 — 拦截 sendResume 接口响应，上限达成立刻停止并提示
 * • 拖拽移动 — 按住标题栏可拖动面板到任意位置
 * • 折叠收起 — 点击 − 按钮收起面板，不遮挡页面内容
 *
 * 【使用步骤】
 * 1. 安装 Tampermonkey / Violentmonkey 扩展
 * 2. 安装本脚本
 * 3. 打开 https://www.deephire.cn/jobseeker/recommend?... 推荐页面
 * 4. 右下角出现「🤖 自动投递」面板，点击「🚀 开始自动投递」
 * 5. 脚本自动滚动列表并逐一点击「投递简历」按钮
 * 6. 触发每日上限后自动停止，面板显示提示信息
 *
 * 【参数说明】
 * TARGET    = 200   # 目标投递数量（可在脚本顶部修改）
 * CLICK_MS  = 1500  # 每次点击间隔（毫秒）
 * SCROLL_MS = 3000  # 每次滚动后等待（毫秒）
 *
 * 【注意事项】
 * • 仅匹配 /jobseeker/recommend 路径，不会在其他页面运行
 * • 依赖页面的 .btn.btn-submit 按钮选择器，网站改版可能导致失效
 * • 每日上限信息来自 sendResume 接口返回的 statusMessage 字段
 * • 不会重复点击已投递的按钮（通过 dataset.autoClicked 标记）
 *
 * 【已知问题】
 * • 如网站更新 DOM 结构导致按钮选择器变化，需修改对应的 CSS 选择器
 *
 * ============================================================
 */

(function () {
  'use strict';

  // ========== 配置 ==========
  const TARGET = 200;
  const CLICK_MS = 1500;
  const SCROLL_MS = 3000;

  // ========== 状态 ==========
  const state = {
    status: 'idle', // idle | running | stopping | limit | done
    count: 0,
    limitMsg: '',
    collapsed: false,
    running: false,
    stopRequested: false,
    limitReached: false,
  };

  // ========== 网络拦截（页面主环境，直接生效） ==========
  function installInterceptor() {
    if (window.__dha_interceptor_installed) return;
    window.__dha_interceptor_installed = true;

    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await origFetch(...args);
      try {
        const url = (args[0] || '').toString();
        if (url.includes('/wapi/partners/zp/geek/sendResume')) {
          const data = await response.clone().json();
          const status = data?.result?.status;
          const msg = data?.result?.statusMessage;
          console.log('[自动投递] sendResume status:', status, 'msg:', msg);
          if (status === 'FAILED' && msg) {
            state.limitReached = true;
            state.limitMsg = msg;
          }
        }
      } catch (_) {}
      return response;
    };

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._dha_url = url;
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      const xhr = this;
      if (xhr._dha_url && xhr._dha_url.includes('/wapi/partners/zp/geek/sendResume')) {
        xhr.addEventListener('load', () => {
          try {
            const data = JSON.parse(xhr.responseText);
            const status = data?.result?.status;
            const msg = data?.result?.statusMessage;
            if (status === 'FAILED' && msg) {
              state.limitReached = true;
              state.limitMsg = msg;
            }
          } catch (_) {}
        });
      }
      return origSend.apply(this, arguments);
    };

    console.log('[自动投递] sendResume 监听已开启');
  }

  // ========== DOM 元素引用 ==========
  let el = {};

  function cacheElements() {
    el.panel = document.getElementById('dha-panel');
    el.badge = document.getElementById('dha-badge');
    el.fill = document.getElementById('dha-progress-fill');
    el.count = document.getElementById('dha-count');
    el.action = document.getElementById('dha-action');
    el.body = document.getElementById('dha-body');
    el.toggle = document.getElementById('dha-toggle');
    el.limitMsg = document.getElementById('dha-limit-msg');
  }

  // ========== UI 更新 ==========
  function updateUI() {
    if (!el.panel) return;
    const pct = Math.round((state.count / TARGET) * 100);

    const badgeMap = {
      idle:    { text: '就绪',    color: '#334155' },
      running: { text: `运行中 ${pct}%`, color: '#10b981' },
      stopping:{ text: '停止中…', color: '#f59e0b' },
      limit:   { text: '已达上限', color: '#ef4444' },
      done:    { text: '已完成',  color: '#10b981' },
    };
    const badge = badgeMap[state.status];
    el.badge.textContent = badge.text;
    el.badge.style.background = badge.color;

    el.fill.style.width = pct + '%';
    el.count.textContent = state.count;

    const btnMap = {
      idle:    '🚀 开始自动投递',
      running: '⏹ 停止',
      stopping:'⏳ 正在停止…',
      limit:   '🚀 开始自动投递',
      done:    '🚀 开始自动投递',
    };
    el.action.textContent = btnMap[state.status];
    el.action.disabled = state.status === 'stopping';

    if (state.status === 'running') {
      el.action.classList.add('dha-btn--stop');
    } else {
      el.action.classList.remove('dha-btn--stop');
    }

    if (state.status === 'limit' && state.limitMsg) {
      el.limitMsg.textContent = '⚠️ ' + state.limitMsg;
      el.limitMsg.style.display = 'block';
    } else {
      el.limitMsg.style.display = 'none';
    }

    if (state.collapsed) {
      el.body.style.display = 'none';
      el.toggle.textContent = '+';
      el.toggle.title = '展开';
    } else {
      el.body.style.display = '';
      el.toggle.textContent = '−';
      el.toggle.title = '折叠';
    }
  }

  // ========== 核心逻辑 ==========
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function startRun() {
    state.running = true;
    state.stopRequested = false;
    state.limitReached = false;
    state.limitMsg = '';
    state.count = 0;
    state.status = 'running';
    if (state.collapsed) { state.collapsed = false; }
    updateUI();

    const container = document.querySelectorAll('.overflow-y-auto')[1];
    if (!container) {
      state.status = 'idle';
      state.running = false;
      updateUI();
      return;
    }

    let clicked = 0;

    while (clicked < TARGET && !state.stopRequested && !state.limitReached) {
      const buttons = [...document.querySelectorAll('.btn.btn-submit')];

      for (const btn of buttons) {
        if (clicked >= TARGET || state.stopRequested || state.limitReached) break;
        if (btn.dataset.autoClicked) continue;

        btn.dataset.autoClicked = '1';
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
        btn.click();

        clicked++;
        state.count = clicked;
        updateUI();
        console.log('[自动投递] 已投递', clicked, '个');

        await sleep(CLICK_MS);
      }

      if (clicked >= TARGET || state.stopRequested || state.limitReached) break;

      container.scrollTop = container.scrollHeight;
      await sleep(SCROLL_MS);
    }

    if (state.limitReached) {
      state.status = 'limit';
      console.log('[自动投递] 已达上限，共', clicked, '个:', state.limitMsg);
    } else if (state.stopRequested) {
      state.status = 'idle';
      console.log('[自动投递] 已手动停止，共', clicked, '个');
    } else {
      state.status = 'done';
      console.log('[自动投递] 完成，共', clicked, '个');
    }

    state.running = false;
    updateUI();
  }

  function stopRun() {
    state.stopRequested = true;
    state.status = 'stopping';
    updateUI();
  }

  function toggleRun() {
    if (state.status === 'running') {
      stopRun();
    } else {
      startRun();
    }
  }

  // ========== 拖拽 ==========
  let dragging = false;
  let dragStartX, dragStartY, panelStartX, panelStartY;

  function onHeaderMouseDown(e) {
    if (e.target.closest('[data-ignore-drag]')) return;
    dragging = true;
    el.panel.querySelector('#dha-header').style.cursor = 'grabbing';
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = el.panel.getBoundingClientRect();
    panelStartX = rect.left;
    panelStartY = rect.top;
    el.panel.style.right = 'auto';
    el.panel.style.bottom = 'auto';
    el.panel.style.left = rect.left + 'px';
    el.panel.style.top = rect.top + 'px';
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!dragging || !el.panel) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const L = Math.max(0, Math.min(panelStartX + dx, innerWidth - el.panel.offsetWidth));
    const T = Math.max(0, Math.min(panelStartY + dy, innerHeight - el.panel.offsetHeight));
    el.panel.style.left = L + 'px';
    el.panel.style.top = T + 'px';
  }

  function onMouseUp() {
    if (!dragging) return;
    dragging = false;
    el.panel.querySelector('#dha-header').style.cursor = 'grab';
  }

  // ========== 创建 UI ==========
  function createUI() {
    installInterceptor();

    // 注入样式
    const style = document.createElement('style');
    style.textContent = `
#dha-panel{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
#dha-card{background:#1e293b;color:#f1f5f9;border-radius:12px;width:260px;box-shadow:0 8px 30px rgba(0,0,0,0.35);border:1px solid #334155;user-select:none;overflow:hidden;}
#dha-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:grab;transition:background 0.2s;}
#dha-header:hover{background:rgba(255,255,255,0.04);}
#dha-title{font-size:14px;font-weight:600;pointer-events:none;}
.dha-header-actions{display:flex;align-items:center;gap:8px;}
#dha-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:#334155;color:#cbd5e1;transition:background 0.3s;white-space:nowrap;}
#dha-toggle{width:22px;height:22px;border:none;border-radius:4px;background:#334155;color:#cbd5e1;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;flex-shrink:0;}
#dha-toggle:hover{background:#475569;color:#fff;}
#dha-body{padding:0 16px 14px;}
#dha-progress-bar{height:6px;background:#334155;border-radius:999px;overflow:hidden;margin-bottom:8px;}
#dha-progress-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:999px;transition:width 0.4s ease;width:0;}
#dha-stats{text-align:center;font-size:24px;font-weight:700;color:#e2e8f0;margin-bottom:12px;letter-spacing:1px;}
#dha-stats span{color:#818cf8;}
#dha-limit-msg{font-size:12px;color:#fca5a5;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:8px 10px;margin-bottom:10px;line-height:1.5;text-align:center;display:none;}
#dha-action{width:100%;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:0.5px;}
#dha-action:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,0.4);}
#dha-action:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none;}
#dha-action.dha-btn--stop{background:linear-gradient(135deg,#ef4444,#dc2626);}
#dha-action.dha-btn--stop:hover{box-shadow:0 4px 12px rgba(239,68,68,0.4);}
`;
    document.head.appendChild(style);

    // 注入面板 HTML
    const panel = document.createElement('div');
    panel.id = 'dha-panel';
    panel.innerHTML = `
<div id="dha-card">
  <div id="dha-header">
    <span id="dha-title">🤖 自动投递</span>
    <div class="dha-header-actions">
      <span id="dha-badge">就绪</span>
      <button id="dha-toggle" data-ignore-drag title="折叠/展开">−</button>
    </div>
  </div>
  <div id="dha-body">
    <div id="dha-progress-bar">
      <div id="dha-progress-fill"></div>
    </div>
    <div id="dha-stats"><span id="dha-count">0</span> / ${TARGET}</div>
    <div id="dha-limit-msg"></div>
    <button id="dha-action">🚀 开始自动投递</button>
  </div>
</div>`;
    document.body.appendChild(panel);

    cacheElements();

    // 事件绑定
    el.action.addEventListener('click', toggleRun);
    el.toggle.addEventListener('click', () => {
      state.collapsed = !state.collapsed;
      updateUI();
    });

    const header = document.getElementById('dha-header');
    header.addEventListener('mousedown', onHeaderMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // ========== 启动 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }
})();
