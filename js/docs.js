var userDocs = [];
var viewingId = null;

function renderList() {
  var container = el('dmItems');
  if (!userDocs.length) {
    container.innerHTML = '<div class="dm-empty" id="dmEmpty">' + I18N[lang].dmEmpty + '</div>';
    updateSidebar(); return;
  }
  container.innerHTML = userDocs.map(function(d) { return '\
    <div class="dm-item ' + (viewingId === d.id ? 'active' : '') + '" data-doc-id="' + d.id + '">\
      <div class="dm-item-icon">' + (CAT_ICONS[d.category] || '📄') + '</div>\
      <div class="dm-item-info">\
        <div class="dm-item-title">' + d.title + '</div>\
        <div class="dm-item-tags">' + (d.tags || []).map(function(t) { return '<span class="dm-item-tag">' + t + '</span>'; }).join('') + '</div>\
      </div>\
      <button class="dm-item-del" data-del-id="' + d.id + '">×</button>\
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
    <div class="sidebar-label">' + (CAT_ICONS[cat] || '📄') + ' ' + cat + '</div>\
    ' + docs.map(function(d) { return '<button class="quick-btn" data-sidebar-doc-id="' + d.id + '">' + d.title.slice(0, 22) + '</button>'; }).join('');
  }).join('');
}

function viewDoc(id) {
  var d = userDocs.find(function(x) { return x.id === id; }); if (!d) return;
  viewingId = id;
  renderList();
  setDisplay('dmViewerEmpty', 'none');
  setDisplay('docDetail', 'block');
  setDisplay('docActions', 'flex');
  el('docDetailTitle').textContent = d.title;
  el('docDetailTags').innerHTML =
    '<span class="tag-pill cat">' + (CAT_ICONS[d.category] || '📄') + ' ' + d.category + '</span>' +
    (d.tags || []).map(function(t) { return '<span class="tag-pill">' + t + '</span>'; }).join('');
  el('docDetailSource').textContent = d.source ? '📄 ' + d.source : '';
  el('docDetailUrl').innerHTML = d.url ? '🔗 <a href="' + d.url + '" target="_blank">' + d.url + '</a>' : '';
  var preview = (d.content || '').slice(0, 3000);
  el('docDetailContent').textContent = preview + (d.content && d.content.length > 3000 ? '\n\n[...]' : '');
}

function deleteViewing() {
  if (!viewingId) return;
  if (!confirm('削除しますか？')) return;
  deleteById(viewingId);
  viewingId = null;
  setDisplay('dmViewerEmpty', 'flex');
  setDisplay('docDetail', 'none');
  setDisplay('docActions', 'none');
}

function deleteById(id) {
  userDocs = userDocs.filter(function(x) { return x.id !== id; });
  if (viewingId === id) { viewingId = null; }
  renderList();
}
