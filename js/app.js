function switchView(name) {
  ['chat', 'data'].forEach(function(v) {
    el('view-' + v).classList.toggle('active', v === name);
    el('btn-' + v).classList.toggle('active', v === name);
  });
  if (name === 'data') renderList();
}

document.addEventListener('DOMContentLoaded', function() {
  el('langJA').addEventListener('click', function() { setLang('ja'); });
  el('langEN').addEventListener('click', function() { setLang('en'); });
  el('langKO').addEventListener('click', function() { setLang('ko'); });

  el('btn-chat').addEventListener('click', function() { switchView('chat'); });
  el('btn-data').addEventListener('click', function() { switchView('data'); });

  el('sendBtn').addEventListener('click', function() { sendMessage(); });

  el('userInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  document.querySelectorAll('.quick-btn[data-quick]').forEach(function(btn) {
    btn.addEventListener('click', function() { askQuick(btn.getAttribute('data-quick')); });
  });

  document.querySelectorAll('.quick-btn[data-builtin]').forEach(function(btn) {
    btn.addEventListener('click', function() { openBuiltin(btn.getAttribute('data-builtin')); });
  });

  var dropZone = el('dropZone');
  dropZone.addEventListener('dragover', dzOver);
  dropZone.addEventListener('dragleave', dzLeave);
  dropZone.addEventListener('drop', dzDrop);
  dropZone.addEventListener('click', function() { el('fileInput').click(); });

  el('fileInput').addEventListener('change', function() { handleFiles(this.files); });

  el('sheetSelect').addEventListener('change', onSheetSelect);

  el('tagAddBtn').addEventListener('click', addTag);
  el('tagAddInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') addTag(); });

  el('tcSaveBtn').addEventListener('click', saveFromConfirm);
  el('tcCancelBtn').addEventListener('click', cancelConfirm);

  el('delBtnDoc').addEventListener('click', deleteViewing);

  el('modalOverlay').addEventListener('click', function(e) { if (e.target === el('modalOverlay')) closeModal(); });
  el('modalCloseBtn').addEventListener('click', closeModal);

  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

  el('dmItems').addEventListener('click', function(e) {
    var item = e.target.closest('[data-doc-id]');
    var delBtn = e.target.closest('[data-del-id]');
    if (delBtn) { e.stopPropagation(); deleteById(delBtn.getAttribute('data-del-id')); return; }
    if (item) { viewDoc(item.getAttribute('data-doc-id')); }
  });

  el('sidebarUserDocs').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-sidebar-doc-id]');
    if (btn) { viewDoc(btn.getAttribute('data-sidebar-doc-id')); }
  });

  el('tagChips').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-tag-index]');
    if (btn) { removeTag(parseInt(btn.getAttribute('data-tag-index'), 10)); }
  });

  loadDocs();

  el('messages').addEventListener('click', function(e) {
    if (e.target.closest('.ref-url a')) return;
    var ref = e.target.closest('[data-builtin-ref]');
    if (ref) { openBuiltin(ref.getAttribute('data-builtin-ref')); return; }
    var udRef = e.target.closest('[data-userdoc-ref]');
    if (udRef) { viewDoc(udRef.getAttribute('data-userdoc-ref')); switchView('data'); }
  });
});
