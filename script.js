// Gallery lightbox script (used by gallery.html)
// - arrows (click, hover the edges, or use the keyboard) to change photo
// - swipe / drag to change photo
// - zoom: mouse wheel, + / - buttons, double click / double tap, pinch; drag to move when zoomed
let currentImageIndex = 0;
const images = document.querySelectorAll('.thumbnail');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const zoomLabel = document.getElementById('zoomLevel');

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
let scale = 1;
let tx = 0;
let ty = 0;

/* ---------- zoom helpers ---------- */
function applyTransform(animated) {
    if (scale <= 1.001 && tx === 0 && ty === 0) {
        lightboxImage.style.transform = '';
    } else {
        lightboxImage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    }
    lightboxImage.style.transition = animated ? 'transform .18s ease-out' : '';
    if (zoomLabel) zoomLabel.textContent = Math.round(scale * 100) + '%';
    lightboxImage.classList.toggle('zoomed', scale > 1.02);
}

function stopEntryAnimation() {
    lightboxImage.style.animation = 'none';
}

function resetZoom(animated) {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform(animated);
}

// keep the picture from being dragged completely out of view
function clampPan() {
    if (scale <= 1.001) { tx = 0; ty = 0; return; }
    const maxX = Math.max((lightboxImage.offsetWidth * scale - window.innerWidth) / 2, 0) + 60;
    const maxY = Math.max((lightboxImage.offsetHeight * scale - window.innerHeight) / 2, 0) + 60;
    tx = Math.max(-maxX, Math.min(maxX, tx));
    ty = Math.max(-maxY, Math.min(maxY, ty));
}

// zoom by "factor" keeping the point under (cx, cy) in place
function zoomAt(cx, cy, factor, animated) {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * factor));
    if (next === scale) return;
    stopEntryAnimation();

    const rect = lightboxImage.getBoundingClientRect();
    const baseX = rect.left + rect.width / 2 - tx;   // centre of the picture without the zoom shift
    const baseY = rect.top + rect.height / 2 - ty;
    const px = cx - baseX;
    const py = cy - baseY;
    const ratio = next / scale;
    tx = px - (px - tx) * ratio;
    ty = py - (py - ty) * ratio;
    scale = next;

    if (scale <= 1.001) { scale = 1; tx = 0; ty = 0; }
    clampPan();
    applyTransform(animated !== false);
}

function toggleZoomAt(x, y) {
    if (scale > 1.2) {
        stopEntryAnimation();
        resetZoom(true);
    } else {
        zoomAt(x, y, 2.5 / scale, true);
    }
}

/* ---------- showing photos ---------- */
function showImage(index) {
    currentImageIndex = index;
    const img = images[currentImageIndex];
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    resetZoom(false);
    if (window.deckSelect) window.deckSelect(index);   // keep the card deck on the same photo

    const desc = img.closest('.gallery-item').querySelector('.image-description');
    const pad = (n) => (n < 10 ? '0' : '') + n;
    lightboxCaption.textContent =
        pad(index + 1) + ' / ' + pad(images.length) + (desc ? '   -   ' + desc.textContent : '');
}

// 3D "fly in" from the side the new picture comes from
function animateIn(direction) {
    lightboxImage.style.animation = '';
    lightboxImage.classList.remove('in-next', 'in-prev');
    void lightboxImage.offsetWidth; // restart the animation
    lightboxImage.classList.add(direction > 0 ? 'in-next' : 'in-prev');
}

function openLightbox(index) {
    lightboxImage.style.animation = '';
    lightboxImage.classList.remove('in-next', 'in-prev');
    showImage(index);
    lightbox.style.display = 'block';
}

function closeLightbox() {
    lightbox.style.display = 'none';
}

// forward (1) or backward (-1), wrapping around at the ends
function changeImage(direction) {
    currentImageIndex = (currentImageIndex + direction + images.length) % images.length;
    showImage(currentImageIndex);
    animateIn(direction);
}

/* ---------- touch / mouse gestures on the picture ---------- */
const pointers = new Map();   // active fingers / mouse
let gesture = null;           // 'swipe' | 'pan' | 'pinch'
let startX = 0, startY = 0, startTx = 0, startTy = 0;
let pinchStartDist = 0, pinchStartScale = 1;
let dragX = 0;
let downTime = 0, downX = 0, downY = 0, movedFar = false;
let lastTapTime = 0, lastTapX = 0, lastTapY = 0;

function pinchDistance() {
    const p = Array.from(pointers.values());
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
}

lightboxImage.addEventListener('pointerdown', function (event) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (lightboxImage.setPointerCapture) {
        try { lightboxImage.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    }
    stopEntryAnimation();
    lightboxImage.style.transition = '';

    if (pointers.size === 2) {
        gesture = 'pinch';
        pinchStartDist = pinchDistance();
        pinchStartScale = scale;
        return;
    }
    gesture = scale > 1.02 ? 'pan' : 'swipe';
    startX = event.clientX;
    startY = event.clientY;
    startTx = tx;
    startTy = ty;
    dragX = 0;
    downTime = performance.now();
    downX = event.clientX;
    downY = event.clientY;
    movedFar = false;
});

lightboxImage.addEventListener('pointermove', function (event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 8) movedFar = true;

    if (gesture === 'pinch' && pointers.size >= 2) {
        scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartScale * (pinchDistance() / pinchStartDist)));
        clampPan();
        applyTransform(false);
    } else if (gesture === 'pan') {
        tx = startTx + (event.clientX - startX);
        ty = startTy + (event.clientY - startY);
        clampPan();
        applyTransform(false);
    } else if (gesture === 'swipe') {
        dragX = event.clientX - startX;
        const shrink = 1 - Math.min(Math.abs(dragX) / 1200, 0.15);
        lightboxImage.style.transform =
            'perspective(900px) translateX(' + dragX + 'px) rotateY(' + (dragX / 12) + 'deg) rotate(' + (dragX / 60) + 'deg) scale(' + shrink + ')';
        lightboxImage.style.opacity = 1 - Math.min(Math.abs(dragX) / 500, 0.5);
    }
});

function releasePointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);

    if (gesture === 'pinch') {
        if (scale < 1.05) { stopEntryAnimation(); resetZoom(true); }
        if (pointers.size === 1) {
            // one finger stays down: carry on moving the zoomed picture
            const rest = Array.from(pointers.values())[0];
            gesture = 'pan';
            startX = rest.x; startY = rest.y; startTx = tx; startTy = ty;
        } else {
            gesture = null;
        }
        return;
    }

    if (gesture === 'swipe') {
        // double tap (touch) toggles zoom
        const now = performance.now();
        if (event.pointerType === 'touch' && !movedFar && now - downTime < 300) {
            if (now - lastTapTime < 320 && Math.hypot(event.clientX - lastTapX, event.clientY - lastTapY) < 40) {
                lightboxImage.style.transform = '';
                lightboxImage.style.opacity = '';
                toggleZoomAt(event.clientX, event.clientY);
                lastTapTime = 0;
                gesture = null;
                return;
            }
            lastTapTime = now;
            lastTapX = event.clientX;
            lastTapY = event.clientY;
        }

        if (Math.abs(dragX) > 90) {
            // fling it away, then bring in the next picture
            const direction = dragX < 0 ? 1 : -1;
            lightboxImage.style.transition = 'transform .22s ease-in, opacity .22s';
            lightboxImage.style.transform =
                'perspective(900px) translateX(' + (dragX < 0 ? -1 : 1) * window.innerWidth * 0.6 + 'px) rotateY(' + (dragX < 0 ? 60 : -60) + 'deg)';
            lightboxImage.style.opacity = 0;
            setTimeout(function () {
                lightboxImage.style.transition = '';
                lightboxImage.style.transform = '';
                lightboxImage.style.opacity = '';
                changeImage(direction);
            }, 210);
        } else {
            // not far enough: spring back
            lightboxImage.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1), opacity .3s';
            lightboxImage.style.transform = '';
            lightboxImage.style.opacity = '';
            setTimeout(function () { lightboxImage.style.transition = ''; }, 360);
        }
    } else if (gesture === 'pan') {
        clampPan();
        applyTransform(true);
    }
    gesture = null;
}
lightboxImage.addEventListener('pointerup', releasePointer);
lightboxImage.addEventListener('pointercancel', releasePointer);
lightboxImage.addEventListener('dragstart', function (e) { e.preventDefault(); });

// mouse: double click toggles zoom
lightboxImage.addEventListener('dblclick', function (event) {
    toggleZoomAt(event.clientX, event.clientY);
});

// mouse wheel / trackpad zoom
lightbox.addEventListener('wheel', function (event) {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0016), false);
}, { passive: false });

/* ---------- zoom buttons ---------- */
function bindButton(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) { e.stopPropagation(); handler(); });
}
bindButton('zoomInBtn', function () { zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.4, true); });
bindButton('zoomOutBtn', function () { zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.4, true); });
bindButton('zoomResetBtn', function () { stopEntryAnimation(); resetZoom(true); });

/* ---------- thumbnails + keyboard ---------- */
images.forEach(function (img, index) {
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLightbox(index);
        }
    });
});

document.addEventListener('keydown', function (event) {
    if (lightbox.style.display !== 'block') return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') changeImage(-1);
    if (event.key === 'ArrowRight') changeImage(1);
    if (event.key === '+' || event.key === '=') zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.4, true);
    if (event.key === '-' || event.key === '_') zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.4, true);
    if (event.key === '0') { stopEntryAnimation(); resetZoom(true); }
});

/* =====================================================================

   ===================================================================== */
(function () {
    const deck = document.getElementById('deck');
    if (!deck) return;

    const cards = Array.from(deck.querySelectorAll('.gallery-item'));
    const total = cards.length;
    if (!total) return;

    const countEl = document.getElementById('deckCount');
    const capEl = document.getElementById('deckCaption');
    const dotsBox = document.getElementById('deckDots');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let pos = 0;          // where the cards are drawn (glides toward target)
    let target = 0;       // the card we want in the middle
    let raf = null;
    let shown = -1;
    let dragging = false, moved = false, suppressClick = false;
    let startX = 0, startPos = 0, lastX = 0, lastT = 0, velocity = 0;
    let wheelLock = 0;

    const mod = (n, m) => ((n % m) + m) % m;
    const wrap = (d) => mod(d + total / 2, total) - total / 2;
    const pad = (n) => (n < 10 ? '0' : '') + n;
    const spacing = () => (deck.clientWidth < 640 ? 100 : 200);
    const selected = () => mod(Math.round(target), total);

    /* ---- dots ---- */
    const dots = cards.map(function (card, i) {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'deck-dot';
        d.setAttribute('aria-label', 'Select photo ' + (i + 1));
        d.addEventListener('click', function () { select(i); });
        if (dotsBox) dotsBox.appendChild(d);
        return d;
    });

    /* ---- place every card in 3D: the selected one in front, the rest fanned out ---- */
    function layout() {
        const sp = spacing();
        cards.forEach(function (card, i) {
            const d = wrap(i - pos);
            const ad = Math.abs(d);
            const sign = d < 0 ? -1 : 1;
            const x = sign * (Math.min(ad, 1) * sp + Math.max(0, ad - 1) * sp * 0.55);
            const rot = Math.max(-60, Math.min(60, -d * 30));
            card.style.transform =
                'translateX(' + x.toFixed(1) + 'px) translateZ(' + (-Math.min(ad, 3) * 130).toFixed(1) + 'px) ' +
                'rotateY(' + rot.toFixed(1) + 'deg) scale(' + (1 - Math.min(ad, 3) * 0.09).toFixed(3) + ')';
            card.style.opacity = Math.max(0.25, 1 - ad * 0.22).toFixed(2);
            card.style.filter = ad < 0.05 ? 'none' : 'brightness(' + (1 - Math.min(ad, 2) * 0.28).toFixed(2) + ')';
            card.style.zIndex = 100 - Math.round(ad * 10);
            card.style.visibility = ad > 3.2 ? 'hidden' : 'visible';
            card.style.pointerEvents = ad > 2.6 ? 'none' : 'auto';
        });
    }

    function updateUI() {
        const i = selected();
        if (i === shown) return;
        shown = i;
        cards.forEach(function (c, n) { c.classList.toggle('is-active', n === i); });
        dots.forEach(function (d, n) { d.classList.toggle('active', n === i); });
        if (countEl) countEl.textContent = pad(i + 1) + ' / ' + pad(total);
        const desc = cards[i].querySelector('.image-description');
        if (capEl) capEl.textContent = desc ? desc.textContent : '';
    }

    function tick() {
        raf = null;
        if (dragging) {
            pos = target;
        } else {
            const diff = target - pos;
            if (reduce || Math.abs(diff) < 0.0008) pos = target;
            else pos += diff * 0.14;
        }
        layout();
        updateUI();
        if (dragging || pos !== target) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }

    /* ---- moving the selection ---- */
    function go(delta) { target = Math.round(target) + delta; kick(); }
    function select(i) { go(wrap(i - selected())); }
    window.deckSelect = select;   // used by the photo viewer

    const prevBtn = document.getElementById('deckPrev');
    const nextBtn = document.getElementById('deckNext');
    const openBtn = document.getElementById('deckOpen');
    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });
    if (openBtn) openBtn.addEventListener('click', function () { openLightbox(selected()); });

    /* ---- click a card: select it; click the selected card: open it ---- */
    deck.addEventListener('click', function (event) {
        if (suppressClick) { suppressClick = false; return; }
        const card = event.target.closest ? event.target.closest('.gallery-item') : null;
        if (!card) return;
        const i = cards.indexOf(card);
        if (i < 0) return;
        openLightbox(i);   // any photo you click opens enlarged (and the deck moves to it)
    });

    /* ---- swipe / drag the cards (mouse, pen and touch) ---- */
    deck.addEventListener('pointerdown', function (event) {
        if (event.button !== undefined && event.button !== 0) return;
        dragging = true;
        moved = false;
        startX = lastX = event.clientX;
        startPos = target;
        lastT = performance.now();
        velocity = 0;
    });

    deck.addEventListener('pointermove', function (event) {
        if (!dragging) return;
        const dx = event.clientX - startX;
        if (!moved && Math.abs(dx) > 6) {
            moved = true;
            deck.classList.add('dragging');
            if (deck.setPointerCapture) { try { deck.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ } }
        }
        if (!moved) return;
        target = startPos - dx / spacing();
        const now = performance.now();
        const dt = now - lastT;
        if (dt > 0) velocity = (event.clientX - lastX) / dt;   // px per ms
        lastX = event.clientX;
        lastT = now;
        kick();
    });

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        deck.classList.remove('dragging');
        if (moved) {
            suppressClick = true;
            setTimeout(function () { suppressClick = false; }, 60);
            // let a quick flick carry a little further, then settle on a card
            const projected = target - (velocity / spacing()) * 160;
            const base = Math.round(startPos);
            target = Math.max(base - 2, Math.min(base + 2, Math.round(projected)));
            kick();
        }
    }
    deck.addEventListener('pointerup', endDrag);
    deck.addEventListener('pointercancel', endDrag);
    deck.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // trackpad: a sideways two-finger swipe moves one card
    deck.addEventListener('wheel', function (event) {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 20) return;
        event.preventDefault();
        const now = performance.now();
        if (now - wheelLock < 350) return;
        wheelLock = now;
        go(event.deltaX > 0 ? 1 : -1);
    }, { passive: false });

    /* ---- keyboard ---- */
    document.addEventListener('keydown', function (event) {
        if (lightbox.style.display === 'block') return;
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
        if ((event.key === 'Enter' || event.key === ' ') && document.activeElement === deck) {
            event.preventDefault();
            openLightbox(selected());
        }
    });

    layout();
    updateUI();
})();
