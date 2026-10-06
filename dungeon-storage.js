(function (global) {
  "use strict";

  const KEYS = Object.freeze({ cards: "enroot_cards", dungeon: "enroot_dungeon_v1", pending: "enroot_dungeon_entry_pending" });
  const LOCK = "enroot-dungeon-storage";
  let queue = Promise.resolve();
  const observedRevisions = new Map();

  function fault(code, message) { const error = new Error(message); error.code = code; throw error; }
  function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function whole(value) { return Number.isSafeInteger(value) && value >= 0; }
  function fail(error) {
    return { ok: false, code: error.code || "STORAGE_UNAVAILABLE", error: error.code ? error.message : "目前無法儲存遊戲，請確認瀏覽器允許儲存資料後再試一次。" };
  }
  function read(key) { return global.localStorage.getItem(key); }
  function write(key, value) { global.localStorage.setItem(key, JSON.stringify(value)); }
  function parse(raw, kind) {
    try { return JSON.parse(raw); }
    catch (_) { fault("CORRUPT_DATA", kind + "無法讀取，現有資料已保留。請先備份瀏覽器資料。" ); }
  }
  function inventory(raw) {
    const value = raw === null ? {} : parse(raw, "卡片收藏");
    if (!record(value) || Object.values(value).some(item => !record(item) || !whole(item.count))) {
      fault("CORRUPT_COLLECTION", "卡片收藏格式不完整，現有資料已保留，暫時無法消耗卡片。" );
    }
    return value;
  }
  function catalog(cards) {
    if (!Array.isArray(cards) || cards.some(card => !record(card) || typeof card.word !== "string" || !card.word)) {
      fault("INVALID_CATALOG", "卡片資料尚未載入完成，請重新整理後再試一次。" );
    }
    return cards;
  }
  function snapshot(run) {
    if (!record(run)) fault("INVALID_RUN", "遊戲進度不完整，無法開始或儲存。" );
    let raw;
    try { raw = JSON.stringify(run); }
    catch (_) { fault("INVALID_RUN", "遊戲進度不完整，無法開始或儲存。" ); }
    if (!raw || raw.length > 2000000) fault("INVALID_RUN", "遊戲進度超出可儲存範圍。" );
    return JSON.parse(raw);
  }
  function validReceipt(receipt) {
    return record(receipt) && typeof receipt.id === "string" && receipt.id.length > 0 && typeof receipt.word === "string" &&
      typeof receipt.rarity === "string" && whole(receipt.at) && whole(receipt.remaining);
  }
  function validActive(active) {
    return active === null || (record(active) && validReceipt(active.receipt) && record(active.run) && typeof active.finished === "boolean" &&
      (active.revision === undefined || whole(active.revision)));
  }
  function emptyState() { return { version: 1, active: null, stats: { runs: 0, wins: 0, shards: 0, bestFloor: 0 } }; }
  function state() {
    const raw = read(KEYS.dungeon);
    if (raw === null) return emptyState();
    const value = parse(raw, "地牢進度");
    if (!record(value) || value.version !== 1 || !validActive(value.active) || !record(value.stats) ||
      !["runs", "wins", "shards", "bestFloor"].every(key => whole(value.stats[key]))) {
      fault("CORRUPT_SAVE", "地牢進度格式不完整，現有資料已保留，暫時無法儲存新冒險。" );
    }
    return value;
  }
  // Recover the run, never the collection: replaying an old collection snapshot
  // could otherwise restore cards after the user clears or changes their inventory.
  function recover() {
    const saved = state(), raw = read(KEYS.pending);
    if (raw === null) return saved;
    const pending = parse(raw, "入場紀錄");
    if (!record(pending) || pending.version !== 1 || !validActive(pending.active) || pending.active === null ||
      !(pending.cardsBefore === null || typeof pending.cardsBefore === "string") || typeof pending.cardsAfter !== "string") {
      fault("CORRUPT_PENDING", "入場紀錄格式不完整，現有資料已保留。" );
    }
    const beforeCollection = inventory(pending.cardsBefore), afterCollection = inventory(pending.cardsAfter);
    const word = pending.active.receipt.word;
    if (!Object.prototype.hasOwnProperty.call(beforeCollection, word) || !Object.prototype.hasOwnProperty.call(afterCollection, word) ||
      beforeCollection[word].count < 1 || afterCollection[word].count !== beforeCollection[word].count - 1 ||
      pending.active.receipt.remaining !== afterCollection[word].count || pending.active.finished) {
      fault("CORRUPT_PENDING", "入場紀錄格式不完整，現有資料已保留。" );
    }
    beforeCollection[word] = Object.assign({}, beforeCollection[word], { count: beforeCollection[word].count - 1 });
    if (JSON.stringify(beforeCollection) !== pending.cardsAfter) fault("CORRUPT_PENDING", "入場紀錄格式不完整，現有資料已保留。" );
    if (saved.active && saved.active.receipt.id === pending.active.receipt.id) {
      global.localStorage.removeItem(KEYS.pending);
      return saved;
    }
    if (saved.active) fault("ENTRY_CONFLICT", "另一場冒險尚未結束，請先接續目前的冒險。" );
    const current = read(KEYS.cards);
    inventory(current);
    if (current === pending.cardsAfter) {
      saved.active = pending.active;
      write(KEYS.dungeon, saved);
      global.localStorage.removeItem(KEYS.pending);
      return saved;
    }
    if (current === pending.cardsBefore) {
      global.localStorage.removeItem(KEYS.pending);
      return saved;
    }
    fault("ENTRY_CONFLICT", "入場時的收藏紀錄已變更，資料已保留。請先備份瀏覽器資料，再處理未完成的入場紀錄。" );
  }
  function serial(operation) {
    const invoke = async () => {
      try {
        if (global.navigator && global.navigator.locks && typeof global.navigator.locks.request === "function") {
          return await global.navigator.locks.request(LOCK, { mode: "exclusive" }, operation);
        }
        // All operations are synchronous inside this callback; the queue also
        // prevents overlapping calls from this document on older browsers.
        return operation();
      } catch (error) { return fail(error); }
    };
    const next = queue.then(invoke, invoke);
    queue = next.then(() => undefined, () => undefined);
    return next;
  }
  function result(saved) {
    if (saved.active) observedRevisions.set(saved.active.receipt.id, saved.active.revision || 0);
    return { ok: true, active: saved.active, stats: saved.stats };
  }
  function match(saved, receiptId) {
    if (!saved.active || saved.active.receipt.id !== receiptId) {
      fault("STALE_RUN", "這場冒險已在其他頁面變更，請重新載入目前的進度。" );
    }
    if (observedRevisions.get(receiptId) !== (saved.active.revision || 0)) {
      fault("STALE_RUN", "這場冒險已在其他頁面變更，請重新載入目前的進度。" );
    }
  }
  function newId() {
    return global.crypto && typeof global.crypto.randomUUID === "function" ? global.crypto.randomUUID() :
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
  }

  global.DungeonStorage = Object.freeze({
    keys: KEYS,
    lockName: LOCK,
    listOwned(cards) {
      try {
        const collection = inventory(read(KEYS.cards));
        const owned = catalog(cards).filter(card => Object.prototype.hasOwnProperty.call(collection, card.word) && collection[card.word].count > 0)
          .map(card => Object.assign({}, card, { count: collection[card.word].count }));
        return { ok: true, cards: owned, totalCopies: owned.reduce((sum, card) => sum + card.count, 0) };
      } catch (error) { return fail(error); }
    },
    load() { return serial(() => result(recover())); },
    consumeEntry(word, cards, initialRun) {
      let run;
      try { run = snapshot(initialRun); catalog(cards); }
      catch (error) { return Promise.resolve(fail(error)); }
      return serial(() => {
        const saved = recover();
        if (saved.active) fault("ACTIVE_RUN", "已有一場冒險，請先接續或結束後再消耗卡片。" );
        const card = cards.find(item => item.word === word);
        if (!card) fault("UNKNOWN_CARD", "找不到這張卡片，請重新選擇入場卡片。" );
        const before = read(KEYS.cards), collection = inventory(before);
        if (!Object.prototype.hasOwnProperty.call(collection, word) || collection[word].count < 1) {
          fault("NO_CARD", "這張卡片已用完，請選擇其他卡片或完成練習取得新卡片。" );
        }
        collection[word] = Object.assign({}, collection[word], { count: collection[word].count - 1 });
        const receipt = { id: newId(), word, rarity: String(card.rarity || "N"), at: Date.now(), remaining: collection[word].count };
        const active = { receipt, run, finished: false, revision: 0 };
        const after = JSON.stringify(collection);
        write(KEYS.pending, { version: 1, cardsBefore: before, cardsAfter: after, active });
        global.localStorage.setItem(KEYS.cards, after);
        saved.active = active;
        write(KEYS.dungeon, saved);
        global.localStorage.removeItem(KEYS.pending);
        return Object.assign(result(saved), { receipt, run });
      });
    },
    saveRun(run, receiptId) {
      let copy;
      try { copy = snapshot(run); }
      catch (error) { return Promise.resolve(fail(error)); }
      return serial(() => {
        const saved = recover();
        match(saved, receiptId);
        if (saved.active.finished) return result(saved);
        saved.active.run = copy;
        saved.active.revision = (saved.active.revision || 0) + 1;
        write(KEYS.dungeon, saved);
        return result(saved);
      });
    },
    finishRun(receiptId, summary, finalRun) {
      let copy;
      try {
        if (!record(summary) || typeof summary.won !== "boolean" || !whole(summary.shards) || !whole(summary.floor)) {
          fault("INVALID_RESULT", "冒險結算資料不完整，進度已保留。" );
        }
        if (finalRun !== undefined) copy = snapshot(finalRun);
      } catch (error) { return Promise.resolve(fail(error)); }
      return serial(() => {
        const saved = recover();
        match(saved, receiptId);
        if (saved.active.finished) return result(saved);
        if (!saved.active.finished) {
          const next = { runs: saved.stats.runs + 1, wins: saved.stats.wins + (summary.won ? 1 : 0),
            shards: saved.stats.shards + summary.shards, bestFloor: Math.max(saved.stats.bestFloor, summary.floor) };
          if (!Object.values(next).every(whole)) fault("INVALID_RESULT", "冒險結算數值超出可儲存範圍，進度已保留。" );
          saved.stats = next;
          saved.active.finished = true;
          saved.active.summary = { won: summary.won, shards: summary.shards, floor: summary.floor };
          saved.active.revision = (saved.active.revision || 0) + 1;
        }
        if (copy) saved.active.run = copy;
        write(KEYS.dungeon, saved);
        return result(saved);
      });
    },
    abandonRun(receiptId) {
      return serial(() => {
        const saved = recover();
        match(saved, receiptId);
        saved.active = null;
        write(KEYS.dungeon, saved);
        observedRevisions.delete(receiptId);
        return result(saved);
      });
    }
  });
})(window);
