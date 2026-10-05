const ROOT_URL="https://raw.githubusercontent.com/WithEnglishWeCan/generated-english-roots-list/master/english.roots.list.build.json";
let roots=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const ZH=(window.ENROOT_ROOT_ZH||{curated:{},gloss:{}});
const WORD_ZH=(window.ENROOT_WORD_ZH||{});
function zhForRoot(key,meanings){
  const aliases=String(key||"").replace(/-/g,"").split(/[\/,]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
  for(const a of aliases){if(ZH.curated&&ZH.curated[a])return{zh:ZH.curated[a].zh,description:ZH.curated[a].description||"",origin:ZH.curated[a].origin||"",curated:true}}
  const translated=(meanings||[]).map(m=>ZH.gloss&&ZH.gloss[String(m).toLowerCase()]||"").filter(Boolean);
  return{zh:[...new Set(translated)].join("、"),description:"",origin:"",curated:false};
}
function normalize(data){
  const out=[];
  Object.entries(data||{}).forEach(([key,v])=>{
    const meanings=Array.isArray(v.meanings)?v.meanings.filter(Boolean):[];
    const examples=Array.isArray(v.examples)?v.examples.map(x=>String(x).replace(/\s+-\s+(?:\d+|hs)$/i,"").trim()).filter(Boolean):[];
    const joined=meanings.join(" / ");
    let type="root";
    if(/\(prefix\)/i.test(joined)) type="prefix";
    else if(/\(suffix\)/i.test(joined)) type="suffix";
    const cleanMeanings=meanings.map(x=>String(x).replace(/\s*\((?:prefix|suffix)\)/gi,"").trim());
    const zh=zhForRoot(key,cleanMeanings);
    out.push({key,meanings:cleanMeanings,examples,type,zh:zh.zh,description:zh.description,origin:zh.origin,curated:zh.curated});
  });
  return out.sort((a,b)=>a.key.localeCompare(b.key));
}
function render(){
  const q=$("rootSearch").value.trim().toLowerCase(),type=$("rootType").value;
  const filtered=roots.filter(r=>{
    if(type!=="all"&&r.type!==type)return false;
    if(!q)return true;
    return r.key.toLowerCase().includes(q)||r.meanings.join(" ").toLowerCase().includes(q)||String(r.zh||"").toLowerCase().includes(q)||String(r.description||"").toLowerCase().includes(q)||r.examples.join(" ").toLowerCase().includes(q)||r.examples.some(x=>String(WORD_ZH[String(x).toLowerCase()]||"").toLowerCase().includes(q));
  });
  $("shownCount").textContent="顯示 "+filtered.length.toLocaleString()+" / "+roots.length.toLocaleString()+" 組";
  const display=filtered.slice(0,240);
  $("atlasGrid").innerHTML=display.length?display.map(r=>`<article class="card rootCard"><div class="rootType">${esc(r.type.toUpperCase())}${r.origin?" · "+esc(r.origin):""}</div><div class="rootKey">${esc(r.key)}</div><div class="rootMeaning"><b>中文核心義</b><br>${esc(r.zh||"—")}<br><span class="muted">English · ${esc(r.meanings.join(" · ")||"—")}</span></div>${r.description?`<div class="example"><b>字源記憶</b> ${esc(r.description)}</div>`:""}<div class="rootExamples">${r.examples.slice(0,8).map(x=>{const zh=WORD_ZH[String(x).toLowerCase()]||"";return zh?`<span class="rootExample" title="例字"><b>${esc(x)}</b><small>${esc(zh)}</small></span>`:`<span class="rootExample hint" title="同根提示"><b>${esc(x)}</b><small>同根提示：${esc(r.zh||"相關字")}</small></span>`}).join("")}</div></article>`).join(""):`<div class="card atlasEmpty">沒有符合的字根</div>`;
}
async function init(){
  try{
    const r=await fetch(ROOT_URL,{cache:"force-cache"});
    if(!r.ok)throw new Error("load");
    roots=normalize(await r.json());
    $("atlasCount").textContent=roots.length.toLocaleString()+" 組字根";
    render();
  }catch(e){
    $("atlasCount").textContent="字根資料載入失敗";
    $("atlasGrid").innerHTML='<div class="card atlasEmpty">目前無法載入完整字根資料，請稍後重新整理。</div>';
  }
}
$("rootSearch").addEventListener("input",render);
$("rootType").addEventListener("change",render);
init();