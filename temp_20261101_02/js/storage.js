/* ============================================================
 * storage.js —— 本地数据持久化（金币 / 分数 / 皮肤 / 设置）
 * ============================================================ */
const Storage = (() => {
  const KEY = 'cartoon_battle_house_v1';

  // 默认数据
  const defaultData = {
    coins: 50,
    score: 0,
    nickname: '玩家',
    ownedSkins: ['default-red', 'default-blue'],
    equippedP1: 'default-red',
    equippedP2: 'default-blue',
    settings: {
      sfx: 60,
      bgm: 40,
      difficulty: 'normal',
      touch: 'auto',
      server: '',
    },
    stats: { wins: 0, loses: 0 },
  };

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultData, ...parsed, settings: { ...defaultData.settings, ...(parsed.settings||{}) } };
      }
    } catch (e) { console.warn('存储读取失败', e); }
    return JSON.parse(JSON.stringify(defaultData));
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn(e); }
  }

  return {
    get: () => data,
    addCoins(n) { data.coins += n; save(); },
    addScore(n) { data.score += n; save(); },
    buySkin(id, price) {
      if (data.coins >= price && !data.ownedSkins.includes(id)) {
        data.coins -= price;
        data.ownedSkins.push(id);
        save();
        return true;
      }
      return false;
    },
    owns(id) { return data.ownedSkins.includes(id); },
    equip(player, id) {
      if (!data.ownedSkins.includes(id)) return false;
      if (player === 1) data.equippedP1 = id;
      else data.equippedP2 = id;
      save();
      return true;
    },
    recordWin() { data.stats.wins++; save(); },
    recordLose() { data.stats.loses++; save(); },
    setNickname(name) { data.nickname = name || '玩家'; save(); },
    updateSettings(s) { Object.assign(data.settings, s); save(); },
  };
})();
