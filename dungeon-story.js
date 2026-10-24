(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonStory = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var GIFTS = Object.freeze({
    flower: Object.freeze({ id: 'flower', name: '月露小花', description: '露米娜喜歡夾在觀星筆記裡的小花。', affection: 3 }),
    tea: Object.freeze({ id: 'tea', name: '蜜星花茶', description: '熬夜觀星後，一杯暖茶讓人安心。', affection: 4 }),
    star: Object.freeze({ id: 'star', name: '星砂玻璃瓶', description: '盛著微光星砂，像一座隨身的小夜空。', affection: 6 })
  });
  function bounded(value, max) { return Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Math.floor(Number(value)))) : 0; }
  function createProfile(profile) {
    var p = profile && typeof profile === 'object' ? profile : {}, gifts = p.gifts || {};
    return { version: 1, affection: bounded(p.affection, 100), gifts: { flower: bounded(gifts.flower, 999), tea: bounded(gifts.tea, 999), star: bounded(gifts.star, 999) },
      scenes: Array.isArray(p.scenes) ? Array.from(new Set(p.scenes.filter(function (id) { return typeof id === 'string' && id.length <= 80; }))).slice(0, 60) : [],
      dating: p.dating === true && p.questCleared === true && bounded(p.affection, 100) >= 75, questCleared: p.questCleared === true };
  }
  function getBond(profile) {
    var p = createProfile(profile), threshold = p.affection < 20 ? 20 : p.affection < 45 ? 45 : p.affection < 75 ? 75 : 100;
    return { name: p.dating ? '星光戀人' : p.affection >= 75 ? '心意相通' : p.affection >= 45 ? '彼此信任' : p.affection >= 20 ? '熟悉的旅伴' : '初次相識',
      next: p.dating ? '一起收藏新的回憶' : p.affection >= 75 ? p.questCleared ? '可以親口告白' : '完成「星光之約」' : p.affection >= 45 ? '星光之約已開啟' : p.affection >= 20 ? '45 點解鎖星光之約' : '20 點成為熟悉的旅伴',
      threshold: threshold, progress: Math.min(100, p.affection / threshold * 100), affection: p.affection };
  }
  var CHAPTERS = [
    { title: '第一封印・樹木的名字', text: '失名之夜後，世界開始忘記自己。樹木不再記得春天，河流失去了方向。你提起星燈，走進苔光秘林，尋找守住四個名字的封印。' },
    { title: '第二封印・月亮的倒影', text: '棘冠散去，森林再次低語。碎月書庫裡卻只剩空白的書頁；鏡月女巫把每個被遺忘的名字藏進倒影。讀出它們，讓記憶重新落回紙上。' },
    { title: '第三封印・王座的寂靜', text: '月亮的名字已被找回。失名之王守著最後一頁歷史，因為他害怕：如果記憶重現，自己失去的一切也將重現。這次，你要帶他走出寂靜。' },
    { title: '第四封印・星辰的約定', text: '王座之後仍有一座花庭。忘誓星龍吞下了人們未完成的約定，讓夜空少了一整片星座。只有願意記得彼此的人，才能為最後的星辰命名。' }
  ];
  var QUEST = [
    { title: '星光之約・追尋殘星', text: '露米娜展開缺了一角的星圖：「我二十四歲了，卻還沒找到老師留下的那顆星。你願意陪我走一次嗎？」你們踏上會移動的星軌，尋找第一片座標。' },
    { title: '星光之約・未說完的話', text: '花庭裡藏著露米娜年少時寫下的心願。她將筆記抱在胸前：「以前我只想證明自己不會迷路。現在，我想有人能一起看見終點。」採集月露花光，守住這段記憶。' },
    { title: '星光之約・為彼此命名', text: '失約星影從斷裂的星圖升起，模仿著你們害怕的道別。露米娜握緊法杖：「未來還不知道會怎樣，但現在，我想和你一起把這一頁寫完。」' }
  ];
  function storyFor(run) {
    if (!run) return { id: 'prologue', chapter: '失名紀事', title: '替世界找回名字', text: CHAPTERS[0].text };
    var p = createProfile(run.relationship), legacy = run.regionCount !== 4;
    if (run.status === 'won') return { id: p.dating ? 'ending-romance' : 'ending', chapter: '終章', title: p.dating ? '每一個明天，都一起觀星' : '世界記得自己的名字',
      text: p.dating ? (legacy ? '三道' : '四道') + '封印化為晨光。露米娜將一顆小星畫在你們的旅圖旁，輕輕牽住你的手：「下一次，不為拯救世界。只為和你一起看看遠方，好嗎？」歸途的夜空，終於多了一個屬於你們的星座。' : (legacy ? '三道' : '四道') + '封印散去，風、月亮與星辰重新擁有名字。你把星燈留在歸途上，讓下一位迷路的旅人，也能找到回家的方向。' };
    if (run.status === 'lost') return { id: 'fallen', chapter: '未完的旅程', title: '星燈會記得回來的人', text: p.dating ? '露米娜在營地等你。她沒有責備，只替星燈添上新油：「我們還有很多明天。先休息，再一起出發。」' : '這次的旅途暫時停在這裡。找到的名字與送出的心意沒有消失；星燈仍會在下一個清晨亮起。' };
    if (run.bondQuest && run.bondQuest.active) { var step = Math.max(0, Math.min(2, run.bondQuest.step || 0)); return Object.assign({ id: 'bond-' + step, chapter: '露米娜的支線 · ' + (step + 1) + '/3' }, QUEST[step]); }
    var region = Math.max(0, Math.min(3, run.region || 0));
    var chapter = Object.assign({ id: 'chapter-' + region, chapter: '失名紀事 · ' + (region + 1) }, CHAPTERS[region]);
    if (legacy && region === 0) chapter.text = chapter.text.replace('四個名字', '三個名字');
    return chapter;
  }
  function dialogue(run) {
    var p = createProfile(run && run.relationship), scene;
    if (p.dating) scene = { id: 'lumina-dating', title: '留給你的那顆星', text: '「我在每張星圖的邊角，都替你留了一顆星。」露米娜笑著將筆記合上。「今天想先去哪裡？我陪你。」' };
    else if (p.questCleared) scene = { id: 'lumina-promise', title: '一張完整的星圖', text: '「原來星座不是因為永遠不會走散才美麗，而是我們願意再找到彼此。」她把修好的星圖攤在你面前，等你說出心裡的話。' };
    else if (p.affection >= 45) scene = { id: 'lumina-trust', title: '能陪我尋找一顆星嗎？', text: '露米娜第一次讓你翻閱她的私人筆記：「這是我一直沒能完成的觀星旅程。如果是和你一起……我想再試一次。」' };
    else if (p.affection >= 20) scene = { id: 'lumina-familiar', title: '分你一半的花茶', text: '「我原本只泡了一杯，不過可以分你一半。」她把熱茶推過來。「你的咒語聽起來很有精神。下次，我也想跟著你試試看。」' };
    else scene = { id: 'lumina-meeting', title: '星露法師・露米娜', text: '「你好！我是露米娜，二十四歲，觀星研究員兼偶爾迷路的法師。」她扶正綴著月亮的帽子。「我在尋找一片被世界忘記的星座。你呢？」' };
    return Object.assign({}, scene, { age: 24, bond: getBond(p), giftLimit: 3,
      canQuest: p.affection >= 45 && !p.questCleared && !(run && run.bondQuest && run.bondQuest.active), canConfess: p.affection >= 75 && p.questCleared && !p.dating });
  }
  var SCENES = {};
  [0, 20, 45, 75, 100].forEach(function (affection) {
    var scene = dialogue({ relationship: { affection: affection, questCleared: affection >= 75, dating: affection === 100 } });
    SCENES[scene.id] = Object.freeze({ id: scene.id, title: scene.title, text: scene.text });
  });
  QUEST.forEach(function (scene, index) { SCENES['bond-' + index] = Object.freeze(Object.assign({ id: 'bond-' + index }, scene)); });
  SCENES['lumina-confession'] = Object.freeze({ id: 'lumina-confession', title: '讓我成為你的下一顆星', text: '你告訴露米娜，想陪伴她的不只是這段旅程。她愣了一下，隨即笑得比星光還明亮：「其實，我也一直在等你說這句話。以後的星圖，我們一起畫吧。」她主動牽住你的手，將這一刻寫進兩個人的明天。' });
  return { createProfile: createProfile, getBond: getBond, GIFTS: GIFTS, storyFor: storyFor, dialogue: dialogue, CHAPTERS: CHAPTERS, QUEST: QUEST, SCENES: Object.freeze(SCENES) };
});
