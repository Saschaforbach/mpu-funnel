/* ============================================================
   Schritt-1-Erfassung fuer die Landingpages
   Meldet Name + Telefon ans CMS, sobald sie eingetippt wurden -
   auch wenn das Formular danach nie abgeschickt wird.
   Greift nicht in den normalen Formularversand ein.
   ============================================================ */
(function () {
  var ZIEL = 'https://cms-deluxe-api.vercel.app/api/webhook-lead?token=whk_e4efae78d1839db7711b728497e80d8325b95520';

  function wert(namen) {
    for (var i = 0; i < namen.length; i++) {
      var e = document.querySelector('#leadform [name="' + namen[i] + '"]') || document.querySelector('[name="' + namen[i] + '"]');
      if (e && String(e.value || '').trim()) return String(e.value).trim();
    }
    return '';
  }

  function gclid() {
    try {
      var g = new URLSearchParams(location.search).get('gclid');
      if (g) { sessionStorage.setItem('mpu_gclid', g); return g; }
      return wert(['gclid']) || sessionStorage.getItem('mpu_gclid') || '';
    } catch (e) { return ''; }
  }

  function melde() {
    var name = wert(['name']);
    var tel  = wert(['telefon', 'tel']);
    var mail = wert(['email']);
    if (name.length < 2) return;
    if (tel.replace(/[^0-9]/g, '').length < 6) return;

    var schluessel = (name + tel).toLowerCase().replace(/\s+/g, '');
    try {
      if (sessionStorage.getItem('mpu_schritt1') === schluessel) return;
      sessionStorage.setItem('mpu_schritt1', schluessel);
    } catch (e) {}

    var thema = wert(['thema', 'anlass']);
    var stadt = wert(['stadt']);

    try {
      fetch(ZIEL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          typ: 'mpu',
          name: name,
          tel: tel,
          email: mail,
          anlass: thema,
          quelle: 'start.mpu-point.de/' + location.pathname.split('/').pop() + (stadt ? ' - ' + stadt : '') + ' (Schritt 1)',
          gclid: gclid(),
          anfrage: 'Formular angefangen - noch nicht abgeschickt' + (stadt ? ' - Stadt: ' + stadt : '')
        })
      }).catch(function () {});
    } catch (e) {}
  }

  document.addEventListener('blur', function (ev) {
    var t = ev.target;
    if (!t || !t.name) return;
    if (['name', 'telefon', 'tel', 'email'].indexOf(t.name) < 0) return;
    setTimeout(melde, 30);
  }, true);

  window.addEventListener('pagehide', melde);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') melde();
  });
})();
