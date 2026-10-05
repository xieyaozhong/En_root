const CARDS=window.ENROOT_CARDS||[];
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function collection(){try{return JSON.parse(localStorage.getItem("enroot_cards")||"{}")}catch(e){return{}}}
function rarityName(r){return{UR:"神話",SSR:"傳奇",SR:"超稀有",R:"稀有",N:"普通"}[r]||r}
function render(){
 const col=collection(),q=$("cardSearch").value.trim().toLowerCase(),rf=$("rarityFilter").value;
 const owned=CARDS.filter(c=>col[c.word]?.count>0);
 $("ownedPill").textContent=owned.length+" / "+CARDS.length;
 $("collectionStats").textContent="已解鎖 "+owned.length+" 張";
 $("totalCopies").textContent="共 "+Object.values(col).reduce((a,b)=>a+(b.count||0),0)+" 張";
 const list=CARDS.filter(c=>(rf==="all"||c.rarity===rf)&&(!q||[c.word,c.zh,c.root,c.story,c.tag].join(" ").toLowerCase().includes(q)));
 $("cardGrid").innerHTML=list.map(c=>{const n=col[c.word]?.count||0;return `<button class="relicCard ${c.rarity} ${n?"owned":"locked"}" data-word="${esc(c.word)}"><div class="rarity">${c.rarity} · ${rarityName(c.rarity)}</div><div class="pixelSprite"><i></i><b>${esc(c.word[0].toUpperCase())}</b></div><div class="relicWord">${n?esc(c.word):"??????"}</div><div class="relicZh">${n?esc(c.zh):"尚未解鎖"}</div><div class="cardTag">${esc(c.tag)}</div>${n?`<div class="copies">× ${n}</div>`:""}</button>`}).join("");
 document.querySelectorAll(".relicCard.owned").forEach(b=>b.onclick=()=>openCard(b.dataset.word));
}
function openCard(word){
 const c=CARDS.find(x=>x.word===word),col=collection(),n=col[word]?.count||0;if(!c||!n)return;
 $("cardDetail").innerHTML=`<div class="modalShade" data-close></div><article class="card detailPanel ${c.rarity}"><button class="modalClose" data-close>×</button><div class="rarity">${c.rarity} · ${rarityName(c.rarity)} · 已收藏 ${n} 張</div><div class="detailTop"><div class="pixelSprite big"><i></i><b>${esc(c.word[0].toUpperCase())}</b></div><div><h2>${esc(c.word)}</h2><div class="detailZh">${esc(c.zh)}</div><span class="tag">${esc(c.tag)}</span></div></div><div class="storyBlock"><b>起源</b><p>${esc(c.origin)}</p><b>語言路徑</b><p>${esc(c.route)}</p><b>構詞線索</b><p>${esc(c.root)}</p><b>單字故事</b><p>${esc(c.story)}</p></div></article>`;
 $("cardDetail").classList.remove("hidden");$("cardDetail").querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>$("cardDetail").classList.add("hidden"));
}
$("cardSearch").oninput=render;$("rarityFilter").onchange=render;render();