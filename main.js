/* ==========================================================================
   EIRVÍK — "Millimetrinn"
   Vanilla JS. No build step, no CDN. Motion constants match Likova's
   documented values (see DESIGN.md). The Plan engine below is a from-
   scratch rebuild of Likova's generic data-plan-plans <-> data-hoverable
   contract (notes/code-tools.md), retargeted from apartment/floor
   selectors to a cabinetry elevation.
   ========================================================================== */

(function () {
  'use strict';

  var EASE = { out: 'cubic-bezier(.25,.74,.22,.99)', snap: 'cubic-bezier(.25,0,.35,1)' };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     PRELOADER
     Wordmark scales down into the header logo position, ~2s hold,
     matches Likova's preloader->header continuity (percent counter
     is approximated: real byte-loading has no meaningful progress
     signal for a static demo, so this is a timed ramp, documented
     honestly in DESIGN.md rather than faked as a real asset counter).
     ------------------------------------------------------------------ */
  (function preloader() {
    var el = document.getElementById('preloader');
    var pct = document.getElementById('preloader-pct');
    if (!el) return;
    if (reduceMotion) { el.classList.add('is-hidden'); return; }

    var start = performance.now();
    var minDelay = 900;
    var done = false;
    function tick(now) {
      var t = Math.min(1, (now - start) / minDelay);
      pct.textContent = Math.round(t * 100);
      if (t < 1) requestAnimationFrame(tick);
      else finish();
    }
    function finish() {
      if (done) return;
      done = true;
      setTimeout(function () { el.classList.add('is-hidden'); }, 120);
      setTimeout(function () { el.remove(); }, 2200);
    }
    /* Hidden-document guard: rAF never fires in a hidden/throttled tab
       (background tabs, in-app preview panes), which would leave the
       curtain up forever — the loading-curtain-never-animates failure.
       Skip the ceremony when hidden, and keep a hard timeout failsafe
       so the curtain can never outlive 2.5s regardless of rAF. */
    if (document.visibilityState === 'hidden') {
      pct.textContent = '100';
      el.classList.add('is-hidden');
      el.remove();
      done = true;
      return;
    }
    document.addEventListener('visibilitychange', finish, { once: true });
    setTimeout(finish, 2500);
    requestAnimationFrame(tick);
  })();

  /* ------------------------------------------------------------------
     HEADER — hide on scroll down, show on scroll up (rAF-batched,
     never a raw scroll-event handler per performance guardrails)
     ------------------------------------------------------------------ */
  (function header() {
    var header = document.getElementById('site-header');
    var lastY = window.scrollY;
    var ticking = false;

    function update() {
      var y = window.scrollY;
      if (y > 140 && y > lastY) header.classList.add('is-hidden');
      else header.classList.remove('is-hidden');
      header.classList.toggle('is-solid', y > window.innerHeight * 0.82);
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    var toggle = document.getElementById('nav-toggle');
    var mobileNav = document.getElementById('mobile-nav');
    function setMenu(open) {
      mobileNav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Loka valmynd' : 'Opna valmynd');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    toggle.addEventListener('click', function () {
      setMenu(!mobileNav.classList.contains('is-open'));
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    /* Three more ways out, so the panel can never trap anyone:
       tap the panel background, press Escape, or resize to desktop. */
    mobileNav.addEventListener('click', function (e) {
      if (e.target === mobileNav) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 769 && mobileNav.classList.contains('is-open')) setMenu(false);
    });
  })();

  /* ------------------------------------------------------------------
     SECTION CHIP NAV — scrollspy. Independent of the chapter-reveal
     observer below: this one watches a thin band near vertical centre
     and marks whichever section is crossing it as the active chip. This
     is the actual "hard to find stuff" fix — a constant, always-visible
     map of the page that tracks where you are.
     ------------------------------------------------------------------ */
  (function sectionNav() {
    var subnav = document.getElementById('section-nav');
    if (!subnav || !('IntersectionObserver' in window)) return;
    var chips = Array.prototype.slice.call(subnav.querySelectorAll('[data-section]'));
    if (!chips.length) return;
    var sections = chips
      .map(function (chip) { return document.getElementById(chip.getAttribute('data-section')); })
      .filter(Boolean);

    var activeId = null;
    function setActive(id) {
      if (id === activeId) return;
      activeId = id;
      chips.forEach(function (chip) {
        chip.classList.toggle('is-active', chip.getAttribute('data-section') === id);
      });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { io.observe(s); });
  })();

  /* ------------------------------------------------------------------
     CHAPTER REVEAL — staircase clip-path curtain via IntersectionObserver.
     Likova drives this with a Locomotive-fork virtual scroll; that engine
     is intentionally NOT reimplemented here (mobile-ship-gate is HARD,
     and a hand-rolled lerp scroller is exactly the class of bug the
     lenis-mobile-damage lore warns about). IntersectionObserver gives
     the same staircase-reveal outcome on every input type, including
     the in-app-browser trap Likova's own probes hit.
     ------------------------------------------------------------------ */
  (function chapters() {
    var chapters = document.querySelectorAll('.chapter:not(.chapter--hero)');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      chapters.forEach(function (c) { c.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    chapters.forEach(function (c) { io.observe(c); });

    /* Hidden-document guard + in-view-on-mount (house pattern): in a
       hidden tab the observer never fires and transition timelines
       freeze, so every reveal-gated chapter would stay invisible.
       Reveal everything when hidden; otherwise immediately reveal
       whatever is already inside the viewport. */
    var revealNow = function (c) { c.classList.add('is-in'); c.style.opacity = '1'; c.style.clipPath = 'none'; io.unobserve(c); };
    if (document.visibilityState === 'hidden') {
      chapters.forEach(revealNow);
    } else {
      var vh = window.innerHeight;
      chapters.forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) revealNow(c);
      });
    }
  })();

  /* ------------------------------------------------------------------
     PLAN ENGINE — data-plan-plans <-> data-hoverable
     One JSON array, one entry per hoverable region (Likova's join
     contract, notes/code-tools.md). ref matches the SVG group's
     data-hoverable attribute. Hovering/focusing/tapping a group
     cross-fades the line drawing state into the module's real photo.
     ------------------------------------------------------------------ */
  var PLAN_ITEMS = [
    {
      ref: 'tall-pantry', system: 'bulthaup · b1', name: 'Háir skápar',
      photo: 'assets/photos/bulthaup-b1-detail.jpg',
      note: 'Form og virkni. Innvols sem stýrir skipulaginu í háum skápaeiningum.',
      dims: null, price: null
    },
    {
      ref: 'fridge-column', system: 'Miele', name: 'Kæliskápur með DailyFresh',
      sku: 'KS4383DDWEISS', photo: 'assets/products/KS4383DDWEISS.jpg',
      note: 'Innbyggður kæliskápur, felldur inn í háa skáparöð.',
      dims: { width: 600, height: 1850, depth: 675 },
      price: 364850, hidePrice: false, enquiryOnly: true
    },
    {
      ref: 'wall-cabinets', system: 'Häcker · Clever and clean', name: 'SLD Slim Line skúffur',
      photo: 'assets/photos/hacker-detail2.jpg',
      note: 'Mjó römmun, meira innanrými. Vegghengd röð yfir vinnuborði.',
      dims: null, price: null
    },
    {
      ref: 'hood', system: 'Miele', name: 'Veggháfur — Escala',
      sku: 'DAH2660S', photo: 'assets/products/DAH2660S.jpg',
      note: 'Vegghengdur háfur, miðjaður yfir helluborði.',
      dims: { width: 600, height: 443, depth: 388 },
      price: 309990, hidePrice: false, enquiryOnly: true
    },
    {
      ref: 'sink', system: 'bulthaup', name: 'Vinnuborð og vaskur',
      photo: 'assets/photos/bulthaup-b3-materials.jpg',
      note: 'Efniviður og form, fóðrað eftir hverri röð.',
      dims: null, price: null
    },
    {
      ref: 'hob', system: 'Miele', name: 'Keramikhelluborð með stálkanti',
      sku: 'KM6520FR', photo: 'assets/products/KM6520FR.jpg',
      note: 'Keramikhelluborð, felld ofan í vinnuborðið.',
      dims: { width: 600 },
      price: 149990, hidePrice: false, enquiryOnly: false
    },
    {
      ref: 'dishwasher', system: 'Miele', name: 'Uppþvottavél — 100% innbyggð',
      sku: 'G5050SCVI', photo: 'assets/products/G5050SCVI.jpg',
      note: 'QuickPowerWash, þvottahæfnisflokkur A.',
      dims: { width: 600, height: 805 },
      price: 269990, hidePrice: false, enquiryOnly: false
    },
    {
      ref: 'wine-cabinet', system: 'Miele', name: 'Innbyggður vínkæliskápur, 18 Bordeaux',
      sku: 'KWT7112IGS', photo: 'assets/products/KWT7112IGS.jpg',
      note: 'Undir vinnuborði, við hlið uppþvottavélar.',
      dims: { width: 560, height: 450 },
      price: 789990, hidePrice: false, enquiryOnly: true
    },
    {
      ref: 'drawer-bank', system: 'bulthaup · b2', name: 'Vinnuskápur',
      photo: 'assets/photos/bulthaup-b2-detail.jpg',
      note: 'Byggt í kringum vinnuborðið. Skúffuröð undir vinnufleti.',
      dims: null, price: null
    },
    {
      ref: 'island', system: 'bulthaup · b3', name: 'Eyja',
      photo: 'assets/photos/bulthaup-b3-island.jpg',
      note: 'Fótstöðukerfi, eyjan sem miðpunktur eldhússins.',
      dims: null, price: null
    }
  ];

  (function planEngine() {
    var stage = document.getElementById('plan-stage');
    var svg = document.getElementById('plan-svg');
    if (!stage || !svg) return;
    stage.setAttribute('data-plan-plans', JSON.stringify(PLAN_ITEMS));

    var byRef = {};
    PLAN_ITEMS.forEach(function (item) { byRef[item.ref] = item; });

    var emptyEl = document.getElementById('plan-readout-empty');
    var detailEl = document.getElementById('plan-readout-detail');
    var imgEl = document.getElementById('plan-readout-img');
    var systemEl = document.getElementById('plan-readout-system');
    var nameEl = document.getElementById('plan-readout-name');
    var noteEl = document.getElementById('plan-readout-note');
    var dimsEl = document.getElementById('plan-readout-dims');
    var priceEl = document.getElementById('plan-readout-price');

    /* ISK grouped with a period BY HAND - Intl silently falls back to comma
       grouping when is-IS locale data is missing, and this string faces
       customers (house rule, offer-generator lineage). */
    var fmtKr = { format: function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); } };

    /* Build the mobile row list from the same PLAN_ITEMS source. Under
       900px the drawing has no hover, so it can't be the way in — each
       module gets a real bordered row (name / system / mm) that expands
       in place to the photo + full specs. One accordion, one thing to
       touch, one place the answer appears. show()/clear() (below) still
       drive the SVG's is-active tie-back highlight and the desktop
       readout underneath, so both input surfaces stay one engine. */
    (function buildRows() {
      var wrap = document.getElementById('plan-rows');
      if (!wrap) return;

      /* bulthaup line codes (b1/b2/b3) are the ONE lowercase exception to
         the page's uppercase register (DESIGN.md §Type, .brandcase) —
         everything else in the system string (bulthaup, Miele, Häcker,
         SLD Slim Line…) uppercases normally via .mono on the parent. */
      function appendSystemLabel(el, str) {
        var re = /\b(b[123])\b/g;
        var last = 0, m;
        while ((m = re.exec(str))) {
          if (m.index > last) el.appendChild(document.createTextNode(str.slice(last, m.index)));
          var span = document.createElement('span');
          span.className = 'brandcase';
          span.textContent = m[1];
          el.appendChild(span);
          last = m.index + m[1].length;
        }
        if (last < str.length) el.appendChild(document.createTextNode(str.slice(last)));
      }

      /* Compact "600 × 1850 × 675 MM" preview for the collapsed row. Bulthaup/
         Häcker modules carry no dims (none invented, DESIGN.md §Plan Selector
         honesty rule) — those rows simply show system only. */
      function dimsPreview(dims) {
        if (!dims) return '';
        var order = ['width', 'height', 'depth'];
        var vals = order.filter(function (k) { return dims[k]; }).map(function (k) { return dims[k]; });
        return vals.length ? vals.join(' × ') + ' MM' : '';
      }

      PLAN_ITEMS.forEach(function (item, i) {
        var row = document.createElement('div');
        row.className = 'plan__row';
        row.setAttribute('role', 'listitem');

        var btnId = 'plan-row-btn-' + item.ref;
        var panelId = 'plan-row-panel-' + item.ref;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'plan__row-trigger';
        btn.id = btnId;
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', panelId);
        btn.setAttribute('data-ref', item.ref);

        var idx = document.createElement('span');
        idx.className = 'plan__row-index mono';
        idx.textContent = String(i + 1).padStart(2, '0');

        var main = document.createElement('span');
        main.className = 'plan__row-main';
        var nameSpan = document.createElement('span');
        nameSpan.className = 'plan__row-name';
        nameSpan.textContent = item.name;
        var subSpan = document.createElement('span');
        subSpan.className = 'plan__row-sub mono';
        var systemSpan = document.createElement('span');
        appendSystemLabel(systemSpan, item.system);
        subSpan.appendChild(systemSpan);
        var preview = dimsPreview(item.dims);
        if (preview) {
          var dimsSpan = document.createElement('span');
          dimsSpan.className = 'plan__row-sub-dims';
          dimsSpan.textContent = preview;
          subSpan.appendChild(dimsSpan);
        }
        main.appendChild(nameSpan);
        main.appendChild(subSpan);

        var icon = document.createElement('span');
        icon.className = 'plan__row-icon';
        icon.setAttribute('aria-hidden', 'true');

        btn.appendChild(idx);
        btn.appendChild(main);
        btn.appendChild(icon);

        var panel = document.createElement('div');
        panel.className = 'plan__row-panel';
        panel.id = panelId;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', btnId);
        panel.hidden = true;

        var photo = document.createElement('div');
        photo.className = 'plan__row-photo';
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.src = item.photo;
        img.alt = item.name;
        img.onload = function () { img.classList.add('is-loaded'); };
        photo.appendChild(img);

        var body = document.createElement('div');
        body.className = 'plan__row-body';

        var note = document.createElement('p');
        note.className = 'plan__row-note';
        note.textContent = item.note;
        body.appendChild(note);

        if (item.dims) {
          var dl = document.createElement('div');
          dl.className = 'plan__row-fulldims mono';
          Object.keys(item.dims).forEach(function (k) {
            var label = k === 'width' ? 'B' : k === 'height' ? 'H' : 'D';
            var d = document.createElement('div');
            d.innerHTML = '<span>' + item.dims[k] + '</span> ' + label + ' · MM';
            dl.appendChild(d);
          });
          body.appendChild(dl);
        }

        if (item.price !== null) {
          var price = document.createElement('p');
          price.className = 'plan__row-price mono';
          price.textContent = (item.hidePrice || item.enquiryOnly) ? 'Verð samkvæmt tilboði' : fmtKr.format(item.price) + ' KR';
          body.appendChild(price);
        }

        panel.appendChild(photo);
        panel.appendChild(body);

        btn.addEventListener('click', function () {
          var wasOpen = btn.getAttribute('aria-expanded') === 'true';
          wrap.querySelectorAll('.plan__row-trigger').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
          wrap.querySelectorAll('.plan__row-panel').forEach(function (p) { p.hidden = true; });
          if (wasOpen) {
            clear();
          } else {
            btn.setAttribute('aria-expanded', 'true');
            panel.hidden = false;
            show(item.ref);
          }
        });

        row.appendChild(btn);
        row.appendChild(panel);
        wrap.appendChild(row);
      });
    })();

    function show(ref) {
      var item = byRef[ref];
      if (!item) return;

      svg.querySelectorAll('[data-hoverable]').forEach(function (g) {
        g.classList.toggle('is-active', g.getAttribute('data-hoverable') === ref);
      });

      emptyEl.hidden = true;
      detailEl.hidden = false;

      imgEl.classList.remove('is-loaded');
      imgEl.src = item.photo;
      imgEl.alt = item.name;
      imgEl.hidden = false;
      imgEl.onload = function () { imgEl.classList.add('is-loaded'); };

      systemEl.textContent = item.system;
      nameEl.textContent = item.name + (item.sku ? ' — ' + item.sku : '');
      noteEl.textContent = item.note;

      dimsEl.innerHTML = '';
      if (item.dims) {
        Object.keys(item.dims).forEach(function (k) {
          var label = k === 'width' ? 'B' : k === 'height' ? 'H' : 'D';
          var wrap = document.createElement('div');
          wrap.innerHTML = '<span>' + item.dims[k] + '</span> ' + label + ' · MM';
          dimsEl.appendChild(wrap);
        });
      }

      if (item.price === null) {
        priceEl.textContent = '';
      } else if (item.hidePrice || item.enquiryOnly) {
        priceEl.textContent = 'Verð samkvæmt tilboði';
      } else {
        priceEl.textContent = fmtKr.format(item.price) + ' KR';
      }
    }

    function clear() {
      svg.querySelectorAll('[data-hoverable]').forEach(function (g) { g.classList.remove('is-active'); });
      emptyEl.hidden = false;
      detailEl.hidden = true;
    }

    /* Under 900px the chip row is the control surface; the drawing reverts to
       being a drawing. Advertising 10 sub-32px SVG groups as buttons there is
       a false affordance for a thumb and noise for a screen reader. */
    var chipMode = window.matchMedia('(max-width: 900px)').matches;
    svg.querySelectorAll('[data-hoverable]').forEach(function (g) {
      var ref = g.getAttribute('data-hoverable');
      if (!chipMode) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
      }
      g.setAttribute('aria-label', byRef[ref] ? byRef[ref].name : ref);
      g.addEventListener('mouseenter', function () { show(ref); });
      g.addEventListener('focus', function () { show(ref); });
      g.addEventListener('click', function () { show(ref); });
      g.addEventListener('touchstart', function () { show(ref); }, { passive: true });
      // SVG <g role="button"> gets no native Enter/Space -> click translation
      // in every browser, so it needs an explicit keydown handler.
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          show(ref);
        }
      });
    });

    svg.addEventListener('mouseleave', clear);
  })();

  /* ------------------------------------------------------------------
     MIELE APPLIANCE WALL — populated from the static copy of Eirvík's
     own /api/products response (assets/products.json). Source noted
     in DESIGN.md. Prices/enquiry flags shown exactly as their API
     returns them; never invented.

     Grouped by appliance type rather than shown as one flat card grid —
     the flat grid was the "messy, hard to find stuff" complaint. The API
     response carries no category field, so the group is inferred from
     the product name (documented here, not hidden): a small, explicit
     keyword table, checked most-specific first (vínkæli before kæli,
     uppþvottavél before þvottavél) so nothing gets miscategorised by a
     substring collision. Anything that matches nothing real lands in
     "Annað" — never silently dropped.
     ------------------------------------------------------------------ */
  (function appliances() {
    var grid = document.getElementById('appliances-grid');
    if (!grid) return;
    /* ISK grouped with a period BY HAND - Intl silently falls back to comma
       grouping when is-IS locale data is missing, and this string faces
       customers (house rule, offer-generator lineage). */
    var fmtKr = { format: function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); } };

    var CATEGORY_ORDER = ['Kæling', 'Eldun', 'Uppþvottur', 'Þvottur', 'Vín', 'Annað'];
    var CATEGORY_RULES = [
      { label: 'Vín', test: /vínkæli/ },
      { label: 'Kæling', test: /kæliskáp|frystiskáp/ },
      { label: 'Uppþvottur', test: /uppþvottavél/ },
      { label: 'Þvottur', test: /þvottavél/ },
      { label: 'Eldun', test: /helluborð|ofn|háfur/ }
    ];
    function categorize(p) {
      var n = (p.name || '').toLowerCase();
      for (var i = 0; i < CATEGORY_RULES.length; i++) {
        if (CATEGORY_RULES[i].test.test(n)) return CATEGORY_RULES[i].label;
      }
      return 'Annað';
    }

    fetch('assets/products.json')
      .then(function (r) { return r.json(); })
      .then(function (products) {
        var groups = {};
        products.forEach(function (p) {
          var cat = categorize(p);
          (groups[cat] = groups[cat] || []).push(p);
        });

        grid.innerHTML = '';
        var groupIndex = 0;
        CATEGORY_ORDER.forEach(function (label) {
          var items = groups[label];
          if (!items || !items.length) return;

          var section = document.createElement('div');
          section.className = 'appliance-group';
          if (!reduceMotion) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(16px)';
            section.style.transition = 'opacity var(--dur-normal) var(--ease-out), transform var(--dur-normal) var(--ease-out)';
            section.style.transitionDelay = Math.min(groupIndex * 70, 280) + 'ms';
          }
          groupIndex++;

          var head = document.createElement('div');
          head.className = 'appliance-group__head';
          var labelEl = document.createElement('h3');
          labelEl.className = 'appliance-group__label mono';
          labelEl.textContent = label;
          var countEl = document.createElement('span');
          countEl.className = 'appliance-group__count mono';
          countEl.textContent = String(items.length).padStart(2, '0');
          head.appendChild(labelEl);
          head.appendChild(countEl);

          var rows = document.createElement('div');
          rows.className = 'appliance-group__rows';

          items.forEach(function (p) {
            var row = document.createElement('article');
            row.className = 'appliance-row';

            var media = document.createElement('div');
            media.className = 'appliance-row__media';
            var img = document.createElement('img');
            img.src = p.localImage;
            img.alt = p.name;
            img.loading = 'lazy';
            media.appendChild(img);

            var info = document.createElement('div');
            info.className = 'appliance-row__info';
            var name = document.createElement('p');
            name.className = 'appliance-row__name';
            name.textContent = p.name;
            var sku = document.createElement('p');
            sku.className = 'appliance-row__sku mono';
            sku.textContent = (p.manufacturer || 'Eirvík') + ' · ' + p.sku;
            info.appendChild(name);
            info.appendChild(sku);

            var meta = document.createElement('div');
            meta.className = 'appliance-row__meta';

            var dims = document.createElement('p');
            dims.className = 'appliance-row__dims mono';
            var parts = [];
            if (p.dims_mm) {
              if (p.dims_mm.width) parts.push(p.dims_mm.width + ' B');
              if (p.dims_mm.height) parts.push(p.dims_mm.height + ' H');
              if (p.dims_mm.depth) parts.push(p.dims_mm.depth + ' D');
            }
            dims.textContent = parts.length ? parts.join(' · ') + ' MM' : '';

            var price = document.createElement('p');
            price.className = 'appliance-row__price mono';
            if (p.hidePrice || p.enquiryOnly) {
              price.setAttribute('data-enquiry', 'true');
              price.textContent = 'Verð samkvæmt tilboði';
            } else {
              price.textContent = fmtKr.format(p.price) + ' KR';
            }

            meta.appendChild(dims);
            meta.appendChild(price);
            row.appendChild(media);
            row.appendChild(info);
            row.appendChild(meta);
            rows.appendChild(row);
          });

          section.appendChild(head);
          section.appendChild(rows);
          grid.appendChild(section);
        });

        if (!reduceMotion) {
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              grid.querySelectorAll('.appliance-group').forEach(function (g) {
                g.style.opacity = '1';
                g.style.transform = 'translateY(0)';
              });
            });
          });
        }
      })
      .catch(function (err) {
        grid.innerHTML = '<p class="mono">Ekki tókst að sækja vörulistann (' + err.message + ').</p>';
      });
  })();

  /* ------------------------------------------------------------------
     BOOKING FORM — demo only, no network call (see visible note in
     the form itself). Client-side confirmation state only.
     ------------------------------------------------------------------ */
  (function booking() {
    var form = document.getElementById('booking-form');
    var confirm = document.getElementById('booking-confirm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      form.hidden = true;
      confirm.hidden = false;
    });
  })();

})();
