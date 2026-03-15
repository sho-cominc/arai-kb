var userDocs = [];
var viewingId = null;

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
  var preview = (d.content || '').slice(0, 3000);
  el('docDetailContent').textContent = preview + (d.content && d.content.length > 3000 ? '\n\n[...]' : '');
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
