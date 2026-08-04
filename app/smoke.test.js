/* ブラウザ通し確認 — 全画面を実際に操作し、JSエラーと表示崩れを検出する。
   実行: node app/smoke.test.js (要 playwright)
   ブラウザ実行パスは環境に合わせて調整すること。 */
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const errs = [];
  page.on("pageerror", e => errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type()==="error") errs.push("console: " + m.text()); });

  const file = "file://" + path.resolve(__dirname, "group-app-prototype.html");
  await page.goto(file);

  const step = async (name, fn) => {
    const before = errs.length;
    await fn();
    await page.waitForTimeout(120);
    console.log((errs.length===before ? "✓" : "✗") + " " + name);
  };

  // 料金マスタを登録
  await step("料金タブを開く", async () => await page.click("#tab-rate"));
  const gotoMonth = async label => {
    for (let i=0;i<14;i++){
      if (await page.locator("b", { hasText: label }).count()) return;
      await page.click("text=→"); await page.waitForTimeout(60);
    }
    throw new Error(label+" に移動できません");
  };
  await step("2026年8月へ移動", async () => await gotoMonth("2026年8月"));
  await step("部屋料金を入力(Superior Twin A=14960)", async () => {
    const row = page.locator("tr", { has: page.locator("td.rowlab", { hasText:"Superior Twin" }) }).first();
    await row.locator("input").nth(1).fill("14960");  // A列
    await row.locator("input").nth(2).fill("12000");  // B列
  });
  await step("月一括でランクAをセット", async () => {
    await page.selectOption("#bulkRank", "A");
    await page.click("text=全日");
  });

  // 案件を作る
  await step("新規案件", async () => await page.click("#tab-new"));
  const fill = async (label, val) => {
    await page.locator(".field", { hasText: label }).first().locator("input,select").first().fill(val);
  };
  await step("会社名・日程・人数を入力", async () => {
    await fill("会社名", "田中産業株式会社");
    await fill("利用開始日(C/I)", "2026-08-15");
    await fill("利用終了日(C/O)", "2026-08-17");
    await fill("大人", "38");
  });
  await step("必須の選択(挨拶・ステータス)", async () => {
    await page.locator(".field", { hasText:"お出迎え・挨拶" }).first().locator("select").selectOption("セールス立ち会い");
    await page.locator(".field", { hasText:"ステータス" }).first().locator("select").selectOption("確定");
  });
  await step("部屋タイプ・室数を入力", async () => {
    const t = page.locator("table.tbl").filter({ hasText:"部屋タイプ" }).first();
    await t.locator("tbody tr").nth(1).locator("select").selectOption("Superior Twin");
    await page.waitForTimeout(200);
    const t2 = page.locator("table.tbl").filter({ hasText:"部屋タイプ" }).first();
    await t2.locator("tbody tr").nth(1).locator("input").first().fill("10");
  });

  const auto = await page.locator("text=/ランクA→A 自動/").count();
  console.log((auto>0?"✓":"✗") + " 自動料金が表示された (該当要素 " + auto + "件)");
  const bd = await page.locator("text=/8\\/15 A ¥14,960/").count();
  console.log((bd>0?"✓":"✗") + " 泊ごと内訳が表示された");

  await step("共有シートを開く", async () => await page.click("text=📄 共有シート"));
  const greet = await page.locator("text=セールス立ち会い").count();
  console.log((greet>0?"✓":"✗") + " 共有シートにお出迎え情報");
  await step("編集へ戻る", async () => await page.click("text=← 編集に戻る"));
  await step("見積書を開く", async () => await page.click("text=💴 見積書"));
  const qt = await page.locator("text=/Superior Twin\\(2泊・ランクA→A 自動\\)/").count();
  console.log((qt>0?"✓":"✗") + " 見積書に部屋行と根拠");
  await step("編集へ戻る2", async () => await page.click("text=← 編集に戻る"));
  await step("工程表を開く", async () => await page.click("text=🕐 工程表"));
  await step("編集へ戻る3", async () => await page.click("text=← 編集に戻る"));
  await step("カレンダー(団体別)", async () => { await page.click("#tab-cal"); await gotoMonth("2026年8月"); });
  const stay = await page.locator("text=田中産業株式会社").count();
  console.log((stay>0?"✓":"✗") + " 団体別カレンダーに掲載");
  await step("カレンダー(会場別)", async () => await page.click("text=会場別"));
  await step("案件一覧へ", async () => await page.click("#tab-list"));

  await page.screenshot({ path: path.join(__dirname,"smoke.png"), fullPage:true });
  console.log(errs.length ? "\n【エラー】\n" + errs.join("\n") : "\nJSエラーなし");
  await browser.close();
  process.exit(errs.length?1:0);
})();
