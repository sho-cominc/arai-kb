var BASE_SYS = 'You are the staff knowledge base assistant for LOTTE ARAI RESORT, a luxury ski resort in Myoko, Niigata, Japan.\n\nIMPORTANT: Always respond in the SAME language the user writes in.\n- If user writes in Japanese → respond in Japanese\n- If user writes in English → respond in English\n- If user writes in Korean → respond in Korean\n\nAlways cite your data source. Return ONLY this JSON (no backticks):\n{"answer":"your answer","items":[{"name":"","price_adult":"","price_child":"","time":"","period":"","tag":"winter|allyear"}],"table_title":"","table_headers":[],"table_rows":[],"source":{"sheet":"source name","note":"note","url":""}}\n\nitems and table_rows are [] when not needed.\nFor source.sheet, use EXACTLY one of these names: 概要, 料金区分, Q&A (for built-in data), or the registered document title.\n\nBUILT-IN DATA:\n■概要 sheet (prices incl. tax):\nPasses: Snow Play Pass ¥2,500/¥2,000 · Happy Pass ¥5,000/¥4,000 · Tanoshii Pass ¥16,000/¥13,000\nSingles: 1.SpongeBob ¥1,000 2.Strider ¥1,000 3.Snow Slope ¥1,500 4.Snow Tubing ¥2,200/¥1,700 5.Zipline ¥2,200/¥1,700 6.Playground ¥2,200/¥1,700 7.Snow Rafting ¥2,500 8.Starry Onsen ¥1,300/¥800 9.Starry Pool ¥2,000/¥1,500 10.Zip Tour ¥8,000/¥6,500 11.Snow Drive Tour ¥5,500/¥4,500\n■料金区分 sheet: A≈10%OFF B≈20%OFF C≈30%OFF D≈50%OFF(staff) E=special\n■Q&A sheet: Hours 10-17/reception 9-16 · Day visitors OK · Bad weather(warning/lightning/wind>10m/s→cancel) · Cancel policy(free until day before/50% day-of before/100% day-of after) · Reservation required for Zip Tour/Snow Drive/Snow Rafting · Ext.1454';

function buildSys() {
  var PRIORITY_WEIGHT = { high: 0, normal: 1, low: 2 };
  var CONTENT_BUDGET = { high: 3000, normal: 2000, low: 800 };
  var now = new Date();
  var THIRTY_DAYS = 30 * 86400000;

  var activeDocs = userDocs.filter(function(d) { return d.status !== 'archived'; });
  activeDocs.sort(function(a, b) {
    return (PRIORITY_WEIGHT[a.priority] || 1) - (PRIORITY_WEIGHT[b.priority] || 1);
  });

  var highCats = activeDocs
    .filter(function(d) { return d.priority === 'high'; })
    .map(function(d) { return d.category; })
    .filter(function(c, i, arr) { return arr.indexOf(c) === i; });

  var s = BASE_SYS;
  s += '\n\nDATA RULES:\n- Prefer registered documents over built-in data when they cover the same topic.\n- PRIORITY:HIGH documents are authoritative — treat them as the primary source.\n- PRIORITY:LOW documents are supplementary — use only when no higher-priority source exists.\n- EXPIRED documents are outdated — mention the expiry and advise verification.';

  if (highCats.length) {
    s += '\nNOTE: HIGH-priority registered documents exist for [' + highCats.join(', ') + '] — these override built-in data for those topics.';
  }

  if (activeDocs.length) {
    s += '\n\nADDITIONAL REGISTERED DATA:\n';
    activeDocs.forEach(function(d) {
      var priority = d.priority || 'normal';
      var budget = CONTENT_BUDGET[priority] || 2000;
      var expired = d.valid_until && new Date(d.valid_until) < now;
      var expiringSoon = d.valid_until && !expired && (new Date(d.valid_until) - now) < THIRTY_DAYS;

      s += '\n■"' + d.title + '" [PRIORITY:' + priority.toUpperCase() + '] [category:' + d.category + '] [tags:' + (d.tags || []).join(',') + ']';
      if (d.source) s += ' [file:' + d.source + ']';
      if (d.url) s += ' [url:' + d.url + ']';
      if (expired) s += '\n⚠️ EXPIRED (' + d.valid_until + ') — treat as reference only, advise staff to verify.';
      else if (expiringSoon) s += '\n⚠️ EXPIRES SOON: ' + d.valid_until;
      if (d.notes) s += '\nSTAFF NOTE: ' + d.notes;
      if (d.summary) s += '\nSummary: ' + d.summary;
      var contentText = (d.content || '').startsWith('__IMAGE__:') ? '' : (d.content || '');
      if (contentText) s += '\nContent:\n' + contentText.slice(0, budget);
    });
  }
  return s;
}

var chatHistory = [];

async function sendMessage(text) {
  var input = el('userInput');
  var msg = text || input.value.trim();
  if (!msg) return;
  input.value = '';
  appendUser(msg);
  var tid = showThinking();
  el('sendBtn').disabled = true;
  chatHistory.push({ role: 'user', content: msg });
  try {
    var result = await callAI(chatHistory, buildSys(), CONFIG.CHAT_MAX_TOKENS);
    chatHistory.push({ role: 'assistant', content: result.raw });
    var parsed = result.parsed || { answer: result.raw, items: [], table_rows: [], source: null };
    hideThinking(tid);
    renderAnswer(parsed);
  } catch (e) {
    console.error('[sendMessage] error:', e);
    hideThinking(tid);
    appendError(e.message || 'エラーが発生しました。もう一度お試しください。');
    chatHistory.pop();
  }
  el('sendBtn').disabled = false;
}

function askQuick(t) { el('userInput').value = t; sendMessage(t); }

function appendUser(text) {
  var d = document.createElement('div');
  d.className = 'message user';
  d.innerHTML = '<div class="avatar user">S</div><div class="bubble">' + escapeHtml(text) + '</div>';
  appendToMessages(d);
}

function appendError(text) {
  var d = document.createElement('div');
  d.className = 'message ai';
  d.innerHTML = '<div class="avatar ai">L</div><div class="bubble" style="color:#c0392b">⚠️ ' + escapeHtml(text) + '</div>';
  appendToMessages(d);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showThinking() {
  var id = 't' + Date.now(), d = document.createElement('div');
  d.className = 'message ai'; d.id = id;
  d.innerHTML = '<div class="avatar ai">L</div><div class="bubble"><div class="thinking"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>';
  appendToMessages(d); return id;
}
function hideThinking(id) { var e = el(id); if (e) e.remove(); }

function renderAnswer(data) {
  var d = document.createElement('div');
  d.className = 'message ai';
  var h = '<div class="avatar ai">L</div><div class="bubble"><div>' + (data.answer || '').replace(/\n/g, '<br>') + '</div>';

  if (data.items && data.items.length) {
    h += '<div class="answer-section"><div class="answer-label">Results</div><div class="ans-item-grid">';
    data.items.forEach(function(item) {
      h += '<div class="ans-item-card">\
        <div class="ans-item-name">' + escapeHtml(item.name || '') + '</div>\
        <div class="ans-item-price">' + escapeHtml(item.price_adult || '—') + (item.price_child && item.price_child !== 'null' ? ' / ' + escapeHtml(item.price_child) : '') + '</div>\
        <div class="ans-item-meta">' + escapeHtml(item.time || '') + ' ' + (item.period ? '· ' + escapeHtml(item.period) : '') + '</div>\
        <span class="tag-pill ans-item-tag">' + (item.tag === 'allyear' ? '通年 / All year' : 'ウィンター / Winter') + '</span>\
      </div>';
    });
    h += '</div></div>';
  }

  if (data.table_rows && data.table_rows.length) {
    h += '<div class="answer-section"><div class="answer-label">' + escapeHtml(data.table_title || 'Details') + '</div>';
    h += '<table class="ans-table"><thead><tr>';
    (data.table_headers || []).forEach(function(x) { h += '<th>' + escapeHtml(x) + '</th>'; });
    h += '</tr></thead><tbody>';
    data.table_rows.forEach(function(row, i) {
      h += '<tr' + (i % 2 ? ' class="alt"' : '') + '>';
      Object.values(row).forEach(function(v) { h += '<td>' + escapeHtml(v || '') + '</td>'; });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
  }

  if (data.source) {
    var s = data.source;
    var isBuiltin = !!BUILTIN[s.sheet];
    var ud = userDocs.find(function(d) { return d.title === s.sheet; });
    var clickable = isBuiltin || ud;
    var urlPart = s.url ? '<div class="ref-url">🔗 <a href="' + escapeHtml(s.url) + '" target="_blank">' + escapeHtml(s.url) + '</a></div>' : '';
    h += '<div class="source-ref' + (clickable ? '' : ' no-click') + '"' +
      (isBuiltin ? ' data-builtin-ref="' + escapeHtml(s.sheet) + '"' : '') +
      (ud ? ' data-userdoc-ref="' + escapeHtml(ud.id) + '"' : '') +
      '>\
      <div class="ref-info">\
        <div class="ref-title">' + I18N[lang].sourceClick + '</div>\
        <div class="source-ref-desc"><strong>' + escapeHtml(s.sheet || '') + '</strong>' + (s.note ? ' · ' + escapeHtml(s.note) : '') + '</div>\
        ' + urlPart + '\
      </div>\
      ' + (clickable ? '<div class="open-icon">↗</div>' : '') + '\
    </div>';
  }

  h += '</div>'; d.innerHTML = h; appendToMessages(d);
}
