function el(id) { return document.getElementById(id); }
function showModal(id) { el(id).classList.add('show'); }
function hideModal(id) { el(id).classList.remove('show'); }
function setDisplay(id, val) { el(id).style.display = val; }

function appendToMessages(node) {
  var m = el('messages');
  m.appendChild(node);
  m.scrollTop = m.scrollHeight;
}

async function callAI(messages, system, maxTokens) {
  var res = await fetch(CONFIG.API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.AI_MODEL,
      max_tokens: maxTokens,
      system: system,
      messages: messages
    })
  });
  var data = await res.json();
  var raw = data.content && data.content[0] && data.content[0].text || '{}';
  var parsed;
  try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch (e) { parsed = null; }
  return { raw: raw, parsed: parsed };
}
