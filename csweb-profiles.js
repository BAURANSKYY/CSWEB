/* CSWEB - profile po nicku z ustawien gry (PLAYER NAME).
   Panelu nie ma: nick wpisujesz w SETTINGS, profil laduje sie sam.
   Nick BAURANSKYY odblokowuje wszystkie skiny z katalogu.
   Nie tyka silnika gry: operuje tylko na localStorage. */
(function () {
  'use strict';
  var INV_KEY = 'clutcher_inv_v1';
  var NAME_KEY = 'clutcher_name';
  var ACTIVE_KEY = 'csweb_active';
  var PFX = 'csweb_inv_';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // 1. przy starcie: wczytaj profil aktywny ZANIM gra go odczyta
  var active = lsGet(ACTIVE_KEY);
  if (active) {
    var snap0 = lsGet(PFX + active);
    if (snap0) {
      lsSet(INV_KEY, snap0);
      lsSet(NAME_KEY, active);
    }
  }
  var lastSeen = lsGet(INV_KEY);
  var lastNick = lsGet(ACTIVE_KEY);
  var unlockTried = false;

  //usuniecie nadanych skinow gdy nick to nie BAURANSKYY (uid 'all...')
  function stripGranted() {
    if ((lsGet(ACTIVE_KEY) || '').toLowerCase() === 'bauranskyy') return false;
    var raw = lsGet(INV_KEY), d;
    try { d = JSON.parse(raw); } catch (e) { return false; }
    if (!d || !d.items) return false;
    var n0 = d.items.length;
    d.items = d.items.filter(function (it) { return !(it.uid && it.uid.indexOf('all') === 0); });
    if (d.items.length === n0) return false;
    try {
      lsSet(INV_KEY, JSON.stringify(d));
      var a = lsGet(ACTIVE_KEY);
      if (a) lsSet(PFX + a, JSON.stringify(d));
    } catch (e) { return false; }
    lastSeen = lsGet(INV_KEY);
    return true;
  }
  try { stripGranted(); } catch (e) {}

  // 1b. BAURANSKYY: wszystkie skiny z katalogu (raz na zmiane nicku)
  function unlockAll() {
    if ((lsGet(ACTIVE_KEY) || '').toLowerCase() !== 'bauranskyy') return;
    if (unlockTried) return;
    unlockTried = true;
    fetch('csweb-catalog.json').then(function (r) { return r.json(); }).then(function (cat) {
      if (!cat || !cat.length) return;
      var raw = lsGet(INV_KEY);
      var d;
      try { d = JSON.parse(raw); } catch (e) { return; }
      if (!d || !d.items) return;
      var have = {};
      d.items.forEach(function (it) { have[it.skin] = 1; });
      var added = 0;
      cat.forEach(function (o) {
        if (!o || !o.id || have[o.id]) return;
        have[o.id] = 1;
        added++;
        d.items.push({ uid: 'all' + added.toString(36) + ((Math.random() * 1296) | 0).toString(36), skin: o.id, wear: 0.05, seed: (Math.random() * 999) | 0, st: false, kills: 0, t: Date.now() });
      });
      if (!added) return;
      try { lsSet(INV_KEY, JSON.stringify(d)); } catch (e) { return; }
      lastSeen = lsGet(INV_KEY);
      lsSet(PFX + lsGet(ACTIVE_KEY), lastSeen);
      location.reload();
    }).catch(function () {});
  }
  try { unlockAll(); } catch (e) {}

  // 2. co 2 s: sledz nick z ustawien + zapisuj zmiany gry do profilu
  setInterval(function () {
    var engName = (lsGet(NAME_KEY) || '').trim().slice(0, 20);
    var nick = lsGet(ACTIVE_KEY);
    if (engName && engName !== nick) {
      var cur = lsGet(INV_KEY);
      if (nick && cur) lsSet(PFX + nick, cur);
      var snap = lsGet(PFX + engName);
      if (snap) lsSet(INV_KEY, snap);
      else if (cur) lsSet(PFX + engName, cur);
      lsSet(ACTIVE_KEY, engName);
      lastSeen = lsGet(INV_KEY);
      lastNick = engName;
      unlockTried = false;
      try { if (stripGranted()) { location.reload(); return; } } catch (e) {}
      try { unlockAll(); } catch (e) {}
      return;
    }
    if (nick !== lastNick) { lastNick = nick; unlockTried = false; try { unlockAll(); } catch (e) {} }
    var cur2 = lsGet(INV_KEY);
    if (nick && cur2 && cur2 !== lastSeen) {
      lastSeen = cur2;
      lsSet(PFX + nick, cur2);
    }
  }, 2000);
})();
