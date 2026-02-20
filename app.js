let apiKey = localStorage.getItem('paul_api_key') || null;
let aktiveProjektId = null;

async function init() {
  if (!apiKey) {
    apiKey = prompt("Dein Anthropic API Key:");
    if (apiKey) localStorage.setItem('paul_api_key', apiKey);
  }
}

function projekteHolen() {
  return JSON.parse(localStorage.getItem('paul_projekte') || '{}');
}

function projekteSpeichern(projekte) {
  localStorage.setItem('paul_projekte', JSON.stringify(projekte));
}

function nachrichtenHolen(projektId) {
  const projekte = projekteHolen();
  return projekte[projektId]?.nachrichten || [];
}

function nachrichtSpeichern(projektId, rolle, text) {
  const projekte = projekteHolen();
  if (!projekte[projektId]) projekte[projektId] = { nachrichten: [] };
  projekte[projektId].nachrichten.push({ role: rolle, content: text });
  projekteSpeichern(projekte);
}

async function nachrichtSenden(projektId, text) {
  nachrichtSpeichern(projektId, 'user', text);

  const nachrichten = nachrichtenHolen(projektId);
  const antwort = await paulAntwortet(nachrichten, apiKey);

  nachrichtSpeichern(projektId, 'assistant', antwort);
  return antwort;
}

async function zusammenfassungAktualisieren(projektId) {
  const nachrichten = nachrichtenHolen(projektId);

  // Nur user/assistant, muss mit user beginnen
  const gefiltert = nachrichten.filter(m => m.role === 'user' || m.role === 'assistant');
  const ersterUser = gefiltert.findIndex(m => m.role === 'user');
  if (ersterUser === -1) return;

  const bereinigte = gefiltert.slice(ersterUser);
  console.log("Bereinigte Nachrichten:", bereinigte.length);
  if (bereinigte.length < 1) return;

  const text = await paulZusammenfassung(bereinigte, apiKey);
  console.log("Zusammenfassung Text:", text);

  const projekte = projekteHolen();
  if (projekte[projektId]) {
    projekte[projektId].zusammenfassung = text;
    projekteSpeichern(projekte);
  }

  return text;
}

function zusammenfassungParsen(text) {
  console.log("Parsen:", text);
  const hinweise = [];
  const offen = [];
  let aktiv = null;

  text.split('\n').forEach(zeile => {
    zeile = zeile.trim();
    if (zeile.startsWith('HINWEISE')) { aktiv = 'hinweise'; return; }
    if (zeile.startsWith('OFFEN')) { aktiv = 'offen'; return; }
    if (zeile.startsWith('- ') && aktiv === 'hinweise') hinweise.push(zeile.slice(2));
    if (zeile.startsWith('- ') && aktiv === 'offen') offen.push(zeile.slice(2));
  });

  console.log("Hinweise:", hinweise, "Offen:", offen);
  return { hinweise, offen };
}