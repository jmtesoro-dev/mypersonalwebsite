// Shared login helper (loaded by every page).
// Accounts and the "logged in" session are kept in the browser. Because some browsers
// (for example when a page is opened straight from a file, or in private mode) do not
// share storage between pages, the session is also carried in the page address
// (#auth=name) and in window.name, so logging in works everywhere.
(function () {
    'use strict';

    var KEY_USERS = 'users';
    var KEY_FLAG = 'isLoggedIn';
    var KEY_USER = 'currentUser';

    var memory = { users: null, session: null };
    var persistent = true;

    /* ---------- tiny safe storage wrappers ---------- */
    function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
    function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } }
    function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
    function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
    function ssDel(k) { try { window.sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }

    // window.name survives moving between pages in the same tab
    function readBlob() {
        try {
            if (window.name && window.name.charAt(0) === '{') return JSON.parse(window.name) || {};
        } catch (e) { /* not ours */ }
        return {};
    }
    function writeBlob(obj) {
        try { window.name = JSON.stringify(obj); } catch (e) { /* ignore */ }
    }

    function hashUser() {
        var m = /[#&]auth=([^&]*)/.exec(window.location.hash || '');
        if (!m) return null;
        try { return decodeURIComponent(m[1]) || null; } catch (e) { return null; }
    }

    /* ---------- accounts ---------- */
    function getUsers() {
        var users = null;

        var raw = lsGet(KEY_USERS);
        if (raw) { try { users = JSON.parse(raw); } catch (e) { users = null; } }

        if (!users) {
            var blob = readBlob();
            if (blob.users && typeof blob.users === 'object') users = blob.users;
        }
        if (!users && memory.users) users = memory.users;
        if (!users || typeof users !== 'object') users = {};

        // keep accounts made with the very first single-account version
        var oldName = lsGet('username');
        var oldPass = lsGet('password');
        if (oldName && oldPass !== null && !(('u:' + oldName.toLowerCase()) in users)) {
            users['u:' + oldName.toLowerCase()] = oldPass;
        }
        return users;
    }

    function saveUsers(users) {
        memory.users = users;
        persistent = lsSet(KEY_USERS, JSON.stringify(users));
        var blob = readBlob();
        blob.users = users;               // backup for this tab if storage is blocked
        writeBlob(blob);
        return true;
    }

    /* ---------- session ---------- */
    function currentUser() {
        var name = memory.session;

        if (!name && lsGet(KEY_FLAG) === 'true') name = lsGet(KEY_USER) || 'user';
        if (!name && ssGet(KEY_FLAG) === 'true') name = ssGet(KEY_USER) || 'user';
        if (!name) name = readBlob().u || null;
        if (!name) name = hashUser();

        if (name) rememberSession(name); // re-save so the next page finds it
        return name || null;
    }

    function rememberSession(name) {
        memory.session = name;
        lsSet(KEY_FLAG, 'true');
        lsSet(KEY_USER, name);
        ssSet(KEY_FLAG, 'true');
        ssSet(KEY_USER, name);
        var blob = readBlob();
        blob.u = name;
        writeBlob(blob);
    }

    function login(name) { rememberSession(name); }

    function logout() {
        memory.session = null;
        lsDel(KEY_FLAG);
        lsDel(KEY_USER);
        ssDel(KEY_FLAG);
        ssDel(KEY_USER);
        var blob = readBlob();
        delete blob.u;
        writeBlob(blob);
        window.location.href = 'login.html';
    }

    function isLoggedIn() { return !!currentUser(); }

    // Pages call this first. It never sends you away: if you are not logged in, the
    // LOG OUT button simply becomes LOG IN and a short message says so.
    function requireLogin() {
        document.addEventListener('DOMContentLoaded', function () {
            if (isLoggedIn()) return;
            var btn = document.querySelector('.logout-button');
            if (btn) {
                btn.textContent = 'Log In';
                btn.setAttribute('href', 'login.html');
                btn.onclick = function (e) { e.preventDefault(); window.location.href = 'login.html'; };
            }
            setTimeout(function () {
                if (window.showToast) window.showToast('You are not logged in. Use LOG IN in the menu to sign in.', 4200);
            }, 700);
        });
    }

    // address of the home page that carries the session along
    function homeUrl() {
        var name = currentUser();
        return 'index.html' + (name ? '#auth=' + encodeURIComponent(name) : '');
    }

    // add the session to links between pages so the next page always knows you are logged in
    function decorateLinks() {
        var name = currentUser();
        if (!name) return;
        var token = '#auth=' + encodeURIComponent(name);
        var links = document.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href');
            if (!href || href.charAt(0) === '#' || /^(javascript:|mailto:|tel:|https?:)/i.test(href)) continue;
            if (!/\.html$/i.test(href) || /^login\.html$/i.test(href)) continue;
            links[i].setAttribute('href', href + token);
        }
    }
    document.addEventListener('DOMContentLoaded', decorateLinks);

    window.Auth = {
        getUsers: getUsers,
        saveUsers: saveUsers,
        login: login,
        logout: logout,
        isLoggedIn: isLoggedIn,
        currentUser: currentUser,
        requireLogin: requireLogin,
        homeUrl: homeUrl,
        isPersistent: function () { return persistent && lsSet('__t', '1') && (lsDel('__t'), true); }
    };
})();
