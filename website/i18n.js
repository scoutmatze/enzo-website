/* ═══════════════════════════════════════════
   i18n.js – Mehrsprachigkeit für da Enzo
   DE (Standard) · EN · IT · LS (Leichte Sprache)
   ═══════════════════════════════════════════ */

const I18N = {
  // ── Navigation ──
  'nav.ueber':         { de: 'Über uns',       en: 'About',        it: 'Chi siamo',       ls: 'Über uns' },
  'nav.karte':         { de: 'Speisekarte',    en: 'Menu',         it: 'Il Menù',         ls: 'Essen' },
  'nav.wochenkarte':   { de: 'Wochenkarte',    en: 'Weekly Special',it: 'Menù Settimanale',ls: 'Wochen-Essen' },
  'nav.reservieren':   { de: 'Reservieren',    en: 'Reservation',  it: 'Prenotare',       ls: 'Tisch buchen' },
  'nav.kontakt':       { de: 'Kontakt',        en: 'Contact',      it: 'Contatti',        ls: 'Kontakt' },
  'nav.galerie':       { de: 'Galerie',        en: 'Gallery',      it: 'Galleria',        ls: 'Bilder' },

  // ── Hero ──
  'hero.tag':          { de: 'München · Laim · Zschokkestraße 34',
                         en: 'Munich · Laim · Zschokkestraße 34',
                         it: 'Monaco · Laim · Zschokkestraße 34',
                         ls: 'München · Laim · Zschokke-Straße 34' },
  'hero.title':        { de: 'Buon appetito <em>in Laim.</em>',
                         en: 'Buon appetito <em>in Laim.</em>',
                         it: 'Buon appetito <em>a Laim.</em>',
                         ls: 'Guten Appetit <em>in Laim.</em>' },
  'hero.text':         { de: 'Italienische Küche, wie sie sein soll – ehrlich, frisch und mit Liebe gemacht. Ein Stück Italien mitten in München.',
                         en: 'Italian cuisine as it should be – honest, fresh and made with love. A piece of Italy in the heart of Munich.',
                         it: 'Cucina italiana come dovrebbe essere – onesta, fresca e fatta con amore. Un pezzo d\'Italia nel cuore di Monaco.',
                         ls: 'Italienisches Essen. Frisch gemacht. Mit Liebe gemacht. Wie in Italien. Aber hier in München.' },
  'hero.btn.reserv':   { de: 'Tisch reservieren', en: 'Book a Table',   it: 'Prenota un Tavolo', ls: 'Tisch buchen' },
  'hero.btn.karte':    { de: 'Speisekarte',       en: 'View Menu',      it: 'Vedi il Menù',     ls: 'Essen ansehen' },

  // ── Über Enzo ──
  'ueber.label':       { de: 'Benvenuti',      en: 'Welcome',      it: 'Benvenuti',       ls: 'Willkommen' },
  'ueber.title':       { de: 'Willkommen <em>bei da Enzo.</em>',
                         en: 'Welcome <em>to da Enzo.</em>',
                         it: 'Benvenuti <em>da Enzo.</em>',
                         ls: 'Willkommen <em>bei da Enzo.</em>' },
  'ueber.p1':          { de: 'Wir sind eine italienische Familie, die die authentischen Aromen unserer Heimat nach München bringt. Unsere Küche basiert auf der Liebe zu traditionellen Rezepten, frischen Zutaten und echter Gastfreundschaft.',
                         en: 'We are an Italian family bringing the authentic flavours of our homeland to Munich. Our kitchen is built on a love for traditional recipes, fresh ingredients and genuine hospitality.',
                         it: 'Siamo una famiglia italiana che porta i sapori autentici della nostra terra a Monaco. La nostra cucina si basa sull\'amore per le ricette tradizionali, gli ingredienti freschi e la vera ospitalità.',
                         ls: 'Wir sind eine Familie aus Italien.\nWir kochen so wie in unserer Heimat.\nWir nehmen frische Zutaten.\nWir kochen nach alten Rezepten.\nBei uns sollen sich alle wohl-fühlen.' },
  'ueber.p2':          { de: 'Jedes Gericht erzählt ein Stück unserer Geschichte. Ich heiße Sie herzlich willkommen und hoffe, dass Sie sich bei uns wohlfühlen und uns oft besuchen werden.',
                         en: 'Every dish tells a part of our story. I warmly welcome you and hope you feel at home with us and visit often.',
                         it: 'Ogni piatto racconta un pezzo della nostra storia. Vi do il benvenuto e spero che vi sentiate a casa da noi e che torniate spesso.',
                         ls: 'Jedes Essen erzählt eine Geschichte.\nIch freue mich auf Ihren Besuch.\nKommen Sie gerne öfter.' },
  'ueber.p3':          { de: 'Buon Appetito!',  en: 'Buon Appetito!', it: 'Buon Appetito!',  ls: 'Guten Appetit!' },

  // ── Highlights ──
  'hl.pasta.title':    { de: 'Frische Pasta',   en: 'Fresh Pasta',    it: 'Pasta Fresca',    ls: 'Frische Nudeln' },
  'hl.pasta.text':     { de: 'Unsere Pasta machen wir selbst. Jeden Tag, von Hand. Punkt.',
                         en: 'We make our pasta ourselves. Every day, by hand. Period.',
                         it: 'La nostra pasta la facciamo noi. Ogni giorno, a mano. Punto.',
                         ls: 'Wir machen unsere Nudeln selbst.\nJeden Tag.\nMit der Hand.' },
  'hl.caffe.title':    { de: 'Caffé-Kultur',    en: 'Caffé Culture',  it: 'Cultura del Caffè',ls: 'Kaffee' },
  'hl.caffe.text':     { de: 'Espresso, Cappuccino, Caffé Latte – bei uns wird der Kaffee noch so gemacht, wie er schmecken soll.',
                         en: 'Espresso, cappuccino, caffé latte – our coffee is still made the way it should taste.',
                         it: 'Espresso, cappuccino, caffè latte – da noi il caffè si fa ancora come deve essere.',
                         ls: 'Espresso. Cappuccino. Milch-Kaffee.\nBei uns schmeckt der Kaffee richtig gut.' },
  'hl.mittag.title':   { de: 'Mittagstisch',    en: 'Lunch Specials', it: 'Pranzo',           ls: 'Mittag-Essen' },
  'hl.mittag.text':    { de: 'Jeden Tag ein neues Gericht auf der Wochenkarte. Schnell, lecker und zum fairen Preis.',
                         en: 'A new dish on the weekly menu every day. Quick, delicious and fairly priced.',
                         it: 'Ogni giorno un nuovo piatto nel menù settimanale. Veloce, buono e a un prezzo giusto.',
                         ls: 'Jeden Tag gibt es ein neues Essen.\nDas Essen ist lecker.\nDas Essen kostet nicht viel.' },
  'hl.dolci.title':    { de: 'Dolci & Kuchen',  en: 'Dolci & Cakes', it: 'Dolci & Torte',   ls: 'Nachtisch' },
  'hl.dolci.text':     { de: 'Tiramisu, Panna Cotta oder unsere Torta della Nonna – das darf man sich gönnen.',
                         en: 'Tiramisu, Panna Cotta or our Torta della Nonna – you deserve a treat.',
                         it: 'Tiramisù, Panna Cotta o la nostra Torta della Nonna – concedetevelo.',
                         ls: 'Tiramisu. Panna Cotta. Oder unser Oma-Kuchen.\nDas schmeckt sehr gut.' },

  // ── Speisekarte ──
  'karte.label':       { de: 'La Carta',        en: 'La Carta',      it: 'La Carta',        ls: 'Essen-Liste' },
  'karte.title':       { de: 'Unsere <em>Speisekarte</em>',
                         en: 'Our <em>Menu</em>',
                         it: 'Il nostro <em>Menù</em>',
                         ls: 'Unser <em>Essen</em>' },
  'karte.loading':     { de: 'Speisekarte wird geladen...',
                         en: 'Loading menu...',
                         it: 'Caricamento del menù...',
                         ls: 'Das Essen wird geladen...' },

  // ── Wochenkarte ──
  'wk.label':          { de: 'Ogni settimana',  en: 'Every Week',    it: 'Ogni settimana',  ls: 'Jede Woche' },
  'wk.title':          { de: 'Le specialità <em>dello Chef</em>',
                         en: 'The Chef\'s <em>Specials</em>',
                         it: 'Le specialità <em>dello Chef</em>',
                         ls: 'Die <em>Empfehlungen vom Koch</em>' },
  'wk.loading':        { de: 'Die Wochenkarte wird geladen...',
                         en: 'Loading weekly menu...',
                         it: 'Caricamento del menù settimanale...',
                         ls: 'Das Wochen-Essen wird geladen...' },

  // ── Reservierung ──
  'res.label':         { de: 'Prenotazione',    en: 'Reservation',   it: 'Prenotazione',    ls: 'Tisch buchen' },
  'res.title':         { de: 'Reservier dir <em>deinen Tisch.</em>',
                         en: 'Book <em>your table.</em>',
                         it: 'Prenota <em>il tuo tavolo.</em>',
                         ls: 'Einen Tisch <em>buchen.</em>' },
  'res.text':          { de: 'Wir sind ein kleines Lokal mit großem Herz, aber eben auch mit begrenzten Plätzen. Reservier am besten kurz vorher – per Formular, WhatsApp oder ruf einfach an.',
                         en: 'We\'re a small place with a big heart – but with limited seating. Best to book ahead via form, WhatsApp or phone.',
                         it: 'Siamo un piccolo locale con un grande cuore, ma con posti limitati. Meglio prenotare in anticipo – tramite il modulo, WhatsApp o telefono.',
                         ls: 'Unser Restaurant ist klein.\nEs gibt nicht so viele Plätze.\nBitte buchen Sie vorher einen Tisch.\nSie können das Formular benutzen.\nOder per WhatsApp schreiben.\nOder anrufen.' },
  'res.wa':            { de: 'Per WhatsApp',    en: 'Via WhatsApp',  it: 'Via WhatsApp',    ls: 'Per WhatsApp' },
  'res.wa.sub':        { de: 'Schnell und unkompliziert', en: 'Quick and easy', it: 'Veloce e semplice', ls: 'Das geht schnell' },
  'res.phone':         { de: 'Per Telefon',     en: 'By Phone',      it: 'Per Telefono',    ls: 'Per Telefon' },
  'res.label.name':    { de: 'Name *',          en: 'Name *',        it: 'Nome *',          ls: 'Ihr Name *' },
  'res.ph.name':       { de: 'Dein Name',       en: 'Your name',     it: 'Il tuo nome',     ls: 'Ihr Name' },
  'res.label.phone':   { de: 'Telefon *',       en: 'Phone *',       it: 'Telefono *',      ls: 'Telefon-Nummer *' },
  'res.label.email':   { de: 'E-Mail *',        en: 'E-Mail *',      it: 'E-Mail *',        ls: 'E-Mail *' },
  'res.ph.email':      { de: 'deine@email.de',  en: 'your@email.com',it: 'tua@email.it',    ls: 'ihre@email.de' },
  'res.label.date':    { de: 'Datum *',          en: 'Date *',        it: 'Data *',          ls: 'Welcher Tag? *' },
  'res.label.time':    { de: 'Uhrzeit *',       en: 'Time *',        it: 'Ora *',           ls: 'Welche Uhrzeit? *' },
  'res.select.default':{ de: 'Bitte wählen',    en: 'Please select', it: 'Seleziona',       ls: 'Bitte auswählen' },
  'res.label.guests':  { de: 'Personen *',      en: 'Guests *',      it: 'Persone *',       ls: 'Wie viele Personen? *' },
  'res.label.msg':     { de: 'Sonderwünsche',   en: 'Special requests', it: 'Richieste speciali', ls: 'Besondere Wünsche' },
  'res.ph.msg':        { de: 'Allergien, Kinderstuhl, besonderer Anlass...', en: 'Allergies, high chair, special occasion...', it: 'Allergie, seggiolone, occasione speciale...', ls: 'Zum Beispiel: Allergie, Kinder-Stuhl...' },
  'res.submit':        { de: 'Tisch anfragen',  en: 'Request Table', it: 'Richiedi Tavolo', ls: 'Tisch anfragen' },
  'res.hint':          { de: 'Dies ist eine Anfrage – wir bestätigen per Telefon, E-Mail oder WhatsApp.',
                         en: 'This is a request – we\'ll confirm by phone, email or WhatsApp.',
                         it: 'Questa è una richiesta – confermeremo per telefono, e-mail o WhatsApp.',
                         ls: 'Das ist erst eine Anfrage.\nWir melden uns dann bei Ihnen.\nPer Telefon oder E-Mail oder WhatsApp.' },
  'res.success':       { de: '✅ Danke! Deine Anfrage ist eingegangen. Wir melden uns in Kürze bei dir.',
                         en: '✅ Thank you! Your request has been received. We\'ll get back to you shortly.',
                         it: '✅ Grazie! La tua richiesta è stata ricevuta. Ti contatteremo a breve.',
                         ls: '✅ Danke! Wir haben Ihre Anfrage bekommen. Wir melden uns bald bei Ihnen.' },
  'res.error':         { de: '❌ Leider hat etwas nicht geklappt. Ruf uns gerne an oder schreib per WhatsApp.',
                         en: '❌ Something went wrong. Please call us or write via WhatsApp.',
                         it: '❌ Qualcosa è andato storto. Chiamaci o scrivici su WhatsApp.',
                         ls: '❌ Das hat leider nicht geklappt. Bitte rufen Sie uns an. Oder schreiben Sie per WhatsApp.' },

  // ── Galerie ──
  'galerie.label':    { de: 'La Galleria',      en: 'Gallery',        it: 'La Galleria',     ls: 'Bilder' },
  'galerie.title':    { de: 'Eindrücke <em>aus da Enzo.</em>',
                         en: 'Impressions <em>from da Enzo.</em>',
                         it: 'Impressioni <em>da Enzo.</em>',
                         ls: 'So sieht es <em>bei uns aus.</em>' },

  // ── Kontakt ──
  'kontakt.label':     { de: 'Trovarci',        en: 'Find Us',       it: 'Trovarci',        ls: 'Wo sind wir' },
  'kontakt.title':     { de: 'So findest du <em>zu uns.</em>',
                         en: 'How to <em>find us.</em>',
                         it: 'Come <em>trovarci.</em>',
                         ls: 'So finden Sie <em>zu uns.</em>' },
  'kontakt.adresse':   { de: 'Adresse',         en: 'Address',       it: 'Indirizzo',       ls: 'Adresse' },
  'kontakt.oeffnung':  { de: 'Öffnungszeiten',  en: 'Opening Hours', it: 'Orari di Apertura',ls: 'Wann haben wir offen' },
  'kontakt.zeiten':    { de: 'Montag: 9:00 – 17:00 Uhr<br>Dienstag – Fr: 9:00 – 18:00 Uhr<br>Sa: 10:00 – 14:00 Uhr<br>So: Ruhetag',
                         en: 'Monday: 9:00 AM – 5:00 PM<br>Tuesday – Fri: 9:00 AM – 6:00 PM<br>Sat: 10:00 AM – 2:00 PM<br>Sun: Closed',
                         it: 'Lunedì: 9:00 – 17:00<br>Martedì – Ven: 9:00 – 18:00<br>Sab: 10:00 – 14:00<br>Dom: Chiuso',
                         ls: 'Montag: 9 Uhr bis 17 Uhr<br>Dienstag bis Freitag: 9 Uhr bis 18 Uhr<br>Samstag: 10 Uhr bis 14 Uhr<br>Sonntag: Geschlossen' },
  'kontakt.veranst':   { de: '⚠️ Für geschlossene Veranstaltungen können wir besondere Zeiten vereinbaren.',
                         en: '⚠️ We can arrange special hours for private events.',
                         it: '⚠️ Per eventi privati possiamo concordare orari speciali.',
                         ls: '⚠️ Für besondere Feiern können wir auch andere Zeiten ausmachen.' },
  'kontakt.kontakt':   { de: 'Kontakt',         en: 'Contact',       it: 'Contatti',        ls: 'Kontakt' },

  // ── Maps Consent ──
  'map.text':          { de: 'Beim Laden der Karte werden Daten an Google übertragen. <a href="/datenschutz.html">Datenschutzerklärung</a>',
                         en: 'Loading the map transfers data to Google. <a href="/datenschutz.html">Privacy Policy</a>',
                         it: 'Caricando la mappa, i dati vengono trasmessi a Google. <a href="/datenschutz.html">Informativa sulla privacy</a>',
                         ls: 'Wenn die Karte geladen wird, werden Daten an Google geschickt. <a href="/datenschutz.html">Daten-Schutz</a>' },
  'map.btn':           { de: 'Karte laden',     en: 'Load Map',      it: 'Carica Mappa',    ls: 'Karte laden' },
  'map.link':          { de: 'Oder direkt in Google Maps öffnen ↗',
                         en: 'Or open directly in Google Maps ↗',
                         it: 'O apri direttamente in Google Maps ↗',
                         ls: 'Oder direkt in Google Maps öffnen ↗' },

  // ── Footer ──
  'footer.copy':       { de: '© 2026 da Enzo – Caffé & Ristorante',
                         en: '© 2026 da Enzo – Caffé & Ristorante',
                         it: '© 2026 da Enzo – Caffé & Ristorante',
                         ls: '© 2026 da Enzo – Caffé & Ristorante' },

  // ── Skip-Link ──
  'skip':              { de: 'Zum Inhalt springen', en: 'Skip to content', it: 'Vai al contenuto', ls: 'Zum Inhalt springen' },
};

/* ── Sprachumschaltung ──────────────────── */
let currentLang = localStorage.getItem('enzo-lang') || 'de';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('enzo-lang', lang);
  document.documentElement.setAttribute('lang', lang === 'ls' ? 'de-simple' : lang);

  // Alle data-i18n Elemente aktualisieren
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const entry = I18N[key];
    if (!entry) return;
    const text = entry[lang] || entry['de'];

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.setAttribute('placeholder', text);
    } else if (el.tagName === 'OPTION' && el.value === '') {
      el.textContent = text;
    } else {
      el.innerHTML = text;
    }
  });

  // Aktiven Button highlighten
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === lang);
  });
}

// Init beim Laden
document.addEventListener('DOMContentLoaded', () => {
  if (currentLang !== 'de') setLang(currentLang);
  // Aktiven Button initial setzen
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === currentLang);
  });
});