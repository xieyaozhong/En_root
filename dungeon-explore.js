(function (root, factory) {
  'use strict';
  var engine = typeof module === 'object' && module.exports ? require('./dungeon-engine.js') : root.DungeonEngine;
  var api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonExplore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Engine) {
  'use strict';
  var VERSION = 1, WIDTH = 960, HEIGHT = 540, RANGE = 85;
  var STATES = ['route', 'shop', 'npc', 'camp', 'reward', 'event'];
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
  function fail(message) { return { ok: false, message: message }; }
  function done(message, extra) { return Object.assign({ ok: true, message: message }, extra || {}); }
  function has(run, id) { return (run.relics || []).some(function (relic) { return relic.id === id; }); }
  function canDash(run) { return typeof Engine.canDash === 'function' ? Engine.canDash(run) : has(run, 'gale') || has(run, 'thunderstep'); }
  function object(id, kind, name, description, x, y, extra) {
    return Object.assign({ id: id, kind: kind, name: name, description: description || '', x: x, y: y,
      r: 26, interactionRadius: RANGE, color: '#a5d9c2', icon: '◆', action: '', args: [] }, extra || {});
  }
  function slots(length) {
    if (length === 1) return [480];
    return Array.from({ length: length }, function (_, i) { return 200 + i * 560 / (length - 1); });
  }
  function scatterObjects(run, objects) {
    if(run.randomWorldVersion!==1)return objects;
    var text=String(run.seed)+':'+run.encounter+':'+run.status,h=2166136261;
    for(var i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
    var layout=(h>>>0)%3,shift=((h>>>8)%3-1)*32;
    return objects.map(function(target,index){
      var o=Object.assign({},target);
      if(run.status==='route' || run.status==='reward'){
        var positions=slots(objects.length),slot=objects.length?(index+layout)%objects.length:0;
        o.x=positions[slot]+shift;o.y+=(slot%2?1:-1)*(layout*20);
      }else if(run.status==='camp'){
        o.x=layout===1?WIDTH-target.x:target.x+shift;
        o.y+=(index%2?1:-1)*layout*24;
      }else if(o.kind==='npc' || o.kind==='merchant'){
        o.x+=shift*2;o.y+=layout*15;
      }else if(o.kind==='exit'){
        o.x=layout===1?165:795;o.y-=layout*20;
      }
      return o;
    });
  }
  function getNpc(run) { return typeof Engine.getNpc === 'function' ? Engine.getNpc(run) : null; }
  function buildObjects(run, npc, exploration) {
    if (run.status === 'route') {
      var positions = slots(run.routes.length);
      return run.routes.map(function (route, i) {
        return object('route-' + route.id, 'door', route.name, route.description, positions[i], 185, {
          r: 34, color: route.type === 'boss' || route.type === 'elite' ? '#ff987b' : '#a5c9ff', icon: route.icon,
          action: 'chooseRoute', args: [route.id], routeType: route.type, npcId: route.npcId || null
        });
      });
    }
    if (run.status === 'reward') {
      var rewardPositions = slots(run.rewards.length);
      return run.rewards.map(function (reward, i) {
        return object('reward-' + reward.id, 'reward', reward.name, reward.description, rewardPositions[i], 215, {
          color: reward.cursed ? '#df8cc9' : '#e8cc7b', icon: reward.icon, action: 'chooseReward', args: [reward.id], rewardKind: reward.kind, cursed: !!reward.cursed
        });
      });
    }
    if (run.status === 'event') {
      var encounterEvent = Engine.getEncounterEvent(run), eventPositions = slots(encounterEvent.choices.length);
      return encounterEvent.choices.map(function (choice, index) {
        return object('event-' + choice.id, choice.id === 'leave' ? 'exit' : 'event', choice.name, choice.description, eventPositions[index], choice.id === 'leave' ? 335 : 230, {
          color: choice.id === 'leave' ? '#a5c9ff' : encounterEvent.color, icon: choice.icon,
          eventId: encounterEvent.id, choiceId: choice.id, action: 'chooseEvent', args: [choice.id]
        });
      });
    }
    if (run.status === 'camp') {
      var campObjects = [
        object('camp-rest', 'camp', '星燈休息', '恢復最大生命的 48%。', 315, 220, { icon: '♨', color: '#ffba81', action: 'chooseCamp', args: ['rest'] }),
        object('camp-train', 'camp', '符文磨練', '咒語威力增加 3，並恢復 10 點生命。', 645, 220, { icon: '✦', color: '#b8a4ff', action: 'chooseCamp', args: ['train'] })
      ];
      var curse = (run.relics || []).find(function (relic) { return Engine.RELICS[relic.id] && Engine.RELICS[relic.id].cursed; });
      if (curse) campObjects.push(object('camp-cleanse', 'camp', '月火淨化', '花費 35 金幣解除「' + curse.name + '」，隨後繼續旅程。', 480, 330,
        { icon: '✧', color: '#e9b4dc', action: 'chooseCamp', args: ['cleanse'], cursed: true }));
      return campObjects;
    }
    var merchant = run.status === 'shop';
    var person = npc || { id: merchant ? 'merchant' : 'traveler', name: merchant ? '流浪商人' : '旅人', description: '靠近並交談。', color: '#e8c57b' };
    var people = [
      object('npc-' + person.id, merchant ? 'merchant' : 'npc', person.name, person.description, 440, 210, {
        r: 28, color: person.color, icon: merchant ? '◆' : '✦', npcId: person.id, sprite: person.sprite || person.id, action: 'dialog'
      }),
      object('exit', 'exit', merchant ? '離開商店' : '繼續旅途', '靠近出口繼續探索。', 795, 375, {
        r: 30, color: '#a5c9ff', icon: '➜', action: merchant ? 'leaveShop' : 'leaveNpc'
      })
    ];
    var recruited = !merchant && person.companionRole && Array.isArray(run.companions) && run.companions.some(function (companion) { return companion.id === person.id; });
    // Keep the current conversation available until it is closed, then show only the following actor.
    return recruited && person.id !== 'lumina' && (!exploration || exploration.dialogId !== 'npc-' + person.id) ? people.slice(1) : people;
  }
  function roomKey(run, npc) {
    return [run.status, run.encounter, run.currentRoute && run.currentRoute.id || '', npc && npc.id || '',
      run.status === 'route' ? (run.routes || []).map(function (r) { return r.id; }).join(',') : '',
      run.status === 'reward' ? (run.rewards || []).map(function (r) { return r.id; }).join(',') : ''].join(':');
  }
  function nearObject(exploration) {
    var best = null, closest = RANGE + 0.001;
    exploration.objects.forEach(function (target) {
      var distance = Math.hypot(exploration.player.x - target.x, exploration.player.y - target.y);
      if (distance <= target.interactionRadius && distance < closest) { best = target; closest = distance; }
    });
    exploration.nearbyId = best ? best.id : null;
    return best;
  }
  function syncCompanions(run, exploration) {
    if (typeof Engine.normalizeCompanions === 'function') Engine.normalizeCompanions(run);
    var previous = Array.isArray(exploration.companions) ? exploration.companions : [];
    exploration.companions = (Array.isArray(run.companions) ? run.companions : []).filter(function (c, index, list) {
      return c && ['lantern', 'echo', 'sentinel', 'lumina'].indexOf(c.id) >= 0 && !(c.id === 'lumina' && run.status === 'npc' && run.npc && run.npc.id === 'lumina') && list.findIndex(function (other) { return other && other.id === c.id; }) === index;
    }).slice(0, 1).map(function (c, index) {
      var old = previous.find(function (body) { return body.npcId === c.id; });
      return Object.assign({}, old || {}, { id: 'companion-' + c.id, npcId: c.id, name: c.name, role: c.role, sprite: c.sprite || c.id,
        color: c.color || '#b9deff', r: 11, x: clamp(finite(old && old.x, exploration.player.x - 35 + index * 28), 44, 916),
        y: clamp(finite(old && old.y, exploration.player.y + 35), 72, 498) });
    });
  }
  function followCompanions(exploration, dt) {
    var player = exploration.player;
    exploration.companions.forEach(function (c, index) {
      var angle = Math.atan2(player.facingY, player.facingX) + Math.PI;
      var dx = player.x + Math.cos(angle) * 42 - c.x, dy = player.y + Math.sin(angle) * 42 - c.y, distance = Math.hypot(dx, dy);
      var step = Math.min(distance, 210 * dt);
      if (distance > 0) { c.x += dx / distance * step; c.y += dy / distance * step; }
      if (Math.hypot(c.x - player.x, c.y - player.y) > 185) { c.x = player.x - 30; c.y = player.y + 25; }
      c.x = clamp(c.x, 44, 916); c.y = clamp(c.y, 72, 498);
    });
  }
  function ensure(run) {
    if (!run || STATES.indexOf(run.status) < 0) return null;
    var npc = (run.status === 'shop' || run.status === 'npc') ? getNpc(run) : null;
    var key = roomKey(run, npc), exploration = run.exploration;
    if (!exploration || exploration.version !== VERSION || exploration.key !== key || !exploration.player) {
      exploration = run.exploration = {
        version: VERSION, key: key, width: WIDTH, height: HEIGHT,
        bounds: { left: 32, right: 928, top: 60, bottom: 510 },
        player: { x: 480, y: 435, r: 12, facingX: 0, facingY: -1, dashTime: 0, dashCooldown: 0, dashBuffer: 0, dashX: 0, dashY: -1, moving: false },
        objects: [], obstacles: [], nearbyId: null, dialogId: null, time: 0, dashes: 0, dashHeld: false
      };
    }
    exploration.width = WIDTH; exploration.height = HEIGHT;
    exploration.bounds = { left: 32, right: 928, top: 60, bottom: 510 };
    var player = exploration.player;
    player.r = 12;
    player.x = clamp(finite(player.x, 480), 44, 916);
    player.y = clamp(finite(player.y, 435), 72, 498);
    player.facingX = finite(player.facingX, 0); player.facingY = finite(player.facingY, -1);
    player.dashX = finite(player.dashX, player.facingX); player.dashY = finite(player.dashY, player.facingY);
    player.dashTime = clamp(finite(player.dashTime, 0), 0, 0.22);
    player.dashCooldown = clamp(finite(player.dashCooldown, 0), 0, 1.4);
    if (!canDash(run)) { player.dashTime = 0; player.dashBuffer = 0; }
    exploration.time = Math.max(0, finite(exploration.time, 0));
    exploration.dashes = Math.max(0, finite(exploration.dashes, 0));
    if (!Array.isArray(exploration.obstacles)) exploration.obstacles = [];
    // Build actions from current engine state instead of trusting serialized UI data.
    exploration.objects = scatterObjects(run,buildObjects(run, npc, exploration));
    syncCompanions(run, exploration);
    if (!exploration.objects.some(function (target) { return target.id === exploration.dialogId && (target.kind === 'merchant' || target.kind === 'npc'); })) exploration.dialogId = null;
    nearObject(exploration);
    return exploration;
  }
  function blocked(exploration, x, y) {
    var r = exploration.player.r;
    return exploration.obstacles.some(function (box) {
      return Math.hypot(x - clamp(x, box.x, box.x + box.w), y - clamp(y, box.y, box.y + box.h)) < r;
    });
  }
  function move(exploration, dx, dy) {
    var player = exploration.player, bounds = exploration.bounds;
    var steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
    for (var i = 0; i < steps; i++) {
      var x = clamp(player.x + dx / steps, bounds.left + player.r, bounds.right - player.r);
      var y = clamp(player.y + dy / steps, bounds.top + player.r, bounds.bottom - player.r);
      if (!blocked(exploration, x, player.y)) player.x = x;
      if (!blocked(exploration, player.x, y)) player.y = y;
    }
  }
  function update(run, seconds, input) {
    var exploration = ensure(run);
    if (!exploration) return null;
    var player = exploration.player;
    player.moving = false;
    if (exploration.dialogId) { clearInput(run); return exploration; }
    var dt = clamp(finite(seconds, 0), 0, 0.1);
    if (!dt) return exploration;
    input = input || {};
    var x = clamp(finite(input.x, 0), -1, 1), y = clamp(finite(input.y, 0), -1, 1), length = Math.hypot(x, y);
    if (length > 0) { player.facingX = x / length; player.facingY = y / length; }
    // Preserve a short joystick tilt for slow walking, but cap diagonal keyboard speed.
    if (length > 1) { x /= length; y /= length; }
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.dashBuffer = Math.max(0, (player.dashBuffer || 0) - dt);
    var dashUnlocked = canDash(run);
    if (!dashUnlocked) { player.dashTime = 0; player.dashBuffer = 0; }
    if (dashUnlocked && input.dash && !exploration.dashHeld) {
      var facingLength = Math.hypot(player.facingX, player.facingY);
      player.queuedDashX = facingLength ? player.facingX / facingLength : 0;
      player.queuedDashY = facingLength ? player.facingY / facingLength : -1;
      player.dashBuffer = 0.14;
    }
    if (dashUnlocked && player.dashBuffer > 0 && player.dashCooldown <= 0 && player.dashTime <= 0) {
      player.dashTime = 0.22; player.dashCooldown = has(run, 'gale') ? 1.15 : 1.4;
      player.dashX = player.queuedDashX; player.dashY = player.queuedDashY; player.dashBuffer = 0;
      exploration.dashes++;
    }
    exploration.dashHeld = !!input.dash;
    var dashDt = Math.min(dt, player.dashTime), walkDt = dt - dashDt;
    var beforeX = player.x, beforeY = player.y;
    if (dashDt > 0) move(exploration, player.dashX * 760 * dashDt, player.dashY * 760 * dashDt);
    if (walkDt > 0 && length > 0) {
      var speed = has(run, 'gale') ? 219.6 : 180;
      move(exploration, x * speed * walkDt, y * speed * walkDt);
    }
    player.dashTime = Math.max(0, player.dashTime - dt);
    player.moving = player.x !== beforeX || player.y !== beforeY;
    exploration.time += dt;
    followCompanions(exploration, dt);
    nearObject(exploration);
    return exploration;
  }
  function nearest(run) { var exploration = ensure(run); return exploration ? nearObject(exploration) : null; }
  function inRange(exploration, target) {
    return target && Math.hypot(exploration.player.x - target.x, exploration.player.y - target.y) <= RANGE;
  }
  function applyResult(run, result, beforeKey) {
    if (!result || !result.ok) return result || fail('目前無法互動。');
    var exploration = ensure(run);
    return Object.assign({}, result, { changed: true, dialog: !!(exploration && exploration.key === beforeKey && exploration.dialogId) });
  }
  function interact(run) {
    var exploration = ensure(run);
    if (!exploration) return fail('目前無法與場景互動。');
    if (exploration.dialogId) return fail('請先結束交談，再移動到其他地方。');
    var target = nearObject(exploration);
    if (!target) return fail('請移動到目標附近，再按 E 互動。');
    if (target.kind === 'merchant' || target.kind === 'npc') {
      exploration.dialogId = target.id; exploration.player.dashTime = 0; exploration.player.moving = false; clearInput(run);
      return done('與' + target.name + '交談。', { dialog: true });
    }
    var result;
    // Each action is explicitly listed: objects never grant arbitrary engine access.
    if (target.action === 'chooseRoute' && run.status === 'route') result = Engine.chooseRoute(run, target.args[0]);
    else if (target.action === 'chooseReward' && run.status === 'reward') result = Engine.chooseReward(run, target.args[0]);
    else if (target.action === 'chooseCamp' && run.status === 'camp') result = Engine.chooseCamp(run, target.args[0]);
    else if (target.action === 'chooseEvent' && run.status === 'event') result = Engine.chooseEvent(run, target.args[0]);
    else if (target.action === 'leaveShop' && run.status === 'shop') result = Engine.leaveShop(run);
    else if (target.action === 'leaveNpc' && run.status === 'npc' && typeof Engine.leaveNpc === 'function') result = Engine.leaveNpc(run);
    else return fail('目前無法使用這個互動。');
    return applyResult(run, result, exploration.key);
  }
  function act(run, method, value) {
    var exploration = ensure(run);
    if (!exploration || !exploration.dialogId) return fail('請先走近角色並與他交談。');
    var target = exploration.objects.find(function (o) { return o.id === exploration.dialogId; });
    if (!inRange(exploration, target)) { exploration.dialogId = null; return fail('距離太遠，請重新走近角色交談。'); }
    var merchant = target.kind === 'merchant' && run.status === 'shop', npc = target.kind === 'npc' && run.status === 'npc';
    var result;
    if (method === 'buy' && merchant) result = Engine.buy(run, value);
    else if (method === 'dismissCompanion' && (merchant || npc) && typeof Engine.dismissCompanion === 'function') result = Engine.dismissCompanion(run);
    else if (method === 'helpNpc' && npc && typeof Engine.helpNpc === 'function') result = Engine.helpNpc(run);
    else if (method === 'challengeNpc' && (merchant || npc) && typeof Engine.challengeNpc === 'function') result = Engine.challengeNpc(run, value);
    else if (npc && target.npcId === 'lumina' && ['giveGift', 'talkNpc', 'beginBondQuest', 'confessBond'].indexOf(method) >= 0 && typeof Engine[method] === 'function') result = Engine[method](run, value);
    else return fail('交談中無法執行這個動作。');
    return applyResult(run, result, exploration.key);
  }
  function close(run) {
    var exploration = ensure(run);
    if (!exploration) return fail('目前沒有交談對象。');
    exploration.dialogId = null; exploration.player.moving = false;
    return done('結束交談，可以繼續移動。');
  }
  function clearInput(run) {
    var exploration = run && run.exploration;
    if (!exploration || !exploration.player) return;
    exploration.dashHeld = false; exploration.player.dashBuffer = 0;
    delete exploration.player.queuedDashX; delete exploration.player.queuedDashY;
  }
  return { ensure: ensure, update: update, nearest: nearest, interact: interact, act: act, close: close, clearInput: clearInput, RANGE: RANGE, STATES: STATES.slice() };
});
