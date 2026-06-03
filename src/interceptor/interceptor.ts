(() => {
  if ((window as any).__dha_interceptor_installed) return;
  (window as any).__dha_interceptor_installed = true;

  const origFetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await origFetch(...args);
    try {
      const url = (args[0] as any)?.toString?.() || '';
      if (url.includes('/wapi/partners/zp/geek/sendResume')) {
        const data = await response.clone().json();
        const status = data?.result?.status;
        const msg = data?.result?.statusMessage;
        console.log('[自动投递] sendResume status:', status, 'msg:', msg);
        if (status === 'FAILED' && msg) {
          window.postMessage({ type: 'DHA_LIMIT_REACHED', msg }, '*');
        }
      }
    } catch (_) {}
    return response;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL
  ) {
    (this as any)._dha_url = url;
    return origOpen.apply(this, arguments as any);
  };
  XMLHttpRequest.prototype.send = function () {
    const xhr = this;
    if (
      (xhr as any)._dha_url &&
      (xhr as any)._dha_url.includes('/wapi/partners/zp/geek/sendResume')
    ) {
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          const status = data?.result?.status;
          const msg = data?.result?.statusMessage;
          if (status === 'FAILED' && msg) {
            window.postMessage({ type: 'DHA_LIMIT_REACHED', msg }, '*');
          }
        } catch (_) {}
      });
    }
    return origSend.apply(this, arguments as any);
  };

  console.log('[自动投递] sendResume 监听已开启');
})();
