/* Four spell schools. Existing English spelling stays the only source of successful casts. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonCombatArts = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var STYLES = [
    { id:'ember', name:'燼刃流', icon:'炎', color:'#ffc083', label:'爆裂・追擊', detail:'每 3 次成功詠唱追加燃焰傷害。' },
    { id:'frost', name:'霜鏡流', icon:'霜', color:'#a8dfff', label:'凝滯・控場', detail:'冰霜術式延緩敵人行動，連咒追加傷害。' },
    { id:'gale', name:'風隼流', icon:'風', color:'#a9f5cc', label:'穿梭・連斬', detail:'獲得短暫閃避窗口，連咒可追擊附近目標。' },
    { id:'astral', name:'星誓流', icon:'星', color:'#ecc0ff', label:'援護・生存', detail:'施法積累護盾與微量治癒，守護遠征。' }
  ];
  function get(run) { return STYLES.find(function (s) { return s.id === (run && run.combatSchool); }) || STYLES[0]; }
  function select(run, id) {
    var style = STYLES.find(function (s) { return s.id === id; });
    if (!run || !style) return false;
    if (run.status === 'lost' || run.status === 'won') return false;
    run.combatSchool = id;
    run.schoolCharges = 0;
    return true;
  }
  function afterCast(run, arena, target, result, api) {
    if (!run || !arena || !result || !result.ok || !target) return;
    var style = get(run), n = run.schoolCharges = (run.schoolCharges || 0) + 1;
    var third = n % 3 === 0, fourth = n % 4 === 0;
    var color = style.color, x = target.x, y = target.y;
    var extra = 0;
    if (style.id === 'ember') {
      if (third && run.status === 'combat' && target.alive) extra = api.damage(run, arena, target, 7 + Math.min(6, (run.region || 0) * 2));
    } else if (style.id === 'frost') {
      arena.slowTime = Math.max(arena.slowTime || 0, third ? 2.2 : .65);
      if (third && run.status === 'combat' && target.alive) extra = api.damage(run, arena, target, 3);
    } else if (style.id === 'gale') {
      arena.player.invulnerable = Math.max(arena.player.invulnerable || 0, .11);
      if (fourth && run.status === 'combat') {
        var other = (arena.enemies || []).find(function (e) { return e.alive && e.active && e.id !== target.id && Math.hypot(e.x-x,e.y-y) < 230; });
        if (other) {
          extra = api.damage(run, arena, other, 6);
          api.effect(arena, 'chain', x, y, { x2:other.x, y2:other.y, color:color, life:.42 });
        }
      }
    } else if (style.id === 'astral') {
      run.player.shield = Math.min(85, (run.player.shield || 0) + (third ? 3 : 1));
      if (fourth && run.status === 'combat') api.heal(run, 2);
    }
    api.effect(arena, 'school-' + style.id, x, y, { r:third?54:31, life:third?.64:.39, color:color,
      fromX:arena.player.x, fromY:arena.player.y, charged:third, school:style.id, text:third ? style.icon+'·奧義' : '' });
    if (result.damage > 0 || extra > 0) {
      arena.hitStop = Math.max(arena.hitStop || 0, third ? .085 : .042);
      arena.castHitSerial = (arena.castHitSerial || 0) + 1;
      arena.lastCastHit = { x:x, y:y, boss:target.kind === 'boss', school:style.id };
    }
    if (extra > 0) result.damage = (result.damage || 0) + extra;
    return { style:style.id, bonus:extra };
  }
  return { STYLES:STYLES, get:get, select:select, afterCast:afterCast };
});
