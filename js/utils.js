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
    var cleaned = raw.replace(/```json|```/g, '').trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch (e1) {
      // Try to extract the first {...} block from the response
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw e1;
      }
    }
  } catch (e) {
    console.warn('[callAI] Response is not JSON, using raw text. Response:', raw.slice(0, 200));
    parsed = null;
  }
  return { raw: raw, parsed: parsed };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
