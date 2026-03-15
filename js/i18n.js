var lang = 'ja';

var I18N = {
  ja: {
    chatBtn:'💬 チャット', dataBtn:'📁 データ管理',
    quickQ:'クイック質問',
    dzText:'ファイルをドロップ<br>AIが自動で読んでタグ付け<br><strong>クリックして選択</strong>',
    aiProc:'AIがファイルを読んでいます...',
    sheetSel:'シートを選択してください',
    tcTitle:'タイトル', tcCat:'カテゴリ', tcTags:'タグ（複数可）',
    tcSave:'💾 保存してAIに反映',
    tagAdd:'タグを追加...',
    dmEmpty:'ファイルをドロップして<br>AIに読ませてください。',
    viewerEmpty:'左のリストからドキュメントを選択',
    welcome:'日本語・English・한국어で質問できます。<br>Ask in any language — I\'ll respond in kind.<br><small class="welcome-hint">📁 Click any source to open the full data</small>',
    sendBtn:'送信', placeholder:'質問を入力 / Ask anything / 질문 입력...',
    sourceClick:'📁 データソース — クリックで開く',
  },
  en: {
    chatBtn:'💬 Chat', dataBtn:'📁 Data',
    quickQ:'Quick Questions',
    dzText:'Drop files here<br>AI will read & tag automatically<br><strong>or click to select</strong>',
    aiProc:'AI is reading the file...',
    sheetSel:'Select a sheet',
    tcTitle:'Title', tcCat:'Category', tcTags:'Tags (multiple OK)',
    tcSave:'💾 Save & Apply to AI',
    tagAdd:'Add a tag...',
    dmEmpty:'Drop a file and<br>let the AI read it.',
    viewerEmpty:'Select a document from the list',
    welcome:'Ask in any language — I\'ll respond in kind.<br><small class="welcome-hint">📁 Click any source to open the full data</small>',
    sendBtn:'Send', placeholder:'Ask anything...',
    sourceClick:'📁 Data Source — Click to open',
  },
  ko: {
    chatBtn:'💬 채팅', dataBtn:'📁 데이터',
    quickQ:'빠른 질문',
    dzText:'파일을 여기에 드롭하세요<br>AI가 자동으로 읽고 태그 설정<br><strong>클릭하여 선택</strong>',
    aiProc:'AI가 파일을 읽고 있습니다...',
    sheetSel:'시트를 선택하세요',
    tcTitle:'제목', tcCat:'카테고리', tcTags:'태그 (복수 가능)',
    tcSave:'💾 저장 및 AI에 반영',
    tagAdd:'태그 추가...',
    dmEmpty:'파일을 드롭하여<br>AI에게 읽혀보세요.',
    viewerEmpty:'왼쪽 목록에서 문서를 선택하세요',
    welcome:'한국어・日本語・English로 질문하세요.<br><small class="welcome-hint">📁 소스를 클릭하면 원본 데이터가 열립니다</small>',
    sendBtn:'전송', placeholder:'무엇이든 질문하세요...',
    sourceClick:'📁 데이터 소스 — 클릭하여 열기',
  }
};

function setLang(l) {
  lang = l;
  ['ja','en','ko'].forEach(function(code) { el('lang'+code.toUpperCase()).classList.toggle('active', code===l); });
  var t = I18N[l];
  el('btn-chat').textContent = t.chatBtn;
  el('btn-data').textContent = t.dataBtn;
  el('dzText').innerHTML = t.dzText;
  el('aiProcLabel').textContent = t.aiProc;
  el('sheetSelectorLabel').textContent = t.sheetSel;
  el('tcTitleLabel').textContent = t.tcTitle;
  el('tcCatLabel').textContent = t.tcCat;
  el('tcTagsLabel').textContent = t.tcTags;
  el('tcSaveBtn').textContent = t.tcSave;
  el('tagAddInput').placeholder = t.tagAdd;
  el('dmEmpty').innerHTML = t.dmEmpty;
  el('dmViewerEmptyText').textContent = t.viewerEmpty;
  el('welcomeText').innerHTML = t.welcome;
  el('sendBtn').textContent = t.sendBtn;
  el('userInput').placeholder = t.placeholder;
}
