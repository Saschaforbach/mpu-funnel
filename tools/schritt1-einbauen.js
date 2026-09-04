/* Baut das Schritt-1-Skript in alle Landingpages mit Formular ein. */
const fs = require('fs');
const TAG = '<' + 'script src="/lead-schritt1-lp.js" defer><' + '/script>';
let geaendert = 0, uebersprungen = 0;
for (const f of fs.readdirSync('.')) {
  if (!f.endsWith('.html')) continue;
  let s = fs.readFileSync(f, 'utf8');
  if (s.indexOf('lead-schritt1-lp.js') > -1) { uebersprungen++; continue; }
  if (s.indexOf('id="leadform"') < 0) { uebersprungen++; continue; }
  const i = s.lastIndexOf('</' + 'body>');
  if (i < 0) { uebersprungen++; continue; }
  s = s.slice(0, i) + TAG + '\n' + s.slice(i);
  fs.writeFileSync(f, s);
  geaendert++;
}
console.log('Eingebaut in ' + geaendert + ' Seiten, uebersprungen: ' + uebersprungen);
