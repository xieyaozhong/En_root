(function(){
const BASE_ART=window.ENROOT_PIXEL_ART,BASE_CUE=window.ENROOT_PIXEL_CUE;
const T={"accommodate":{"icon":"bed","label":"BED","cue":"床位＋入住空間 → 容納／住宿"},"reimburse":{"icon":"coin","label":"↶$","cue":"金幣退回 → 報銷"},"itinerary":{"icon":"map","label":"MAP","cue":"地圖路線＋定位點 → 行程表"},"maintenance":{"icon":"tool","label":"FIX","cue":"扳手＋齒輪 → 維護保養"},"prerequisite":{"icon":"lock","label":"REQ","cue":"先解鎖條件 → 先決條件"},"subsidiary":{"icon":"building","label":"HQ","cue":"母公司＋分支大樓 → 子公司"},"consecutive":{"icon":"chain","label":"1-2-3","cue":"一格接一格 → 連續"},"complimentary":{"icon":"gift","label":"FREE","cue":"禮物盒 → 免費贈送"},"discrepancy":{"icon":"scale","label":"≠","cue":"失衡天平 → 差異不一致"},"feasible":{"icon":"check","label":"OK","cue":"完成勾選 → 可行"},"mandatory":{"icon":"scroll","label":"MUST","cue":"規則卷軸 → 強制必須"},"expedite":{"icon":"speed","label":"FAST","cue":"加速箭頭 → 加速處理"},"allocate":{"icon":"boxes","label":"1→3","cue":"資源分到多個箱子 → 分配"},"comply":{"icon":"check","label":"RULE","cue":"規則＋勾選 → 遵守"},"procurement":{"icon":"cart","label":"BUY","cue":"採購車＋清單 → 採購"},"liability":{"icon":"scale","label":"DEBT","cue":"天平＋負債 → 責任／負債"},"vacancy":{"icon":"chair","label":"OPEN","cue":"空椅子 → 職缺／空房"},"payroll":{"icon":"coin","label":"PAY","cue":"薪資金幣＋名冊 → 薪資表"},"acquisition":{"icon":"handshake","label":"M&A","cue":"兩方握手合併 → 收購"},"quotation":{"icon":"doc","label":"$?","cue":"文件＋價格 → 報價"},"reschedule":{"icon":"calendar","label":"↻","cue":"日曆重排 → 重新安排"},"subscription":{"icon":"card","label":"SUB","cue":"會員卡＋循環 → 訂閱"},"forecast":{"icon":"chart","label":"NEXT","cue":"趨勢圖指向未來 → 預測"},"brochure":{"icon":"book","label":"INFO","cue":"折頁小冊 → 宣傳手冊"},"receipt":{"icon":"doc","label":"PAID","cue":"付款文件 → 收據"},"entrepreneur":{"icon":"bulb","label":"NEW","cue":"燈泡＋商業起步 → 創業者"},"phenomenon":{"icon":"eye","label":"?!","cue":"眼睛觀察異象 → 現象"},"theory":{"icon":"book","label":"WHY","cue":"書本＋問號 → 理論"},"research":{"icon":"search","label":"FIND","cue":"放大鏡找資料 → 研究"},"evidence":{"icon":"evidence","label":"PROOF","cue":"放大鏡＋證物 → 證據"},"university":{"icon":"school","label":"UNI","cue":"校舍＋學位帽 → 大學"},"education":{"icon":"teacher","label":"LEARN","cue":"老師＋書本 → 教育"},"mathematics":{"icon":"math","label":"π","cue":"數學符號＋計算 → 數學"},"geometry":{"icon":"triangle","label":"△","cue":"三角形＋尺規 → 幾何"},"astronomy":{"icon":"telescope","label":"★","cue":"望遠鏡看星星 → 天文"},"archaeology":{"icon":"dig","label":"OLD","cue":"鏟子挖古物 → 考古"},"anthropology":{"icon":"people","label":"HUMAN","cue":"不同人群 → 人類學"},"linguistics":{"icon":"speech","label":"ABC","cue":"對話＋字母 → 語言學"},"rhetoric":{"icon":"speech","label":"SAY","cue":"講台話語 → 修辭"},"memory":{"icon":"brain","label":"MEM","cue":"大腦＋記憶格 → 記憶"},"cognition":{"icon":"brain","label":"THINK","cue":"大腦思考 → 認知"},"neuron":{"icon":"neuron","label":"N","cue":"神經元突觸 → 神經元"},"molecule":{"icon":"atom","label":"H2O","cue":"原子連結 → 分子"},"gravity":{"icon":"gravity","label":"↓","cue":"物體被拉向地面 → 重力"},"climate":{"icon":"cloud","label":"°C","cue":"雲＋太陽＋溫度 → 氣候"},"geology":{"icon":"rock","label":"ROCK","cue":"地層岩石 → 地質"},"evolution":{"icon":"evolution","label":"→","cue":"生物逐步變化 → 演化"},"species":{"icon":"dna","label":"DNA","cue":"DNA＋生物分類 → 物種"},"fossil":{"icon":"fossil","label":"OLD","cue":"岩層中的骨骼 → 化石"},"habitat":{"icon":"tree","label":"HOME","cue":"生物的家＋環境 → 棲地"},"oxygen":{"icon":"bubble","label":"O2","cue":"氧氣泡＋O₂ → 氧氣"},"constitution":{"icon":"scroll","label":"LAW","cue":"法律卷軸 → 憲法"},"justice":{"icon":"scale","label":"=","cue":"平衡天平 → 正義"},"jury":{"icon":"people","label":"12","cue":"一群審議者 → 陪審團"},"archive":{"icon":"folder","label":"FILE","cue":"檔案櫃 → 檔案"},"sandwich":{"icon":"food","label":"FOOD","cue":"兩片麵包夾餡 → 三明治"},"boycott":{"icon":"stop","label":"STOP","cue":"停止交易標誌 → 抵制"},"silhouette":{"icon":"profile","label":"SHADOW","cue":"黑色側臉輪廓 → 剪影"},"mentor":{"icon":"teacher","label":"GUIDE","cue":"老師指導學生 → 導師"},"echo":{"icon":"sound","label":"ECHO","cue":"聲波來回反射 → 回聲"},"atlas":{"icon":"globe","label":"MAP","cue":"地球＋地圖頁 → 地圖集"}};
const P={bg:"#081523",ink:"#06101b",white:"#eef7ff",blue:"#82aaff",mint:"#77e7bd",gold:"#ffd67e",pink:"#ff9de1",red:"#ff8490",skin:"#ffc9a5",grey:"#93a8bc",green:"#71e4a8"};
const r=(x,y,w,h,c,rx=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+c+'"/>';
const line=(x1,y1,x2,y2,c,w=2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="square"/>';
const txt=(x,y,s,c,size=7)=>'<text x="'+x+'" y="'+y+'" fill="'+c+'" font-size="'+size+'" font-weight="900" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" text-anchor="middle">'+String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</text>';
function icon(type){
 switch(type){
 case"bed":return r(9,29,46,16,P.blue)+r(11,22,15,9,P.white)+r(9,45,5,10,P.grey)+r(50,45,5,10,P.grey);
 case"coin":return r(13,24,18,18,P.gold,9)+r(33,17,18,18,P.gold,9)+r(35,38,17,10,P.blue)+txt(42,46,"$",P.white,8);
 case"map":return r(8,16,48,34,P.white)+line(24,16,24,50,P.blue,3)+line(40,16,40,50,P.mint,3)+r(35,24,9,9,P.red,5)+line(39,33,32,44,P.red,3);
 case"tool":return r(12,37,38,7,P.grey)+r(39,17,8,22,P.grey)+r(34,13,18,8,P.blue)+r(12,18,16,16,P.gold,8)+r(18,23,5,5,P.ink);
 case"lock":return r(18,27,28,24,P.blue)+r(24,17,16,14,"none")+line(24,29,24,20,P.white,4)+line(40,29,40,20,P.white,4)+line(24,20,40,20,P.white,4)+r(29,35,6,10,P.gold);
 case"building":return r(12,14,40,39,P.blue)+r(18,20,8,8,P.gold)+r(38,20,8,8,P.mint)+r(18,34,8,8,P.white)+r(38,34,8,8,P.white)+r(28,41,8,12,P.ink);
 case"chain":return r(8,25,18,14,P.blue,7)+r(38,25,18,14,P.mint,7)+r(23,29,18,6,P.white);
 case"gift":return r(13,27,38,26,P.pink)+r(10,22,44,9,P.gold)+r(28,22,8,31,P.white)+r(19,13,11,9,P.red)+r(34,13,11,9,P.red);
 case"scale":return line(32,14,32,49,P.white,4)+line(14,22,50,22,P.gold,4)+line(18,22,13,38,P.grey,2)+line(46,22,51,38,P.grey,2)+r(8,38,20,5,P.blue)+r(40,38,16,5,P.red)+r(23,49,18,5,P.white);
 case"check":return r(10,13,44,39,P.white)+line(17,33,27,43,P.green,5)+line(27,43,47,22,P.green,5);
 case"speed":return line(9,22,35,22,P.blue,4)+line(9,32,42,32,P.mint,4)+line(9,42,50,42,P.gold,4)+r(44,27,10,10,P.red);
 case"boxes":return r(8,17,18,18,P.gold)+r(30,17,18,18,P.blue)+r(19,38,18,18,P.mint)+line(17,13,47,13,P.white,3);
 case"cart":return r(13,22,33,22,P.blue)+line(8,15,14,22,P.white,4)+r(18,47,7,7,P.ink,4)+r(39,47,7,7,P.ink,4)+r(48,18,8,8,P.gold);
 case"chair":return r(21,16,22,23,P.blue)+r(17,38,30,8,P.white)+r(19,46,6,10,P.grey)+r(39,46,6,10,P.grey);
 case"handshake":return r(7,25,20,12,P.blue)+r(37,25,20,12,P.mint)+r(23,28,18,14,P.skin)+r(18,37,12,7,P.skin)+r(34,37,12,7,P.skin);
 case"doc":return r(16,9,32,46,P.white)+r(21,18,22,4,P.ink)+r(21,29,17,4,P.grey)+r(21,40,21,4,P.grey);
 case"calendar":return r(11,17,42,36,P.white)+r(11,17,42,9,P.red)+r(20,12,5,10,P.grey)+r(39,12,5,10,P.grey)+r(20,33,8,8,P.blue)+r(36,33,8,8,P.mint);
 case"card":return r(8,19,48,29,P.blue)+r(12,25,40,7,P.ink)+r(15,39,15,5,P.gold)+r(36,39,13,5,P.white);
 case"chart":return line(12,49,52,49,P.white,3)+line(12,49,12,15,P.white,3)+line(17,42,27,34,P.blue,4)+line(27,34,37,37,P.mint,4)+line(37,37,50,20,P.gold,4);
 case"book":return r(7,16,23,36,P.blue)+r(34,16,23,36,P.mint)+r(29,16,6,36,P.white)+r(12,23,13,4,P.white)+r(39,23,13,4,P.white);
 case"bulb":return r(22,13,20,22,P.gold,10)+r(27,35,10,12,P.grey)+r(25,48,14,6,P.white)+line(14,13,19,18,P.gold,3)+line(45,18,51,13,P.gold,3);
 case"eye":return r(11,24,42,18,P.white,9)+r(25,24,14,18,P.blue,7)+r(30,29,4,8,P.ink);
 case"search":return r(11,13,28,28,P.white,14)+r(16,18,18,18,P.blue,9)+line(36,38,52,53,P.gold,6);
 case"evidence":return r(9,14,28,34,P.white)+r(14,21,18,4,P.ink)+r(14,31,14,4,P.grey)+r(35,34,13,13,"none")+line(40,39,53,52,P.gold,5)+r(38,36,9,9,P.blue,5);
 case"school":return r(10,24,44,29,P.blue)+r(15,30,8,17,P.white)+r(28,30,8,17,P.white)+r(41,30,8,17,P.white)+r(15,15,34,9,P.gold)+r(26,9,12,6,P.mint);
 case"teacher":return r(9,15,28,24,P.blue)+r(13,20,20,5,P.white)+r(42,15,10,10,P.skin,5)+r(39,27,16,24,P.mint)+line(37,31,27,27,P.skin,4);
 case"math":return r(9,12,46,40,P.ink)+txt(25,36,"π",P.gold,20)+txt(45,30,"+",P.mint,14)+txt(44,44,"=",P.white,12);
 case"triangle":return '<polygon points="32,10 54,49 10,49" fill="'+P.blue+'"/><polygon points="32,20 44,43 20,43" fill="'+P.bg+'"/>'+line(8,54,56,54,P.gold,3);
 case"telescope":return r(18,20,30,9,P.blue)+r(43,17,10,15,P.gold)+line(26,29,20,51,P.white,4)+line(36,29,43,51,P.white,4)+r(9,10,5,5,P.gold)+r(48,8,4,4,P.white);
 case"dig":return line(20,13,38,47,P.grey,5)+r(33,43,18,9,P.gold)+r(10,39,18,13,P.ink)+r(15,34,8,6,P.white);
 case"people":return r(10,14,10,10,P.skin,5)+r(27,10,10,10,P.skin,5)+r(44,14,10,10,P.skin,5)+r(8,26,14,24,P.blue)+r(25,22,14,28,P.mint)+r(42,26,14,24,P.gold);
 case"speech":return r(8,14,48,26,P.white,6)+r(15,40,10,8,P.white)+txt(32,32,"ABC",P.blue,9);
 case"brain":return r(16,15,32,29,P.pink,12)+r(12,22,10,16,P.pink,7)+r(42,22,10,16,P.pink,7)+line(32,16,32,43,P.ink,3);
 case"neuron":return r(27,26,10,10,P.gold,5)+line(32,31,12,17,P.blue,3)+line(32,31,52,18,P.mint,3)+line(32,31,50,46,P.pink,3)+r(8,13,7,7,P.blue,4)+r(49,14,7,7,P.mint,4)+r(48,43,7,7,P.pink,4);
 case"atom":return r(29,29,6,6,P.gold,3)+line(9,32,55,32,P.blue,3)+line(32,9,32,55,P.mint,3)+r(12,28,6,6,P.pink,3)+r(46,28,6,6,P.pink,3);
 case"gravity":return r(25,13,14,14,P.gold,7)+line(32,29,32,49,P.white,4)+'<polygon points="25,43 39,43 32,54" fill="'+P.white+'"/>'+r(12,54,40,4,P.blue);
 case"cloud":return r(10,26,36,15,P.white,8)+r(18,18,18,17,P.white,9)+r(44,11,10,10,P.gold,5)+line(17,43,13,52,P.blue,3)+line(29,43,25,52,P.blue,3)+line(41,43,37,52,P.blue,3);
 case"rock":return '<polygon points="12,49 18,26 31,14 49,23 55,49" fill="'+P.grey+'"/>'+line(18,36,49,36,P.gold,3)+line(25,24,42,49,P.blue,3);
 case"evolution":return r(8,39,10,10,P.green,5)+r(25,30,12,12,P.mint,6)+r(44,18,14,14,P.blue,7)+line(16,42,25,36,P.white,3)+line(37,34,45,25,P.white,3);
 case"dna":return line(18,13,46,51,P.blue,4)+line(46,13,18,51,P.mint,4)+line(22,20,42,20,P.gold,3)+line(22,32,42,32,P.pink,3)+line(22,44,42,44,P.gold,3);
 case"fossil":return r(8,12,48,43,P.gold)+r(15,18,34,31,P.grey)+r(27,22,10,10,P.white,5)+r(18,34,12,5,P.white)+r(36,34,12,5,P.white)+line(25,39,19,46,P.white,4)+line(39,39,45,46,P.white,4);
 case"tree":return r(28,34,8,21,P.grey)+r(17,17,30,24,P.green,12)+r(10,26,18,16,P.mint,8)+r(38,25,16,16,P.green,8);
 case"bubble":return r(17,18,12,12,P.blue,6)+r(34,10,9,9,P.mint,5)+r(38,31,15,15,P.white,8)+txt(24,51,"O2",P.gold,9);
 case"scroll":return r(13,11,38,43,P.gold)+r(8,8,10,49,P.white)+r(46,8,10,49,P.white)+r(20,20,24,4,P.ink)+r(20,30,18,4,P.ink)+r(20,40,22,4,P.ink);
 case"folder":return r(9,21,46,31,P.blue)+r(13,15,20,10,P.mint)+r(15,29,34,16,P.white)+r(20,34,24,4,P.grey);
 case"food":return r(10,19,44,10,P.gold)+r(13,29,38,8,P.green)+r(10,37,44,10,P.red)+r(10,47,44,8,P.gold);
 case"stop":return r(14,14,36,36,P.red,7)+txt(32,37,"STOP",P.white,9)+line(9,53,55,53,P.grey,4);
 case"profile":return r(15,12,24,24,P.ink,12)+r(25,32,20,18,P.ink)+r(38,18,9,8,P.ink)+r(9,52,46,4,P.grey);
 case"sound":return r(11,24,11,16,P.blue)+r(22,20,12,24,P.blue)+line(38,22,47,16,P.mint,3)+line(38,32,51,32,P.gold,3)+line(38,42,47,48,P.pink,3);
 case"globe":return r(14,11,36,36,P.blue,18)+r(19,17,10,8,P.green)+r(34,23,11,9,P.green)+r(22,33,13,9,P.green)+r(29,47,6,8,P.grey)+r(18,55,28,3,P.white);
 default:return r(10,14,44,38,P.blue)+txt(32,37,"WORD",P.white,8);
 }
}
function rarityColor(r){return({UR:P.gold,SSR:P.pink,SR:"#bca4ff",R:"#7ec9ff",N:P.grey})[r]||P.blue}
function art(card,size){
 const t=T[(card&&card.word||"").toLowerCase()];if(!t)return BASE_ART?BASE_ART(card,size):"";
 const accent=rarityColor(card.rarity);
 return '<svg class="semanticPixel '+(size==="large"?"large ":"")+'extra" viewBox="0 0 64 64" role="img" aria-label="'+t.cue.replace(/"/g,"&quot;")+'" shape-rendering="crispEdges">'+r(2,2,60,60,P.bg)+r(2,2,60,4,accent)+r(2,58,60,4,P.ink)+r(2,2,4,60,accent)+r(58,2,4,60,P.ink)+icon(t.icon)+r(7,52,50,8,P.ink)+txt(32,59,t.label,P.white,6)+'</svg>';
}
window.ENROOT_PIXEL_ART=art;
window.ENROOT_PIXEL_CUE=function(card){const t=T[(card&&card.word||"").toLowerCase()];return t?t.cue:(BASE_CUE?BASE_CUE(card):card.tag)};
})();
