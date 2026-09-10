/* ============================================================
   MPU Point - zentrales Klick-Tracking fuer alle Landingpages
   Wird per <script src="/tracking.js" defer> auf jeder Seite geladen.
   Aenderungen am Tracking ab jetzt NUR noch in dieser Datei.

   LABELS: Conversion-Label aus Google Ads eintragen (Teil nach dem
   Schraegstrich bei send_to). Leer = es wird nichts gesendet.
   ============================================================ */
(function () {
  'use strict';

  var AW = 'AW-709708397';
  var LABEL = {
    telefon:  '',  // Conversion-Aktion 'LP-Telefon' (Klick auf Telefonnummer)
    whatsapp: ''   // Conversion-Aktion 'LP - WhatsApp-Klick'
  };

  function sende(label) {
    if (!label || typeof window.gtag !== 'function') return;
    try { window.gtag('event', 'conversion', { send_to: AW + '/' + label }); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^tel:/i.test(h)) sende(LABEL.telefon);
    else if (/wa\.me|api\.whatsapp\.com|^whatsapp:/i.test(h)) sende(LABEL.whatsapp);
  }, true);
})();
