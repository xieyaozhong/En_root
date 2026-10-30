/* PixelLab -> Word Relic adapter. This file DOES NOT call PixelLab's paid API.
 * Accepts user-owned PixelLab PNG sheets + an explicit grid manifest.
 * No credentials, external image hosts, changes to collision, or save data.
 * No generated art is represented as an actual PixelLab output until imported. */
const SCHEMA='word-relic.pixellab.v1';
const DIRECTIONS=['east','south-east','south','south-west','west','north-west','north','north-east'];
const ACTIONS=new Set(['idle','walk','run','attack','cast','chant','dash','hurt','fallen','death']);
const MAX_CHARACTERS=28,MAX_ACTIONS=10,MAX_IMAGES=96;
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
const assetName=s=>typeof s==='string'&&s.length>0&&s.length<=220&&
  !s.startsWith('/')&&!s.includes('\\')&&!s.split('/').includes('..')&&!s.includes('?')&&!s.includes('#')&&!s.includes(':');
const pathOf=(base,path)=>{
  if(!assetName(path))throw new TypeError('Invalid local sprite path: '+path);
  const dest=new URL(path,base),site=new URL(base);
  if(dest.origin!==site.origin||!['https:','http:'].includes(dest.protocol))
    throw new TypeError('Sprite images must be same-origin local files');
  return dest;
};
const pos=n=>Number.isInteger(n)&&n>=1&&n<=512;
const primary=['idle','walk','run','cast','attack','chant','dash','hurt','fallen','death'];
let active=null,origin='none',loading=false,enabled=true,notice='尚未匯入 PixelLab 圖檔';
try{enabled=localStorage.getItem('dungeon_pixellab_enabled')!=='off';}catch(_){}

function validate(pack){
  if(!pack||pack.schema!==SCHEMA||!pack.characters||typeof pack.characters!=='object')
    throw new TypeError('Expected schema '+SCHEMA+' and characters mapping');
  const entries=Object.entries(pack.characters);
  if(!entries.length||entries.length>MAX_CHARACTERS)throw new RangeError('Provide 1–28 characters');
  let count=0;
  const characters=new Map();
  for(const [id,person] of entries){
    if(!/^[a-z][a-z0-9_-]{0,39}$/.test(id)||!person||!Array.isArray(person.cell)||
       person.cell.length!==2||!person.cell.every(pos))throw new TypeError('Invalid character ID or cell: '+id);
    const [w,h]=person.cell;
    const anchor=person.anchor||[w/2,h-6];
    if(!Array.isArray(anchor)||anchor.length!==2||anchor.some(n=>!finite(n)||n<0||n>512))
      throw new TypeError('Invalid foot anchor for '+id);
    const scale=person.scale??1;
    if(!finite(scale)||scale<=0||scale>4)throw new TypeError('Invalid world scale for '+id);
    const actions=Object.entries(person.actions||{});
    if(!actions.length||actions.length>MAX_ACTIONS)throw new TypeError('Missing action clips for '+id);
    const clips=new Map();
    for(const [key,record] of actions){
      if(!ACTIONS.has(key)||!record||!assetName(record.sheet))throw new TypeError('Invalid animation '+id+'/'+key);
      const frames=record.frames,columns=record.columns??frames,fps=record.fps??8;
      if(!Number.isInteger(frames)||frames<1||frames>64||!Number.isInteger(columns)||columns<1||columns>64||
         !finite(fps)||fps<=0||fps>60)throw new TypeError('Invalid grid/timing for '+id+'/'+key);
      const directions=record.directions||person.directions||['south'];
      if(!Array.isArray(directions)||directions.length<1||directions.length>8||
         new Set(directions).size!==directions.length||directions.some(d=>!DIRECTIONS.includes(d)))
        throw new TypeError('Invalid directions for '+id+'/'+key);
      if(record.directionRows!==undefined&&!Array.isArray(record.directionRows))
        throw new TypeError('directionRows must be an array');
      const directionRows=record.directionRows??directions.map((_,i)=>i);
      if(directionRows.length!==directions.length||directionRows.some(n=>!Number.isInteger(n)||n<0||n>64))
        throw new TypeError('Invalid direction row indices');
      const rowsPerDirection=Math.ceil(frames/columns);
      const minWidth=Math.min(32768,columns*w);
      const minHeight=Math.min(32768,(Math.max(...directionRows)+1)*rowsPerDirection*h);
      if(minWidth>8192||minHeight>8192)throw new RangeError('Atlas too large');
      clips.set(key,{key,sheet:record.sheet,frames,columns,fps,loop:record.loop!==false,
        directions,directionRows,rowsPerDirection,minWidth,minHeight,w,h,anchor,scale});
      count++;
      if(count>MAX_IMAGES)throw new RangeError('Sprite atlas count exceeds 96');
    }
    characters.set(id,clips);
  }
  return characters;
}
function keyForPose(pose,clips){
  const m=String(pose?.mode||'idle');
  const prefer=m==='walk'&&Number(pose?.speed)>225?['run','walk']:
    m==='cast'?['cast','attack','chant']:m==='chant'?['chant','cast','idle']:
    m==='fallen'?['fallen','death']:m==='hurt'?['hurt','idle']:
    m==='dash'?['dash','run','walk']:m==='walk'?['walk','run']:['idle'];
  return prefer.find(x=>clips.has(x))||'idle';
}
function directionFor(pose,clip){
  const x=Number(pose?.facingX),y=Number(pose?.facingY);
  if(!Number.isFinite(x)||!Number.isFinite(y)||(Math.abs(x)+Math.abs(y)<.001))
    return clip.directions.indexOf('south')>=0?clip.directions.indexOf('south'):0;
  const a=(Math.atan2(y,x)+Math.PI*2)%(Math.PI*2);
  let result=0,min=Infinity;
  for(let i=0;i<clip.directions.length;i++){
    const angle=DIRECTIONS.indexOf(clip.directions[i])*Math.PI/4;
    const delta=Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)));
    if(delta<min){min=delta;result=i;}
  }
  return result;
}
function frameFor(pose,clip){
  if(pose?.still)return 0;
  const mode=clip.key;
  let progress;
  if(mode==='walk'||mode==='run'){
    const phase=Number(pose?.phase)||0;
    progress=((phase/(Math.PI*2))%1+1)%1;
  }else if(['cast','attack','hurt','fallen','death'].includes(mode)){
    const p=Number(mode==='hurt'||mode==='fallen'||mode==='death'?pose?.hurtProgress:pose?.castProgress);
    progress=Number.isFinite(p)?clamp(p,0,1):0;
    return Math.min(clip.frames-1,Math.floor(progress*(clip.frames-1)+.0001));
  }else{
    const time=Math.max(0,Number(pose?.time)||0);
    progress=(time*clip.fps/clip.frames)%1;
  }
  return Math.min(clip.frames-1,Math.floor(progress*clip.frames));
}
function render(ctx,pose,id){
  if(!enabled||!active||!pose||!ctx)return false;
  const character=active.get(String(id||'').replace(/^npc-/,''));
  if(!character)return false;
  const key=keyForPose(pose,character);
  const item=character.get(key)||character.get('idle')||character.values().next().value;
  if(!item?.image)return false;
  const c=item,fi=frameFor(pose,c),di=directionFor(pose,c);
  const sx=(fi%c.columns)*c.w,sy=(c.directionRows[di]*c.rowsPerDirection+Math.floor(fi/c.columns))*c.h;
  ctx.save();
  try{
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(c.image,sx,sy,c.w,c.h,-c.anchor[0]*c.scale,-c.anchor[1]*c.scale,c.w*c.scale,c.h*c.scale);
  }finally{ctx.restore();}
  return true;
}
function status(){return{enabled,loaded:!!active,origin,notice,characters:active?[...active.keys()]:[]};}
function paint(){
  const statusEl=document.getElementById('pixellabStatus');
  if(statusEl)statusEl.textContent=notice;
  const btn=document.getElementById('pixelLabButton');
  if(btn){btn.title='PixelLab 美術素材包：'+notice;btn.dataset.loaded=active?'yes':'no';}
  const toggle=document.getElementById('pixellabToggle');
  if(toggle){toggle.textContent=enabled?'PixelLab 素材：啟用':'PixelLab 素材：停用';toggle.setAttribute('aria-pressed',String(enabled));}
}
function toggle(){
  enabled=!enabled;
  try{localStorage.setItem('dungeon_pixellab_enabled',enabled?'on':'off');}catch(_){}
  paint();return enabled;
}
async function decode(file,url){
  return await new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Cannot decode sprite sheet '+file));
    img.src=url;
  });
}
async function build(pack,fetchImage){
  const validated=validate(pack);
  const images=new Map(),candidate=new Map();
  for(const [id,clips] of validated){
    const next=new Map();
    for(const [action,c] of clips){
      let image=images.get(c.sheet);
      if(!image){image=await fetchImage(c.sheet);images.set(c.sheet,image);}
      if(image.width<c.minWidth||image.height<c.minHeight)
        throw new RangeError(id+'/'+action+' atlas '+c.sheet+' is too small, need at least '+c.minWidth+'×'+c.minHeight);
      next.set(action,{...c,image});
    }
    candidate.set(id,next);
  }
  return candidate;
}
/** Use same-origin assets committed in the game repository. */
async function loadPack(path='assets/dungeon/pixellab/pack.json'){
  if(loading)throw new Error('Another sprite pack is loading');
  loading=true;paint();
  try{
    const file=pathOf(document.baseURI,path),resp=await fetch(file.href,{cache:'no-cache'});
    if(!resp.ok)throw new Error('Asset manifest not found ('+resp.status+')');
    const pack=await resp.json();
    const compiled=await build(pack,p=>decode(p,pathOf(file.href,p).href));
    active=compiled;origin=pack.source||'pixellab-export';
    notice='已載入 '+compiled.size+' 個角色（'+origin+'），可在戰鬥中使用';
    paint();return status();
  }catch(error){notice='匯入失敗：'+String(error?.message||error);paint();throw error;}
  finally{loading=false;}
}
/** Local PNG/JSON import. No API key, server upload or browser storage.
 * PNGs remain in this tab only; publish PNG+JSON to GitHub for shared use. */
async function loadFiles(files){
  if(loading)throw new Error('Another sprite pack is loading');
  const list=[...files],metadata=list.filter(f=>f.name.toLowerCase().endsWith('.json'));
  if(metadata.length!==1)throw new TypeError('Select one pack.json and its PNG sprite sheets');
  if(list.length>98)throw new RangeError('Too many files');
  const json=JSON.parse(await metadata[0].text());
  const lookup=new Map();
  for(const f of list){
    if(!f.name.toLowerCase().endsWith('.png'))continue;
    if(f.size>16*1024*1024)throw new RangeError('Image too large: '+f.name);
    if(lookup.has(f.name))throw new TypeError('Duplicate filename: '+f.name);
    lookup.set(f.name,f);
  }
  loading=true;paint();
  try{
    const compiled=await build(json,async path=>{
      const basename=path.split('/').pop(),file=lookup.get(basename);
      if(!file)throw new Error('Missing PNG: '+basename);
      const url=URL.createObjectURL(file);
      try{return await decode(basename,url);}finally{URL.revokeObjectURL(url);}
    });
    active=compiled;origin=json.source||'local-pixellab-export';
    notice='已預覽 '+compiled.size+' 個角色，僅在目前分頁有效；若要永久部署需把圖檔放入 GitHub';
    paint();return status();
  }catch(error){notice='匯入失敗：'+String(error?.message||error);paint();throw error;}
  finally{loading=false;}
}
function setup(){
  const btn=document.getElementById('pixelLabButton'),
    panel=document.getElementById('pixellabDialog'),
    inp=document.getElementById('pixellabFiles'),
    close=document.getElementById('pixellabClose'),
    toggleEl=document.getElementById('pixellabToggle');
  btn?.addEventListener('click',()=>panel?.showModal());
  close?.addEventListener('click',()=>panel?.close());
  toggleEl?.addEventListener('click',toggle);
  inp?.addEventListener('change',async()=>{
    if(!inp.files?.length)return;
    try{await loadFiles(inp.files);}catch(error){/* paint() already exposes error */}
    inp.value='';
  });
  paint();
  // Repository manifest is optional. When it is absent, there are no paid API
  // calls; the old Forge/HD model is still fully available.
  fetch('assets/dungeon/pixellab/pack.json',{method:'HEAD',cache:'no-cache'})
    .then(r=>r.ok?loadPack():null).catch(()=>{});
}
if(typeof window!=='undefined'){
  window.DungeonPixelLab=Object.freeze({render,loadPack,loadFiles,toggle,status,validate});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
}
export {render,loadPack,loadFiles,toggle,status,validate,keyForPose,directionFor,frameFor};
