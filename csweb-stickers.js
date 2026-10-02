/* CSWEB - naklejki na broniach (CS2: sloty jak w sticker_gap).
   BEZPIECZNE Z ZALOZENIA: nie rusza silnika, farby ani meshy.
   - dane: item.stickers = [{slot, id}] (brak = zero zmian w renderze),
   - render: osobne plastry-decalki doklejane do grupy broni, tylko gdy item ma naklejki,
   - wszystko w try/catch: blad = brak naklejki, nigdy wysypanie gry. */
(function () {
  'use strict';
  var CAT = null, CATLOAD = false;
  var IMGS = {};
  var INSPECT_UID = null;
  var SEEN = new Map(); // group -> {sig, decals:[...]}
  var TICK = 0;

  function cat(cb) {
    if (CAT) { cb && cb(CAT); return; }
    if (CATLOAD) return;
    CATLOAD = true;
    fetch('csweb-stickers.json?v=01').then(function (r) { return r.json(); }).then(function (c) {
      CAT = c || []; cb && cb(CAT);
    }).catch(function () { CATLOAD = false; });
  }
  var SHOPCAT = null, SHOPLOAD = false;
  function shopcat(cb) {
    if (SHOPCAT) { cb && cb(SHOPCAT); return; }
    if (SHOPLOAD) return;
    SHOPLOAD = true;
    fetch('csweb-catalog.json?v=10').then(function (r) { return r.json(); }).then(function (c) {
      SHOPCAT = {};
      (c || []).forEach(function (o) { if (o && o.id && !SHOPCAT[o.id]) SHOPCAT[o.id] = o; });
      cb && cb(SHOPCAT);
    }).catch(function () { SHOPLOAD = false; });
  }
  function stById(id) {
    if (!CAT) return null;
    for (var k = 0; k < CAT.length; k++) if (CAT[k].id === id) return CAT[k];
    return null;
  }
  function imgFor(id, cb) {
    var st = stById(id);
    if (!st) { cb && cb(null); return; }
    if (IMGS[id] && IMGS[id].done) { cb && cb(IMGS[id].el); return; }
    var im = new Image();
    IMGS[id] = { el: im, done: false };
    im.onload = function () { IMGS[id].done = true; cb && cb(im); };
    im.onerror = function () { cb && cb(null); };
    im.src = 'ui/stickers/' + st.file;
  }

  /* ---------- dane ---------- */
  function invRead() { try { return JSON.parse(localStorage.getItem('clutcher_inv_v1') || 'null'); } catch (e) { return null; } }
  function invWrite(d) { try { localStorage.setItem('clutcher_inv_v1', JSON.stringify(d)); } catch (e) {} }
  function findItem(uid) {
    try {
      var d = invRead();
      if (!d || !d.items) return null;
      for (var k = 0; k < d.items.length; k++) if (d.items[k] && d.items[k].uid === uid) return d.items[k];
    } catch (e) {}
    return null;
  }
  function setSticker(uid, slot, sid) {
    try {
      var d = invRead();
      if (!d || !d.items) return false;
      for (var k = 0; k < d.items.length; k++) {
        var it = d.items[k];
        if (it && it.uid === uid) {
          var st = [];
          (it.stickers || []).forEach(function (s) { if (s && s.slot !== slot) st.push(s); });
          if (sid) st.push({ slot: slot, id: sid });
          it.stickers = st;
          invWrite(d);
          SEEN.clear();
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  /* ---------- UI w inspekcie ---------- */
  var UI_SLOT = 0;
  function ensureUI() {
    try {
      var bar = document.getElementById('csweb-stickers');
      if (bar) return bar;
      bar = document.createElement('div');
      bar.id = 'csweb-stickers';
      bar.innerHTML = '<div class="csweb-st-title">NAKLEJKI</div><div class="csweb-st-slots"></div><div class="csweb-st-grid"></div>';
      document.body.appendChild(bar);
      return bar;
    } catch (e) { return null; }
  }
  function paintUI() {
    try {
      var ov = document.getElementById('inspectov');
      var bar = ensureUI();
      if (!bar) return;
      var show = !!(ov && getComputedStyle(ov).display !== 'none' && INSPECT_UID);
      bar.style.display = show ? 'block' : 'none';
      if (!show) return;
      var it = findItem(INSPECT_UID);
      var cur = (it && it.stickers) || [];
      var slots = bar.querySelector('.csweb-st-slots');
      var sh = '';
      for (var s = 0; s < 4; s++) {
        var has = null;
        cur.forEach(function (x) { if (x && x.slot === s) has = x.id; });
        var st = has ? stById(has) : null;
        sh += '<div class="csweb-st-slot' + (s === UI_SLOT ? ' sel' : '') + '" data-s="' + s + '">' +
          (st ? '<img src="ui/stickers/' + st.file + '">' : '<span>+</span>') +
          (st ? '<b data-x="' + s + '">&times;</b>' : '') + '</div>';
      }
      if (slots._h !== sh) { slots.innerHTML = sh; slots._h = sh; }
      var grid = bar.querySelector('.csweb-st-grid');
      if (CAT && !grid._built) {
        grid._built = true;
        var gh = '';
        CAT.forEach(function (o) {
          gh += '<div class="csweb-st-item" data-id="' + o.id + '" title="' + o.name + '">' +
            '<img loading="lazy" src="ui/stickers/' + o.file + '"></div>';
        });
        grid.innerHTML = gh;
      }
      if (!bar._wired) {
        bar._wired = true;
        bar.addEventListener('click', function (ev) {
          try {
            var x = ev.target.getAttribute && ev.target.getAttribute('data-x');
            if (x !== null && x !== undefined) { setSticker(INSPECT_UID, +x, null); paintUI(); return; }
            var sl = ev.target.closest ? ev.target.closest('.csweb-st-slot') : null;
            if (sl) { UI_SLOT = +sl.getAttribute('data-s'); paintUI(); return; }
            var it2 = ev.target.closest ? ev.target.closest('.csweb-st-item') : null;
            if (it2 && INSPECT_UID) { setSticker(INSPECT_UID, UI_SLOT, it2.getAttribute('data-id')); paintUI(); }
          } catch (e) {}
        });
      }
    } catch (e) {}
  }
  try {
    document.addEventListener('click', function (ev) {
      try {
        var b = ev.target.closest ? ev.target.closest('.st-view') : null;
        if (!b) return;
        var tile = b.closest ? b.closest('.skintile') : null;
        INSPECT_UID = tile ? tile.getAttribute('data-uid') : null;
        UI_SLOT = 0;
      } catch (e) {}
    }, true);
  } catch (e) {}

  /* ---------- render: plastry na slotach ---------- */
  function gapFrames(group) {
    var out = [];
    try {
      group.traverse(function (o) {
        if (!o.isMesh) return;
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        var gap = mats.some(function (mt) { return mt && /sticker_gap/i.test(mt.name || ''); });
        if (!gap) return;
        var g = o.geometry;
        if (!g || !g.attributes || !g.attributes.position) return;
        var pos = g.attributes.position;
        if (!pos || typeof pos.getX !== 'function' || !pos.count) return;
        var idx = g.index ? g.index.array : null;
        var n = idx ? idx.length / 3 : Math.floor(pos.count / 3);
        // bbox w ukladzie lokalnym mesha
        var v = new o.position.constructor();
        var min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
        try {
          for (var i2 = 0; i2 < pos.count; i2++) {
            v.fromBufferAttribute(pos, i2);
            for (var d = 0; d < 3; d++) {
              var c = [v.x, v.y, v.z][d];
              if (c < min[d]) min[d] = c;
              if (c > max[d]) max[d] = c;
            }
          }
        } catch (e) { return; }
        // normalna srednia
        var nor = g.attributes.normal, nx = 0, ny = 0, nz = 0, nn = 0;
        if (nor && typeof nor.getX === 'function' && nor.count) {
          try {
            for (var i3 = 0; i3 < nor.count; i3 += 3) {
              nx += nor.getX(i3); ny += nor.getY(i3); nz += nor.getZ(i3); nn++;
            }
          } catch (e) { nn = 0; }
        }
        out.push({ mesh: o, min: min, max: max, n: nn ? [nx / nn, ny / nn, nz / nn] : [0, 0, 1] });
      });
    } catch (e) {}
    return out;
  }
  function clearDecals(group) {
    try {
      var rm = [];
      group.traverse(function (o) { if (o.userData && o.userData.cswebSticker) rm.push(o); });
      rm.forEach(function (o) { try { if (o.parent) o.parent.remove(o); } catch (e) {} });
    } catch (e) {}
  }
  function buildDecals(group, item) {
    try {
      clearDecals(group);
      var sticks = (item.stickers || []).slice(0, 4);
      if (!sticks.length) return;
      var frames = gapFrames(group).filter(function (f) { return f.mesh.visible !== false; });
      if (!frames.length) frames = gapFrames(group);
      if (!frames.length) return;
      try { group.updateWorldMatrix(true, true); } catch (e) {}
      var fr = frames[0];
      var m4 = fr.mesh.matrixWorld;
      var V = fr.mesh.position.constructor;
      function wFromLocal(x, y, z) {
        try { return new V(x, y, z).applyMatrix4(m4); } catch (e) { return null; }
      }
      var c0 = [(fr.min[0] + fr.max[0]) / 2, (fr.min[1] + fr.max[1]) / 2, (fr.min[2] + fr.max[2]) / 2];
      var ext = [fr.max[0] - fr.min[0], fr.max[1] - fr.min[1], fr.max[2] - fr.min[2]];
      // rozmiar w swiecie: dwa punkty przez macierz
      function wlen(ax, d) {
        try {
          var p0 = [c0[0], c0[1], c0[2]], p1 = [c0[0], c0[1], c0[2]];
          p1[ax] += d;
          var a = wFromLocal(p0[0], p0[1], p0[2]), b = wFromLocal(p1[0], p1[1], p1[2]);
          if (!a || !b) return 0;
          return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        } catch (e) { return 0; }
      }
      var ax = [[0, ext[0]], [1, ext[1]], [2, ext[2]]].sort(function (a, b) { return b[1] - a[1]; });
      var A = ax[0][0];
      var alen = wlen(A, ext[A]) || 0.1, blen = 0.1;
      for (var bi = 1; bi < 3; bi++) {
        var w = wlen(ax[bi][0], ext[ax[bi][0]]);
        if (w > blen) blen = w;
      }
      var nlen = Math.hypot(fr.n[0], fr.n[1], fr.n[2]) || 1;
      var wC = wFromLocal(c0[0], c0[1], c0[2]);
      if (!wC) return;
      var wN = new V(fr.n[0] / nlen, fr.n[1] / nlen, fr.n[2] / nlen).transformDirection(m4);
      // material bazowy do sklonowania (pierwszy nie-gap z mapa)
      var bodyMat = null;
      group.traverse(function (o) {
        if (bodyMat || !o.isMesh) return;
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        for (var k = 0; k < mats.length; k++) {
          var mt = mats[k];
          if (mt && !/sticker_gap/i.test(mt.name || '') && mt.map && mt.map.image) { bodyMat = mt; break; }
        }
      });
      if (!bodyMat) return;
      var nSlots = (alen / Math.max(blen, 1e-6)) >= 2.5 ? 4 : 1;
      try { window.cswebStk._last = 'nSlots=' + nSlots + ' alen=' + alen.toFixed(3) + ' blen=' + blen.toFixed(3) + ' wN=(' + wN.x.toFixed(2) + ',' + wN.y.toFixed(2) + ',' + wN.z.toFixed(2) + ') wC=(' + wC.x.toFixed(2) + ',' + wC.y.toFixed(2) + ',' + wC.z.toFixed(2) + ')'; } catch (e) {}
      sticks.forEach(function (s) {
        if (!s || s.slot == null || s.slot >= nSlots) return;
        var st = stById(s.id);
        if (!st) return;
        imgFor(s.id, function (im) {
          try {
            if (!im) return;
            var f = nSlots === 1 ? 0 : (s.slot / (nSlots - 1) - 0.5) * 0.72;
            var e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]][A];
            var we = new V(e[0], e[1], e[2]).transformDirection(m4).multiplyScalar(f * alen);
            var wc = wC.clone().add(we).add(wN.clone().multiplyScalar(Math.max(0.004, alen * 0.02)));
            var Tex = bodyMat.map.constructor;
            var tex = new Tex();
            tex.image = im;
            tex.needsUpdate = true;
            try { tex.colorSpace = 'srgb'; } catch (ee) {}
            var Mt = bodyMat.constructor;
            var mat = new Mt({ map: tex, transparent: true, roughness: 0.55, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
            mat.name = 'csweb_sticker_' + s.slot;
            var segLen = (nSlots === 1 ? alen : alen / nSlots * 0.94);
            var ar = (im.naturalWidth || 4) / (im.naturalHeight || 3);
            var w = segLen, h = w / ar, maxH = nSlots === 1 ? blen : alen / nSlots * 0.94;
            if (h > maxH) { h = maxH; w = h * ar; }
            var Geo = fr.mesh.geometry.constructor;
            var srcAttr = fr.mesh.geometry.attributes.position;
            var AC = srcAttr.constructor;
            var good = false;
            try { good = !!new AC(new Float32Array(3), 3); } catch (ee) { good = false; }
            if (!good) return;
            var geo = new Geo();
            geo.setAttribute('position', new AC(new Float32Array([-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0]), 3));
            geo.setAttribute('uv', new AC(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
            geo.setIndex([0, 1, 2, 0, 2, 3]);
            try { geo.computeVertexNormals(); } catch (ee) {}
            var MeshCtor = null;
            try {
              group.traverse(function (o) { if (!MeshCtor && o.isMesh && !o.isSkinnedMesh) MeshCtor = o.constructor; });
              if (!MeshCtor) {
                var root = group;
                while (root && root.parent) root = root.parent;
                if (root) root.traverse(function (o) { if (!MeshCtor && o.isMesh && !o.isSkinnedMesh) MeshCtor = o.constructor; });
              }
            } catch (ee) {}
            if (!MeshCtor) return;
            var mesh = new MeshCtor(geo, mat);
            mesh.position.copy(wc);
            mesh.lookAt(wc.clone().add(wN));
            mesh.renderOrder = 5;
            mesh.userData.cswebSticker = true;
            try { mesh.updateMatrix(); } catch (ee) {}
            // doklej do grupy z zachowaniem transformacji swiata
            try { group.attach(mesh); } catch (ee) {
              try { group.add(mesh); } catch (eee) {}
            }
          } catch (e) {}
        });
      });
    } catch (e) {}
  }

  /* ---------- sledzenie grup broni ---------- */
  function eachGroup(cb) {
    try {
      var g = window.game;
      if (!g) return;
      // inspect
      try {
        var seen = new Set(), holder = null;
        var walk = function (o, d) {
          if (!o || d > 6 || holder) return;
          if (typeof o !== 'object') return;
          if (seen.has(o)) return;
          seen.add(o);
          var has = false;
          try { has = !!(o._skinView && o._skinView.grp); } catch (e) {}
          if (has) { holder = o; return; }
          var keys = [];
          try { keys = Object.keys(o); } catch (e) { return; }
          for (var k = 0; k < keys.length; k++) {
            if (keys[k] === 'parent') continue;
            try { walk(o[keys[k]], d + 1); } catch (e) {}
          }
        };
        walk(g, 0);
        if (holder && holder._skinView.grp) cb(holder._skinView.grp, { kind: 'inspect', uid: INSPECT_UID });
      } catch (e) {}
      // viewmodel
      try {
        if (g.cs2 && g.cs2.rig && g.cs2.rig._paintGun && g.weapons) {
          cb(g.cs2.rig._paintGun, { kind: 'vm', wid: g.weapons.current, team: g.player && g.player.team });
        }
      } catch (e) {}
      // dropy na ziemi
      try {
        var drops = g.drops || [];
        for (var i = 0; i < Math.min(drops.length, 6); i++) {
          var dr = drops[i];
          if (dr && dr.mesh) cb(dr.mesh, { kind: 'drop', skin: dr.skin, item: dr.item });
        }
      } catch (e) {}
    } catch (e) {}
  }
  function resolveItem(info) {
    try {
      if (info.kind === 'inspect' && info.uid) return findItem(info.uid);
      if (info.kind === 'vm') {
        var d = invRead();
        if (!d || !d.items || !d.equipped) return null;
        var wid = info.wid;
        var uid = d.equipped[wid];
        if (!uid && SHOPCAT) {
          // slot broni z katalogu (np. bron teamowa -> slot)
          for (var k = 0; k < d.items.length; k++) {
            var it0 = d.items[k];
            if (!it0) continue;
            var ce = SHOPCAT[it0.skin];
            if (ce && (ce.slot === wid || wid.indexOf(ce.slot) === 0 || ce.slot.indexOf(wid) === 0)) {
              if (d.equipped[ce.slot]) { uid = d.equipped[ce.slot]; break; }
            }
          }
        }
        if (!uid) return null;
        for (var k2 = 0; k2 < d.items.length; k2++) if (d.items[k2] && d.items[k2].uid === uid) return d.items[k2];
        return null;
      }
      if (info.kind === 'drop' && info.item) {
        if (typeof info.item === 'object') return info.item;
        if (typeof info.item === 'string') return findItem(info.item);
        return null;
      }
      if (info.kind === 'drop' && info.skin) {
        var d2 = invRead();
        if (d2 && d2.items) for (var k2 = 0; k2 < d2.items.length; k2++) {
          // drop niesie skin id? porownaj wlasciciela po nazwie entity? uproszczenie: pierwszy item z tym skinem gracza
        }
      }
    } catch (e) {}
    return null;
  }
  function sigFor(item, group) {
    try {
      var tok = '';
      if (group.userData) tok = String(group.userData._paintToken ? 'p' : '');
      return (item ? item.uid : 'none') + '|' + JSON.stringify((item && item.stickers) || []) + '|' + tok;
    } catch (e) { return 'err'; }
  }
  function tick() {
    try {
      TICK++;
      paintUI();
      if (TICK % 2) return;
      eachGroup(function (group, info) {
        try {
          var item = resolveItem(info);
          var sig = sigFor(item, group) + '|' + (info.kind || '');
          var prev = SEEN.get(group);
          if (prev && prev === sig) {
            group.traverse(function (o) { if (o.userData && o.userData.cswebSticker) o.visible = true; });
            return;
          }
          SEEN.set(group, sig);
          clearDecals(group);
          if (item && item.stickers && item.stickers.length) buildDecals(group, item);
        } catch (e) {}
      });
      if (SEEN.size > 40) SEEN.clear();
    } catch (e) {}
  }
  try {
    cat(function () {});
    shopcat(function () {});
    setInterval(tick, 1200);
    window.cswebStk = { tick: tick, set: setSticker, dbg: function () {
      var o = [];
      try {
        o.push('CAT=' + (CAT ? CAT.length : 'null'));
        eachGroup(function (group, info) {
          try {
            var item = resolveItem(info);
            var n = 0, gaps = 0;
            group.traverse(function (x) {
              if (x.isMesh) {
                n++;
                var mats = Array.isArray(x.material) ? x.material : [x.material];
                if (mats.some(function (mt) { return mt && /sticker_gap/i.test(mt.name || ''); })) gaps++;
              }
            });
            var uid = info.uid || (item && item.uid) || '?';
            var stk = item && item.stickers ? item.stickers.length : 0;
            var dec = 0;
            group.traverse(function (x) { if (x.userData && x.userData.cswebSticker) dec++; });
            o.push(info.kind + ' meshes=' + n + ' gaps=' + gaps + ' uid=' + uid + ' stk=' + stk + ' dec=' + dec);
          } catch (e) { o.push(info.kind + ' ERR ' + String(e).slice(0, 60)); }
        });
      } catch (e) { o.push('ERR ' + String(e).slice(0, 60)); }
      return o.join('\n');
    } };
  } catch (e) {}
})();
