/* 料金ロジック検証 — アプリ本体(group-app-prototype.html)から実際の関数を抽出して実行する。
   テスト側にロジックを複製しないので、本体を直せばテストも追従する。
   実行: node app/pricing-logic.test.js */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "group-app-prototype.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

// 本体から純粋関数だけを取り出す(DOM に触る部分は読み込まない)
const NAMES = ["N","yen","pad2","dayKey","monthKey","md","stayDates","stayRanks",
               "autoRoomRate","nightBreakdown","autoBlockReason","nights",
               "priceRoom","roomLines"];
const src = NAMES.map(n => {
  const fn = script.match(new RegExp(`^function ${n}\\(([\\s\\S]*?)\\n\\}`, "m"));
  if (fn) return fn[0];
  const arrow = script.match(new RegExp(`^const ${n} *=.*$`, "m"));
  if (arrow) return arrow[0];
  throw new Error(`本体に ${n} が見つかりません(関数名を変えたらこのリストも更新すること)`);
}).join("\n");

const db = { rates: { cal: {}, table: {} }, cases: [] };
const F = new Function("db", src + "\nreturn {" + NAMES.join(",") + "};")(db);
const { stayDates, autoRoomRate, roomLines, autoBlockReason } = F;

db.rates.cal = { "2026-08-15": "A", "2026-08-16": "B", "2026-08-17": "A" };
db.rates.table = { "Superior Twin": { A: 14960, B: 12000 } };

let fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function T(name, got, want) {
  const ok = eq(got, want);
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}: ${JSON.stringify(got)}` +
    (ok ? "" : ` (期待 ${JSON.stringify(want)})`));
}
const room = (type, n, rate) => ({ type, n: String(n), rate: String(rate || "") });

console.log("[泊の切り出し — C/O日は泊数に含めない]");
T("8/15→8/17 は 15・16 の2泊", stayDates({ ci: "2026-08-15", co: "2026-08-17" }),
  ["2026-08-15", "2026-08-16"]);
T("8/15→8/18 は3泊", stayDates({ ci: "2026-08-15", co: "2026-08-18" }),
  ["2026-08-15", "2026-08-16", "2026-08-17"]);
T("月をまたぐ 8/31→9/2", stayDates({ ci: "2026-08-31", co: "2026-09-02" }),
  ["2026-08-31", "2026-09-01"]);

console.log("\n[泊ごとにランクを引いて合算する]");
let c = { ci: "2026-08-15", co: "2026-08-17", rankOv: {}, roomRows: [room("Superior Twin", 10)] };
let a = autoRoomRate(c, "Superior Twin");
T("2泊 A+B = 26,960/室", a.total, 14960 + 12000);
T("ラベルに泊ごとのランク", a.label, "ランクA→B 自動");
T("内訳は2泊分", a.nights.map(n => [n.date, n.rank, n.price]),
  [["2026-08-15", "A", 14960], ["2026-08-16", "B", 12000]]);
T("10室で 269,600", roomLines(c)[0].amt, 269600);

c = { ci: "2026-08-15", co: "2026-08-18", rankOv: {}, roomRows: [room("Superior Twin", 1)] };
a = autoRoomRate(c, "Superior Twin");
T("3泊 A+B+A = 41,920/室", a.total, 14960 + 12000 + 14960);
T("3泊のラベル", a.label, "ランクA→B→A 自動");

console.log("\n[手動で介入できる2経路]");
c = { ci: "2026-08-15", co: "2026-08-17", rankOv: {}, roomRows: [room("Superior Twin", 10, 20000)] };
T("料金の手入力が自動より優先(20,000×2泊×10室)", roomLines(c)[0].amt, 400000);
T("手動フラグが立つ", roomLines(c)[0].manual, true);

c = { ci: "2026-08-15", co: "2026-08-17", rankOv: { "2026-08-15": "B" }, roomRows: [room("Superior Twin", 10)] };
T("1泊目をBに上書き → B+B = 24,000/室", autoRoomRate(c, "Superior Twin").total, 24000);
T("上書き後の金額 240,000", roomLines(c)[0].amt, 240000);

console.log("\n[見積書に載せる根拠 — 手動料金に自動ラベルを付けない]");
c = { ci: "2026-08-15", co: "2026-08-17", rankOv: {}, roomRows: [room("Superior Twin", 10, 20000)] };
T("手動時は autoApplied なし(見積に『自動』と出さない)", roomLines(c)[0].autoApplied, null);
T("手動時も auto は参考表示用に残る", !!roomLines(c)[0].auto, true);
c = { ci: "2026-08-15", co: "2026-08-17", rankOv: {}, roomRows: [room("Superior Twin", 10)] };
T("自動時は autoApplied にラベル", roomLines(c)[0].autoApplied.label, "ランクA→B 自動");

console.log("\n[1泊でも欠けたら自動計算しない]");
c = { ci: "2026-08-15", co: "2026-08-19", rankOv: {}, roomRows: [room("Superior Twin", 10)] };
T("未設定日(8/18)を含む → 自動なし", autoRoomRate(c, "Superior Twin"), null);
T("金額は0(勝手な値を出さない)", roomLines(c)[0].amt, 0);
T("原因を日付で説明", autoBlockReason(c, "Superior Twin"), "8/18 のランク未設定");

db.rates.table["Deluxe Twin"] = { A: 20000 };   // Bランクの料金が未登録
c = { ci: "2026-08-15", co: "2026-08-17", rankOv: {}, roomRows: [room("Deluxe Twin", 2)] };
T("料金未登録のランクを含む → 自動なし", autoRoomRate(c, "Deluxe Twin"), null);
T("料金未登録も原因を説明", autoBlockReason(c, "Deluxe Twin"), "8/16(ランクB)の料金未登録");

console.log("\n[日帰り]");
c = { ci: "2026-08-15", co: "2026-08-15", rankOv: {}, roomRows: [room("Superior Twin", 2)] };
T("C/O=C/I は1泊分として計算", roomLines(c)[0].amt, 14960 * 2);

console.log(fail ? `\n${fail}件 失敗` : "\n全て一致");
process.exit(fail ? 1 : 0);
