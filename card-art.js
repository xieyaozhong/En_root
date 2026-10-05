(function(){
const W={
  robot:"robot",quarantine:"shield",vaccine:"syringe",academy:"school",museum:"museum",candidate:"ballot",panic:"panic",disaster:"meteor",malaria:"mosquito",salary:"coins",alphabet:"letters",marathon:"runner",deadline:"clock",broadcast:"radio",companion:"friends",window:"window",enthusiasm:"flame",calculate:"calculator",school:"school",mortgage:"house",transport:"truck",inspect:"magnifier",predict:"crystal",portable:"suitcase",audience:"crowd",manual:"handbook",refund:"refund",postpone:"calendar",revenue:"coins",agenda:"checklist"
};
const C={
  robot:"機器人",shield:"防護盾牌",syringe:"注射器",school:"學院建築",museum:"博物館",ballot:"投票箱",panic:"驚嘆與恐慌",meteor:"墜落星體",mosquito:"蚊子",coins:"金幣與錢袋",letters:"字母積木",runner:"奔跑者",clock:"時鐘",radio:"廣播塔",friends:"兩位夥伴",window:"窗戶",flame:"熱情火焰",calculator:"計算器",house:"房屋",truck:"運輸貨車",magnifier:"放大鏡",crystal:"預言水晶球",suitcase:"手提箱",crowd:"人群",handbook:"手冊",refund:"退回金幣",calendar:"日曆",checklist:"待辦清單",phone:"電話",screen:"螢幕",microscope:"顯微鏡",dna:"DNA 雙股",globe:"地球",camera:"相機",rocket:"火箭",numbers:"數字與演算",computer:"電腦",network:"網路節點",satellite:"衛星",lightning:"閃電",flask:"實驗燒瓶",atom:"原子",leaf:"葉片",body:"人體輪廓",brain:"大腦",people:"社會人群",thinker:"思考者",experiment:"實驗假說",split:"拆解成部分",merge:"合併成整體",books:"書架",stage:"舞台",music:"音符",scroll:"歷史卷軸",book:"書本",speech:"說話氣泡",contract:"合約文件",receipt:"發票收據",bank:"銀行",card:"信用卡",handshake:"握手",building:"公司大樓",tower:"首都高塔",market:"市場攤位",cart:"購物車",shipout:"貨物出口",shipin:"貨物進口",recruit:"招募新成員",chat:"面談對話",persondoc:"申請文件",arrowup:"向上升遷",manager:"管理看板",boxes:"庫存箱",blueprint:"專案藍圖",chess:"策略棋局",meeting:"會議桌",bricks:"建造積木",chain:"中斷鏈條",volcano:"火山噴發",inbox:"提交箱",key:"通行許可",send:"向外發送",receive:"接收物件",hold:"握住保留",box:"容納盒",pin:"位置圖釘",stairs:"向前階梯"
};
const P={bg:"#0b1a2c",ink:"#07111f",mint:"#77e7bd",blue:"#82aaff",gold:"#ffd67e",pink:"#ff9de1",red:"#ff8490",white:"#f1f7ff",skin:"#ffc9a5",green:"#71e4a8",grey:"#94a9c0"};
const r=(x,y,w,h,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'"/>';
const q=(x,y,s,c)=>r(x,y,s,s,c);
const sceneMap={
  phone:()=>r(21,10,22,44,P.blue)+r(25,14,14,25,P.white)+r(29,45,6,4,P.ink),
  screen:()=>r(9,12,46,30,P.blue)+r(13,16,38,22,P.ink)+r(27,42,10,5,P.grey)+r(20,47,24,5,P.white),
  microscope:()=>r(29,8,8,24,P.blue)+r(35,8,12,7,P.white)+r(21,28,16,7,P.mint)+r(17,35,8,15,P.grey)+r(13,49,37,6,P.white),
  dna:()=>r(16,10,5,44,P.mint)+r(43,10,5,44,P.blue)+r(21,14,22,4,P.gold)+r(21,25,22,4,P.pink)+r(21,36,22,4,P.gold)+r(21,47,22,4,P.pink),
  globe:()=>r(14,10,36,36,P.blue)+r(19,14,10,8,P.green)+r(34,20,12,10,P.green)+r(21,31,13,10,P.green)+r(29,46,6,8,P.grey)+r(19,54,26,4,P.white),
  camera:()=>r(10,18,44,28,P.grey)+r(17,13,14,7,P.white)+r(23,24,18,18,P.blue)+r(28,29,8,8,P.ink)+r(45,22,5,5,P.red),
  rocket:()=>r(26,8,12,35,P.white)+r(22,19,20,16,P.blue)+r(27,12,10,8,P.red)+r(20,34,8,12,P.red)+r(36,34,8,12,P.red)+r(27,43,10,13,P.gold),
  numbers:()=>r(10,11,44,42,P.ink)+r(15,16,10,8,P.blue)+r(28,16,10,8,P.mint)+r(41,16,8,8,P.gold)+r(15,29,8,8,P.gold)+r(27,29,10,8,P.pink)+r(40,29,9,8,P.blue)+r(15,42,34,6,P.white),
  computer:()=>r(9,11,46,31,P.blue)+r(14,16,36,21,P.ink)+r(20,20,7,7,P.mint)+r(31,20,7,7,P.gold)+r(27,42,10,7,P.grey)+r(17,49,30,5,P.white),
  network:()=>r(10,11,10,10,P.blue)+r(44,11,10,10,P.mint)+r(27,27,10,10,P.gold)+r(10,43,10,10,P.pink)+r(44,43,10,10,P.blue)+r(18,18,10,4,P.white)+r(37,18,9,4,P.white)+r(18,43,11,4,P.white)+r(37,43,9,4,P.white),
  satellite:()=>r(28,24,8,16,P.white)+r(8,20,20,24,P.blue)+r(36,20,20,24,P.blue)+r(22,12,20,10,P.gold)+r(30,40,4,13,P.grey),
  lightning:()=>r(29,7,16,20,P.gold)+r(22,25,18,8,P.gold)+r(19,31,13,25,P.gold)+r(10,48,8,8,P.blue)+r(46,13,7,7,P.mint),
  flask:()=>r(26,8,12,20,P.white)+r(18,27,28,27,P.blue)+r(22,35,20,15,P.mint)+r(14,50,6,6,P.gold)+r(45,42,7,7,P.pink),
  atom:()=>r(28,28,8,8,P.gold)+r(8,29,48,6,P.blue)+r(29,8,6,48,P.mint)+r(14,14,8,8,P.pink)+r(42,42,8,8,P.pink),
  leaf:()=>r(13,15,38,30,P.green)+r(31,21,5,33,P.mint)+r(20,27,12,4,P.mint)+r(34,36,11,4,P.mint),
  body:()=>r(27,8,10,10,P.skin)+r(22,19,20,22,P.blue)+r(14,22,8,23,P.skin)+r(42,22,8,23,P.skin)+r(24,41,7,15,P.grey)+r(33,41,7,15,P.grey),
  brain:()=>r(16,14,32,30,P.pink)+r(12,21,10,18,P.pink)+r(42,21,10,18,P.pink)+r(22,10,10,8,P.pink)+r(32,10,10,8,P.pink)+r(30,16,4,27,P.ink),
  people:()=>r(10,14,10,10,P.skin)+r(27,10,10,10,P.skin)+r(44,14,10,10,P.skin)+r(8,25,14,24,P.blue)+r(25,21,14,28,P.mint)+r(42,25,14,24,P.gold),
  ballot:()=>r(11,27,42,27,P.blue)+r(19,14,26,18,P.white)+r(24,18,16,4,P.ink)+r(27,37,10,5,P.ink),
  thinker:()=>r(21,12,12,12,P.skin)+r(17,24,20,25,P.blue)+r(37,22,10,6,P.skin)+r(43,16,6,6,P.gold)+r(49,10,6,6,P.gold),
  experiment:()=>r(12,33,40,20,P.grey)+r(17,12,12,30,P.white)+r(34,15,12,27,P.white)+r(19,28,8,11,P.mint)+r(36,27,8,12,P.pink),
  split:()=>r(10,13,17,38,P.blue)+r(37,13,17,38,P.mint)+r(28,20,8,5,P.white)+r(28,39,8,5,P.white),
  merge:()=>r(8,13,15,18,P.blue)+r(41,13,15,18,P.mint)+r(25,34,14,18,P.gold)+r(19,27,26,5,P.white),
  books:()=>r(10,12,44,9,P.blue)+r(13,24,38,9,P.mint)+r(9,36,46,9,P.gold)+r(15,48,35,8,P.pink),
  stage:()=>r(8,12,48,8,P.red)+r(10,20,10,34,P.pink)+r(44,20,10,34,P.pink)+r(20,38,24,16,P.gold)+r(25,30,14,8,P.skin),
  music:()=>r(21,12,7,31,P.blue)+r(28,12,18,6,P.blue)+r(39,18,7,26,P.blue)+r(13,39,15,12,P.gold)+r(31,39,15,12,P.pink),
  scroll:()=>r(12,11,40,42,P.gold)+r(17,17,30,5,P.ink)+r(17,27,25,4,P.ink)+r(17,36,28,4,P.ink)+r(8,8,10,48,P.white)+r(46,8,10,48,P.white),
  book:()=>r(7,14,24,38,P.blue)+r(33,14,24,38,P.mint)+r(29,14,6,38,P.white)+r(12,21,13,4,P.white)+r(39,21,13,4,P.white),
  speech:()=>r(9,12,46,31,P.white)+r(16,43,10,9,P.white)+r(16,20,8,5,P.blue)+r(28,20,8,5,P.mint)+r(40,20,8,5,P.gold),
  contract:()=>r(14,8,36,48,P.white)+r(20,16,24,4,P.ink)+r(20,26,20,4,P.grey)+r(20,36,14,4,P.grey)+r(35,43,11,7,P.blue),
  receipt:()=>r(18,7,28,50,P.white)+r(22,15,20,4,P.ink)+r(22,24,16,4,P.grey)+r(22,33,20,4,P.grey)+r(28,45,12,5,P.gold),
  bank:()=>r(8,20,48,7,P.white)+r(13,27,7,23,P.blue)+r(26,27,7,23,P.blue)+r(39,27,7,23,P.blue)+r(8,50,48,7,P.white)+r(14,11,36,8,P.gold),
  card:()=>r(8,16,48,32,P.blue)+r(12,22,40,8,P.ink)+r(14,36,15,5,P.gold)+r(35,36,14,5,P.white),
  handshake:()=>r(7,25,20,12,P.blue)+r(37,25,20,12,P.mint)+r(23,28,18,14,P.skin)+r(18,37,12,7,P.skin)+r(34,37,12,7,P.skin),
  building:()=>r(15,8,34,48,P.blue)+r(21,15,8,8,P.gold)+r(35,15,8,8,P.gold)+r(21,29,8,8,P.white)+r(35,29,8,8,P.white)+r(27,42,10,14,P.ink),
  tower:()=>r(24,8,16,48,P.blue)+r(18,17,28,7,P.white)+r(20,50,24,6,P.gold)+r(29,14,6,28,P.ink),
  market:()=>r(9,18,46,9,P.red)+r(12,27,40,27,P.white)+r(16,33,12,17,P.mint)+r(34,33,12,17,P.gold)+r(14,11,36,7,P.gold),
  cart:()=>r(12,20,34,23,P.blue)+r(8,14,8,8,P.white)+r(18,46,8,8,P.ink)+r(39,46,8,8,P.ink)+r(46,23,8,5,P.white),
  shipout:()=>r(8,37,40,12,P.blue)+r(18,24,24,14,P.white)+r(45,18,12,7,P.gold)+r(50,14,7,15,P.gold),
  shipin:()=>r(16,37,40,12,P.blue)+r(22,24,24,14,P.white)+r(7,18,12,7,P.mint)+r(7,14,7,15,P.mint),
  recruit:()=>r(12,16,12,12,P.skin)+r(8,29,20,23,P.blue)+r(39,16,12,12,P.skin)+r(35,29,20,23,P.mint)+r(27,22,8,8,P.gold),
  chat:()=>r(7,13,24,20,P.white)+r(33,29,24,20,P.mint)+r(14,32,7,7,P.white)+r(43,48,7,7,P.mint)+r(13,20,12,4,P.ink)+r(39,36,12,4,P.ink),
  persondoc:()=>r(9,12,12,12,P.skin)+r(7,25,16,27,P.blue)+r(30,12,25,40,P.white)+r(35,19,15,4,P.ink)+r(35,29,12,4,P.grey)+r(35,39,14,4,P.grey),
  arrowup:()=>r(26,25,12,31,P.mint)+r(17,24,30,12,P.mint)+r(22,15,20,10,P.mint)+r(27,8,10,8,P.mint),
  manager:()=>r(8,13,48,34,P.blue)+r(14,18,14,8,P.gold)+r(34,18,14,8,P.mint)+r(14,32,34,6,P.white)+r(24,48,16,7,P.grey),
  boxes:()=>r(8,11,21,20,P.gold)+r(35,11,21,20,P.gold)+r(8,35,21,20,P.blue)+r(35,35,21,20,P.mint)+r(16,18,5,5,P.ink)+r(43,42,5,5,P.ink),
  blueprint:()=>r(9,9,46,46,P.blue)+r(15,15,34,4,P.white)+r(15,23,4,24,P.white)+r(19,43,27,4,P.white)+r(30,26,16,4,P.gold)+r(42,30,4,13,P.gold),
  chess:()=>r(8,8,48,48,P.white)+r(8,8,12,12,P.blue)+r(32,8,12,12,P.blue)+r(20,20,12,12,P.blue)+r(44,20,12,12,P.blue)+r(8,32,12,12,P.blue)+r(32,32,12,12,P.blue)+r(20,44,12,12,P.blue)+r(44,44,12,12,P.blue),
  meeting:()=>r(10,28,44,18,P.gold)+r(14,12,10,10,P.skin)+r(27,10,10,10,P.skin)+r(40,12,10,10,P.skin)+r(17,46,6,10,P.grey)+r(41,46,6,10,P.grey),
  bricks:()=>r(8,37,20,9,P.red)+r(30,37,26,9,P.red)+r(13,26,26,9,P.gold)+r(41,26,15,9,P.gold)+r(8,15,22,9,P.blue)+r(32,15,24,9,P.blue),
  chain:()=>r(8,25,17,14,P.blue)+r(39,25,17,14,P.blue)+r(19,29,8,6,P.white)+r(37,29,8,6,P.white)+r(29,17,6,12,P.red)+r(29,37,6,12,P.red),
  volcano:()=>r(17,38,30,18,P.grey)+r(24,28,16,12,P.red)+r(28,18,8,12,P.gold)+r(20,12,7,7,P.red)+r(40,10,7,7,P.gold),
  inbox:()=>r(9,28,46,27,P.blue)+r(18,12,28,24,P.white)+r(25,18,14,5,P.ink)+r(25,27,14,5,P.grey)+r(24,40,16,6,P.gold),
  key:()=>r(10,22,20,20,P.gold)+r(25,29,31,7,P.gold)+r(45,36,7,8,P.gold)+r(35,36,7,5,P.gold)+r(15,27,10,10,P.ink),
  send:()=>r(9,23,24,18,P.white)+r(33,18,22,28,P.blue)+r(16,29,10,6,P.ink)+r(34,26,16,6,P.gold),
  receive:()=>r(31,23,24,18,P.white)+r(9,18,22,28,P.mint)+r(38,29,10,6,P.ink)+r(14,26,16,6,P.gold),
  hold:()=>r(12,31,40,17,P.skin)+r(16,20,8,18,P.skin)+r(26,16,8,18,P.skin)+r(36,20,8,18,P.skin)+r(23,29,18,11,P.gold),
  box:()=>r(10,17,44,37,P.gold)+r(10,17,44,8,P.white)+r(28,17,8,37,P.ink)+r(18,31,12,6,P.blue),
  pin:()=>r(23,10,18,18,P.red)+r(27,26,10,18,P.red)+r(30,42,4,12,P.red)+r(28,15,8,8,P.white),
  stairs:()=>r(8,46,12,10,P.blue)+r(20,36,12,20,P.blue)+r(32,26,12,30,P.mint)+r(44,16,12,40,P.gold),
  robot:()=>r(17,16,30,29,P.blue)+r(21,20,22,17,P.white)+r(24,25,5,5,P.ink)+r(35,25,5,5,P.ink)+r(29,8,6,9,P.gold)+r(13,23,5,16,P.grey)+r(47,23,5,16,P.grey),
  shield:()=>r(16,10,32,33,P.blue)+r(21,16,22,22,P.white)+r(27,22,10,10,P.mint)+r(24,43,16,11,P.gold),
  syringe:()=>r(13,30,31,10,P.white)+r(20,24,26,22,P.blue)+r(43,28,12,4,P.grey)+r(8,27,8,16,P.mint),
  museum:()=>r(8,18,48,7,P.gold)+r(13,25,7,24,P.white)+r(25,25,7,24,P.white)+r(37,25,7,24,P.white)+r(49,25,7,24,P.white)+r(8,49,48,7,P.blue)+r(16,11,32,7,P.gold),
  panic:()=>r(19,12,26,34,P.pink)+r(24,21,5,5,P.ink)+r(35,21,5,5,P.ink)+r(27,34,10,5,P.ink)+r(48,8,6,20,P.red)+r(48,32,6,6,P.red),
  meteor:()=>r(38,10,13,13,P.gold)+r(29,19,13,13,P.red)+r(20,28,13,13,P.pink)+r(11,37,13,13,P.blue)+r(42,42,10,10,P.grey),
  mosquito:()=>r(27,23,10,21,P.ink)+r(14,17,18,13,P.blue)+r(32,17,18,13,P.blue)+r(19,42,8,8,P.ink)+r(37,42,8,8,P.ink)+r(31,8,4,15,P.ink),
  letters:()=>r(8,12,15,18,P.blue)+r(25,12,15,18,P.mint)+r(42,12,15,18,P.gold)+r(12,35,15,18,P.pink)+r(31,35,15,18,P.blue),
  runner:()=>r(27,9,10,10,P.skin)+r(23,19,15,18,P.blue)+r(13,25,12,6,P.skin)+r(37,25,12,6,P.skin)+r(19,37,8,18,P.grey)+r(34,37,8,18,P.grey),
  clock:()=>r(12,10,40,40,P.white)+r(17,15,30,30,P.blue)+r(29,19,6,15,P.ink)+r(32,30,11,6,P.ink)+r(25,52,14,5,P.grey),
  radio:()=>r(29,10,6,20,P.grey)+r(15,18,34,28,P.blue)+r(20,23,24,18,P.ink)+r(22,28,5,5,P.mint)+r(36,28,5,5,P.gold)+r(10,49,44,6,P.white),
  friends:()=>r(12,13,12,12,P.skin)+r(40,13,12,12,P.skin)+r(8,26,20,26,P.blue)+r(36,26,20,26,P.mint)+r(25,30,14,8,P.gold),
  window:()=>r(10,10,44,44,P.blue)+r(15,15,34,34,P.white)+r(29,15,6,34,P.ink)+r(15,29,34,6,P.ink),
  flame:()=>r(27,9,10,12,P.gold)+r(20,19,24,18,P.red)+r(16,31,32,20,P.gold)+r(24,38,16,14,P.pink),
  calculator:()=>r(15,8,34,48,P.blue)+r(20,13,24,10,P.white)+r(20,28,6,6,P.gold)+r(29,28,6,6,P.mint)+r(38,28,6,6,P.pink)+r(20,38,6,6,P.white)+r(29,38,15,6,P.white),
  house:()=>r(13,27,38,28,P.blue)+r(8,27,24,8,P.red)+r(32,19,24,16,P.red)+r(27,37,10,18,P.ink)+r(41,34,7,7,P.gold),
  truck:()=>r(8,22,31,23,P.blue)+r(39,29,15,16,P.mint)+r(13,46,10,10,P.ink)+r(42,46,10,10,P.ink)+r(42,33,8,7,P.white),
  magnifier:()=>r(10,10,30,30,P.white)+r(15,15,20,20,P.blue)+r(35,35,8,8,P.gold)+r(41,41,15,8,P.gold),
  crystal:()=>r(16,14,32,32,P.pink)+r(21,19,22,22,P.blue)+r(24,46,16,8,P.gold)+r(15,54,34,5,P.white),
  suitcase:()=>r(12,20,40,32,P.gold)+r(23,13,18,8,P.grey)+r(18,27,6,18,P.ink)+r(40,27,6,18,P.ink)+r(27,34,10,6,P.blue),
  crowd:()=>r(8,13,10,10,P.skin)+r(27,10,10,10,P.skin)+r(46,13,10,10,P.skin)+r(6,24,14,27,P.blue)+r(24,21,16,30,P.mint)+r(44,24,14,27,P.gold),
  handbook:()=>r(8,14,22,38,P.blue)+r(34,14,22,38,P.mint)+r(29,14,6,38,P.white)+r(13,21,12,4,P.white)+r(39,21,12,4,P.white)+r(21,37,7,7,P.skin),
  refund:()=>r(9,18,21,26,P.white)+r(34,20,17,17,P.gold)+r(40,37,8,8,P.gold)+r(23,42,20,6,P.mint)+r(18,38,8,14,P.mint),
  calendar:()=>r(10,15,44,39,P.white)+r(10,15,44,10,P.red)+r(18,10,6,10,P.grey)+r(40,10,6,10,P.grey)+r(19,31,9,9,P.blue)+r(36,31,9,9,P.mint),
  checklist:()=>r(13,8,38,48,P.white)+r(19,16,6,6,P.mint)+r(29,17,15,4,P.ink)+r(19,29,6,6,P.mint)+r(29,30,15,4,P.ink)+r(19,42,6,6,P.gold)+r(29,43,15,4,P.ink)
};
function pick(c){
 const s=c&&c.scene||W[(c&&c.word||"").toLowerCase()]||({科技:"computer",科學:"flask",學術:"book",文化:"books",商務:"contract",金融:"coins",醫學:"syringe",物流:"truck",人資:"people",字根:"bricks",歷史:"scroll",語言:"speech"}[c&&c.tag]||"book");
 return sceneMap[s]?s:"book";
}
function stars(word){
 let h=0;for(const ch of String(word||""))h=(h*31+ch.charCodeAt(0))>>>0;
 let out="";for(let i=0;i<5;i++){const x=5+((h>>(i*3))%50),y=5+((h>>(i*2+1))%50);out+=q(x,y,2,i%2?P.gold:P.white)}
 return out;
}
window.ENROOT_PIXEL_ART=function(card,size){
 const s=pick(card),body=sceneMap[s]();
 return '<svg class="semanticPixel '+(size==="large"?"large":"")+'" viewBox="0 0 64 64" role="img" aria-label="'+String(C[s]||"單字像素圖").replace(/"/g,"&quot;")+'" shape-rendering="crispEdges">'+r(2,2,60,60,P.bg)+stars(card&&card.word)+body+r(2,2,60,3,P.white)+r(2,59,60,3,P.ink)+r(2,2,3,60,P.white)+r(59,2,3,60,P.ink)+'</svg>';
};
window.ENROOT_PIXEL_CUE=function(card){const s=pick(card);return C[s]||"單字概念圖";};
})();