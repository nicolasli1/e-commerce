(function() {
  var gaId = '__GA_MEASUREMENT_ID__';
  if (!gaId || gaId === '__GA_MEASUREMENT_ID__') return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', gaId, { send_page_view: true, anonymize_ip: true });
})();
