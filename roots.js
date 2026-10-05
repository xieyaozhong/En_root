const ROOT_URL="https://raw.githubusercontent.com/WithEnglishWeCan/generated-english-roots-list/master/english.roots.list.build.json";
let roots=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function normalize(data){
  const out=[];
  Object.entries(data||{}).forEach(([key,v])=>{
    const meanings=Array.isArray(v.meanings)?v.meanings.filter(Boolean):[];
    const examples=Array.isArray(v.examples)?v.examples.map(x=>String(x).replace(/\s+-\s+(?:\d+|hs)$/i,"").trim()).filter(Boolean):[];
    const joined=meanings.join(" / ");
    let type="root";
    if(/\(prefix\)/i.test(joined)) type="prefix";
    else if(/\(suffix\)/i.test(joined)) type="suffix";
    out.push({key,meanings:meanings.map(x=>String(x).replace(/\s*\((?:prefix|suffix)\)/gi,"").trim()),examples,type});
  });
  return out.sort((a,b)=>a.key.localeCompare(b.key));
}
function render(){
  const q=$("rootSearch").value.trim().toLowerCase(),type=$("rootType").value;
  const filtered=roots.filter(r=>{
    if(type!=="all"&&r.type!==type)return false;
    if(!q)return true;
    return r.key.toLowerCase().includes(q)||r.meanings.join(" ").toLowerCase().includes(q)||r.examples.join(" ").toLowerCase().includes(q);
  });
  $("shownCount").textContent="顯示 "+filtered.length.toLocaleString()+" / "+roots.length.toLocaleString()+" 組";
  const display=filtered.slice(0,240);
  $("atlasGrid").innerHTML=display.length?display.map(r=>`<article class="card rootCard"><div class="rootType">${esc(r.type.toUpperCase())}</div><div class="rootKey">${esc(r.key)}</div><div class="rootMeaning">${esc(r.meanings.join(" · ")||"—")}</div><div class="rootExamples">${r.examples.slice(0,8).map(x=>`<span title="例字">${esc(x)}</span>`).join("")}</div></article>`).join(""):`<div class="card atlasEmpty">沒有符合的字根</div>`;
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