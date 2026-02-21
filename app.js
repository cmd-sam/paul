// ---- SUPABASE SETUP ----
// Ersetze diese zwei Werte mit deinen eigenen aus dem Supabase Dashboard
const SUPABASE_URL = 'https://kstpwfvokaobkmmmnyhq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzdHB3ZnZva2FvYmttbW1ueWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjY0MjksImV4cCI6MjA4NzI0MjQyOX0.EaKIIqsUkJkLtBgsUkdrCyphlerqQGTh57DErwPbnEk';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- API KEY (Claude) ----
function apiKeyHolen() {
  return localStorage.getItem('paul_api_key');
}

async function init() {
  let key = apiKeyHolen();
  if (!key) {
    key = prompt('Claude API Key eingeben:');
    if (key) localStorage.setItem('paul_api_key', key);
  }
}

// ---- VORHABEN ----
async function projekteHolen() {
  const { data, error } = await supabase
    .from('vorhaben')
    .select('*')
    .order('erstellt_am', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function vorhabenAnlegenDB(name) {
  const { data, error } = await supabase
    .from('vorhaben')
    .insert({ name })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

// ---- NACHRICHTEN ----
async function nachrichtenHolen(vorhabenId) {
  const { data, error } = await supabase
    .from('nachrichten')
    .select('*')
    .eq('vorhaben_id', vorhabenId)
    .order('erstellt_am', { ascending: true });
  if (error) { console.error(error); return []; }
  return data.map(m => ({ role: m.rolle, content: m.inhalt }));
}

async function nachrichtSpeichern(vorhabenId, rolle, inhalt) {
  const { error } = await supabase
    .from('nachrichten')
    .insert({ vorhaben_id: vorhabenId, rolle, inhalt });
  if (error) console.error(error);
}

async function nachrichtSenden(vorhabenId, text) {
  await nachrichtSpeichern(vorhabenId, 'user', text);

  const nachrichten = await nachrichtenHolen(vorhabenId);
  const apiKey = apiKeyHolen();
  const antwort = await paulAntwortet(nachrichten, apiKey);

  await nachrichtSpeichern(vorhabenId, 'assistant', antwort);
  return antwort;
}

// ---- ZUSAMMENFASSUNG ----
async function zusammenfassungAktualisieren(vorhabenId) {
  const nachrichten = await nachrichtenHolen(vorhabenId);
  if (nachrichten.filter(m => m.role === 'user').length === 0) return null;

  const apiKey = apiKeyHolen();
  const text = await paulZusammenfassung(nachrichten, apiKey);
  if (!text) return null;

  await supabase
    .from('vorhaben')
    .update({ zusammenfassung: text, zusammenfassung_zeit: new Date().toISOString() })
    .eq('id', vorhabenId);

  return text;
}

async function zusammenfassungLaden(vorhabenId) {
  const { data, error } = await supabase
    .from('vorhaben')
    .select('zusammenfassung, zusammenfassung_zeit')
    .eq('id', vorhabenId)
    .single();
  if (error) return null;
  return data;
}

// ---- PARSER ----
function zusammenfassungParsen(text) {
  const hinweise = [];
  const offen = [];
  if (!text) return { hinweise, offen };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let aktiv = null;

  for (const line of lines) {
    const up = line.toUpperCase();
    if (up.includes('HINWEISE') || up.includes('HINWEIS')) { aktiv = 'h'; continue; }
    if (up.includes('OFFEN')) { aktiv = 'o'; continue; }
    if (line.startsWith('-')) {
      const inhalt = line.replace(/^-+\s*/, '');
      if (aktiv === 'h') hinweise.push(inhalt);
      if (aktiv === 'o') offen.push(inhalt);
    }
  }
  return { hinweise, offen };
}

// Legacy-Kompatibilität (wird in vorhaben.html noch genutzt)
function projekteSpeichern() {}