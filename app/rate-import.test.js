/* 料金取り込みの検証 — 正規化形式の投入・不正行の弾き方・月グリッド表示・タップ操作。
   実行: node app/rate-import.test.js (要 playwright) */
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport:{width:430,height:1000} });
  const errs=[]; p.on("pageerror",e=>errs.push(e.message));
  p.on("dialog", d=>{ console.log("  通知:", d.message().split("\n")[0]); d.accept(); });
  await p.goto("file://" + require("path").resolve(__dirname,"group-app-prototype.html"));
  await p.click("#tab-rate");
  await p.click("text=📥 料金データの取り込み");

  // 正規化形式(見出し行・空行・不正行を混ぜて堅牢性も見る)
  const csv = [
    "# 日付,ランク",
    "2026-08-14,S","2026-08-15,A","2026-08-16,B","2026-08-17,C","2026-08-18,D",
    "2026/8/19,A",              // スラッシュ区切りも許容
    "",                          // 空行
    "2026-08-20,Z",              // 不正ランク
    "# 部屋タイプ,ランク,単価",
    "Superior Twin,A,14960","Superior Twin,B,12000",
    "存在しない部屋,A,1000",      // 未知の部屋
    "ぐちゃぐちゃな行",
  ].join("\n");
  await p.locator("textarea").first().fill(csv);
  await p.waitForTimeout(200);
  const info = (await p.locator("#impInfo").textContent()).replace(/\s+/g," ").trim();
  console.log("プレビュー:", info);
  await p.click("text=取り込む");
  await p.waitForTimeout(300);

  const state = await p.evaluate(()=>{
    const d=JSON.parse(localStorage.getItem("groupdesk.v1"));
    return { cal:d.rates.cal, tw:d.rates.table["Superior Twin"], keys:Object.keys(d.rates.cal).length };
  });
  const T=(n,g,w)=>console.log((JSON.stringify(g)===JSON.stringify(w)?"✓":"✗ FAIL")+` ${n}: ${JSON.stringify(g)}`);
  T("8/14=S", state.cal["2026-08-14"], "S");
  T("スラッシュ形式 8/19=A", state.cal["2026-08-19"], "A");
  T("不正ランクZは取り込まない", state.cal["2026-08-20"], undefined);
  T("料金表 Superior Twin", state.tw, {A:"14960",B:"12000"});
  T("取り込んだ日数(不正1件を除く6日)", state.keys, 6);

  // 月グリッドが色分けで出るか
  await p.waitForTimeout(200);
  for(let i=0;i<3;i++){ if(await p.locator("b",{hasText:"2026年8月"}).count()) break; await p.click("text=→"); await p.waitForTimeout(80); }
  const cells = await p.locator(".rkcell.rk-S, .rkcell.rk-A, .rkcell.rk-B, .rkcell.rk-C, .rkcell.rk-D").count();
  console.log((cells===6?"✓":"✗ FAIL")+` 月グリッドに色付きセル ${cells}個(6のはず)`);
  // タップでランクが送られるか
  const before = await p.evaluate(()=>JSON.parse(localStorage.getItem("groupdesk.v1")).rates.cal["2026-08-14"]);
  await p.locator(".rkcell.rk-S").first().click(); await p.waitForTimeout(150);
  const after = await p.evaluate(()=>JSON.parse(localStorage.getItem("groupdesk.v1")).rates.cal["2026-08-14"]);
  console.log((before==="S"&&after==="A"?"✓":"✗ FAIL")+` タップでランク送り ${before}→${after}`);

  await p.screenshot({ path: require("path").join(__dirname,"rate.png"), fullPage:true });
  console.log(errs.length?("\nJSエラー: "+errs.join("; ")):"\nJSエラーなし");
  await b.close();
})();
