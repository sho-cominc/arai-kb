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

  var data;
  try {
    data = await res.json();
  } catch (e) {
    console.error('[callAI] Failed to parse JSON response (HTTP ' + res.status + '):', e);
    throw new Error('サーバーからの応答を解析できませんでした (HTTP ' + res.status + ')');
  }

  if (!res.ok) {
    var errMsg = (data && data.error) ? data.error : 'HTTP ' + res.status;
    console.error('[callAI] Server error:', errMsg);
    throw new Error(errMsg);
  }

  var raw = data.content && data.content[0] && data.content[0].text || '{}';
  var parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.warn('[callAI] Response is not JSON, using raw text. Response:', raw.slice(0, 200));
    parsed = null;
  }
  return { raw: raw, parsed: parsed };
}
