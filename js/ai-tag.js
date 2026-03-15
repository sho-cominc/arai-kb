var pendingDoc = null;
var pendingTags = [];

async function aiTagFile(filename, type, content) {
  showAiProc(filename);
  var preview = content.slice(0, 1500);
  var prompt = 'You are an AI assistant for a hotel knowledge base called "LOTTE ARAI RESORT".\n\nA staff member just uploaded a file. Read the content and respond ONLY with this JSON (no backticks):\n{\n  "title": "短いわかりやすいタイトル（日本語OK、30文字以内）",\n  "category": "one of: activities | rooms | rates | facilities | faq | tourism | operations | other",\n  "tags": ["tag1","tag2","tag3"],\n  "summary": "2〜3文の日本語要約"\n}\n\nTags should be short keywords (Japanese or English), 3-6 tags, reflecting the content well.\n\nFilename: ' + filename + '\nType: ' + type + '\nContent preview:\n' + preview;

  try {
    var res = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.AI_MODEL,
        max_tokens: CONFIG.TAG_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    var data = await res.json();
    var raw = data.content && data.content[0] && data.content[0].text || '{}';
    var parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch (e) { parsed = { title: filename, category: 'other', tags: [], summary: '' }; }
    openTagConfirm(filename, type, content, parsed);
  } catch (e) {
    openTagConfirm(filename, type, content, {});
  }
}

function openTagConfirm(filename, type, content, parsed) {
  hideAiProc();
  pendingDoc = { filename: filename, type: type, content: content, summary: parsed.summary || '' };
  pendingTags = parsed.tags || [];
  el('tcTitle').value = parsed.title || filename;
  el('tcCategory').value = parsed.category || 'other';
  el('tcUrl').value = '';
  renderTagChips();
  showModal('tagConfirm');
}

function renderTagChips() {
  el('tagChips').innerHTML = pendingTags.map(function(t, i) { return '\
    <span class="tag-chip">' + t + '\
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
  };
}

function saveFromConfirm() {
  if (!pendingDoc) return;
  var doc = createDocFromForm();
  userDocs.push(doc);
  pendingDoc = null; pendingTags = [];
  hideModal('tagConfirm');
  renderList();
  viewDoc(doc.id);
}

function cancelConfirm() {
  pendingDoc = null; pendingTags = [];
  hideModal('tagConfirm');
}

function showAiProc(name) {
  el('aiProcLabel').textContent = I18N[lang].aiProc;
  el('aiProcFile').textContent = name;
  showModal('aiProcessing');
}
function hideAiProc() { hideModal('aiProcessing'); }
