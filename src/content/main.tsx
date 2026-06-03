import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 内联注入样式
const style = document.createElement('style');
style.textContent = `
#dha-panel{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
#dha-card{background:#1e293b;color:#f1f5f9;border-radius:12px;width:260px;box-shadow:0 8px 30px rgba(0,0,0,0.35);border:1px solid #334155;user-select:none;overflow:hidden;}
#dha-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:grab;transition:background 0.2s;}
#dha-header:hover{background:rgba(255,255,255,0.04);}
#dha-header:active{cursor:grabbing;}
#dha-title{font-size:14px;font-weight:600;pointer-events:none;}
.dha-header-actions{display:flex;align-items:center;gap:8px;}
#dha-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;color:#cbd5e1;transition:background 0.3s;white-space:nowrap;}
#dha-toggle{width:22px;height:22px;border:none;border-radius:4px;background:#334155;color:#cbd5e1;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;flex-shrink:0;}
#dha-toggle:hover{background:#475569;color:#fff;}
#dha-body{padding:0 16px 14px;}
#dha-progress-bar{height:6px;background:#334155;border-radius:999px;overflow:hidden;margin-bottom:8px;}
#dha-progress-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:999px;transition:width 0.4s ease;}
#dha-stats{text-align:center;font-size:24px;font-weight:700;color:#e2e8f0;margin-bottom:12px;letter-spacing:1px;}
#dha-stats span{color:#818cf8;}
#dha-limit-msg{font-size:12px;color:#fca5a5;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:8px 10px;margin-bottom:10px;line-height:1.5;text-align:center;}
#dha-action{width:100%;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:0.5px;}
#dha-action:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,0.4);}
#dha-action:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none;}
#dha-action.dha-btn--stop{background:linear-gradient(135deg,#ef4444,#dc2626);}
#dha-action.dha-btn--stop:hover{box-shadow:0 4px 12px rgba(239,68,68,0.4);}
`;
document.head.appendChild(style);

function mount() {
  const rootEl = document.createElement('div');
  rootEl.id = 'dha-root';
  document.body.appendChild(rootEl);
  ReactDOM.createRoot(rootEl).render(
    React.createElement(React.StrictMode, null,
      React.createElement(App)
    )
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
