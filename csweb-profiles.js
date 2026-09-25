/* CSWEB - profile graczy.
   Wpisz nick i gra laduje caly profil: skiny, monety, wyposazenie.
   Kazdy nick ma osobny ekwipunek na tym komputerze.
   Nie tyka silnika gry: przelacza tylko dane w localStorage przed startem gry. */
(function () {
  'use strict';
  var INV_KEY = 'clutcher_inv_v1';
  var NAME_KEY = 'clutcher_name';
  var ACTIVE_KEY = 'csweb_active';
  var PFX = 'csweb_inv_';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  // 1. przy starcie: wczytaj profil aktywny ZANIM gra go odczyta
  var active = lsGet(ACTIVE_KEY);
  if (active) {
    var snap = lsGet(PFX + active);
    if (snap) {
      lsSet(INV_KEY, snap);
      lsSet(NAME_KEY, active);
    }
  }
  var lastSeen = lsGet(INV_KEY);

  // 2. co 2 s: zapisuj zmiany gry z powrotem do profilu
  setInterval(function () {
    var nick = lsGet(ACTIVE_KEY);
    if (!nick) return;
    var cur = lsGet(INV_KEY);
    if (cur && cur !== lastSeen) {
      lastSeen = cur;
      lsSet(PFX + nick, cur);
    }
  }, 2000);

  function profiles() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PFX) === 0) out.push(k.slice(PFX.length));
    }
    return out.sort();
  }

  function login(nick) {
    nick = (nick || '').trim().slice(0, 20);
    if (!nick) return false;
    // nowy profil przejmuje aktualny stan gry jako startowy
    if (!lsGet(PFX + nick)) {
      var cur = lsGet(INV_KEY);
      if (cur) lsSet(PFX + nick, cur);
    }
    lsSet(ACTIVE_KEY, nick);
    location.reload();
    return true;
  }

  function logout() { lsDel(ACTIVE_KEY); location.reload(); }

  // 3. plywajacy panel: tylko nick + lista
  function css() {
    var s = document.createElement('style');
    s.textContent = '#csweb-prof{position:fixed;right:10px;bottom:10px;z-index:99999;font-family:inherit}'
      + '#csweb-profBtn{background:#10151b;border:1px solid #8bc53f;color:#d7e6c3;border-radius:6px;padding:8px 12px;cursor:pointer;font-size:13px;font-weight:700;letter-spacing:.5px}'
      + '#csweb-panel{display:none;position:fixed;right:10px;bottom:52px;z-index:99999;width:280px;background:rgba(10,14,18,.96);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:14px;color:#e8eef2;font-size:13px}'
      + '#csweb-panel.open{display:block}'
      + '#csweb-panel input{width:100%;box-sizing:border-box;background:#161c22;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:4px;padding:7px;margin:6px 0;font-size:13px}'
      + '#csweb-panel button{background:#232b34;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:4px;padding:7px 10px;margin:3px 4px 3px 0;cursor:pointer;font-size:12px}'
      + '#csweb-panel button.go{background:#4a7c2f;border-color:#8bc53f;font-weight:700}'
      + '#csweb-panel .row{margin:4px 0}';
    document.head.appendChild(s);
  }

  function ui() {
    css();
    var wrap = document.createElement('div');
    wrap.id = 'csweb-prof';
    wrap.innerHTML = '<button id="csweb-profBtn"></button><div id="csweb-panel">'
      + '<div class="row"><b>Profil gracza</b> - wpisz nick, laduje sie caly profil</div>'
      + '<div class="row"><input id="csweb-nick" maxlength="20" placeholder="twoj nick, np. gracz123"></div>'
      + '<div class="row"><button class="go" id="csweb-login">Graj jako nick</button>'
      + '<button id="csweb-logout">Wyloguj</button></div>'
      + '<div class="row"><button id="csweb-export">Eksport profilu</button>'
      + '<button id="csweb-import">Import profilu</button>'
      + '<input type="file" id="csweb-file" accept=".json,application/json" style="display:none"></div>'
      + '<div class="row" id="csweb-list" style="opacity:.75"></div></div>';
    document.body.appendChild(wrap);
    var btn = document.getElementById('csweb-profBtn');
    var panel = document.getElementById('csweb-panel');
    function refreshBtn() {
      var n = lsGet(ACTIVE_KEY);
      btn.textContent = n ? '\u25CF ' + n : '\u25CB go\u015B\u0107';
    }
    refreshBtn();
    btn.onclick = function () {
      panel.classList.toggle('open');
      var list = profiles();
      document.getElementById('csweb-list').textContent = list.length ? 'Profile na tym PC: ' + list.join(', ') : 'Brak profili - wpisz nick i graj.';
      var cur = lsGet(ACTIVE_KEY);
      if (cur) document.getElementById('csweb-nick').value = cur;
    };
    document.getElementById('csweb-login').onclick = function () {
      var v = document.getElementById('csweb-nick').value;
      if (!login(v)) alert('Podaj nick.');
    };
    document.getElementById('csweb-logout').onclick = logout;
    document.getElementById('csweb-export').onclick = function () {
      var nick = lsGet(ACTIVE_KEY) || document.getElementById('csweb-nick').value.trim().slice(0, 20);
      if (!nick) { alert('Najpierw wpisz nick albo zaloguj.'); return; }
      var snap = lsGet(PFX + nick) || lsGet(INV_KEY);
      if (!snap) { alert('Brak danych profilu.'); return; }
      var blob = new Blob([JSON.stringify({ app: 'csweb', nick: nick, inv: JSON.parse(snap) })], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'csweb-profil-' + nick + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };
    document.getElementById('csweb-import').onclick = function () {
      document.getElementById('csweb-file').click();
    };
    document.getElementById('csweb-file').onchange = function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!d || d.app !== 'csweb' || !d.nick || !d.inv) throw 0;
          lsSet(PFX + d.nick, JSON.stringify(d.inv));
          lsSet(ACTIVE_KEY, d.nick);
          location.reload();
        } catch (e) { alert('Zly plik profilu.'); }
      };
      rd.readAsText(f);
      ev.target.value = '';
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui);
  else ui();
})();
