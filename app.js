const DATA_URL="https://huggingface.co/datasets/kknono668/toeic-vocab-tw/resolve/main/data/toeic_vocabulary.json";
const MAX_WORDS=50000;
const ROOTS_DATA_URL="https://raw.githubusercontent.com/WithEnglishWeCan/generated-english-roots-list/master/english.roots.list.build.json";
const SUPPLEMENTAL_SOURCES=[
  {id:"TOEFL",label:"TOEFL 學術核心",url:"https://raw.githubusercontent.com/grhliu/wordtyper-vocabularies/main/vocabularies/toefl.json",tags:["TOEFL"],stars:5},
  {id:"GRE",label:"GRE 高階學術",url:"https://raw.githubusercontent.com/grhliu/wordtyper-vocabularies/main/vocabularies/gre.json",tags:["ACADEMIC","ADVANCED"],stars:4},
  {id:"SAT",label:"SAT 高階閱讀",url:"https://raw.githubusercontent.com/grhliu/wordtyper-vocabularies/main/vocabularies/sat.json",tags:["ACADEMIC","ADVANCED"],stars:4},
  {id:"GMAT",label:"GMAT 商學高階",url:"https://raw.githubusercontent.com/grhliu/wordtyper-vocabularies/main/vocabularies/gmat.json",tags:["ACADEMIC","ADVANCED"],stars:4},
  {id:"IELTS",label:"IELTS 學術核心",url:"https://raw.githubusercontent.com/grhliu/wordtyper-vocabularies/main/vocabularies/ielts_core.json",tags:["ACADEMIC","ADVANCED"],stars:4},
  {id:"IELTS+",label:"IELTS Advanced",url:"https://raw.githubusercontent.com/grhliu/wordtyper-vocabularies/main/vocabularies/ielts_advanced.json",tags:["ACADEMIC","ADVANCED"],stars:4}
];
let ROOTS=[
["trans","prefix","跨越、轉移"],["inter","prefix","在…之間"],["sub","prefix","在下、次級"],["super","prefix","在上、超越"],["pre","prefix","在前、預先"],["post","prefix","在後"],["re","prefix","再次、返回"],["de","prefix","向下、去除、離開"],["dis","prefix","分開、否定"],["pro","prefix","向前、支持"],["anti","prefix","反對、相反"],["multi","prefix","多"],["uni","prefix","一"],["bi","prefix","二、雙"],["tri","prefix","三"],["micro","prefix","小、微"],["macro","prefix","大、宏觀"],["auto","prefix","自己、自動"],["bene","prefix","好、善"],["mal","prefix","壞、不良"],["con","prefix","一起、共同"],["com","prefix","一起、共同"],["co","prefix","共同、一起"],["im","prefix","進入／不"],["in","prefix","進入／不"],["ex","prefix","向外、以前的"],
["spect","root","看"],["vis","root","看"],["vid","root","看"],["port","root","攜帶、運送"],["tract","root","拉、牽引"],["ject","root","投、丟"],["duct","root","引導"],["duc","root","引導"],["script","root","寫"],["scrib","root","寫"],["dict","root","說、宣告"],["voc","root","聲音、呼叫"],["aud","root","聽"],["cred","root","相信"],["form","root","形狀、形成"],["struct","root","建造"],["rupt","root","破裂"],["miss","root","送出"],["mit","root","送出"],["cess","root","走、前進"],["ceed","root","走、前進"],["cede","root","走、前進"],["fer","root","帶、承載"],["cept","root","拿、接受"],["capt","root","拿、抓"],["tain","root","握住、保持"],["ten","root","握住、延伸"],["pon","root","放置"],["pos","root","放置"],["stit","root","站立、設置"],["sta","root","站立"],["mot","root","移動"],["mov","root","移動"],["press","root","壓"],["gress","root","走、步行"],["grad","root","步、階級"],["curr","root","跑、流動"],["curs","root","跑、流動"],["pend","root","懸掛、衡量"],["pens","root","衡量、花費"],["fin","root","界限、結束"],["serv","root","服務、保存"],["manu","root","手"],["fact","root","做、製造"],["fect","root","做、造成"],["fic","root","做、製造"],["gen","root","出生、產生"],["log","root","話語、學科、推理"],["graph","root","寫、記錄"],["phon","root","聲音"],["chron","root","時間"],["tele","root","遠距"],["bio","root","生命"],["geo","root","土地、地球"],
["tion","suffix","名詞：動作／結果"],["sion","suffix","名詞：動作／結果"],["ment","suffix","名詞：結果／狀態"],["able","suffix","能夠…的"],["ible","suffix","能夠…的"],["ive","suffix","具有…性質的"],["ous","suffix","充滿…的"],["ity","suffix","名詞：性質／狀態"],["ance","suffix","名詞：狀態／行為"],["ence","suffix","名詞：狀態／行為"],["ize","suffix","使成為…"],["ify","suffix","使…化"],["ly","suffix","副詞：以…方式"]
].map(function(x){return{k:x[0],t:x[1],m:x[2]}});

const MEMORY={
"accommodate":"ac + com + mod：把東西「一起調整到合適模式」→ 容納。拼字記兩個 c、兩個 m。",
"reimburse":"re + im + burse（錢包）：把錢「放回錢包」→ 報銷、償還。",
"itinerary":"想像出差前拿到一張 itinerary，從第一站一路排到最後一站 → 行程表。",
"maintenance":"maintain + ance：維持這件事的狀態 → 維護、保養。",
"inventory":"想像倉庫拿 inventory 清單逐一盤點 → 庫存、存貨清單。",
"prerequisite":"pre（之前）+ requisite（必要的）→ 之前就必須具備 → 先決條件。",
"subsidiary":"sub（下面）→ 位於母公司下面的公司 → 子公司。",
"consecutive":"一個緊跟一個 → 連續的。",
"complimentary":"飯店「招待你」是一種好意 → complimentary 常是免費贈送的。",
"discrepancy":"想像帳目左右兩欄對不起來 → 差異、不一致。",
"feasible":"能真正做得到 = feasible，比 possible 更強調實務可行。",
"mandatory":"mand = 命令。被命令一定要做 → 強制的、必須的。",
"expedite":"聯想 ped = 腳，讓腳步更快 → 加速處理。",
"allocate":"想像把資源切成一格一格分派到不同位置 → 分配。",
"comply":"跟規則一起順著走 → 遵守。",
"procurement":"procure（取得）+ ment → 公司取得物資的流程 → 採購。",
"liability":"liable（負有責任）+ ity → 責任／負債。",
"warranty":"商品出問題時，廠商保證負責 → warranty = 保固。",
"premises":"商務英文常用複數 premises 指公司／營業場所。",
"vacancy":"vac = 空。空出來的職位或房間 → vacancy。",
"invoice":"invoice 是賣方開出的請款單；receipt 是付款後的收據。",
"postpone":"post（後）+ pone（放）→ 往後放 → 延後。",
"applicant":"apply 的人 → applicant；application 是申請本身。",
"payroll":"pay + roll（名冊）→ 要付薪水的人員名冊 → 薪資表。",
"acquisition":"acquire 取得 → acquisition 在商務語境常指收購。",
"revenue":"公司流進來的營收；expense 是流出去的費用。",
"forecast":"fore（前）+ cast（投射）→ 把資訊投射到未來 → 預測。",
"quotation":"quote 報價 + tion → 正式報價、報價單。",
"agenda":"會議開始前先看 agenda → 議程。",
"deadline":"最後一條不能跨過的線 → 截止期限。",
"subscription":"sub + script（寫）→ 寫名加入、持續訂閱 → 訂閱。",
"refund":"re（回）+ fund（資金）→ 資金退回 → 退款。",
"reschedule":"re（重新）+ schedule → 重新排時間。"
};

const F=[
["allocate","分配；配置","780-900","金融與會計","verb","The manager will allocate additional funds to the project."],
["applicant","申請人；應徵者","600-780","人力資源","noun","Each applicant must submit a resume by Friday."],
["attendance","出席；出席人數","600-780","會議與簡報","noun","Attendance at the annual meeting exceeded expectations."],
["complimentary","免費贈送的；讚美的","780-900","住宿與餐飲","adjective","Guests receive complimentary breakfast during their stay."],
["comply","遵守；依從","780-900","法務合規與安全","verb","All employees must comply with the safety regulations."],
["deadline","截止期限","400-600","辦公日常","noun","The project deadline has been moved to next Monday."],
["expedite","加速；促進","900+","採購與物流","verb","We will expedite the shipment to meet the customer's request."],
["forecast","預測；預報","600-780","金融與會計","noun","The sales forecast shows strong growth next quarter."],
["invoice","發票；請款單","600-780","金融與會計","noun","Please send the invoice to our accounting department."],
["inventory","庫存；存貨清單","600-780","採購與物流","noun","The store checks its inventory at the end of each month."],
["itinerary","行程表","780-900","旅遊與交通","noun","The travel itinerary includes three client visits."],
["maintenance","維護；保養","600-780","營運管理","noun","The elevator is closed for routine maintenance."],
["mandatory","強制的；必須的","780-900","法務合規與安全","adjective","Safety training is mandatory for all new employees."],
["negotiate","協商；談判","600-780","溝通互動","verb","The two companies will negotiate a new contract."],
["postpone","延期；延後","400-600","會議與簡報","verb","They decided to postpone the meeting until Thursday."],
["premises","營業場所；房產","780-900","物業與不動產","noun","Smoking is not permitted anywhere on the premises."],
["procurement","採購；取得","900+","採購與物流","noun","The procurement team is reviewing supplier proposals."],
["quotation","報價；引文","600-780","行銷與銷售","noun","We requested a quotation from three vendors."],
["reimburse","報銷；償還","780-900","金融與會計","verb","The company will reimburse your travel expenses."],
["revenue","營收；收入","600-780","金融與會計","noun","Online sales generated record revenue this year."],
["subscription","訂閱；訂購","600-780","行銷與銷售","noun","Your annual subscription will renew automatically."],
["vacancy","空缺；空房","600-780","人力資源","noun","The company posted a vacancy for a marketing specialist."],
["warranty","保固；保證","600-780","客戶服務","noun","The printer comes with a two-year warranty."],
["acquisition","收購；取得","900+","金融與會計","noun","The acquisition will expand the company's market share."],
["subsidiary","子公司；附屬機構","900+","一般專業","noun","The firm opened a new subsidiary in Singapore."],
["feasible","可行的","780-900","營運管理","adjective","The engineers confirmed that the proposal is feasible."],
["discrepancy","差異；不一致","900+","金融與會計","noun","The auditor found a discrepancy in the expense report."],
["refund","退款；退還","400-600","客戶服務","noun","Customers may request a refund within fourteen days."],
["reschedule","重新安排時間","400-600","會議與簡報","verb","We need to reschedule the appointment for next week."],
["brochure","宣傳小冊；手冊","400-600","行銷與銷售","noun","The brochure describes all of the hotel's facilities."]
].map(function(x,i){return{english_word:x[0],chinese_definition:x[1],toeic_score_range:x[2],category:x[3],parts_of_speech:[x[4]],star_rating:i<8?5:4,examples:[{english:x[5],chinese:""}],word_forms:[]}});

let words=[],session=[],idx=0,correct=0,wrong=[],rootsSeen=new Set(),state=loadState();
function $(id){return document.getElementById(id)}
function shuffle(a){return a.slice().sort(function(){return Math.random()-.5})}
function sample(a){return a[Math.floor(Math.random()*a.length)]}
function weighted(a){const bag=[];a.forEach(function(w){const n=Math.max(1,Math.min(5,Number(w.star_rating)||3));for(let i=0;i<n;i++)bag.push(w)});return sample(bag.length?bag:a)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]})}
function loadState(){try{const s=Object.assign({hard:{},seen:{},sessions:0,total:0,correct:0,pullTickets:[]},JSON.parse(localStorage.getItem("enroot_state")||"{}"));if(!Array.isArray(s.pullTickets))s.pullTickets=[];return s}catch(e){return{hard:{},seen:{},sessions:0,total:0,correct:0,pullTickets:[]}}}
function save(){localStorage.setItem("enroot_state",JSON.stringify(state));header()}
function header(){$("hardPill").textContent="生難字 "+Object.keys(state.hard||{}).length;if($("pullPill"))$("pullPill").textContent="抽卡券 "+(state.pullTickets||[]).length;$("sessions").textContent=state.sessions||0;$("accuracy").textContent=state.total?Math.round(state.correct/state.total*100)+"%":"—";$("mastered").textContent=Object.values(state.seen||{}).filter(function(v){return v>=2}).length}
function normalize(data){return data.filter(function(w){return w&&w.english_word&&w.chinese_definition}).sort(function(a,b){return (Number(b.star_rating)||0)-(Number(a.star_rating)||0)}).slice(0,MAX_WORDS).map(function(w){w.english_word=String(w.english_word).trim();w.chinese_definition=String(w.chinese_definition).trim();w.parts_of_speech=Array.isArray(w.parts_of_speech)?w.parts_of_speech:[];w.examples=Array.isArray(w.examples)?w.examples:[];w.star_rating=Number(w.star_rating)||3;w.exam_tags=Array.from(new Set([].concat(w.exam_tags||[],["TOEIC"])));w.source_label=w.source_label||"TOEIC";return w})}
function normalizeSupplement(data,source){const list=data&&Array.isArray(data.words)?data.words:[];return list.filter(function(w){return w&&w.word&&Array.isArray(w.translations)&&w.translations.length}).map(function(w){const defs=w.translations.filter(Boolean).join("；");const pos=[];(w.translations||[]).forEach(function(t){const m=String(t).match(/^([a-z]+)\./i);if(!m)return;const p=m[1].toLowerCase();if(["n"].includes(p))pos.push("noun");else if(["v","vt","vi"].includes(p))pos.push("verb");else if(["a","adj"].includes(p))pos.push("adjective");else if(["ad","adv"].includes(p))pos.push("adverb")});return{english_word:String(w.word).trim(),chinese_definition:defs,phonetic:w.phonetic||"",toeic_score_range:"",category:source.label,parts_of_speech:Array.from(new Set(pos)),star_rating:source.stars||4,examples:[],word_forms:[],exam_tags:source.tags.slice(),source_label:source.id}})}
function normalizeRootAtlas(data){const out=[],zh=window.ENROOT_ROOT_ZH||{curated:{},gloss:{}};Object.entries(data||{}).forEach(function(entry){const raw=String(entry[0]||"").toLowerCase().trim(),v=entry[1]||{};if(!raw)return;const meanings=Array.isArray(v.meanings)?v.meanings.filter(Boolean).map(function(x){return String(x).replace(/\s*\((?:prefix|suffix)\)/gi,"").trim()}):[];const examples=Array.isArray(v.examples)?v.examples.map(function(x){return String(x).replace(/\s+-\s+(?:\d+|hs)$/i,"").trim().toLowerCase()}).filter(Boolean):[];const mt=(v.meanings||[]).join(" / ");let t="root";if(/\(prefix\)/i.test(mt))t="prefix";else if(/\(suffix\)/i.test(mt))t="suffix";raw.split("/").map(function(x){return x.trim()}).filter(Boolean).forEach(function(k){const ck=k.replace(/-/g,"").toLowerCase(),cur=zh.curated&&zh.curated[ck],tm=meanings.map(function(m){return zh.gloss&&zh.gloss[m.toLowerCase()]||""}).filter(Boolean);out.push({k:k,t:t,m:cur&&cur.zh?cur.zh:(Array.from(new Set(tm)).join("、")||meanings.join("、")||"字根概念"),e:examples,atlas:true})})});return out}
function mergeRoots(extra){const map=new Map();ROOTS.forEach(function(r){map.set(r.k+"|"+r.t,r)});extra.forEach(function(r){const key=r.k+"|"+r.t;if(!map.has(key))map.set(key,r)});ROOTS=Array.from(map.values())}
function mergeGroups(groups){const map=new Map();groups.forEach(function(group){group.forEach(function(w){const key=String(w.english_word||"").toLowerCase().trim();if(!key)return;if(!map.has(key)){map.set(key,w);return}const old=map.get(key);old.exam_tags=Array.from(new Set([].concat(old.exam_tags||[],w.exam_tags||[])));if(!old.phonetic&&w.phonetic)old.phonetic=w.phonetic;if((!old.chinese_definition||old.chinese_definition.length<3)&&w.chinese_definition)old.chinese_definition=w.chinese_definition})});return Array.from(map.values())}
async function init(){header();const groups=[],loaded=[];let rootAtlasLoaded=false;try{const base=await fetch(DATA_URL,{cache:"force-cache"});if(!base.ok)throw new Error("toeic");const toeic=normalize(await base.json());if(toeic.length<1000)throw new Error("toeic-short");groups.push(toeic);loaded.push("TOEIC "+toeic.length.toLocaleString())}catch(e){const fallback=normalize(F);groups.push(fallback);loaded.push("TOEIC 離線示範")}
const supplemental=await Promise.allSettled(SUPPLEMENTAL_SOURCES.map(async function(source){const r=await fetch(source.url,{cache:"force-cache"});if(!r.ok)throw new Error(source.id);const data=await r.json();return{source:source,words:normalizeSupplement(data,source)}}));
supplemental.forEach(function(r){if(r.status==="fulfilled"&&r.value.words.length){groups.push(r.value.words);loaded.push(r.value.source.id+" "+r.value.words.length.toLocaleString())}});
try{const rr=await fetch(ROOTS_DATA_URL,{cache:"force-cache"});if(rr.ok){mergeRoots(normalizeRootAtlas(await rr.json()));rootAtlasLoaded=true}}catch(e){}
words=mergeGroups(groups);$("bankPill").textContent=words.length.toLocaleString()+" 詞 · "+ROOTS.length.toLocaleString()+" 字根";$("status").textContent="已載入 "+words.length.toLocaleString()+" 個去重詞條｜"+ROOTS.length.toLocaleString()+" 組字根"+(rootAtlasLoaded?"｜完整字根地圖已啟用":"｜使用內建核心字根")+"｜"+loaded.join(" · ");$("start").disabled=false;$("start").textContent="開始 10 題";syncExamUI()}
function roots(word){const s=word.toLowerCase(),out=[];ROOTS.forEach(function(r){let hit=false;const direct=Array.isArray(r.e)&&r.e.indexOf(s)>=0;if(direct)hit=true;else if(r.t==="prefix")hit=r.k.length>=2&&s.startsWith(r.k)&&s.length>r.k.length+2;else if(r.t==="suffix")hit=r.k.length>=2&&s.endsWith(r.k)&&s.length>r.k.length+2;else hit=r.k.length>=4&&s.indexOf(r.k)>=0;if(hit&&!out.some(function(x){return x.k===r.k}))out.push(r)});return out.sort(function(a,b){const ae=a.atlas?0:1,be=b.atlas?0:1;if(ae!==be)return be-ae;return b.k.length-a.k.length}).slice(0,4)}
function formula(word,rs){return rs.length?rs.map(function(r){return r.k+"（"+r.m+"）"}).join(" + ")+" → "+word:"這個字不適合硬拆字根，改用「情境＋例句＋發音」建立記憶。"}
function mnemonic(w,rs){const k=w.english_word.toLowerCase();if(MEMORY[k])return MEMORY[k];if(rs.length)return"先抓住「"+rs.map(function(r){return r.m.split("、")[0]}).join("＋")+"」的畫面，再連到「"+w.chinese_definition.split(/[；，,]/)[0]+"」。看到 "+rs.map(function(r){return r.k}).join(" / ")+" 時先回想核心意思。";return"把「"+w.english_word+"」和考試情境「"+(w.category||"學術／工作場合")+"」綁在一起，朗讀或默念兩次，再遮住中文回想意思。"}
function family(root,current){if(!root)return[];return shuffle(words.filter(function(w){return w.english_word.toLowerCase()!==current.toLowerCase()&&w.english_word.toLowerCase().indexOf(root.k)>=0})).slice(0,6).map(function(w){return w.english_word})}
function examMatch(w,exam){const tags=w.exam_tags||[];if(exam==="toeic")return tags.indexOf("TOEIC")>=0;if(exam==="toefl")return tags.indexOf("TOEFL")>=0||tags.indexOf("ACADEMIC")>=0;if(exam==="advanced")return tags.indexOf("ADVANCED")>=0;return true}
function getPool(mode,band){const exam=$("exam")?$("exam").value:"dual";let p=words.filter(function(w){return examMatch(w,exam)});if(exam==="toeic"&&band!=="all")p=p.filter(function(w){return w.toeic_score_range===band});if(mode==="hard"){const keys=new Set(Object.keys(state.hard||{}));p=p.filter(function(w){return keys.has(w.english_word.toLowerCase())})}if(mode==="root")p=p.filter(function(w){return roots(w.english_word).length});return p}
function choose(mode,band){let p=getPool(mode,band);if(p.length<10&&band!=="all")p=getPool(mode,"all");if(p.length<10&&mode==="hard"){alert("生難字還不到 10 個，先做綜合練習累積錯題。");$("mode").value="mixed";p=getPool("mixed",band)}if(p.length<10)p=words;const out=[],used=new Set();while(out.length<10&&used.size<p.length){const w=weighted(p),k=w.english_word.toLowerCase();if(!used.has(k)){used.add(k);out.push(w)}}return out}
function distract(w,kind){let p=words.filter(function(x){return x.english_word!==w.english_word});if(w.category){const same=p.filter(function(x){return x.category===w.category});if(same.length>20)p=same}return shuffle(p).slice(0,3).map(function(x){return kind==="word"?x.english_word:x.chinese_definition})}
function context(w){const ex=(w.examples||[]).find(function(e){return e&&e.english});if(!ex)return null;const lower=ex.english.toLowerCase(),target=w.english_word.toLowerCase(),at=lower.indexOf(target);if(at<0)return null;return{text:ex.english.slice(0,at)+"_____"+ex.english.slice(at+w.english_word.length),translation:ex.chinese||""}}
function makeQ(w,i,mode){const rs=roots(w.english_word);let type="meaning";if(mode==="root"&&rs.length)type=i%2===0?"root":"meaning";else if(mode==="mixed"){if(i%3===1&&rs.length)type="root";else if(i%3===2&&context(w))type="context"}if(type==="root"){const target=rs[0],other=shuffle(ROOTS.filter(function(r){return r.k!==target.k&&r.t===target.t})).slice(0,3);return{w:w,type:type,rs:rs,prompt:w.english_word,sub:"字根／字首「"+target.k+"」最接近哪個核心意思？",options:shuffle([target].concat(other)).map(function(r){return{label:r.m,ok:r.k===target.k}})}}if(type==="context"){const c=context(w);if(c)return{w:w,type:type,rs:rs,prompt:c.text,sub:"選出最適合放入空格的單字。"+(c.translation?"｜"+c.translation:""),options:shuffle([w.english_word].concat(distract(w,"word"))).map(function(x){return{label:x,ok:x===w.english_word}})}}return{w:w,type:"meaning",rs:rs,prompt:w.english_word,sub:"選出最符合目前考試詞庫語境的中文意思。",options:shuffle([w.chinese_definition].concat(distract(w,"meaning"))).map(function(x){return{label:x,ok:x===w.chinese_definition}})}}
function syncExamUI(){if(!$("exam"))return;const toeic=$("exam").value==="toeic";$("band").disabled=!toeic;if(!toeic)$("band").value="all";const label=$("bandLabel");if(label){label.childNodes[0].nodeValue=toeic?"TOEIC 目標區間":"難度分層（所選詞庫自動）"}}
function start(){const mode=$("mode").value,band=$("band").value;session=choose(mode,band).map(function(w,i){return makeQ(w,i,mode)});idx=0;correct=0;wrong=[];rootsSeen=new Set();$("home").classList.add("hidden");$("result").classList.add("hidden");$("quiz").classList.remove("hidden");render()}
function render(){const q=session[idx];$("qnum").textContent=(idx+1)+" / 10";$("bar").style.width=(idx/10*100)+"%";$("score").textContent=correct+" 分";$("qtype").textContent=q.type==="meaning"?"MEANING · 字義":q.type==="root"?"ROOT · 字根":"CONTEXT · 情境";const n=Math.max(1,Math.min(5,q.w.star_rating||3));$("stars").textContent="★".repeat(n)+"☆".repeat(5-n);$("prompt").textContent=q.prompt;$("sub").textContent=q.sub;$("answers").innerHTML="";$("explain").classList.add("hidden");q.options.forEach(function(o,i){const b=document.createElement("button");b.className="answer";b.textContent=String.fromCharCode(65+i)+". "+o.label;b.onclick=function(){answer(i)};$("answers").appendChild(b)})}
function answer(i){const q=session[idx],buttons=[].slice.call(document.querySelectorAll(".answer")),choice=q.options[i];buttons.forEach(function(b,j){b.disabled=true;if(q.options[j].ok)b.classList.add("good");else if(j===i)b.classList.add("bad")});const key=q.w.english_word.toLowerCase();state.total=(state.total||0)+1;state.seen[key]=(state.seen[key]||0)+(choice.ok?1:0);if(choice.ok){correct++;state.correct=(state.correct||0)+1}else{state.hard[key]=q.w.chinese_definition;wrong.push(q.w)}q.rs.forEach(function(r){rootsSeen.add(r.k)});save();explain(q,choice.ok);$("score").textContent=correct+" 分"}
function explain(q,ok){const w=q.w,rs=q.rs,main=rs.find(function(r){return r.t==="root"})||rs[0],fam=family(main,w.english_word),ex=(w.examples||[]).find(function(e){return e&&e.english}),isHard=!!state.hard[w.english_word.toLowerCase()];let h="<h4>"+(ok?"✓ 答對了":"需要再連一次")+"</h4><div class='wordline'><strong>"+esc(w.english_word)+"</strong><span class='tag'>"+esc((w.parts_of_speech||[]).join(" / ")||"word")+"</span><span class='tag'>"+esc(w.category||"TOEIC")+"</span></div><div style='margin-top:7px;color:#d5e5f3'>"+esc(w.chinese_definition)+"</div>";if(rs.length)h+="<div class='rootchips'>"+rs.map(function(r){return"<span class='rootchip'><b>"+esc(r.k)+"</b> · "+esc(r.m)+"</span>"}).join("")+"</div>";h+="<div class='formula'>"+esc(formula(w.english_word,rs))+"</div><div class='memory'>記憶法："+esc(mnemonic(w,rs))+"</div>";if(ex)h+="<div class='example'><b>例句</b> "+esc(ex.english)+(ex.chinese?"<br><span class='muted'>"+esc(ex.chinese)+"</span>":"")+"</div>";if(fam.length)h+="<div style='margin-top:12px;color:var(--muted);font-size:12px'>同根連結</div><div class='family'>"+fam.map(function(x){return"<span>"+esc(x)+"</span>"}).join("")+"</div>";h+="<div class='actions'><button class='secondary hard "+(isHard?"on":"")+"' id='toggleHard'>"+(isHard?"★ 已在生難字本":"☆ 加入生難字")+"</button><button class='primary' id='next'>"+(idx===9?"看本回合結果":"下一題")+"</button></div>";$("explain").innerHTML=h;$("explain").classList.remove("hidden");$("toggleHard").onclick=function(){toggleHard(w)};$("next").onclick=next}
function toggleHard(w){const k=w.english_word.toLowerCase();if(state.hard[k])delete state.hard[k];else state.hard[k]=w.chinese_definition;save();const b=$("toggleHard");b.classList.toggle("on",!!state.hard[k]);b.textContent=state.hard[k]?"★ 已在生難字本":"☆ 加入生難字"}
function next(){if(idx<9){idx++;render()}else finish()}
function rarityLabel(r){return{UR:"神話",SSR:"傳奇",SR:"超稀有",R:"稀有",N:"普通"}[r]||r}
function cardCollection(){try{return JSON.parse(localStorage.getItem("enroot_cards")||"{}")}catch(e){return{}}}
function saveCardCollection(c){localStorage.setItem("enroot_cards",JSON.stringify(c))}
function rollRarity(score){
 const r=Math.random()*100;
 let rates=score>=10?[5,10,20,30]:score>=8?[3,8,17,29]:score>=5?[2,6,13,27]:[1,4,10,25];
 if(r<rates[0])return"UR";
 if(r<rates[1])return"SSR";
 if(r<rates[2])return"SR";
 if(r<rates[3])return"R";
 return"N";
}
function pickCard(rarity){
 const all=window.ENROOT_CARDS||[],pool=all.filter(function(c){return c.rarity===rarity});
 if(pool.length)return sample(pool);
 const fallback=all.filter(function(c){return c.rarity==="N"});
 return sample(fallback.length?fallback:all);
}
function syncGacha(){
 if(!$("drawCard"))return;
 const n=(state.pullTickets||[]).length;
 $("drawCard").disabled=n<1;
 $("drawCard").textContent=n?"🎴 抽一張單字卡 · 剩 "+n+" 次":"本回合抽卡完成";
}
let drawingCard=false;
function withCardStorageLock(action){
 return navigator.locks&&typeof navigator.locks.request==="function"?navigator.locks.request("enroot-dungeon-storage",{mode:"exclusive"},action):Promise.resolve().then(action);
}
async function drawCard(){
 if(drawingCard||!state.pullTickets||!state.pullTickets.length)return;
 drawingCard=true;
 let drawn;
 try{
   drawn=await withCardStorageLock(function(){
     const stateRaw=localStorage.getItem("enroot_state");if(stateRaw===null){state=loadState();return null;}const latest=JSON.parse(stateRaw);
     if(!latest||typeof latest!=="object"||Array.isArray(latest)||!Array.isArray(latest.pullTickets))throw new Error("invalid learning state");
     if(!latest.pullTickets.length){state=latest;return null;}
     const score=Number(latest.pullTickets[0])||0,rarity=rollRarity(score),card=pickCard(rarity);
     if(!card)throw new Error("no card available");
     const before=localStorage.getItem("enroot_cards"),col=JSON.parse(before||"{}");
     if(!col||typeof col!=="object"||Array.isArray(col)||Object.values(col).some(function(item){return!item||typeof item!=="object"||!Number.isSafeInteger(item.count)||item.count<0}))throw new Error("invalid collection");
     const old=Object.assign({},col[card.word]||{count:0,first:new Date().toISOString()});
     old.count+=1;if(!Number.isSafeInteger(old.count))throw new Error("collection full");
     old.last=new Date().toISOString();old.rarity=card.rarity;col[card.word]=old;
     const after=JSON.stringify(col);latest.pullTickets.shift();
     localStorage.setItem("enroot_cards",after);
     try{localStorage.setItem("enroot_state",JSON.stringify(latest));}
     catch(error){
       if(localStorage.getItem("enroot_cards")===after){if(before===null)localStorage.removeItem("enroot_cards");else localStorage.setItem("enroot_cards",before);}
       throw error;
     }
     state=latest;return{card:card,rarity:rarity};
   });
 }catch(error){
   drawingCard=false;syncGacha();const reveal=$("gachaReveal");reveal.classList.remove("hidden");reveal.textContent="目前無法儲存抽卡結果，抽卡券已保留。請確認瀏覽器允許儲存資料後再試一次。";return;
 }
 if(!drawn){drawingCard=false;header();syncGacha();return;}
 const card=drawn.card,rarity=drawn.rarity;header();
 const reveal=$("gachaReveal"),btn=$("drawCard");
 btn.disabled=true;btn.textContent="✦ 詞源召喚中…";
 reveal.classList.remove("hidden","pop");
 reveal.innerHTML="<div class='ritualStage'><div class='ritualRunes'><i>ROOT</i><i>WORD</i><i>MEMORY</i><i>ORIGIN</i></div><div class='ritualPortal'></div><div class='ritualCardBack'><span>ER</span></div><div class='ritualText'>正在從詞源圖鑑召喚單字卡…</div></div>";
 setTimeout(function(){
   const stage=reveal.querySelector(".ritualStage");if(stage){stage.classList.add("rare-"+card.rarity.toLowerCase());const t=stage.querySelector(".ritualText");if(t)t.textContent=card.rarity+" · "+rarityLabel(card.rarity)+" 能量出現";}
 },650);
 setTimeout(function(){
   const art=window.ENROOT_PIXEL_ART?window.ENROOT_PIXEL_ART(card,"large"):"";
   const cue=window.ENROOT_PIXEL_CUE?window.ENROOT_PIXEL_CUE(card):card.tag;
   reveal.innerHTML="<div class='revealBurst "+esc(card.rarity)+"'><div class='rarity'>"+esc(card.rarity)+" · "+esc(rarityLabel(card.rarity))+"</div><div class='pixelArtWrap revealArt'>"+art+"</div><div class='visualCue strong'>像素記憶 · "+esc(cue)+"</div><div class='relicWord'>"+esc(card.word)+"</div><div class='relicZh'>"+esc(card.zh)+"</div><div class='originMini'>"+esc(card.origin)+"</div><div class='storyBlock'><b>構詞線索</b><p>"+esc(card.root)+"</p><b>起源故事</b><p>"+esc(card.story)+"</p></div><div class='actions'><a class='secondary navlink' href='cards.html'>打開卡片圖鑑</a></div></div>";
   reveal.classList.remove("pop");void reveal.offsetWidth;reveal.classList.add("pop");drawingCard=false;syncGacha();
 },1550);
}
function finish(){state.sessions=(state.sessions||0)+1;state.pullTickets=(state.pullTickets||[]);state.pullTickets.push(correct);save();$("quiz").classList.add("hidden");$("result").classList.remove("hidden");$("final").textContent=correct+"/10";$("rc").textContent=correct;$("rw").textContent=10-correct;$("rr").textContent=rootsSeen.size;$("note").textContent=correct>=9?"很穩，下一輪可以提高分數帶或改成字根強化。":correct>=7?"基礎已成形，把錯的幾個字再用字根連一次。":"先不要追求量，優先把本回合錯題的字根畫面記住。";const uniq=[];const seen=new Set();wrong.forEach(function(w){if(!seen.has(w.english_word)){seen.add(w.english_word);uniq.push(w)}});$("review").innerHTML=uniq.length?"<h4>本回合生難字</h4>"+uniq.map(function(w){const rs=roots(w.english_word);return"<div class='reviewItem'><b>"+esc(w.english_word)+"</b><p>"+esc(w.chinese_definition)+"<br>"+esc(formula(w.english_word,rs))+"<br>記憶法："+esc(mnemonic(w,rs))+"</p></div>"}).join(""):"<div class='reviewItem'><b>本回合沒有錯題</b><p>可以直接挑戰更高分數帶。</p></div>";$("gachaReveal").classList.add("hidden");$("gachaReveal").innerHTML="";syncGacha()}
function home(){$("quiz").classList.add("hidden");$("result").classList.add("hidden");$("home").classList.remove("hidden");header()}
$("start").onclick=start;$("again").onclick=start;$("back").onclick=home;$("drawCard").onclick=drawCard;$("exam").onchange=syncExamUI;$("hardReview").onclick=function(){$("mode").value="hard";home();start()};$("clear").onclick=async function(){if(confirm("要清除生難字、答題統計與熟悉度嗎？")){try{await withCardStorageLock(function(){localStorage.removeItem("enroot_state");localStorage.removeItem("enroot_cards");state=loadState()});header();syncGacha()}catch(error){alert("目前無法清除資料，請確認瀏覽器允許儲存資料後再試一次。")}}};init();
