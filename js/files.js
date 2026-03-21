var pendingXlsx = null;

function dzOver(e) { e.preventDefault(); el('dropZone').classList.add('drag-over'); }
function dzLeave(e) { el('dropZone').classList.remove('drag-over'); }
function dzDrop(e) { e.preventDefault(); el('dropZone').classList.remove('drag-over'); handleFiles(e.dataTransfer.files); }

function handleFiles(files) {
  if (!files || !files.length) return;
  Array.from(files).forEach(function(f) { processFile(f); });
}

function processFile(file) {
  var name = file.name;
  var ext = name.split('.').pop().toLowerCase();
  switchView('data');
  showAiProc(name);

  var reader = new FileReader();

  if (ext === 'xlsx') {
    reader.onload = function(e) {
      var wb = XLSX.read(e.target.result, { type: 'array' });
      pendingXlsx = { wb: wb, fileName: name };
      hideAiProc();
      if (wb.SheetNames.length === 1) {
        loadXlsxSheet(wb, wb.SheetNames[0], name);
      } else {
        var sel = el('sheetSelect');
        sel.innerHTML = wb.SheetNames.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
        showModal('sheetSelector');
      }
    };
    reader.readAsArrayBuffer(file);
  } else if (ext === 'csv') {
    reader.onload = function(e) { hideAiProc(); aiTagFile(name, 'sheet', e.target.result); };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'md' || ext === 'txt') {
    reader.onload = function(e) { hideAiProc(); aiTagFile(name, 'md', e.target.result); };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'json') {
    reader.onload = function(e) {
      hideAiProc();
      var text;
      try {
        var parsed = JSON.parse(e.target.result);
        text = JSON.stringify(parsed, null, 2);
      } catch (err) {
        text = e.target.result;
      }
      aiTagFile(name, 'json', text);
    };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'pdf') {
    var formData = new FormData();
    formData.append('file', file);
    fetch('/api/extract', { method: 'POST', body: formData })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        hideAiProc();
        aiTagFile(name, 'pdf', data.text || '（テキスト抽出できませんでした）');
      })
      .catch(function(err) {
        hideAiProc();
        aiTagFile(name, 'pdf', '（テキスト抽出できませんでした）');
      });
    return;
  } else {
    hideAiProc();
    alert('非対応形式: .' + ext + '\n対応: .xlsx .csv .md .txt .pdf .json');
  }
}

function onSheetSelect() {
  if (!pendingXlsx) return;
  var sn = el('sheetSelect').value;
  hideModal('sheetSelector');
  loadXlsxSheet(pendingXlsx.wb, sn, pendingXlsx.fileName);
  pendingXlsx = null;
}

function loadXlsxSheet(wb, sheetName, fileName) {
  var ws = wb.Sheets[sheetName];
  var tsv = XLSX.utils.sheet_to_csv(ws, { FS: '\t', defval: '' });
  showAiProc(fileName);
  aiTagFile(fileName + ' — ' + sheetName, 'sheet', tsv);
}
