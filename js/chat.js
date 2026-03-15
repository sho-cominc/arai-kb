var BASE_SYS = 'You are the staff knowledge base assistant for LOTTE ARAI RESORT, a luxury ski resort in Myoko, Niigata, Japan.\n\nIMPORTANT: Always respond in the SAME language the user writes in.\n- If user writes in Japanese → respond in Japanese\n- If user writes in English → respond in English\n- If user writes in Korean → respond in Korean\n\nAlways cite your data source. Return ONLY this JSON (no backticks):\n{"answer":"your answer","items":[{"name":"","price_adult":"","price_child":"","time":"","period":"","tag":"winter|allyear"}],"table_title":"","table_headers":[],"table_rows":[],"source":{"sheet":"source name","note":"note","url":""}}\n\nitems and table_rows are [] when not needed.\n\nBUILT-IN DATA:\n■Overview sheet (prices incl. tax):\nPasses: Snow Play Pass ¥2,500/¥2,000 · Happy Pass ¥5,000/¥4,000 · Tanoshii Pass ¥16,000/¥13,000\nSingles: 1.SpongeBob ¥1,000 2.Strider ¥1,000 3.Snow Slope ¥1,500 4.Snow Tubing ¥2,200/¥1,700 5.Zipline ¥2,200/¥1,700 6.Playground ¥2,200/¥1,700 7.Snow Rafting ¥2,500 8.Starry Onsen ¥1,300/¥800 9.Starry Pool ¥2,000/¥1,500 10.Zip Tour ¥8,000/¥6,500 11.Snow Drive Tour ¥5,500/¥4,500\n■Discount sheet: A≈10%OFF B≈20%OFF C≈30%OFF D≈50%OFF(staff) E=special\n■Q&A sheet: Hours 10-17/reception 9-16 · Day visitors OK · Bad weather(warning/lightning/wind>10m/s→cancel) · Cancel policy(free until day before/50% day-of before/100% day-of after) · Reservation required for Zip Tour/Snow Drive/Snow Rafting · Ext.1454';

function buildSys() {
  var s = BASE_SYS;
  if (userDocs.length) {
    s += '\n\nADDITIONAL REGISTERED DATA:\n';
    userDocs.forEach(function(d) {
      s += '\n■"' + d.title + '" [category:' + d.category + '] [tags:' + (d.tags || []).join(',') + ']';
      if (d.source) s += ' [file:' + d.source + ']';
      if (d.url) s += ' [url:' + d.url + ']';
      if (d.summary) s += '\nSummary: ' + d.summary;
      if (d.content) s += '\nContent:\n' + d.content.slice(0, 2000);
    });
  }
  return s;
}

var history = [];

async function callChatAPI(messages, system) {
  var res = await fetch(CONFIG.API_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CONFIG.AI_MODEL, max_tokens: CONFIG.CHAT_MAX_TOKENS, system: system, messages: messages })
  });
  var data = await res.json();
  var raw = data.content && data.content[0] && data.content[0].text || '{}';
  var parsed;
  try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch (e) { parsed = { answer: raw, items: [], table_rows: [], source: null }; }
  return { raw: raw, parsed: parsed };
}

async function sendMessage(text) {
  var input = el('userInput');
  var msg = text || input.value.trim(); if (!msg) return;
  input.value = ''; appendUser(msg);
  var tid = showThinking();
  el('sendBtn').disabled = true;
  history.push({ role: 'user', content: msg });
  try {
    var result = await callChatAPI(history, buildSys());
    history.push({ role: 'assistant', content: result.raw });
    hideThinking(tid); renderAnswer(result.parsed);
  } catch (e) { hideThinking(tid); appendUser('Error. Please try again.'); }
  el('sendBtn').disabled = false;
}

function askQuick(t) { el('userInput').value = t; sendMessage(t); }

function appendUser(text) {
  var m = el('messages'), d = document.createElement('div');
  d.className = 'message user';
  d.innerHTML = '<div class="avatar user">S</div><div class="bubble">' + text + '</div>';
  m.appendChild(d); m.scrollTop = m.scrollHeight;
}

function showThinking() {
  var m = el('messages'), id = 't' + Date.now(), d = document.createElement('div');
  d.className = 'message ai'; d.id = id;
  d.innerHTML = '<div class="avatar ai">L</div><div class="bubble"><div class="thinking"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>';
  m.appendChild(d); m.scrollTop = m.scrollHeight; return id;
}
function hideThinking(id) { var e = el(id); if (e) e.remove(); }

function renderAnswer(data) {
  var m = el('messages'), d = document.createElement('div');
  d.className = 'message ai';
  var h = '<div class="avatar ai">L</div><div class="bubble"><div>' + (data.answer || '').replace(/\n/g, '<br>') + '</div>';

  if (data.items && data.items.length) {
    h += '<div class="answer-section"><div class="answer-label">Results</div><div class="ans-item-grid">';
    data.items.forEach(function(item) {
      h += '<div class="ans-item-card">\
        <div class="ans-item-name">' + item.name + '</div>\
        <div class="ans-item-price">' + (item.price_adult || '—') + (item.price_child && item.price_child !== 'null' ? ' / ' + item.price_child : '') + '</div>\
        <div class="ans-item-meta">' + (item.time || '') + ' ' + (item.period ? '· ' + item.period : '') + '</div>\
        <span class="tag-pill ans-item-tag">' + (item.tag === 'allyear' ? '通年 / All year' : 'ウィンター / Winter') + '</span>\
      </div>';
    });
    h += '</div></div>';
  }

  if (data.table_rows && data.table_rows.length) {
    h += '<div class="answer-section"><div class="answer-label">' + (data.table_title || 'Details') + '</div>';
    h += '<table class="ans-table"><thead><tr>';
    (data.table_headers || []).forEach(function(x) { h += '<th>' + x + '</th>'; });
    h += '</tr></thead><tbody>';
    data.table_rows.forEach(function(row, i) {
      h += '<tr' + (i % 2 ? ' class="alt"' : '') + '>';
      Object.values(row).forEach(function(v) { h += '<td>' + (v || '') + '</td>'; });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
  }

  if (data.source) {
    var s = data.source;
    var isBuiltin = !!BUILTIN[s.sheet];
    var ud = userDocs.find(function(d) { return d.title === s.sheet; });
    var clickable = isBuiltin || ud;
    var urlPart = s.url ? '<div class="ref-url">🔗 <a href="' + s.url + '" target="_blank">' + s.url + '</a></div>' : '';
    h += '<div class="source-ref' + (clickable ? '' : ' no-click') + '"' +
      (isBuiltin ? ' data-builtin-ref="' + s.sheet + '"' : '') +
      (ud ? ' data-userdoc-ref="' + ud.id + '"' : '') +
      '>\
      <div class="ref-info">\
        <div class="ref-title">' + I18N[lang].sourceClick + '</div>\
        <div class="source-ref-desc"><strong>' + s.sheet + '</strong>' + (s.note ? ' · ' + s.note : '') + '</div>\
        ' + urlPart + '\
      </div>\
      ' + (clickable ? '<div class="open-icon">↗</div>' : '') + '\
    </div>';
  }

  h += '</div>'; d.innerHTML = h; m.appendChild(d); m.scrollTop = m.scrollHeight;
}
