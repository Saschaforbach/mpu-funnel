/* ============================================================
   MPU Point – Buchung direkt auf der Landingpage
   ------------------------------------------------------------
   Kein Sprung auf www.mpu-point.de, kein Cookie-Banner,
   kein fremder Anbieter. Nutzt die eigene CMS-API.

   ABLAUF
   1. Name + Telefon + Einwilligung  -> Lead geht sofort raus
                                        (auch wenn danach abgebrochen wird)
   2. Termin waehlen                 -> Datum, dann Uhrzeit
   3. E-Mail + Buchen                -> Termin im CMS-Kalender
                                     -> /danke.html (Conversion)

   EINBAU
   Diese Datei als /buchung.js hochladen, dann in alkohol.html,
   drogen.html, punkte.html und straftaten.html vor </body>:

       <script src="/buchung.js" defer></script>

   Die Sektion setzt sich selbst direkt vor den Formularbereich.
   Zusaetzlich in denselben Seiten die Buchen-Buttons umhaengen:
       href="https://www.mpu-point.de/?buchen=1"   ->   href="#buchung"
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Konfiguration ------------------------------- */

  var API = 'https://cms-deluxe-api.vercel.app/api/slots';

  // Kein Token noetig: api/slots.js erlaubt Aufrufe von start.mpu-point.de
  // per Herkunftspruefung. Es stehen keine Zugangsdaten im Client.

  // Lead-Endpunkt wird zur Laufzeit aus dem Seitenquelltext gelesen -
  // dieselbe URL, die das bestehende Formular der Seite ohnehin nutzt.
  function leadEndpunkt() {
    var m = document.documentElement.innerHTML
      .match(/https:\/\/[a-z0-9.-]+\/api\/webhook-lead[^'"\s<>]*/i);
    return m ? m[0] : null;
  }

  var ADS_ID   = 'AW-709708397';
  var LBL_LEAD = 'KFxkCK_Wn-4cEO2UtdIC';   // LP - Formular-Lead, 330 EUR

  var TAGE_VORAUS = 42;

  var THEMEN = { alkohol: 'Alkohol', drogen: 'Drogen', punkte: 'Punkte', straftaten: 'Straftaten' };

  function thema() {
    var d = location.pathname.split('/').pop().replace('.html', '');
    for (var k in THEMEN) if (d.indexOf(k) !== -1) return THEMEN[k];
    return 'Allgemein';
  }

  function gclid() {
    try {
      var g = new URLSearchParams(location.search).get('gclid');
      if (g) { sessionStorage.setItem('mpu_gclid', g); return g; }
      return sessionStorage.getItem('mpu_gclid') || '';
    } catch (e) { return ''; }
  }

  var THEMA = thema();
  var zustand = { name: '', tel: '', email: '', datum: '', zeit: '', slots: [] };

  /* ---------- Darstellung --------------------------------- */

  var CSS = ''
    + '#buchung-overlay{position:fixed;inset:0;background:rgba(12,28,20,.6);z-index:99999;display:none;overflow-y:auto;padding:14px}'
    + '#buchung-overlay.offen{display:block}'
    + '#buchung{max-width:580px;margin:20px auto;background:var(--weiss);border-radius:18px;padding:22px 20px 26px;position:relative}'
    + '#buchung h2{font-size:1.16rem;margin:0 0 4px;color:var(--dunkel);padding-right:34px}'
    + '#buchung .sub{margin:0 0 12px;font-size:.92rem}'
    + '#buchung .bk-zu{position:absolute;top:10px;right:12px;border:none;background:none;font-size:30px;line-height:1;color:var(--grau);cursor:pointer;padding:0 6px}'
    + '#buchung .bk-karte{background:transparent;border:none;padding:0;max-width:none}'
    + '@media(max-width:560px){#buchung{margin:8px auto;padding:20px 16px 24px}}'
    + '#buchung .bk-schritt{display:none}'
    + '#buchung .bk-schritt.aktiv{display:block}'
    + '#buchung .bk-fort{display:flex;gap:6px;margin-bottom:18px}'
    + '#buchung .bk-fort span{flex:1;height:4px;border-radius:2px;background:var(--rand)}'
    + '#buchung .bk-fort span.an{background:var(--gruen)}'
    + '#buchung .bk-tage{display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:6px;margin-bottom:10px;max-height:132px;overflow:hidden;transition:max-height .2s}'
    + '#buchung .bk-tage.alle{max-height:none}'
    + '#buchung .bk-mehr{display:block;width:100%;background:none;border:1px dashed var(--rand);border-radius:9px;color:var(--gruen);font-weight:700;padding:7px;margin-bottom:14px;cursor:pointer;font-family:inherit;font-size:.86rem}'
    + '#buchung .bk-tag{padding:6px 3px;border:1px solid var(--rand);border-radius:9px;background:var(--weiss);text-align:center;cursor:pointer;font-family:inherit;line-height:1.15}'
    + '#buchung .bk-tag.gewaehlt{border-color:var(--gruen);background:var(--tint);border-width:2px}'
    + '#buchung .bk-tag b{display:block;font-size:1.02rem;color:var(--dunkel)}'
    + '#buchung .bk-tag small{color:var(--grau);font-size:.68rem;display:block}'
    + '#buchung .bk-zeiten{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;margin-bottom:14px}'
    + '#buchung .bk-zeit{padding:10px 4px;border:1px solid var(--rand);border-radius:10px;background:var(--weiss);cursor:pointer;font-weight:700;color:var(--dunkel);font-family:inherit;font-size:1rem}'
    + '#buchung .bk-zeit.gewaehlt{border-color:var(--gruen);background:var(--tint);border-width:2px}'
    + '#buchung .bk-hinweis{color:var(--grau);font-size:.9rem;margin:10px 0}'
    + '#buchung .bk-fehler{color:#c0392b;font-weight:600;margin:10px 0;display:none}'
    + '#buchung .bk-zurueck{background:none;border:none;color:var(--gruen);font-weight:700;cursor:pointer;padding:8px 0;font-family:inherit;font-size:.95rem}'
    + '#buchung .bk-zusammenfassung{background:var(--tint);border-radius:11px;padding:12px 14px;margin-bottom:14px;font-size:.95rem}'
    + '#buchung label.bk-check{display:flex;gap:9px;align-items:flex-start;font-size:.88rem;color:var(--grau);margin:12px 0}'
    + '#buchung label.bk-check input{margin-top:3px;flex:0 0 auto;width:18px;height:18px}';

  var HTML = ''
    + '<button type="button" class="bk-zu" aria-label="Schliessen">&times;</button>'
    + '<h2>Termin fürs Erstgespräch</h2>'
    + '<p class="sub">Zwei Angaben, dann Wunschtermin wählen.</p>'
    + '<div class="bk-karte">'
    + '<div class="bk-fort"><span class="an"></span><span></span><span></span></div>'

    /* Schritt 1 */
    + '<div class="bk-schritt aktiv" data-schritt="1">'
    +   '<div class="feld"><label for="bk-name">Name *</label>'
    +   '<input type="text" id="bk-name" autocomplete="name" placeholder="Max Mustermann"></div>'
    +   '<div class="feld"><label for="bk-tel">Telefon *</label>'
    +   '<input type="tel" id="bk-tel" autocomplete="tel" placeholder="+49 123 456789"></div>'
    +   '<label class="bk-check"><input type="checkbox" id="bk-ds">'
    +   '<span>Ich bin einverstanden, dass MPU Point mich zu meiner Anfrage telefonisch kontaktiert. '
    +   'Mehr in der <a href="https://www.mpu-point.de/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a>.</span></label>'
    +   '<p class="bk-fehler" id="bk-fehler1"></p>'
    +   '<button type="button" class="btn btn-haupt" id="bk-weiter" style="width:100%">Weiter zur Terminauswahl</button>'
    + '</div>'

    /* Schritt 2 */
    + '<div class="bk-schritt" data-schritt="2">'
    +   '<p class="bk-hinweis" id="bk-laden">Freie Termine werden geladen …</p>'
    +   '<div class="bk-tage" id="bk-tage"></div>'
    +   '<button type="button" class="bk-mehr" id="bk-mehr" hidden>Weitere Termine anzeigen</button>'
    +   '<div class="bk-zeiten" id="bk-zeiten"></div>'
    +   '<p class="bk-fehler" id="bk-fehler2"></p>'
    +   '<button type="button" class="bk-zurueck" data-zurueck="1">← Zurück</button>'
    + '</div>'

    /* Schritt 3 */
    + '<div class="bk-schritt" data-schritt="3">'
    +   '<div class="bk-zusammenfassung" id="bk-zus"></div>'
    +   '<div class="feld"><label for="bk-mail">E-Mail *</label>'
    +   '<input type="email" id="bk-mail" autocomplete="email" placeholder="max@beispiel.de"></div>'
    +   '<p class="bk-hinweis">Für die Terminbestätigung und den Kalendereintrag.</p>'
    +   '<p class="bk-fehler" id="bk-fehler3"></p>'
    +   '<button type="button" class="btn btn-haupt" id="bk-buchen" style="width:100%">Termin verbindlich buchen</button>'
    +   '<button type="button" class="bk-zurueck" data-zurueck="2">← Anderen Termin wählen</button>'
    + '</div>'

    + '</div></div>';

  /* ---------- Hilfsfunktionen ----------------------------- */

  var WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var MONAT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  function q(id) { return document.getElementById(id); }

  function oeffnen() {
    document.getElementById('buchung-overlay').classList.add('offen');
    document.body.style.overflow = 'hidden';
    var f = q('bk-name');
    if (f && !f.value) setTimeout(function () { f.focus(); }, 120);
  }

  function schliessen() {
    document.getElementById('buchung-overlay').classList.remove('offen');
    document.body.style.overflow = '';
  }

  function zeigeSchritt(n) {
    var s = document.querySelectorAll('#buchung .bk-schritt');
    for (var i = 0; i < s.length; i++) {
      s[i].classList.toggle('aktiv', s[i].dataset.schritt === String(n));
    }
    var f = document.querySelectorAll('#buchung .bk-fort span');
    for (var j = 0; j < f.length; j++) f[j].classList.toggle('an', j < n);
    document.getElementById('buchung').scrollTop = 0;
    var ov = document.getElementById('buchung-overlay');
    if (ov) ov.scrollTop = 0;
  }

  function fehler(id, text) {
    var e = q(id);
    e.textContent = text;
    e.style.display = text ? 'block' : 'none';
  }

  function conversion(cb) {
    var fertig = false;
    function weiter() { if (!fertig) { fertig = true; if (cb) cb(); } }
    try { sessionStorage.setItem('mpu_conv_gesendet', '1'); } catch (e) {}
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        send_to: ADS_ID + '/' + LBL_LEAD, value: 330, currency: 'EUR', event_callback: weiter
      });
      setTimeout(weiter, 1200);
    } else { weiter(); }
  }

  /* ---------- Schritt 1: Lead sichern --------------------- */

  function schritt1() {
    var name = q('bk-name').value.trim();
    var tel  = q('bk-tel').value.trim();

    if (!name || !tel) { fehler('bk-fehler1', 'Bitte Name und Telefonnummer eintragen.'); return; }
    if (!q('bk-ds').checked) { fehler('bk-fehler1', 'Bitte bestätigen Sie die Datenschutzerklärung.'); return; }
    fehler('bk-fehler1', '');

    zustand.name = name;
    zustand.tel = tel;

    var btn = q('bk-weiter');
    btn.disabled = true;
    btn.textContent = 'Einen Moment …';

    // Lead sofort sichern - unabhaengig davon, ob spaeter gebucht wird
    var ziel = leadEndpunkt();
    if (ziel) fetch(ziel, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        typ: 'mpu', name: name, tel: tel, email: '',
        anlass: THEMA,
        quelle: 'start.mpu-point.de/' + location.pathname.split('/').pop() + ' (Buchung Schritt 1)',
        gclid: gclid(),
        anfrage: 'Terminbuchung begonnen · Anlass: ' + THEMA
      }),
      keepalive: true
    }).catch(function (e) { console.error('Lead-Vorabsicherung fehlgeschlagen:', e); });

    btn.disabled = false;
    btn.textContent = 'Weiter zur Terminauswahl';
    zeigeSchritt(2);
    ladeSlots();
  }

  /* ---------- Schritt 2: Termine ------------------------- */

  function ladeSlots() {
    q('bk-laden').style.display = 'block';
    fehler('bk-fehler2', '');

    fetch(API + '?typ=mpu&days=' + TAGE_VORAUS)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        q('bk-laden').style.display = 'none';
        if (!j || !j.ok || !Array.isArray(j.slots) || !j.slots.length) {
          fehler('bk-fehler2', 'Aktuell sind online keine Termine frei. Rufen Sie uns kurz an: 0211 909 899 60');
          return;
        }
        zustand.slots = j.slots;
        zeichneTage();
      })
      .catch(function (e) {
        q('bk-laden').style.display = 'none';
        fehler('bk-fehler2', 'Die Termine konnten nicht geladen werden. Bitte rufen Sie uns an: 0211 909 899 60');
        console.error(e);
      });
  }

  function zeichneTage() {
    var tage = [];
    zustand.slots.forEach(function (s) { if (tage.indexOf(s.date) === -1) tage.push(s.date); });

    q('bk-tage').innerHTML = tage.map(function (d) {
      var dt = new Date(d + 'T12:00:00');
      return '<button type="button" class="bk-tag" data-datum="' + d + '">'
           + '<small>' + WOCHENTAG[dt.getDay()] + '</small>'
           + '<b>' + dt.getDate() + '</b>'
           + '<small>' + MONAT[dt.getMonth()] + '</small></button>';
    }).join('');

    q('bk-tage').querySelectorAll('.bk-tag').forEach(function (b) {
      b.addEventListener('click', function () {
        zustand.datum = b.dataset.datum;
        zustand.zeit = '';
        q('bk-tage').querySelectorAll('.bk-tag').forEach(function (x) { x.classList.remove('gewaehlt'); });
        b.classList.add('gewaehlt');
        zeichneZeiten();
      });
    });

    var raster = q('bk-tage');
    var mehr = q('bk-mehr');
    if (tage.length > 8) {
      mehr.hidden = false;
      mehr.textContent = 'Weitere Termine anzeigen (' + (tage.length - 8) + ')';
      mehr.onclick = function () { raster.classList.add('alle'); mehr.hidden = true; };
    } else {
      mehr.hidden = true;
      raster.classList.add('alle');
    }

    if (tage.length) raster.querySelector('.bk-tag').click();
  }

  function zeichneZeiten() {
    var zeiten = zustand.slots.filter(function (s) { return s.date === zustand.datum; });

    q('bk-zeiten').innerHTML = zeiten.map(function (s) {
      return '<button type="button" class="bk-zeit" data-zeit="' + s.time + '">' + s.time + '</button>';
    }).join('');

    q('bk-zeiten').querySelectorAll('.bk-zeit').forEach(function (b) {
      b.addEventListener('click', function () {
        zustand.zeit = b.dataset.zeit;
        var dt = new Date(zustand.datum + 'T12:00:00');
        q('bk-zus').innerHTML = '<strong>' + WOCHENTAG[dt.getDay()] + ', ' + dt.getDate() + '. '
          + MONAT[dt.getMonth()] + '</strong> um <strong>' + zustand.zeit + ' Uhr</strong><br>'
          + 'Kostenloses Erstgespräch · ca. 20 Minuten · telefonisch oder per Video';
        zeigeSchritt(3);
      });
    });
  }

  /* ---------- Schritt 3: Buchen -------------------------- */

  function buchen() {
    var email = q('bk-mail').value.trim();
    if (!email || email.indexOf('@') === -1) {
      fehler('bk-fehler3', 'Bitte eine gültige E-Mail-Adresse eintragen.');
      return;
    }
    fehler('bk-fehler3', '');
    zustand.email = email;

    var btn = q('bk-buchen');
    btn.disabled = true;
    btn.textContent = 'Wird gebucht …';

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        typ: 'mpu',
        name: zustand.name,
        tel: zustand.tel,
        email: email,
        date: zustand.datum,
        time: zustand.zeit,
        anlass: THEMA,
        medium: 'Telefon',
        online: true,
        datenschutz: true,
        anfrage: 'Landingpage-Buchung · Anlass: ' + THEMA + ' · gclid: ' + (gclid() || 'keine')
      })
    })
    .then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
    })
    .then(function (a) {
      if (a.status === 409) {
        btn.disabled = false;
        btn.textContent = 'Termin verbindlich buchen';
        fehler('bk-fehler3', 'Dieser Termin wurde gerade vergeben. Bitte wählen Sie einen anderen.');
        zeigeSchritt(2);
        ladeSlots();
        return;
      }
      if (a.status >= 400) {
        btn.disabled = false;
        btn.textContent = 'Termin verbindlich buchen';
        fehler('bk-fehler3', (a.body && a.body.error) || 'Die Buchung hat nicht geklappt. Bitte rufen Sie uns an: 0211 909 899 60');
        return;
      }
      conversion(function () {
        location.href = '/danke.html?gebucht=1&thema=' + encodeURIComponent(THEMA);
      });
    })
    .catch(function (e) {
      btn.disabled = false;
      btn.textContent = 'Termin verbindlich buchen';
      fehler('bk-fehler3', 'Verbindungsproblem. Bitte rufen Sie uns kurz an: 0211 909 899 60');
      console.error(e);
    });
  }

  /* ---------- Aufbau ------------------------------------- */

  function start() {
    if (document.getElementById('buchung')) return;

    var stil = document.createElement('style');
    stil.textContent = CSS;
    document.head.appendChild(stil);

    var overlay = document.createElement('div');
    overlay.id = 'buchung-overlay';
    var sek = document.createElement('div');
    sek.id = 'buchung';
    sek.innerHTML = HTML;
    overlay.appendChild(sek);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) schliessen(); });
    sek.querySelector('.bk-zu').addEventListener('click', schliessen);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') schliessen(); });

    q('bk-weiter').addEventListener('click', schritt1);
    q('bk-buchen').addEventListener('click', buchen);
    document.querySelectorAll('#buchung [data-zurueck]').forEach(function (b) {
      b.addEventListener('click', function () { zeigeSchritt(Number(b.dataset.zurueck)); });
    });

    // Buchen-Buttons auf die eigene Sektion umhaengen
    document.querySelectorAll('a[href*="mpu-point.de/?buchen=1"], a[href="#buchung"], a[href="#anfrage"]').forEach(function (a) {
      a.removeAttribute('target');
      a.removeAttribute('rel');
      a.addEventListener('click', function (e) { e.preventDefault(); oeffnen(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

})();
