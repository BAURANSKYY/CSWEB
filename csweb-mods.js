/* CSWEB mody: etykiety map, porzadki w menu, celownik, marketplace testowy.
   Nie tyka silnika gry poza odczytem/zapisem localStorage i gotowymi klasami CSS. */
(function () {
  'use strict';

  /* ---------- 1. ETYKIETY MAP ---------- */
  function mapLabels(root) {
    var o = (root || document).querySelector('#opt-map button[data-v="oasis"]');
    if (o && o.textContent !== 'Mirage') o.textContent = 'Mirage';
    var d = (root || document).querySelector('#opt-map button[data-v="dusker"]');
    if (d && d.textContent !== 'Dust II') d.textContent = 'Dust II';
  }

  /* ---------- 2. UKRYWANIE: discord box + stopka ---------- */
  function hideJunk() {
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        var v = n.nodeValue || '';
        if (/join the community/i.test(v)) {
          var box = n.parentNode;
          for (var k = 0; k < 4 && box && box !== document.body; k++) {
            box = box.parentNode;
            if (box && box.querySelector && box.querySelector('a[href*="discord"]')) { box.style.display = 'none'; break; }
          }
        }
      });
      document.querySelectorAll('a[href*="partners.html"]').forEach(function (a) {
        var f = a.closest('#menufoot, footer, div');
        if (f) f.style.display = 'none';
      });
      // pigułka rangi w topnav (Master Guardian itd.) - precz, zostaje nick i monety
      document.querySelectorAll('.nav-side.right span, .nav-side.right div').forEach(function (el) {
        if (el.id === 'navname' || el.id === 'coins') return;
        if (/guardian|legend|eagle|nova|master|supreme|global|silver|gold|distinguished|elite|diamond|ak |sheriff|·\s*\d{3,}/i.test(el.textContent || '')) el.style.display = 'none';
      });
    } catch (e) {}
  }

  /* ---------- 2b. LOADOUT: równe kolumny, bez podpisów ---------- */
  function loadoutTidy() {
    try {
      var root = document.getElementById('tab-loadout');
      if (!root) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        var v = (n.nodeValue || '').replace(/[\u2013\u2014]/g, '-').trim().toLowerCase();
        if (v === 'always included' || v === 'slots 2-5' || v.indexOf('you spawn with this') >= 0
          || v.indexOf('these are the weapons you can buy') === 0
          || v.indexOf('in a match, open the buy menu') === 0) {
          var el = n.parentNode;
          if (el && el.style) el.style.display = 'none';
        }
      });
    } catch (e) {}
  }


  var XKEY = 'csweb_xhair';
  var XCOLORS = ['#3cff5a', '#00e5ff', '#ffe14d', '#ff4d4d', '#ffffff', '#ff6ee7'];
  function xhairGet() {
    try { return Object.assign({ color: '#3cff5a', stat: false }, JSON.parse(localStorage.getItem(XKEY) || '{}')); }
    catch (e) { return { color: '#3cff5a', stat: false }; }
  }
  function xhairApply() {
    var x = xhairGet();
    document.body.classList.toggle('csweb-xhair-static', !!x.stat);
    document.body.classList.toggle('csweb-xhair-color', x.color !== '#3cff5a');
    document.body.style.setProperty('--xhair', x.color);
  }
  function xhairUI() {
    var box = document.getElementById('settingsbox');
    if (!box || document.getElementById('csweb-xrow')) return;
    var x = xhairGet();
    var row = document.createElement('div');
    row.className = 'srow';
    row.id = 'csweb-xrow';
    row.innerHTML = '<label>CROSSHAIR</label><div id="csweb-xbtns" style="display:flex;gap:6px;flex-wrap:wrap"></div>'
      + '<div style="margin-top:6px"><button id="csweb-xstat" class="mbtn" style="font-size:12px"></button></div>';
    box.appendChild(row);
    var btns = row.querySelector('#csweb-xbtns');
    XCOLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.style.cssText = 'width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:' + c + ';cursor:pointer';
      b.title = c;
      b.onclick = function () {
        var s = xhairGet(); s.color = c;
        localStorage.setItem(XKEY, JSON.stringify(s)); xhairApply();
      };
      btns.appendChild(b);
    });
    var st = row.querySelector('#csweb-xstat');
    function ref() {
      var s = xhairGet();
      st.textContent = 'Static crosshair: ' + (s.stat ? 'ON' : 'off');
    }
    st.onclick = function () {
      var s = xhairGet(); s.stat = !s.stat;
      localStorage.setItem(XKEY, JSON.stringify(s)); xhairApply(); ref();
    };
    ref();
  }

  /* ---------- 2c. INVENTORY: zwijane grupy na bron ---------- */
  function lockerGroups() {
    var boxes;
    try { boxes = document.querySelectorAll('#lockerlist .lk-wep'); }
    catch (e) { return; }
    boxes.forEach(function (box) {
      if (box.cswebGrouped) return;
      box.cswebGrouped = true;
      var cards = box.querySelectorAll('.skintile');
      if (!cards.length) return;
      cards.forEach(function (c) {
        var nm = c.querySelector('.st-name');
        if (nm && nm.textContent.trim() === 'Default') nm.style.display = 'none';
      });
      if (cards.length < 2) return;
      box.classList.add('csweb-shut');
      for (var k = 1; k < cards.length; k++) cards[k].classList.add('csweb-hide');
      var first = cards[0];
      first.title = 'Click to expand skins';
      first.addEventListener('click', function (ev) {
        if (!box.classList.contains('csweb-shut')) return;
        ev.stopPropagation();
        ev.preventDefault();
        box.classList.remove('csweb-shut');
        for (var m = 1; m < cards.length; m++) cards[m].classList.remove('csweb-hide');
      }, true);
    });
  }

  /* ---------- 2d. SCOREBOARD: bez brandu, nie nad pauzą ---------- */
  /* ---------- 2c. KAFELKI: pokaz equipniety skin zamiast bialej sylwetki ---------- */
  var EQCAT = null, EQCAT_LOADING = false;
  var EQRC = { consumer: '#b0c3d9', industrial: '#5e98d9', milspec: '#4b69ff', restricted: '#8847ff', classified: '#d32ce6', covert: '#eb4b4b', contraband: '#e4ae39', gold: '#ffd24a' };
  function equipTiles() {
    try {
      if (!EQCAT) {
        if (!EQCAT_LOADING) {
          EQCAT_LOADING = true;
          fetch('csweb-catalog.json?v=06').then(function (r) { return r.json(); }).then(function (cat) {
            EQCAT = {};
            (cat || []).forEach(function (o) { if (o && o.id) EQCAT[o.id] = o; });
          }).catch(function () { EQCAT_LOADING = false; });
        }
        return;
      }
      var raw = null;
      try { raw = localStorage.getItem('clutcher_inv_v1'); } catch (e) { return; }
      if (!raw) return;
      var d;
      try { d = JSON.parse(raw); } catch (e) { return; }
      if (!d || !d.items || !d.equipped) return;
      var byUid = {};
      d.items.forEach(function (it) { if (it && it.uid) byUid[it.uid] = it; });
      document.querySelectorAll('.skintile[data-slot]').forEach(function (tile) {
        try {
          var slot = tile.getAttribute('data-slot');
          var uid = d.equipped[slot];
          if (!uid || !byUid[uid]) return;
          if (tile.getAttribute('data-csweb-eq') === uid) return;
          var cat = EQCAT[byUid[uid].skin];
          if (!cat) return;
          tile.setAttribute('data-csweb-eq', uid);
          var rc = EQRC[cat.rarity] || '#fff';
          tile.style.setProperty('--rc', rc);
          var bar = tile.querySelector('.st-bar');
          if (bar) bar.style.background = rc;
          var nm = tile.querySelector('.st-name');
          if (nm) { nm.style.display = ''; nm.textContent = cat.name || ''; }
          var img = tile.querySelector('img.st-icon');
          var url = 'ui/skins/' + cat.img + '.webp';
          if (img && img.getAttribute('src') !== url) {
            var probe = new Image();
            probe.onload = (function (el, u) { return function () { try { el.src = u; } catch (e) {} }; })(img, url);
            probe.src = url;
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  function scoreFix() {
    try {
      var sb = document.getElementById('scoreboard');
      if (sb) {
        var walker = document.createTreeWalker(sb, NodeFilter.SHOW_TEXT);
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (n) {
          if (/^\s*clutcher\.?io?\s*$/i.test(n.nodeValue || '')) {
            var el = n.parentNode;
            if (el && el.style) el.style.display = 'none';
          }
        });
      }
      var pause = document.getElementById('pause');
      if (pause && sb && pause.style.display !== 'none' && sb.style.display !== 'none') {
        sb.style.display = 'none';
      }
    } catch (e) {}
  }

  /* ---------- 4. MARKETPLACE TESTOWY (wszystko po 1) ---------- */
  var CATMAP = { glock: 'Pistols', usps: 'Pistols', p2000: 'Pistols', dualies: 'Pistols', p250: 'Pistols', 'fiveseven': 'Pistols', tec9: 'Pistols', cz75: 'Pistols', deagle: 'Pistols', r8: 'Pistols', ak47: 'Rifles', m4a4: 'Rifles', m4a1s: 'Rifles', aug: 'Rifles', sg553: 'Rifles', famas: 'Rifles', galil: 'Rifles', mac10: 'SMG', mp9: 'SMG', mp7: 'SMG', mp5sd: 'SMG', ump45: 'SMG', p90: 'SMG', bizon: 'SMG', m249: 'Heavy', negev: 'Heavy', nova: 'Heavy', xm1014: 'Heavy', sawedoff: 'Heavy', mag7: 'Heavy', ssg08: 'Snipers', awp: 'Snipers', g3sg1: 'Snipers', scar20: 'Snipers' };
  var RCOL = { 'mil-spec': '#4b69ff', restricted: '#8847ff', classified: '#d32ce6', covert: '#eb4b4b', contraband: '#e67e22', gold: '#ffd75e', base: '#9a9a9a' };
  var catalog = null;
  var shopFilter = 'All';
  var shopQuery = '';

  function invRead() {
    try { return JSON.parse(localStorage.getItem('clutcher_inv_v1') || 'null'); }
    catch (e) { return null; }
  }
  function invWrite(d) {
    try { localStorage.setItem('clutcher_inv_v1', JSON.stringify(d)); } catch (e) {}
  }
  var PRICE = { 'Pistols': 1500, 'SMG': 2500, 'Heavy': 3500, 'Rifles': 5000, 'Snipers': 7500, 'Knives': 10000, 'Gloves': 8000, 'Other': 2000 };
  function priceOf(o) { return PRICE[shopCat(o)] || 2000; }
  function shopBuy(id, price) {
    price = price | 0;
    var H = window.CSWEB_H;
    if (H && H.add) {
      try {
        if ((H.load().coins | 0) < price) return false;
        H.add({ id: id, wmin: 0, wmax: 1 }, { wear: 0.05, seed: (Math.random() * 999) | 0 });
        H.addCoins(-price);
        renderShopCoins();
        return true;
      } catch (e) {}
    }
    // awaryjnie: dopisz wprost do zapisu (ten sam ksztalt co rs())
    var d = invRead();
    if (!d || !d.items) return false;
    if ((d.coins | 0) < price) return false;
    d.coins -= price;
    d.items.push({ uid: 'i' + Date.now().toString(36) + ((Math.random() * 1296) | 0).toString(36), skin: id, wear: 0.05, seed: (Math.random() * 999) | 0, st: false, kills: 0, t: Date.now() });
    invWrite(d);
    renderShopCoins();
    return true;
  }
  function renderShopCoins() {
    var H = window.CSWEB_H, c = null;
    try { c = H ? H.load().coins : (invRead() || {}).coins; } catch (e) {}
    if (c == null) return;
    var el = document.getElementById('csweb-shop-coins');
    if (el) el.textContent = 'Balance: ' + c + ' $';
    try {
      var nav = document.querySelector('#coins');
      if (nav) nav.textContent = nav.textContent.replace(/^\d+/, String(c));
    } catch (e) {}
  }
  function ownedSkins() {
    var s = {};
    try {
      var H = window.CSWEB_H;
      if (H) { H.load().items.forEach(function (it) { s[it.skin] = 1; }); return s; }
    } catch (e) {}
    var d = invRead();
    if (d && d.items) d.items.forEach(function (it) { s[it.skin] = 1; });
    return s;
  }
  function previewSkin(o) {
    var ps = window.CSWEB_PS, IN = window.CSWEB_INSP;
    if (!ps || !IN || !IN.showInspect) return;
    var def = ps[o.id];
    if (!def) return;
    var slot = o.kind === 'knife' ? 'knife' : (o.kind === 'gloves' ? 'gloves' : (o.slot || def.weapon));
    try {
      var page = document.getElementById('tab-market');
      if (page) page.style.display = 'none';
      IN.showInspect(def, slot, null, { skin: o.id, wear: 0.05, seed: 7, uid: null, st: false, kills: 0 });
    } catch (e) {
      var pg = document.getElementById('tab-market');
      if (pg) pg.style.display = '';
    }
  }
  function restoreMarket() {
    if (!document.getElementById('inspectov')) {
      var pg = document.getElementById('tab-market');
      if (pg && pg.style.display === 'none') pg.style.display = '';
    }
  }
  function shopCat(o) {
    if (o.kind === 'knife') return 'Knives';
    if (o.kind === 'gloves') return 'Gloves';
    return CATMAP[o.slot] || 'Other';
  }
  var PER_PAGE = 48;
  var shopPage = 0;
  function renderShop() {
    var grid = document.getElementById('csweb-shop');
    if (!grid || !catalog) return;
    var q = shopQuery.toLowerCase();
    var all = catalog.filter(function (o) {
      if (shopFilter !== 'All' && shopCat(o) !== shopFilter) return false;
      if (q && o.name.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    if (shopPage > pages - 1) shopPage = pages - 1;
    var list = all.slice(shopPage * PER_PAGE, shopPage * PER_PAGE + PER_PAGE);
    var own = ownedSkins();
    grid.innerHTML = '';
    list.forEach(function (o) {
      var card = document.createElement('div');
      card.className = 'csweb-card';
      var col = RCOL[(o.rarity || '').toLowerCase()] || '#9a9a9a';
      card.style.borderColor = col;
      var has = !!own[o.id];
      var price = priceOf(o);
      card.innerHTML = '<div class="csweb-img"><img loading="lazy" src="ui/skins/' + o.img + '.webp" alt="">'
        + '<button class="csweb-lupa" title="3D preview">🔍</button></div>'
        + '<div class="csweb-name">' + o.name + '</div>'
         + '<div class="csweb-buy"><span>' + price + ' $</span><button' + (has ? ' disabled' : '') + '>' + (has ? 'OWNED' : 'BUY') + '</button></div>';
      if (!has) {
        card.querySelector('.csweb-buy button').onclick = function (ev) {
          ev.stopPropagation();
          if (shopBuy(o.id, price)) { ev.target.textContent = 'BOUGHT'; ev.target.disabled = true; setTimeout(function () { renderShop(); }, 900); }
          else alert('Not enough funds.');
        };
      }
      card.querySelector('.csweb-lupa').onclick = function (ev) {
        ev.stopPropagation();
        previewSkin(o);
      };
      grid.appendChild(card);
    });
    var cnt = document.getElementById('csweb-count');
    if (cnt) cnt.textContent = all.length + ' items · page ' + (shopPage + 1) + '/' + pages;
    var pv = document.getElementById('csweb-prev');
    var nx = document.getElementById('csweb-next');
    if (pv) pv.disabled = shopPage <= 0;
    if (nx) nx.disabled = shopPage >= pages - 1;
  }
  function shopGo(d) {
    shopPage += d;
    renderShop();
    var page = document.getElementById('tab-market');
    if (page) page.scrollTop = 0;
  }
  function buildMarket() {
    var page = document.getElementById('tab-market');
    if (!page || document.getElementById('csweb-shop')) return;
    var soon = page.querySelector('.soonpage');
    if (soon) soon.style.display = 'none';
    var wrap = document.createElement('div');
    wrap.id = 'csweb-market';
    wrap.innerHTML = '<div id="csweb-shop-coins"></div>'
      + '<div id="csweb-filters"></div>'
      + '<div class="csweb-tools"><button id="csweb-prev">◀</button><input id="csweb-q" placeholder="search skins..."><button id="csweb-next">▶</button><span id="csweb-count"></span></div>'
      + '<div id="csweb-shop"></div>';
    page.appendChild(wrap);
    var cats = ['All', 'Pistols', 'Rifles', 'SMG', 'Heavy', 'Snipers', 'Knives', 'Gloves', 'Other'];
    var fb = wrap.querySelector('#csweb-filters');
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.textContent = c;
      b.className = c === 'All' ? 'sel' : '';
      b.onclick = function () {
        shopFilter = c;
        shopPage = 0;
        fb.querySelectorAll('button').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        renderShop();
      };
      fb.appendChild(b);
    });
    wrap.querySelector('#csweb-q').oninput = function (e) { shopQuery = e.target.value; shopPage = 0; renderShop(); };
    wrap.querySelector('#csweb-prev').onclick = function () { shopGo(-1); };
    wrap.querySelector('#csweb-next').onclick = function () { shopGo(1); };
    fetch('csweb-catalog.json').then(function (r) { return r.json(); }).then(function (j) {
      catalog = j; renderShop(); renderShopCoins();
    });
  }

  /* ---------- 2g. OUTFIT: wlasny pasek (oryginalny ukryty w CSS) ---------- */
  function syncOutfit() {
    try {
      var t = window.game && window.game.previewCharTeam;
      document.querySelectorAll('#csweb-outfit button').forEach(function (b) {
        b.classList.toggle('sel', b.getAttribute('data-v') === t);
      });
    } catch (e) {}
  }
  function outfitBar() {
    try {
      var bar = document.getElementById('csweb-outfit');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'csweb-outfit';
        bar.innerHTML = '<button data-v="CT">CT OUTFIT</button><button data-v="T">T OUTFIT</button>';
        document.body.appendChild(bar);
        bar.addEventListener('click', function (e) {
          var b = e.target && e.target.closest ? e.target.closest('button') : null;
          if (!b) return;
          try { if (window.game && window.game.setPreviewTeam) window.game.setPreviewTeam(b.getAttribute('data-v')); } catch (err) {}
          syncOutfit();
        });
      }
      var show = false;
      try {
        var tp = document.getElementById('tab-play'), menu = document.getElementById('menu');
        show = !!(tp && tp.classList.contains('sel') && menu && getComputedStyle(menu).display !== 'none');
      } catch (e2) {}
      bar.style.display = show ? 'flex' : 'none';
      if (show) syncOutfit();
    } catch (e) {}
  }

  /* ---------- 2e. CSGO menu: etykiety paska ---------- */
  var CSGO_TABS = { play: 'PLAY', loadout: 'LOADOUT', locker: 'INVENTORY', cases: 'CASES', settings: 'SETTINGS' };
  function csgoMenu() {
    try {
      var tabs = document.getElementById('tabs');
      if (tabs) {
        tabs.querySelectorAll('button[data-tab]').forEach(function (b) {
          var v = b.getAttribute('data-tab');
          if (v === 'market' || v === 'trading') return;
          var L = CSGO_TABS[v];
          if (L && b.textContent !== L) b.textContent = L;
        });
      }
      if (!document.body.classList.contains('csweb-csgo')) document.body.classList.add('csweb-csgo');
    } catch (e) {}
  }

  /* ---------- 2f. MONETA: C -> $ ---------- */
  function coinFix() {    try {
      document.querySelectorAll('#coins i, .chal-reward i, .case-price i').forEach(function (el) {
        if (el.textContent === 'C') el.textContent = '$';
      });
      var sel = '#coins,.case-price,.chal-reward,#csweb-shop-coins,.csweb-buy span,.co-wallet,#co-wallet,#reward';
      document.querySelectorAll(sel).forEach(function (box) {
        var w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        var nodes = [];
        while (w.nextNode()) nodes.push(w.currentNode);
        nodes.forEach(function (n) {
          if (/(\d)\s*C$/.test(n.nodeValue || '')) n.nodeValue = n.nodeValue.replace(/(\d)\s*C$/, '$1 $');
        });
      });
    } catch (e) {}
  }

  /* ---------- start ---------- */
  xhairApply();
  mapLabels(document);
  hideJunk();
  csgoMenu();
  outfitBar();
  loadoutTidy();
  lockerGroups();
  equipTiles();
  scoreFix();
  buildMarket();
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Tab') document.body.classList.add('csweb-bigmap');
  });
  document.addEventListener('keyup', function (e) {
    if (e.code === 'Tab') document.body.classList.remove('csweb-bigmap');
  });
  window.addEventListener('blur', function () { document.body.classList.remove('csweb-bigmap'); });
  new MutationObserver(function () {
    mapLabels(document);
    hideJunk();
    csgoMenu();
    outfitBar();
    coinFix();
    loadoutTidy();
    lockerGroups();
    equipTiles();
    scoreFix();
    xhairUI();
    buildMarket();
    restoreMarket();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
