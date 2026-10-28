// Shared script for every page (kept simple and light):
//  - dark / light mode button (remembered)
//  - header: sizing, current-page highlight, dropdown that opens on hover, click or tap
//  - soft animated background (floating shapes + dust)
//  - small helpers: pop-up messages, back-to-top button, scroll progress bar
//  - gentle card tilt, fun fact reveal, keyboard support
(function () {
    'use strict';

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    /* =====================================================
       Injected styles
       ===================================================== */
    var css = [
        /* background layer */
        '.fx-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}',
        '.fx-dust{position:absolute;left:0;top:0;width:100%;height:100%}',
        '.fx-orb{position:absolute;border-radius:50%;width:var(--s);height:var(--s);opacity:.45;',
        'background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.9) 0,var(--c) 26%,rgba(10,4,24,.92) 100%);',
        'box-shadow:0 0 60px var(--c),inset -10px -14px 30px rgba(0,0,0,.45);',
        'animation:fxOrb var(--t) ease-in-out infinite alternate}',
        '.fx-wrap{position:absolute;width:var(--s);height:var(--s);perspective:700px;opacity:.65}',
        '.fx-cube{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:fxSpin var(--t) linear infinite}',
        '.fx-cube i{position:absolute;inset:0;border:1px solid rgba(196,181,253,.6);',
        'background:linear-gradient(135deg,rgba(124,58,237,.2),rgba(16,185,129,.14));',
        'box-shadow:inset 0 0 22px rgba(196,181,253,.3)}',
        '.fx-cube i:nth-child(1){transform:translateZ(calc(var(--s)/2))}',
        '.fx-cube i:nth-child(2){transform:rotateY(180deg) translateZ(calc(var(--s)/2))}',
        '.fx-cube i:nth-child(3){transform:rotateY(90deg) translateZ(calc(var(--s)/2))}',
        '.fx-cube i:nth-child(4){transform:rotateY(-90deg) translateZ(calc(var(--s)/2))}',
        '.fx-cube i:nth-child(5){transform:rotateX(90deg) translateZ(calc(var(--s)/2))}',
        '.fx-cube i:nth-child(6){transform:rotateX(-90deg) translateZ(calc(var(--s)/2))}',
        '@keyframes fxOrb{from{transform:translateY(0) scale(1)}to{transform:translateY(-40px) scale(1.1)}}',
        '@keyframes fxSpin{from{transform:rotateX(0) rotateY(0)}to{transform:rotateX(360deg) rotateY(360deg)}}',
        '.fx-vignette{position:fixed;inset:0;z-index:9989;pointer-events:none;',
        'background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.4) 100%)}',

        /* scroll progress, back to top, toast */
        '.fx-progress{position:fixed;top:0;left:0;height:3px;width:0;z-index:1002;',
        'background:linear-gradient(90deg,#7c3aed,#6ee7b7)}',
        '.fx-top{position:fixed;right:22px;bottom:24px;width:48px;height:48px;z-index:1001;padding:0;',
        'border-radius:50%;border:1px solid rgba(255,255,255,.25);cursor:pointer;opacity:0;pointer-events:none;',
        'background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.05)),rgba(12,6,26,.6);',
        'box-shadow:0 10px 24px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.4);',
        'transition:opacity .25s,transform .25s,background .25s}',
        '.fx-top.show{opacity:1;pointer-events:auto}',
        '.fx-top:hover{transform:translateY(-3px);background:linear-gradient(135deg,#7c3aed,#10b981)}',
        '.fx-top::before{content:"";position:absolute;left:50%;top:50%;width:11px;height:11px;',
        'border-left:3px solid #fff;border-top:3px solid #fff;transform:translate(-50%,-30%) rotate(45deg)}',
        '.fx-toast{position:fixed;left:50%;bottom:34px;z-index:1600;max-width:min(90vw,460px);padding:13px 24px;',
        'translate:-50% 24px;opacity:0;pointer-events:none;text-align:center;color:#fff;font-size:15px;',
        'background:linear-gradient(135deg,rgba(255,255,255,.2),rgba(255,255,255,.05)),rgba(12,6,26,.82);',
        'border:1px solid rgba(255,255,255,.3);border-radius:14px;',
        'box-shadow:0 18px 44px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.4);',
        'transition:opacity .3s,translate .35s}',
        '.fx-toast.show{opacity:1;translate:-50% 0}',

        /* theme button */
        '.theme-ico{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:8px;',
        'background:currentColor;box-shadow:0 0 8px currentColor}',
        'html[data-theme="light"] .theme-ico{background:transparent;box-shadow:inset -4px -1px 0 0 currentColor}',
        '.theme-float{position:fixed;top:18px;right:18px;z-index:1003;font-family:inherit;font-size:12px;letter-spacing:.1em;',
        'color:#ede9fe;padding:9px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.25);cursor:pointer;',
        'background:linear-gradient(135deg,rgba(255,255,255,.2),rgba(255,255,255,.05)),rgba(12,6,26,.6);',
        'box-shadow:0 10px 24px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.35);',
        'transition:transform .2s,background .2s,color .2s}',
        '.theme-float:hover{transform:translateY(-2px);background:linear-gradient(135deg,#7c3aed,#10b981);color:#fff}',

        /* light-mode versions */
        'html[data-theme="light"] .theme-float{color:#3b1a78;border-color:rgba(76,29,149,.25);',
        'background:linear-gradient(135deg,#fff,#ede9fe);box-shadow:0 10px 24px rgba(76,29,149,.25),inset 0 1px 0 #fff}',
        'html[data-theme="light"] .theme-float:hover{color:#fff;background:linear-gradient(135deg,#7c3aed,#10b981)}',
        'html[data-theme="light"] .fx-vignette{background:radial-gradient(ellipse at center,transparent 65%,rgba(76,29,149,.1) 100%)}',
        'html[data-theme="light"] .fx-orb{opacity:.55;background:radial-gradient(circle at 32% 28%,#fff 0,var(--c) 38%,rgba(76,29,149,.6) 100%);',
        'box-shadow:0 0 40px var(--c),inset -10px -14px 30px rgba(76,29,149,.3)}',
        'html[data-theme="light"] .fx-cube i{border-color:rgba(109,40,217,.5);box-shadow:inset 0 0 22px rgba(124,58,237,.2)}',
        'html[data-theme="light"] .fx-toast{color:#22123f;border-color:rgba(76,29,149,.25);',
        'background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(237,233,254,.95));',
        'box-shadow:0 18px 44px rgba(76,29,149,.3),inset 0 1px 0 #fff}',
        'html[data-theme="light"] .fx-top{border-color:rgba(76,29,149,.25);background:linear-gradient(135deg,#fff,#ede9fe);',
        'box-shadow:0 10px 24px rgba(76,29,149,.3),inset 0 1px 0 #fff}',
        'html[data-theme="light"] .fx-top::before{border-color:#5b21b6}',
        'html[data-theme="light"] .fx-top:hover::before{border-color:#fff}',

        /* circular wipe used when switching theme */
        '::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}',
        '::view-transition-old(root){z-index:1}::view-transition-new(root){z-index:2}',

        '@media (hover:none){.fx-wrap{display:none}}',
        '@media (prefers-reduced-motion:reduce){.fx-layer *{animation:none!important}}'
    ].join('');

    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* =====================================================
       Pop-up message (used by other pages too)
       ===================================================== */
    var toastEl = document.createElement('div');
    toastEl.className = 'fx-toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
    var toastTimer = null;

    window.showToast = function (message, ms) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2600);
    };

    /* =====================================================
       Soft background: floating shapes + dust
       ===================================================== */
    var layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');

    [
        { s: 130, x: '6%',  y: '62%', c: '#7c3aed', t: 12 },
        { s: 100, x: '89%', y: '16%', c: '#10b981', t: 10 },
        { s: 70,  x: '76%', y: '70%', c: '#a78bfa', t: 14 }
    ].forEach(function (o) {
        var el = document.createElement('div');
        el.className = 'fx-orb';
        el.style.cssText = '--s:' + o.s + 'px;--c:' + o.c + ';--t:' + o.t + 's;left:' + o.x + ';top:' + o.y;
        layer.appendChild(el);
    });

    [
        { s: 80, x: '84%', y: '46%', t: 24 },
        { s: 56, x: '4%',  y: '28%', t: 18 }
    ].forEach(function (c) {
        var wrap = document.createElement('div');
        wrap.className = 'fx-wrap';
        wrap.style.cssText = '--s:' + c.s + 'px;--t:' + c.t + 's;left:' + c.x + ';top:' + c.y;
        var cube = document.createElement('div');
        cube.className = 'fx-cube';
        for (var i = 0; i < 6; i++) cube.appendChild(document.createElement('i'));
        wrap.appendChild(cube);
        layer.appendChild(wrap);
    });
    document.body.appendChild(layer);

    var vignette = document.createElement('div');
    vignette.className = 'fx-vignette';
    vignette.setAttribute('aria-hidden', 'true');
    document.body.appendChild(vignette);

    function currentTheme() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    // drifting dust (pauses when the tab is hidden)
    if (!reduce) {
        (function () {
            var canvas = document.createElement('canvas');
            canvas.className = 'fx-dust';
            layer.insertBefore(canvas, layer.firstChild);
            var ctx = canvas.getContext('2d');
            if (!ctx) return;
            var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
            var parts = [];

            function resize() {
                W = window.innerWidth;
                H = window.innerHeight;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            resize();
            window.addEventListener('resize', resize);

            for (var i = 0, n = canHover ? 30 : 14; i < n; i++) {
                parts.push({
                    x: Math.random() * W, y: Math.random() * H,
                    r: Math.random() * 1.7 + 0.4,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: -(Math.random() * 0.22 + 0.05),
                    a: Math.random() * 0.6 + 0.2,
                    t: Math.random() * 6.28,
                    c: Math.random() < 0.5 ? 0 : 1
                });
            }

            (function frame() {
                requestAnimationFrame(frame);
                if (document.hidden) return;
                ctx.clearRect(0, 0, W, H);
                var light = currentTheme() === 'light';
                parts.forEach(function (p) {
                    p.t += 0.02;
                    p.x += p.vx + Math.sin(p.t) * 0.12;
                    p.y += p.vy;
                    if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
                    if (p.x < -5) p.x = W + 5;
                    if (p.x > W + 5) p.x = -5;
                    var a = p.a * (0.55 + 0.45 * Math.sin(p.t * 1.7));
                    var col = light ? (p.c ? '5,150,105' : '109,40,217') : (p.c ? '110,231,183' : '196,181,253');
                    ctx.beginPath();
                    ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
                    ctx.arc(p.x, p.y, p.r, 0, 6.283);
                    ctx.fill();
                });
            })();
        })();
    }

    /* =====================================================
       Scroll progress + back-to-top
       ===================================================== */
    var progress = document.createElement('div');
    progress.className = 'fx-progress';
    document.body.appendChild(progress);

    var topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.className = 'fx-top';
    topBtn.setAttribute('aria-label', 'Back to top');
    topBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    document.body.appendChild(topBtn);

    var scrollQueued = false;
    function onScroll() {
        scrollQueued = false;
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
        topBtn.classList.toggle('show', h.scrollTop > 500);
    }
    window.addEventListener('scroll', function () {
        if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    /* =====================================================
       Dark / light mode (remembered in the browser)
       ===================================================== */
    var themeBtns = [];

    function updateThemeButtons() {
        var light = currentTheme() === 'light';
        themeBtns.forEach(function (b) {
            b.setAttribute('aria-label', 'Switch to ' + (light ? 'dark' : 'light') + ' mode');
        });
    }
    function applyTheme(t) {
        if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('theme', t); } catch (e) { /* storage blocked: still works for this visit */ }
        updateThemeButtons();
    }
    function toggleTheme(x, y) {
        var next = currentTheme() === 'light' ? 'dark' : 'light';
        var go = function () { applyTheme(next); };

        if (document.startViewTransition && !reduce) {
            var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            var vt = document.startViewTransition(go);
            vt.ready.then(function () {
                document.documentElement.animate(
                    { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
                    { duration: 600, easing: 'cubic-bezier(.65,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
                );
            }).catch(function () { /* transition skipped */ });
        } else {
            go();
        }
        window.showToast((next === 'light' ? 'Light' : 'Dark') + ' mode on', 1300);
    }
    function makeThemeButton(cls, existing) {
        var b = existing || document.createElement('button');
        if (!existing) {
            b.type = 'button';
            b.className = cls;
            b.innerHTML = '<span class="theme-ico"></span><span class="theme-txt"></span>';
        }
        b.addEventListener('click', function () {
            var r = b.getBoundingClientRect();
            toggleTheme(r.left + r.width / 2, r.top + r.height / 2);
        });
        themeBtns.push(b);
        return b;
    }

    /* =====================================================
       Header: sizing, theme button, current page, dropdown
       ===================================================== */
    var header = $('header');
    if (header) {
        var existingBtn = $('.theme-btn', header);
        if (existingBtn) {
            makeThemeButton('', existingBtn);
        } else {
            var tools = document.createElement('div');
            tools.className = 'menu-right';
            tools.appendChild(makeThemeButton('menu-btn theme-btn'));
            header.appendChild(tools);
        }
    } else {
        document.body.appendChild(makeThemeButton('theme-float'));
    }
    updateThemeButtons();

    // press T to switch (not while typing)
    document.addEventListener('keydown', function (e) {
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 't' || e.key === 'T') toggleTheme(window.innerWidth - 80, 30);
    });

    if ($('nav')) {
        // highlight the page you are on
        var here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        $$('nav a[href]').forEach(function (a) {
            var h = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
            if (h && h === here) {
                a.classList.add('active');
                var dd = a.closest('.dropdown');
                if (dd) { var b = $('.dropbtn', dd); if (b) b.classList.add('active'); }
            }
        });

        // the About menu opens on hover, click or tap; Esc or clicking elsewhere closes it
        $$('.dropdown').forEach(function (dd) {
            var btn = $('.dropbtn', dd);
            if (!btn) return;
            btn.setAttribute('aria-haspopup', 'true');
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                dd.classList.toggle('open');
            });
            dd.addEventListener('mouseleave', function () { dd.classList.remove('open'); });
        });
        document.addEventListener('click', function (e) {
            $$('.dropdown.open').forEach(function (dd) {
                if (!dd.contains(e.target)) dd.classList.remove('open');
            });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') $$('.dropdown.open').forEach(function (dd) { dd.classList.remove('open'); });
        });
    }

    /* =====================================================
       Cards: keyboard support + fun fact reveal
       ===================================================== */
    $$('.goal-card').forEach(function (card) {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    $$('.funfact-card').forEach(function (card) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', 'false');

        function setOrigin(e) {
            var r = card.getBoundingClientRect();
            card.style.setProperty('--ix', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
            card.style.setProperty('--iy', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
        }
        function toggle() {
            var on = card.classList.toggle('revealed');
            card.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        card.addEventListener('mouseenter', setOrigin);
        card.addEventListener('mouseleave', setOrigin);
        card.addEventListener('click', function (e) { setOrigin(e); toggle(); });
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.style.setProperty('--ix', '50%');
                card.style.setProperty('--iy', '50%');
                toggle();
            }
        });
    });

    /* =====================================================
       Login page: clock above the card
       ===================================================== */
    if ($('.form-container')) {
        var lock = document.createElement('div');
        lock.className = 'lock-clock';
        lock.innerHTML = '<div class="lc-time"></div><div class="lc-date"></div>';
        document.body.appendChild(lock);
        var lcTime = $('.lc-time', lock);
        var lcDate = $('.lc-date', lock);
        var tickLock = function () {
            var d = new Date();
            lcTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lcDate.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        };
        tickLock();
        setInterval(tickLock, 15000);
    }

    /* =====================================================
       Gentle mouse effects (one batched handler): card tilt + slider parallax
       ===================================================== */
    if (reduce || !canHover) return;

    var TILT = '.goal-card, .funfact-card';
    var moveEvt = null, queued = false, activeCard = null, activeSlider = null;

    function resetTilt(el) {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
    }

    function processMove() {
        queued = false;
        var e = moveEvt;
        if (!e) return;
        var t = e.target;

        var card = t.closest ? t.closest(TILT) : null;
        if (activeCard && activeCard !== card) resetTilt(activeCard);
        if (card) {
            var r = card.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width;
            var py = (e.clientY - r.top) / r.height;
            card.style.setProperty('--ry', ((px - 0.5) * 12).toFixed(2) + 'deg');
            card.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
            card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
            card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        }
        activeCard = card;

        var sl = t.closest ? t.closest('.slider') : null;
        if (activeSlider && activeSlider !== sl) {
            activeSlider.style.setProperty('--px', 0);
            activeSlider.style.setProperty('--py', 0);
        }
        if (sl) {
            var sr = sl.getBoundingClientRect();
            sl.style.setProperty('--px', ((e.clientX - sr.left) / sr.width - 0.5).toFixed(3));
            sl.style.setProperty('--py', ((e.clientY - sr.top) / sr.height - 0.5).toFixed(3));
        }
        activeSlider = sl;
    }

    document.addEventListener('mousemove', function (e) {
        moveEvt = e;
        if (!queued) { queued = true; requestAnimationFrame(processMove); }
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', function () {
        if (activeCard) { resetTilt(activeCard); activeCard = null; }
        if (activeSlider) {
            activeSlider.style.setProperty('--px', 0);
            activeSlider.style.setProperty('--py', 0);
            activeSlider = null;
        }
    });
})();
