const PAUL_SYSTEM_PROMPT = `Du bist PAUL, ein stiller Projektbegleiter.
Antworte kurz, ruhig und direkt.
Kein Markdown. Keine Sterne. Keine Rauten. Keine Emojis. Kein Fettdruck.
Kein Smalltalk. Kein Druck. Nur festhalten was wichtig ist.
Maximal 1-2 Sätze. Deutsch.`;

async function paulAntwortet(nachrichten, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      system: PAUL_SYSTEM_PROMPT,
      messages: nachrichten
    })
  });

  const data = await response.json();
  return data.content[0].text;
}

async function paulZusammenfassung(nachrichten, apiKey) {
  const mitFormat = [
    ...nachrichten,
    { role: 'user', content: `Fasse alles oben zusammen. Antworte NUR in diesem Format, ohne weitere Worte, kein Markdown, keine Sterne:

HINWEISE
- was festgehalten wurde
- was wichtig ist

OFFEN
- was noch unklar ist` }
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 400,
      messages: mitFormat
    })
  });

  const data = await response.json();

  if (!data.content || !data.content[0]) {
    console.log("Zusammenfassung fehlgeschlagen:", data);
    return null;
  }

  return data.content[0].text;
}