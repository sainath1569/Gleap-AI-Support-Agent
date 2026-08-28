(function () {
  // Prevent duplicate script injection
  if (window.__GLEAP_KAI_WIDGET_LOADED__) return;
  window.__GLEAP_KAI_WIDGET_LOADED__ = true;

  // Detect script hosting origin automatically
  let widgetOrigin = window.location.origin;
  const currentScript = document.currentScript;
  if (currentScript && currentScript.src) {
    try {
      const url = new URL(currentScript.src);
      widgetOrigin = url.origin;
    } catch (e) {
      console.warn("Could not parse widget script origin", e);
    }
  }

  // Create widget iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'gleap-kai-chat-widget';
  iframe.src = `${widgetOrigin}/?embed=true`;
  iframe.title = 'Kai AI Support Assistant';
  iframe.setAttribute('allow', 'microphone; clipboard-read; clipboard-write');

  // Floating bottom-right styling with transparent background
  Object.assign(iframe.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    width: '74px',
    height: '74px',
    border: 'none',
    overflow: 'hidden',
    zIndex: '2147483647',
    background: 'transparent',
    colorScheme: 'none',
    transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), height 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'auto'
  });

  // Listen for open/close state events from inside the widget
  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'GLEAP_WIDGET_STATE') return;

    if (event.data.isOpen) {
      const isMobile = window.innerWidth < 640;
      iframe.style.width = isMobile ? 'calc(100vw - 24px)' : '450px';
      iframe.style.height = isMobile ? 'calc(100vh - 32px)' : '700px';
      iframe.style.maxWidth = '100vw';
      iframe.style.maxHeight = '100vh';
      iframe.style.borderRadius = '24px';
    } else {
      iframe.style.width = '74px';
      iframe.style.height = '74px';
      iframe.style.borderRadius = '50%';
    }
  });

  // Append iframe to host document body
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(iframe);
    });
  } else {
    document.body.appendChild(iframe);
  }
})();
