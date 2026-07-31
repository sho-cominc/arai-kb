// 料金ロジックの単体検証(アプリ内の関数を再現して検算)
const db={rates:{cal:{"2026-08-15":"A","2026-08-16":"B"},table:{"Superior Twin":{A:14960,B:12000}}}};
const N=v=>{const x=parseFloat(String(v).replace(/,/g,""));return isNaN(x)?0:x};
function stayDates(c){if(!c.ci)return[];const out=[],s=new Date(c.ci),e=c.co?new Date(c.co):null;
 if(!e||e.getTime()<=s.getTime())return[c.ci];
 for(let d=new Date(s);d<e;d.setDate(d.getDate()+1))
  out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
 return out;}
function stayRanks(c){return stayDates(c).map(d=>{const ov=(c.rankOv||{})[d];
 return{date:d,rank:ov||db.rates.cal[d]||"",ov:!!ov,calRank:db.rates.cal[d]||""}})}
function autoRoomRate(c,type){const ds=stayRanks(c);if(!type||!ds.length)return null;
 let total=0;const parts=[];
 for(const{date,rank}of ds){const p=rank&&db.rates.table[type]&&N(db.rates.table[type][rank]);
  if(!p)return null;total+=p;parts.push(rank)}
 return{total,label:"ランク"+parts.join("→")+" 自動"}}
function roomLines(c){return c.roomRows.filter(r=>r.type&&N(r.n)).map(r=>{
 const manual=N(r.rate)>0,auto=manual?null:autoRoomRate(c,r.type);
 const nights=c.co?Math.round((new Date(c.co)-new Date(c.ci))/864e5):1;
 const perRoom=manual?N(r.rate)*(nights||1):(auto?auto.total:0);
 return{...r,perRoom,auto,manual,amt:N(r.n)*perRoom}})}

const T=(name,got,want)=>console.log((got===want?"✓":"✗ FAIL")+` ${name}: ${got}`+(got===want?"":` (期待 ${want})`));

// ① 2泊・ランクA→B・自動
let c={ci:"2026-08-15",co:"2026-08-17",roomRows:[{type:"Superior Twin",n:"10",rate:""}]};
db.rates.cal["2026-08-16"]="B";
let l=roomLines(c)[0];
T("自動2泊(14960+12000)×10室", l.amt, 269600);
T("自動ラベル", l.auto.label, "ランクA→B 自動");

// ② 手動上書き
c.roomRows[0].rate="20000";
l=roomLines(c)[0];
T("手動20000×2泊×10室", l.amt, 400000);
T("手動フラグ", l.manual, true);

// ③ 案件側でランク上書き(1泊目をBに)
c.roomRows[0].rate="";
c.rankOv={"2026-08-15":"B"};
l=roomLines(c)[0];
T("ランク上書きB→B(12000×2)×10室", l.amt, 240000);
T("上書き後ラベル", l.auto.label, "ランクB→B 自動");

// ④ ランク未設定の泊があれば自動不可
c.rankOv={}; c.co="2026-08-19"; // 8/17,8/18 はカレンダー未設定
l=roomLines(c)[0];
T("未設定日を含む→自動なし", l.auto, null);
T("未設定日→金額0(手入力を促す)", l.amt, 0);

// ⑤ 日帰り(C/O=C/I)
c={ci:"2026-08-15",co:"2026-08-15",rankOv:{},roomRows:[{type:"Superior Twin",n:"2",rate:""}]};
l=roomLines(c)[0];
T("日帰り1泊分A(14960)×2室", l.amt, 29920);
