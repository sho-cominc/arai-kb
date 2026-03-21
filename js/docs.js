var userDocs = [];
var viewingId = null;
var editingTags = [];

async function loadDocs() {
  showAiProc('データ読み込み中...');
  try {
    var res = await fetch('/api/docs');
    if (!res.ok) {
      var errData = {};
      try { errData = await res.json(); } catch (_) {}
      throw new Error((errData.error || 'HTTP ' + res.status));
    }
    userDocs = await res.json();
  } catch (e) {
    console.error('[loadDocs] failed:', e);
    userDocs = [];
    showLoadError(e.message || 'データの読み込みに失敗しました');
  }
  hideAiProc();
  renderList();
}

function showLoadError(msg) {
  var container = el('dmItems');
  container.innerHTML = '<div class="dm-empty" style="color:#c0392b">⚠️ ' + escapeHtml(msg) + '<br><small>環境変数 FIREBASE_CREDENTIALS を確認してください</small></div>';
}

function renderList() {
  var container = el('dmItems');
  if (!userDocs.length) {
    container.innerHTML = '<div class="dm-empty" id="dmEmpty">' + I18N[lang].dmEmpty + '</div>';
    updateSidebar(); return;
  }
  container.innerHTML = userDocs.map(function(d) { return '\
    <div class="dm-item ' + (viewingId === d.id ? 'active' : '') + '" data-doc-id="' + escapeHtml(d.id) + '">\
      <div class="dm-item-icon">' + (CAT_ICONS[d.category] || '📄') + '</div>\
      <div class="dm-item-info">\
        <div class="dm-item-title">' + escapeHtml(d.title) + '</div>\
        <div class="dm-item-tags">' + (d.tags || []).map(function(t) { return '<span class="dm-item-tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>\
      </div>\
      <button class="dm-item-del" data-del-id="' + escapeHtml(d.id) + '">×</button>\
    </div>'; }).join('');
  updateSidebar();
}

function updateSidebar() {
  var container = el('sidebarUserDocs');
  if (!userDocs.length) { container.innerHTML = ''; return; }
  var bycat = {};
  userDocs.forEach(function(d) { if (!bycat[d.category]) bycat[d.category] = []; bycat[d.category].push(d); });
  container.innerHTML = Object.entries(bycat).map(function(entry) {
    var cat = entry[0], docs = entry[1];
    return '\
    <div class="sidebar-label">' + (CAT_ICONS[cat] || '📄') + ' ' + escapeHtml(cat) + '</div>\
    ' + docs.map(function(d) { return '<button class="quick-btn" data-sidebar-doc-id="' + escapeHtml(d.id) + '">' + escapeHtml(d.title.slice(0, 22)) + '</button>'; }).join('');
  }).join('');
}

function showDocViewer(show) {
  setDisplay('dmViewerEmpty', show ? 'none' : 'flex');
  setDisplay('docDetail', show ? 'block' : 'none');
  setDisplay('docActions', show ? 'flex' : 'none');
}

function viewDoc(id) {
  var d = userDocs.find(function(x) { return x.id === id; }); if (!d) return;
  viewingId = id;
  renderList();
  showDocViewer(true);
  el('docDetailTitle').textContent = d.title;
  el('docDetailTags').innerHTML =
    '<span class="tag-pill cat">' + (CAT_ICONS[d.category] || '📄') + ' ' + escapeHtml(d.category) + '</span>' +
    (d.tags || []).map(function(t) { return '<span class="tag-pill">' + escapeHtml(t) + '</span>'; }).join('');
  el('docDetailSource').textContent = d.source ? '📄 ' + d.source : '';
  el('docDetailUrl').innerHTML = d.url ? '🔗 <a href="' + escapeHtml(d.url) + '" target="_blank">' + escapeHtml(d.url) + '</a>' : '';
  var content = d.content || '';
  var contentEl = el('docDetailContent');
  if (content.startsWith('__IMAGE__:')) {
    contentEl.innerHTML = '<img src="' + content.slice(10) + '" style="max-width:100%;border-radius:8px;" />';
  } else {
    contentEl.textContent = content.slice(0, 3000) + (content.length > 3000 ? '\n\n[...]' : '');
  }
}

function editDoc() {
  var d = userDocs.find(function(x) { return x.id === viewingId; });
  if (!d) return;
  editingTags = (d.tags || []).slice();
  setDisplay('docActions', 'none');

  var cats = ['activities','rooms','rates','facilities','faq','tourism','operations','other'];
  var catOptions = cats.map(function(c) {
    return '<option value="' + c + '"' + (d.category === c ? ' selected' : '') + '>' + c + '</option>';
  }).join('');

  el('docDetail').innerHTML =
    '<div class="edit-form">' +
    '<label>タイトル<input id="editTitle" class="edit-input" value="' + escapeHtml(d.title || '') + '" /></label>' +
    '<label>カテゴリ<select id="editCategory" class="edit-input">' + catOptions + '</select></label>' +
    '<label>タグ<div class="edit-tag-row" id="editTagChips"></div>' +
    '<div class="tag-add-row"><input id="editTagInput" class="tag-add-input" placeholder="タグを追加..." />' +
    '<button class="tag-add-btn" onclick="editAddTag()">+</button></div></label>' +
    '<label>URL<input id="editUrl" class="edit-input" value="' + escapeHtml(d.url || '') + '" /></label>' +
    '<div class="edit-actions">' +
    '<button class="save-btn" onclick="saveEdit()">保存</button>' +
    '<button class="cancel-btn" onclick="cancelEdit()">キャンセル</button>' +
    '</div></div>';

  renderEditTags();

  el('editTagInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') editAddTag(); });
}

function renderEditTags() {
  el('editTagChips').innerHTML = editingTags.map(function(t, i) {
    return '<span class="tag-chip">' + escapeHtml(t) + '<button class="remove-tag" onclick="editRemoveTag(' + i + ')">×</button></span>';
  }).join('');
}

function editAddTag() {
  var input = el('editTagInput');
  var val = input.value.trim();
  if (val && !editingTags.includes(val)) { editingTags.push(val); renderEditTags(); }
  input.value = '';
}

function editRemoveTag(i) { editingTags.splice(i, 1); renderEditTags(); }

async function saveEdit() {
  var d = userDocs.find(function(x) { return x.id === viewingId; });
  if (!d) return;
  d.title = el('editTitle').value.trim() || d.title;
  d.category = el('editCategory').value;
  d.tags = editingTags.slice();
  d.url = el('editUrl').value.trim();
  try {
    var res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch (e) {
    alert('保存に失敗しました: ' + e.message);
    return;
  }
  renderList();
  viewDoc(viewingId);
  setDisplay('docActions', 'flex');
}

function cancelEdit() {
  viewDoc(viewingId);
  setDisplay('docActions', 'flex');
}

async function deleteViewing() {
  if (!viewingId) return;
  if (!confirm('削除しますか？')) return;
  await deleteById(viewingId);
}

async function deleteById(id) {
  try {
    var res = await fetch('/api/docs/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!res.ok) {
      var errData = {};
      try { errData = await res.json(); } catch (_) {}
      throw new Error(errData.error || 'HTTP ' + res.status);
    }
  } catch (e) {
    console.error('[deleteById] failed:', e);
    alert('削除に失敗しました: ' + e.message);
    return;
  }
  userDocs = userDocs.filter(function(x) { return x.id !== id; });
  if (viewingId === id) {
    viewingId = null;
    showDocViewer(false);
  }
  renderList();
}
