/* CSWEB - profile graczy + KONTA cloud (nick + haslo).
   Gosc / profil lokalny dziala jak wczesniej (localStorage, offline OK).
   Konto cloud (Supabase): nick+haslo, skiny w chmurze, dziala z kazdego kompa.
   Nie tyka silnika gry: przelacza tylko dane w localStorage przed startem gry. */
(function () {
  'use strict';
  var INV_KEY = 'clutcher_inv_v1';
  var NAME_KEY = 'clutcher_name';
  var ACTIVE_KEY = 'csweb_active';
  var CLOUDUID_KEY = 'csweb_clouduid';
  var PFX = 'csweb_inv_';
  var SB_URL = 'https://yyxnwsovmdlmsjrlkjkn.supabase.co';
  var SB_KEY = 'sb_publishable_D2jgttkr7CA9vUZPXx0Pqg_LtWT8VCw';
  var sb = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function mailOf(nick) { return nick.toLowerCase() + '@csweb.local'; }
  function nickOk(nick) { return /^[A-Za-z0-9_.\-]{3,20}$/.test(nick || ''); }

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

  // 1b. chmura w tle: sesja -> profil z bazy -> jedno przeladowanie z danymi
  function cloudBoot() {
    import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(function (m) {
      sb = m.createClient(SB_URL, SB_KEY);
      return sb.auth.getSession();
    }).then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) { refreshBtn(); return; }
      return sb.from('profiles').select('nick,inv').eq('user_id', session.user.id).single().then(function (r) {
        if (r.error || !r.data) { refreshBtn(); return; }
        var cloudInv = JSON.stringify(r.data.inv);
        var cur = lsGet(INV_KEY);
        if (cur !== cloudInv && !sessionStorage.getItem('csweb_synced')) {
          try { sessionStorage.setItem('csweb_synced', '1'); } catch (e) {}
          lsSet(INV_KEY, cloudInv);
          lsSet(NAME_KEY, r.data.nick);
          lsSet(ACTIVE_KEY, r.data.nick);
          lsSet(PFX + r.data.nick, cloudInv);
          lsSet(CLOUDUID_KEY, session.user.id);
          lastSeen = cloudInv;
          location.reload();
          return;
        }
        lsSet(CLOUDUID_KEY, session.user.id);
        if (!lsGet(ACTIVE_KEY)) lsSet(ACTIVE_KEY, r.data.nick);
        refreshBtn();
      });
    }).catch(function () { refreshBtn(); });
  }

  function cloudPush() {
    if (!sb) return;
    var nick = lsGet(ACTIVE_KEY), uid = lsGet(CLOUDUID_KEY);
    if (!nick || !uid) return;
    var cur = lsGet(INV_KEY);
    if (!cur || cur === lastSeen) return;
    lastSeen = cur;
    var inv;
    try { inv = JSON.parse(cur); } catch (e) { return; }
    sb.from('profiles').upsert({ user_id: uid, nick: nick, inv: inv }).then(function () {}, function () {});
  }

  // 2. co 2 s: zapisuj zmiany gry do profilu (lokalnie + chmura)
  setInterval(function () {
    var nick = lsGet(ACTIVE_KEY);
    if (!nick) return;
    var cur = lsGet(INV_KEY);
    if (cur && cur !== lastSeen) {
      lastSeen = cur;
      lsSet(PFX + nick, cur);
    }
    cloudPush();
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

  function logout() {
    if (sb) { try { sb.auth.signOut(); } catch (e) {} }
    lsDel(ACTIVE_KEY);
    lsDel(CLOUDUID_KEY);
    try { sessionStorage.removeItem('csweb_synced'); } catch (e) {}
    location.reload();
  }

  function msg(t) {
    var el = document.getElementById('csweb-msg');
    if (el) el.textContent = t || '';
  }

  function cloudSignup() {
    var nick = document.getElementById('csweb-nick').value.trim().slice(0, 20);
    var pass = document.getElementById('csweb-pass').value;
    if (!nickOk(nick)) { msg('Nick: 3-20 znakow, litery/cyfry/_.-'); return; }
    if (!pass || pass.length < 6) { msg('Haslo: minimum 6 znakow.'); return; }
    if (!sb) { msg('Brak netu - konto cloud niedostepne.'); return; }
    msg('Zakladam konto...');
    sb.auth.signUp({ email: mailOf(nick), password: pass }).then(function (res) {
      if (res.error) {
        if (/already|registered|exists/i.test(res.error.message)) msg('Nick zajety - zaloguj sie.');
        else msg('Blad: ' + res.error.message);
        return null;
      }
      if (!res.data || !res.data.session) { msg('Konto jest, zaloguj sie przyciskiem Zaloguj.'); return null; }
      var uid = res.data.user.id;
      var snap = lsGet(INV_KEY) || '{"coins":0,"items":[]}';
      var inv;
      try { inv = JSON.parse(snap); } catch (e) { inv = { coins: 0, items: [] }; }
      return sb.from('profiles').upsert({ user_id: uid, nick: nick, inv: inv }).then(function (r2) {
        if (r2.error) { msg('Blad zapisu: ' + r2.error.message); return; }
        lsSet(PFX + nick, snap);
        lsSet(INV_KEY, snap);
        lsSet(NAME_KEY, nick);
        lsSet(ACTIVE_KEY, nick);
        lsSet(CLOUDUID_KEY, uid);
        lastSeen = snap;
        location.reload();
      });
    }).catch(function () { msg('Blad sieci.'); });
  }

  function cloudLogin() {
    var nick = document.getElementById('csweb-nick').value.trim().slice(0, 20);
    var pass = document.getElementById('csweb-pass').value;
    if (!nickOk(nick) || !pass) { msg('Podaj nick i haslo.'); return; }
    if (!sb) { msg('Brak netu - konto cloud niedostepne.'); return; }
    msg('Logowanie...');
    sb.auth.signInWithPassword({ email: mailOf(nick), password: pass }).then(function (res) {
      if (res.error) { msg('Zly nick lub haslo.'); return null; }
      var uid = res.data.user.id;
      return sb.from('profiles').select('nick,inv').eq('user_id', uid).single().then(function (r) {
        if (r.error || !r.data) { msg('Brak profilu w chmurze.'); return; }
        var cloudInv = JSON.stringify(r.data.inv);
        lsSet(PFX + r.data.nick, cloudInv);
        lsSet(INV_KEY, cloudInv);
        lsSet(NAME_KEY, r.data.nick);
        lsSet(ACTIVE_KEY, r.data.nick);
        lsSet(CLOUDUID_KEY, uid);
        lastSeen = cloudInv;
        location.reload();
      });
    }).catch(function () { msg('Blad sieci.'); });
  }

  // 3. plywajacy panel: nick + haslo + lista
  var btnRef = null;
  function refreshBtn() {
    if (!btnRef) return;
    var n = lsGet(ACTIVE_KEY);
    var cloud = !!lsGet(CLOUDUID_KEY);
    btnRef.textContent = n ? '\u25CF ' + n + (cloud ? ' \u2601' : '') : '\u25CB go\u015B\u0107';
  }

  function css() {
    var s = document.createElement('style');
    s.textContent = '#csweb-prof{position:fixed;right:10px;bottom:10px;z-index:99999;font-family:inherit}'
      + '#csweb-profBtn{background:#10151b;border:1px solid #8bc53f;color:#d7e6c3;border-radius:6px;padding:8px 12px;cursor:pointer;font-size:13px;font-weight:700;letter-spacing:.5px}'
      + '#csweb-panel{display:none;position:fixed;right:10px;bottom:52px;z-index:99999;width:280px;background:rgba(10,14,18,.96);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:14px;color:#e8eef2;font-size:13px}'
      + '#csweb-panel.open{display:block}'
      + '#csweb-panel input{width:100%;box-sizing:border-box;background:#161c22;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:4px;padding:7px;margin:6px 0;font-size:13px}'
      + '#csweb-panel button{background:#232b34;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:4px;padding:7px 10px;margin:3px 4px 3px 0;cursor:pointer;font-size:12px}'
      + '#csweb-panel button.go{background:#4a7c2f;border-color:#8bc53f;font-weight:700}'
      + '#csweb-panel .row{margin:4px 0}'
      + '#csweb-msg{min-height:16px;color:#ffd75e;font-size:12px}';
    document.head.appendChild(s);
  }

  function ui() {
    css();
    var wrap = document.createElement('div');
    wrap.id = 'csweb-prof';
    wrap.innerHTML = '<button id="csweb-profBtn"></button><div id="csweb-panel">'
      + '<div class="row"><b>Konto CSWEB</b> - nick + haslo, skiny w chmurze</div>'
      + '<div class="row"><input id="csweb-nick" maxlength="20" placeholder="nick"></div>'
      + '<div class="row"><input id="csweb-pass" type="password" maxlength="72" placeholder="haslo (min. 6 znakow)"></div>'
      + '<div class="row"><button class="go" id="csweb-signup">Zaloz konto</button>'
      + '<button class="go" id="csweb-signin">Zaloguj</button>'
      + '<button id="csweb-logout">Wyloguj</button></div>'
      + '<div class="row" id="csweb-msg"></div>'
      + '<div class="row"><button id="csweb-local">Graj lokalnie (bez konta)</button></div>'
      + '<div class="row"><button id="csweb-export">Eksport profilu</button>'
      + '<button id="csweb-import">Import profilu</button>'
      + '<input type="file" id="csweb-file" accept=".json,application/json" style="display:none"></div>'
      + '<div class="row" id="csweb-list" style="opacity:.75"></div></div>';
    document.body.appendChild(wrap);
    btnRef = document.getElementById('csweb-profBtn');
    var panel = document.getElementById('csweb-panel');
    refreshBtn();
    document.getElementById('csweb-profBtn').onclick = function () {
      panel.classList.toggle('open');
      var list = profiles();
      document.getElementById('csweb-list').textContent = list.length ? 'Profile na tym PC: ' + list.join(', ') : 'Brak profili lokalnych.';
      var cur = lsGet(ACTIVE_KEY);
      if (cur) document.getElementById('csweb-nick').value = cur;
    };
    document.getElementById('csweb-signup').onclick = cloudSignup;
    document.getElementById('csweb-signin').onclick = cloudLogin;
    document.getElementById('csweb-logout').onclick = logout;
    document.getElementById('csweb-local').onclick = function () {
      var v = document.getElementById('csweb-nick').value;
      if (!login(v)) alert('Podaj nick.');
    };
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
    cloudBoot();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui);
  else ui();
})();
