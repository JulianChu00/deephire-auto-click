import { useState, useEffect, useRef, useCallback } from 'react';

const TARGET = 200;
const CLICK_MS = 1500;
const SCROLL_MS = 3000;

type Status = 'idle' | 'running' | 'stopping' | 'limit' | 'done';

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [count, setCount] = useState(0);
  const [limitMsg, setLimitMsg] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const runningRef = useRef(false);
  const stopRef = useRef(false);
  const limitRef = useRef(false);
  const limitMsgRef = useRef('');

  // 拖拽
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panelStart = useRef({ x: 0, y: 0 });

  // 监听来自 interceptor 的消息
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'DHA_LIMIT_REACHED') {
        limitRef.current = true;
        limitMsgRef.current = e.data.msg || '';
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const start = useCallback(async () => {
    runningRef.current = true;
    stopRef.current = false;
    limitRef.current = false;
    limitMsgRef.current = '';
    setCount(0);
    setStatus('running');
    setLimitMsg('');
    if (collapsed) setCollapsed(false);

    const container = document.querySelectorAll('.overflow-y-auto')[1] as HTMLElement;
    if (!container) {
      setStatus('idle');
      return;
    }

    let clicked = 0;

    while (clicked < TARGET && !stopRef.current && !limitRef.current) {
      const buttons = [
        ...document.querySelectorAll<HTMLElement>('.btn.btn-submit'),
      ];

      for (const btn of buttons) {
        if (clicked >= TARGET || stopRef.current || limitRef.current) break;
        if (btn.dataset.autoClicked) continue;

        btn.dataset.autoClicked = '1';
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
        btn.click();

        clicked++;
        setCount(clicked);

        await sleep(CLICK_MS);

        if (limitRef.current) break;
      }

      if (clicked >= TARGET || stopRef.current || limitRef.current) break;

      container.scrollTop = container.scrollHeight;
      await sleep(SCROLL_MS);
    }

    if (limitRef.current) {
      setStatus('limit');
      setLimitMsg(limitMsgRef.current);
    } else if (stopRef.current) {
      setStatus('idle');
    } else {
      setStatus('done');
    }

    runningRef.current = false;
  }, [collapsed]);

  const stop = () => {
    stopRef.current = true;
    setStatus('stopping');
  };

  const toggle = () => {
    if (status === 'running') {
      stop();
    } else {
      start();
    }
  };

  // 拖拽
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-ignore-drag]')) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    const rect = panelRef.current!.getBoundingClientRect();
    panelStart.current = { x: rect.left, y: rect.top };
    panelRef.current!.style.right = 'auto';
    panelRef.current!.style.bottom = 'auto';
    panelRef.current!.style.left = rect.left + 'px';
    panelRef.current!.style.top = rect.top + 'px';
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !panelRef.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const L = Math.max(0, Math.min(panelStart.current.x + dx, innerWidth - panelRef.current.offsetWidth));
      const T = Math.max(0, Math.min(panelStart.current.y + dy, innerHeight - panelRef.current.offsetHeight));
      panelRef.current.style.left = L + 'px';
      panelRef.current.style.top = T + 'px';
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const pct = Math.round((count / TARGET) * 100);

  const statusBadge: Record<Status, { text: string; color: string }> = {
    idle: { text: '就绪', color: '#334155' },
    running: { text: `运行中 ${pct}%`, color: '#10b981' },
    stopping: { text: '停止中…', color: '#f59e0b' },
    limit: { text: '已达上限', color: '#ef4444' },
    done: { text: '已完成', color: '#10b981' },
  };

  const badge = statusBadge[status];

  const btnText: Record<Status, string> = {
    idle: '🚀 开始自动投递',
    running: '⏹ 停止',
    stopping: '⏳ 正在停止…',
    limit: '🚀 开始自动投递',
    done: '🚀 开始自动投递',
  };

  const btnDisabled = status === 'stopping';

  return (
    <div id="dha-panel" ref={panelRef}>
      <div id="dha-card">
        <div id="dha-header" onMouseDown={onMouseDown}>
          <span id="dha-title">🤖 自动投递</span>
          <div className="dha-header-actions">
            <span
              id="dha-badge"
              style={{ background: badge.color }}
            >
              {badge.text}
            </span>
            <button
              id="dha-toggle"
              data-ignore-drag
              title={collapsed ? '展开' : '折叠'}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '+' : '−'}
            </button>
          </div>
        </div>
        {!collapsed && (
          <div id="dha-body">
            <div id="dha-progress-bar">
              <div
                id="dha-progress-fill"
                style={{ width: pct + '%' }}
              />
            </div>
            <div id="dha-stats">
              <span>{count}</span> / {TARGET}
            </div>
            {status === 'limit' && limitMsg && (
              <div id="dha-limit-msg">⚠️ {limitMsg}</div>
            )}
            <button
              id="dha-action"
              className={status === 'running' ? 'dha-btn--stop' : ''}
              disabled={btnDisabled}
              onClick={toggle}
            >
              {btnText[status]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
