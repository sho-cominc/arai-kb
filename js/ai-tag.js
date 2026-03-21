var pendingDoc = null;
var pendingTags = [];

function clearPending() {
  pendingDoc = null;
  pendingTags = [];
}

async function aiTagFile(filename, type, content, imageb64) {
  showAiProc(filename);
  var preview = content.slice(0, 1500);
  var prompt = 'You are an AI assistant for a hotel knowledge base called "LOTTE ARAI RESORT".\n\nA staff member just uploaded a file. Read the content and respond ONLY with this JSON (no backticks):\n{\n  "title": "短いわかりやすいタイトル（日本語OK、30文字以内）",\n  "category": "one of: activities | rooms | rates | facilities | faq | tourism | operations | other",\n  "tags": ["tag1","tag2","tag3"],\n  "summary": "2〜3文の日本語要約"\n}\n\nTags should be short keywords (Japanese or English), 6-10 tags. Include: topic keywords, related activities or services, target audience, season if relevant, and any specific names (places, products, staff roles) mentioned in the content.\n\nFilename: ' + filename + '\nType: ' + type + '\nContent preview:\n' + preview;

  try {
    var result = await callAI([{ role: 'user', content: prompt }], '', CONFIG.TAG_MAX_TOKENS);
    var parsed = result.parsed || { title: filename, category: 'other', tags: [], summary: '' };
    openTagConfirm(filename, type, content, parsed, imageb64);
  } catch (e) {
    console.error('[aiTagFile] failed:', e);
    openTagConfirm(filename, type, content, { title: filename, category: 'other', tags: [], summary: '' }, imageb64);
  }
}

function openTagConfirm(filename, type, content, parsed, imageb64) {
  hideAiProc();
  var storedContent = imageb64 ? '__IMAGE__:' + imageb64 : content;
  pendingDoc = { filename: filename, type: type, content: storedContent, summary: parsed.summary || '' };
  pendingTags = parsed.tags || [];
  el('tcTitle').value = parsed.title || filename;
  el('tcCategory').value = parsed.category || 'other';
  el('tcUrl').value = '';
  renderTagChips();
  showModal('tagConfirm');
}

function renderTagChips() {
  el('tagChips').innerHTML = pendingTags.map(function(t, i) { return '\
    <span class="tag-chip">' + escapeHtml(t) + '\
      <button class="remove-tag" data-tag-index="' + i + '">×</button>\
    </span>'; }).join('');
}

function removeTag(i) { pendingTags.splice(i, 1); renderTagChips(); }

function addTag() {
  var input = el('tagAddInput');
  var val = input.value.trim();
  if (val && !pendingTags.includes(val)) { pendingTags.push(val); renderTagChips(); }
  input.value = '';
}

function createDocFromForm() {
  return {
    id: 'doc_' + Date.now(),
    title: el('tcTitle').value.trim() || pendingDoc.filename,
    category: el('tcCategory').value,
    tags: pendingTags.slice(),
    source: pendingDoc.filename,
    url: el('tcUrl').value.trim(),
    content: pendingDoc.content,
    summary: pendingDoc.summary,
    type: pendingDoc.type,
    priority: el('tcPriority').value,
    status: 'active',
    valid_until: null,
    notes: '',
  };
}

async function saveFromConfirm() {
  if (!pendingDoc) return;
  var doc = createDocFromForm();
  try {
    var res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    if (!res.ok) {
      var errData = {};
      try { errData = await res.json(); } catch (_) {}
      throw new Error(errData.error || 'HTTP ' + res.status);
    }
  } catch (e) {
    console.error('[saveFromConfirm] failed:', e);
    alert('保存に失敗しました: ' + e.message);
    return;
  }
  userDocs.push(doc);
  clearPending();
  hideModal('tagConfirm');
  renderList();
  viewDoc(doc.id);
}

function cancelConfirm() {
  clearPending();
  hideModal('tagConfirm');
}

function showAiProc(name) {
  el('aiProcLabel').textContent = I18N[lang].aiProc;
  el('aiProcFile').textContent = name;
  showModal('aiProcessing');
}
function hideAiProc() { hideModal('aiProcessing'); }
