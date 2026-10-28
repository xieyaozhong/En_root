/* Autonomous party AI: serializable roguelike agents for both the arena and exploration. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonCompanionAI = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var ARCHETYPES = {
    lantern: { trait: '謹慎守護', maxHp: 72, speed: 165, bravery: .30, curiosity: .31, reach: 66 },
    echo: { trait: '好奇冒險', maxHp: 60, speed: 185, bravery: .43, curiosity: .82, reach: 115 },
    sentinel: { trait: '魯莽前鋒', maxHp: 112, speed: 195, bravery: .94, curiosity: .38, reach: 93 },
    lumina: { trait: '理性星術', maxHp: 78, speed: 180, bravery: .48, curiosity: .56, reach: 88 }
  };
  var LABELS = { protect:'護衛', flank:'側翼迎擊', wander:'閒晃', explore:'自行探索', lost:'走失', return:'尋路歸隊', retreat:'受傷撤退', panic:'驚慌', heal:'療傷' };
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function random(run) {
    var n = (run.companionRng >>> 0) || ((Number(run.seed) >>> 0) ^ 0x9e3779b9) || 45328;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5; run.companionRng = n >>> 0;
    return (run.companionRng >>> 0) / 4294967296;
  }
  function profile(id) { return ARCHETYPES[id] || ARCHETYPES.lantern; }
  function prepare(run, member) {
    if (!run || !member) return member;
    var p = profile(member.id);
    if (!Number.isFinite(member.maxHp) || member.maxHp <= 0) member.maxHp = p.maxHp;
    if (!Number.isFinite(member.hp)) member.hp = member.maxHp;
    member.hp = clamp(member.hp, 0, member.maxHp);
    if (!Number.isFinite(member.morale)) member.morale = 75;
    member.morale = clamp(member.morale, 0, 100);
    if (!member.trait) member.trait = p.trait;
    if (!member.behavior) member.behavior = 'protect';
    if (!Number.isFinite(member.wounds)) member.wounds = 0;
    if (!Array.isArray(run.fallenCompanions)) run.fallenCompanions = [];
    return member;
  }
  function body(run, member, old) {
    prepare(run, member);
    var b = Object.assign({}, old || {});
    b.hp = member.hp; b.maxHp = member.maxHp; b.morale = member.morale;
    b.trait = member.trait; b.behavior = member.behavior;
    b.decisionTimer = Number.isFinite(b.decisionTimer) ? b.decisionTimer : .3;
    b.hurtCooldown = Number.isFinite(b.hurtCooldown) ? b.hurtCooldown : 0;
    b.lostTimer = Number.isFinite(b.lostTimer) ? b.lostTimer : 0;
    b.walkTimer = Number.isFinite(b.walkTimer) ? b.walkTimer : 0;
    b.alertFlash = Number.isFinite(b.alertFlash) ? b.alertFlash : 0;
    return b;
  }
  function report(run, type, message) {
    if (!run) return;
    run.eventId = (run.eventId || 0) + 1;
    run.lastEvent = { id: run.eventId, type: type, message: message };
    if (!Array.isArray(run.log)) run.log = [];
    run.log.unshift(message); if (run.log.length > 70) run.log.length = 70;
  }
  function save(run, actor) {
    if (!run || !actor) return;
    var member = (run.companions || []).find(function (x) { return x.id === actor.npcId; });
    if (!member) return;
    member.hp = clamp(Math.round(actor.hp), 0, actor.maxHp);
    member.morale = clamp(Math.round(actor.morale), 0, 100);
    member.behavior = actor.behavior;
    member.wounds = actor.wounds || 0;
  }
  function setBehavior(run, actor, next) {
    if (actor.behavior === next) return;
    actor.behavior = next;
    save(run, actor);
    if (next === 'lost') report(run, 'companion-lost', actor.name + ' 走失了！可能正在別處探索。');
    if (next === 'return') report(run, 'companion-return', actor.name + ' 正試著找回隊伍。');
  }
  function fall(run, area, actor, effect) {
    if (actor.dead || actor.hp > 0) return false;
    actor.dead = true; actor.hp = 0;
    var record = { id: actor.npcId, name: actor.name, trait: actor.trait,
      encounter: run.encounter, region: run.region, cause: actor.lastHurtCause || '地牢戰鬥' };
    if (!Array.isArray(run.fallenCompanions)) run.fallenCompanions = [];
    if (!run.fallenCompanions.some(function (c) { return c.id === record.id; })) run.fallenCompanions.push(record);
    run.companions = (run.companions || []).filter(function (c) { return c.id !== actor.npcId; });
    run.reserveCompanions = (run.reserveCompanions || []).filter(function (c) { return c.id !== actor.npcId; });
    if (area.echoQueue) area.echoQueue = area.echoQueue.filter(function (q) { return q.npcId !== actor.npcId; });
    if (effect) effect(area, 'death', actor.x, actor.y, { life: 1.5, r: 32, color: actor.color || '#b6d8ee', text: '隊友陣亡',
      actor: { id: actor.id, npcId: actor.npcId, sprite: actor.sprite, kind: 'npc', name: actor.name,
        x: actor.x, y: actor.y, r: actor.r, facingX: actor.facingX, facingY: actor.facingY } });
    report(run, 'companion-death', actor.name + ' 在本趟遠征中陣亡。這次無法再招募。');
    return true;
  }
  function hurt(run, area, actor, amount, cause, effect) {
    if (!actor || actor.dead || !(amount > 0) || actor.hurtCooldown > 0) return false;
    actor.hp = Math.max(0, actor.hp - Math.max(1, Math.round(amount)));
    actor.hurtCooldown = .82; actor.hurt = .22; actor.alertFlash = .55;
    actor.morale = clamp(actor.morale - 8, 0, 100); actor.wounds = (actor.wounds || 0) + 1;
    actor.lastHurtCause = cause || '怪物攻擊';
    if (effect) effect(area, 'impact', actor.x, actor.y, { r: 23, color: '#ff7f99', text: '-' + Math.round(amount), life: .5 });
    save(run, actor);
    fall(run, area, actor, effect);
    return true;
  }
  function choose(run, area, actor, combat) {
    var p = profile(actor.npcId), near = distance(actor, area.player), enemy = (area.enemies || []).filter(function (e) { return e.alive && e.active !== false; })
      .sort(function (a, b) { return distance(a, actor) - distance(b, actor); })[0];
    if (actor.hp <= actor.maxHp * .26) { setBehavior(run, actor, 'retreat'); return; }
    if (actor.morale < 22 && enemy && distance(actor, enemy) < 160) { setBehavior(run, actor, 'panic'); return; }
    if (actor.behavior === 'lost' && actor.lostTimer > 0) return;
    if (actor.behavior === 'lost') { setBehavior(run, actor, 'return'); return; }
    if (near > 280 && actor.behavior !== 'return') { actor.lostTimer = 3 + random(run) * 6; setBehavior(run, actor, 'lost'); return; }
    if (actor.behavior === 'return' && near > 78) return;
    var r = random(run);
    if (r < p.curiosity * (combat ? .16 : .30)) setBehavior(run, actor, 'explore');
    else if (r < p.curiosity * (combat ? .24 : .53)) setBehavior(run, actor, 'wander');
    else if (combat && enemy && r < p.bravery * .68 + .23) setBehavior(run, actor, 'flank');
    else setBehavior(run, actor, 'protect');
    if (actor.behavior === 'explore' || actor.behavior === 'wander') {
      actor.walkTimer = 2.3 + random(run) * 3.5;
      actor.goalX = 90 + random(run) * 775;
      actor.goalY = 105 + random(run) * 340;
    }
  }
  function steer(run, area, actor, dt, combat, move) {
    var p = profile(actor.npcId), player = area.player, near = distance(player, actor);
    var enemies = (area.enemies || []).filter(function (e) { return e.alive && e.active !== false; });
    var enemy = enemies.sort(function (a, b) { return distance(a, actor) - distance(b, actor); })[0];
    actor.decisionTimer -= dt; actor.walkTimer -= dt;
    if (actor.behavior === 'lost') actor.lostTimer -= dt;
    if (actor.decisionTimer <= 0 || ((actor.behavior === 'wander' || actor.behavior === 'explore') && actor.walkTimer <= 0)) {
      choose(run, area, actor, combat);
      actor.decisionTimer = 1.1 + random(run) * 1.8;
    }
    var x = player.x - 48, y = player.y + 30;
    if (actor.behavior === 'protect') {
      var side = actor.npcId === 'sentinel' ? 1 : -1;
      x = player.x + (player.facingX || 1) * p.reach * side;
      y = player.y + (player.facingY || 0) * p.reach * side + (actor.npcId === 'lumina' ? -20 : 17);
    } else if (actor.behavior === 'flank' && enemy) {
      var angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + (actor.npcId === 'sentinel' ? .65 : -1.05);
      x = enemy.x + Math.cos(angle) * p.reach; y = enemy.y + Math.sin(angle) * p.reach;
    } else if (actor.behavior === 'explore' || actor.behavior === 'wander' || actor.behavior === 'lost') {
      if (!Number.isFinite(actor.goalX) || actor.walkTimer <= 0) {
        actor.goalX = 78 + random(run) * 805; actor.goalY = 92 + random(run) * 370;
        actor.walkTimer = 2.3 + random(run) * 4;
      }
      x = actor.goalX; y = actor.goalY;
    } else if (actor.behavior === 'retreat' || actor.behavior === 'panic') {
      var threat = enemy || player;
      var dx = actor.x - threat.x, dy = actor.y - threat.y, d = Math.hypot(dx, dy) || 1;
      x = actor.x + dx / d * 120; y = actor.y + dy / d * 120;
      if (near > 250) { x = player.x - 65; y = player.y + 40; }
    }
    var b = area.bounds || { left: 40, right: 920, top: 60, bottom: 500 };
    x = clamp(x, b.left + 30, b.right - 30); y = clamp(y, b.top + 30, b.bottom - 30);
    var length = Math.hypot(x - actor.x, y - actor.y);
    actor.moving = length > 4;
    if (length > 1) {
      var speed = p.speed * (actor.behavior === 'lost' ? .82 : actor.behavior === 'panic' ? 1.19 : 1);
      var step = Math.min(length, speed * dt);
      var vx = (x - actor.x) / length, vy = (y - actor.y) / length;
      move(actor, vx * step, vy * step);
      actor.facingX = vx; actor.facingY = vy;
    }
    if (!combat && actor.behavior === 'protect' && near < 72) actor.morale = Math.min(100, actor.morale + dt * .15);
    if (combat && actor.behavior === 'flank' && near < 150) actor.morale = Math.min(100, actor.morale + dt * .13);
    if (actor.behavior === 'retreat' && actor.hp > actor.maxHp * .52) setBehavior(run, actor, 'return');
    actor.alertFlash = Math.max(0, (actor.alertFlash || 0) - dt);
    actor.hurtCooldown = Math.max(0, (actor.hurtCooldown || 0) - dt);
  }
  function advanceCombat(run, area, dt, api) {
    (area.companions || []).forEach(function (actor) {
      if (actor.dead) return;
      steer(run, area, actor, dt, true, function (c, dx, dy) { api.move(area, c, dx, dy); });
      save(run, actor);
    });
  }
  function advanceExplore(run, area, dt) {
    (area.companions || []).forEach(function (actor) {
      if (actor.dead) return;
      steer(run, area, actor, dt, false, function (c, dx, dy) {
        var b = area.bounds;
        c.x = clamp(c.x + dx, b.left + c.r, b.right - c.r);
        c.y = clamp(c.y + dy, b.top + c.r, b.bottom - c.r);
      });
      save(run, actor);
    });
  }
  function postCombat(run, area, dt, effect) {
    var allies = area.companions || [];
    allies.forEach(function (c) {
      if (c.dead) return;
      var incoming = (area.projectiles || []).find(function (b) { return b.life > 0 && b.source !== 'companion' && distance(b,c) < (b.r || 5) + c.r; });
      if (incoming) { incoming.life = 0; hurt(run, area, c, Math.max(3, incoming.damage * .7), '敵方彈幕', effect); }
      if (c.hurtCooldown > 0) return;
      var hazard = (area.hazards || []).find(function (h) {
        if (h.cosmetic || h.life <= 0 || h.delay > 0 || h.source === 'companion') return false;
        var r = h.r || 30, inner = h.innerR || 0, d = distance(h,c);
        return d < r + c.r && d >= Math.max(0, inner - c.r);
      });
      if (hazard) hurt(run, area, c, Math.max(2, (hazard.damage || 7) * .68), '地形或首領攻擊', effect);
      if (c.hurtCooldown > 0) return;
      var melee = (area.enemies || []).find(function (e) {
        return e.alive && e.active !== false && e.action && e.action.stage === 'active' && distance(e,c) < e.r + c.r + 18;
      });
      if (melee) hurt(run, area, c, melee.kind === 'boss' ? 10 : 5, '怪物近戰', effect);
    });
    area.companions = allies.filter(function (c) { return !c.dead; });
    if (area.projectiles) area.projectiles = area.projectiles.filter(function (p) { return p.life > 0; });
  }
  function friendlyFire(run, area, actor, target, effect) {
    if (!actor || !target || actor.dead || random(run) > (actor.npcId === 'sentinel' ? .22 : .10)) return false;
    var ax = actor.x, ay = actor.y, tx = target.x - ax, ty = target.y - ay, len2 = tx * tx + ty * ty;
    if (len2 < 1) return false;
    var victims = [area.player].concat((area.companions || []).filter(function (c) { return c !== actor && !c.dead; }));
    var hit = victims.find(function (v) {
      var u = clamp(((v.x-ax)*tx + (v.y-ay)*ty)/len2, 0, 1);
      var dis = Math.hypot(v.x-(ax+tx*u),v.y-(ay+ty*u));
      return u > .12 && u < .94 && dis < (v.r || 12) + (actor.npcId === 'sentinel' ? 23 : 14);
    });
    if (!hit) return false;
    var amount = actor.npcId === 'sentinel' ? 5 : 3;
    if (hit === area.player) {
      // Accidental hits are nonlethal to the player and cannot end a run.
      var blocked = Math.min(run.player.shield || 0, amount);
      run.player.shield = Math.max(0, (run.player.shield || 0) - blocked);
      run.player.hp = Math.max(1, run.player.hp - Math.max(0, amount - blocked));
      effect(area, 'impact', hit.x, hit.y, { color:'#ffc17f', text:'友軍誤傷', r:29, life:.75 });
    } else {
      hit.hurtCooldown = 0;
      hurt(run, area, hit, amount, '友軍誤傷', effect);
    }
    report(run, 'friendly-fire', actor.name + ' 的招式誤傷了' + (hit === area.player ? '你' : hit.name) + '。');
    return true;
  }
  return { ARCHETYPES:ARCHETYPES, LABELS:LABELS, prepare:prepare, body:body,
    advanceCombat:advanceCombat, advanceExplore:advanceExplore, postCombat:postCombat,
    friendlyFire:friendlyFire, hurt:hurt, fall:fall, report:report };
});
