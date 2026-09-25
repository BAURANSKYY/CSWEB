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
    row.innerHTML = '<label>CELOWNIK</label><div id="csweb-xbtns" style="display:flex;gap:6px;flex-wrap:wrap"></div>'
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
      st.textContent = 'Statyczny celownik: ' + (s.stat ? 'WŁĄCZONY' : 'wyłączony');
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
      first.title = 'Kliknij, aby rozwinac skiny';
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
  var CATMAP = { glock: 'Pistolety', usps: 'Pistolety', p2000: 'Pistolety', dualies: 'Pistolety', p250: 'Pistolety', 'fiveseven': 'Pistolety', tec9: 'Pistolety', cz75: 'Pistolety', deagle: 'Pistolety', r8: 'Pistolety', ak47: 'Karabiny', m4a4: 'Karabiny', m4a1s: 'Karabiny', aug: 'Karabiny', sg553: 'Karabiny', famas: 'Karabiny', galil: 'Karabiny', mac10: 'SMG', mp9: 'SMG', mp7: 'SMG', mp5sd: 'SMG', ump45: 'SMG', p90: 'SMG', bizon: 'SMG', m249: 'Ciężkie', negev: 'Ciężkie', nova: 'Ciężkie', xm1014: 'Ciężkie', sawedoff: 'Ciężkie', mag7: 'Ciężkie', ssg08: 'Snajperki', awp: 'Snajperki', g3sg1: 'Snajperki', scar20: 'Snajperki' };
  var RCOL = { 'mil-spec': '#4b69ff', restricted: '#8847ff', classified: '#d32ce6', covert: '#eb4b4b', contraband: '#e67e22', gold: '#ffd75e', base: '#9a9a9a' };
  var catalog = null;
  var shopFilter = 'Wszystko';
  var shopQuery = '';

  function invRead() {
    try { return JSON.parse(localStorage.getItem('clutcher_inv_v1') || 'null'); }
    catch (e) { return null; }
  }
  function invWrite(d) {
    try { localStorage.setItem('clutcher_inv_v1', JSON.stringify(d)); } catch (e) {}
  }
  var PRICE = { 'Pistolety': 1500, 'SMG': 2500, 'Ciężkie': 3500, 'Karabiny': 5000, 'Snajperki': 7500, 'Noże': 10000, 'Rękawice': 8000, 'Inne': 2000 };
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
    if (el) el.textContent = 'Masz: ' + c + ' $';
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
    if (o.kind === 'knife') return 'Noże';
    if (o.kind === 'gloves') return 'Rękawice';
    return CATMAP[o.slot] || 'Inne';
  }
  var PER_PAGE = 48;
  var shopPage = 0;
  function renderShop() {
    var grid = document.getElementById('csweb-shop');
    if (!grid || !catalog) return;
    var q = shopQuery.toLowerCase();
    var all = catalog.filter(function (o) {
      if (shopFilter !== 'Wszystko' && shopCat(o) !== shopFilter) return false;
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
        + '<button class="csweb-lupa" title="Podgląd 3D">🔍</button></div>'
        + '<div class="csweb-name">' + o.name + '</div>'
        + '<div class="csweb-buy"><span>' + price + ' $</span><button' + (has ? ' disabled' : '') + '>' + (has ? 'MASZ' : 'KUP') + '</button></div>';
      if (!has) {
        card.querySelector('.csweb-buy button').onclick = function (ev) {
          ev.stopPropagation();
          if (shopBuy(o.id, price)) { ev.target.textContent = 'KUPIONE'; ev.target.disabled = true; setTimeout(function () { renderShop(); }, 900); }
          else alert('Brak monet.');
        };
      }
      card.querySelector('.csweb-lupa').onclick = function (ev) {
        ev.stopPropagation();
        previewSkin(o);
      };
      grid.appendChild(card);
    });
    var cnt = document.getElementById('csweb-count');
    if (cnt) cnt.textContent = all.length + ' itemów · strona ' + (shopPage + 1) + '/' + pages;
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
      + '<div class="csweb-tools"><button id="csweb-prev">◀</button><input id="csweb-q" placeholder="szukaj skina..."><button id="csweb-next">▶</button><span id="csweb-count"></span></div>'
      + '<div id="csweb-shop"></div>';
    page.appendChild(wrap);
    var cats = ['Wszystko', 'Pistolety', 'Karabiny', 'SMG', 'Ciężkie', 'Snajperki', 'Noże', 'Rękawice', 'Inne'];
    var fb = wrap.querySelector('#csweb-filters');
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.textContent = c;
      b.className = c === 'Wszystko' ? 'sel' : '';
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

  /* ---------- 2e. CSGO menu: etykiety paska + outfit pod PLAY ---------- */
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
      var cn = document.getElementById('charname'), ob = document.getElementById('opt-outfit');
      if (ob && cn && cn.nextElementSibling !== ob) cn.after(ob);
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
  loadoutTidy();
  lockerGroups();
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
    coinFix();
    loadoutTidy();
    lockerGroups();
    scoreFix();
    xhairUI();
    buildMarket();
    restoreMarket();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
