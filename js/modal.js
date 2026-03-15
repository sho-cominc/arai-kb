function openBuiltin(name) {
  var keys = Object.keys(BUILTIN);
  buildModal('📊 ' + name, BUILTIN[name].file, keys, name, function(n) { return renderBuiltinSheet(n); });
}

function buildModal(title, sub, tabs, activeTab, renderer) {
  el('modalTitle').textContent = title;
  el('modalSub').textContent = sub;
  var tabsEl = el('modalTabs');
  var bodyEl = el('modalBody');
  tabsEl.innerHTML = ''; bodyEl.innerHTML = '';
  tabs.forEach(function(name) {
    var tab = document.createElement('div');
    tab.className = 'modal-tab' + (name === activeTab ? ' active' : '');
    tab.textContent = name;
    var sid = 'sc_' + name.replace(/[^\w]/g, '_');
    tab.addEventListener('click', function() {
      document.querySelectorAll('.modal-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.sheet-content').forEach(function(c) { c.classList.remove('active'); });
      el(sid).classList.add('active');
    });
    tabsEl.appendChild(tab);
    var content = document.createElement('div');
    content.className = 'sheet-content' + (name === activeTab ? ' active' : '');
    content.id = sid;
    content.innerHTML = renderer(name);
    bodyEl.appendChild(content);
  });
  el('modalOverlay').classList.add('active');
}

function renderBuiltinSheet(name) {
  var s = BUILTIN[name]; if (!s) return '<p>No data</p>';
  var h = '';
  if (s.url) h += '<div class="sheet-url-bar">🔗 <a href="' + s.url + '" target="_blank">' + s.url + '</a></div>';
  h += '<div class="sheet-note">' + s.note + '</div>';
  h += '<table class="sheet-table"><thead><tr>';
  s.headers.forEach(function(x) { h += '<th>' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  s.rows.forEach(function(row) {
    if (row.s) { h += '<tr class="section-header"><td colspan="' + s.headers.length + '">' + row.s + '</td></tr>'; }
    else {
      h += '<tr' + (row.h ? ' class="highlight-row"' : '') + '>';
      row.d.forEach(function(c) { h += '<td>' + (c ? c.replace(/\n/g, '<br>') : '') + '</td>'; });
      h += '</tr>';
    }
  });
  h += '</tbody></table>'; return h;
}

function closeModal() { el('modalOverlay').classList.remove('active'); }
