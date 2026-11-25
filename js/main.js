import { projects } from './projects.js';
import { initTerminal } from './terminal.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isDesktop = () => window.innerWidth > 900;

/* =========================================================
   1. Render GitHub projects
   ========================================================= */
const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('#labTrack').innerHTML = projects
  .map(
    (p, i) => `
  <article class="pcard card3d" data-cat="${p.cat}" style="--accent:${p.accent}">
    <div class="pcard__art" aria-hidden="true">
      <div class="pcard__bar"><i></i><i></i><i></i></div>
      <div class="pcard__code">${p.code.map((l) => `<span>${esc(l)}</span>`).join('\n')}</div>
      <div class="pcard__orb"></div>
    </div>
    <div class="pcard__body">
      <div class="pcard__meta"><b>${String(i + 1).padStart(2, '0')} · ${p.cat === 'sec' ? 'Security' : 'App / AI'}</b><span>${p.date}</span></div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.desc)}</p>
      <div class="pcard__tech">${p.tech.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    </div>
    <div class="pcard__links">
      ${p.live ? `<a class="live" href="${p.live}" target="_blank" rel="noopener" data-cursor="Launch">Live ${icon('i-arrow')}</a>` : ''}
      <a href="${p.url}" target="_blank" rel="noopener" data-cursor="Code">${icon('i-github')} Source</a>
    </div>
  </article>`
  )
  .join('') + `
  <article class="pcard pcard--more card3d" data-cat="any">
    <span class="mono">// more builds</span>
    <h3>New projects are landing here</h3>
    <p>More SOC tooling and automation repos are on the way. Browse everything on GitHub in the meantime.</p>
    <a class="btn btn--glow btn--sm magnetic" href="https://github.com/Thondarock" target="_blank" rel="noopener" data-cursor="GitHub">${icon('i-github')} github.com/Thondarock</a>
  </article>`;

/* =========================================================
   2. Text splitting
   ========================================================= */
function splitChars(el) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.innerHTML = [...text].map((ch) => (ch === ' ' ? ' ' : `<span class="cm" aria-hidden="true"><span class="c">${ch}</span></span>`)).join('');
  el.classList.add('is-split');
}
function splitWords(el, masked = true) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => (masked ? `<span class="wm"><span class="w">${w}</span></span>` : `<span class="w">${w}</span>`)).join(' ');
}
$$('.split-chars').forEach(splitChars);
$$('.split-words').forEach((el) => splitWords(el));
$$('[data-words]').forEach((el) => splitWords(el, false));

// keep one continuous gradient across split glyphs
function fixGradients() {
  $$('.grad-text').forEach((root) => {
    const parts = $$('.c, .w', root);
    if (!parts.length) return;
    const r = root.getBoundingClientRect();
    parts.forEach((p) => {
      const pr = p.getBoundingClientRect();
      p.style.backgroundSize = `${r.width}px 100%`;
      p.style.backgroundPosition = `${r.left - pr.left}px 0`;
    });
  });
}

/* =========================================================
   3. Smooth scroll
   ========================================================= */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6 });
  else (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView());
};

/* =========================================================
   4. 3D world
   ========================================================= */
let world = null;
async function initWorld() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) throw new Error('no webgl');
    const { createWorld } = await import('./world.js');
    world = createWorld($('#world'), { reduceMotion });
    if (!world) throw new Error('renderer failed');
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    document.body.classList.add('no-webgl');
  }
}

/* =========================================================
   5. Section mapping (scroll → camera stop, nav, rail)
   ========================================================= */
const sections = $$('main > section');
const navLinks = $$('.nav__links a');
let tops = [];
function measure() {
  tops = sections.map((s) => {
    const el = s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;
    return el.getBoundingClientRect().top + window.scrollY;
  });
}
let lastIdx = -1;
function onScroll() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  let p = 0;
  let cam = 0;
  for (let i = 0; i < tops.length; i++) {
    const a = tops[i];
    const b = i + 1 < tops.length ? tops[i + 1] : Math.max(a + 1, max);
    if (y >= a) {
      const f = Math.min(1, (y - a) / Math.max(1, b - a));
      p = i + f;
      // dwell on each scene while its content is read, then fly to the next
      const g = Math.min(1, Math.max(0, (f - 0.35) / 0.65));
      cam = i + g * g * (3 - 2 * g);
    }
  }
  // the last section is shorter than a full travel: map it to its stop
  p = Math.min(p, sections.length - 1);
  if (y >= max - 2) p = cam = sections.length - 1;
  world && world.setProgress(Math.min(cam, sections.length - 1));

  $('#railFill').style.transform = `scaleY(${max > 0 ? y / max : 0})`;
  const idx = Math.min(sections.length - 1, Math.floor(p + 0.45));
  if (idx !== lastIdx) {
    lastIdx = idx;
    const s = sections[idx];
    $('#railLabel').textContent = `${String(idx).padStart(2, '0')} — ${s.dataset.label}`;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${s.id}`));
  }
}

/* nav state */
const nav = $('#nav');
let lastY = 0;
function navState() {
  const y = window.scrollY;
  nav.classList.toggle('is-scrolled', y > 40);
  nav.classList.toggle('is-hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
  lastY = y;
}
window.addEventListener('scroll', () => { onScroll(); navState(); }, { passive: true });

/* anchors + menu */
const burger = $('#burger');
const toggleMenu = (open) => {
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  $('#menu').setAttribute('aria-hidden', String(!open));
  if (lenis) open ? lenis.stop() : lenis.start();
};
burger.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const t = id === '#home' ? 0 : $(id);
    if (t === null) return;
    e.preventDefault();
    toggleMenu(false);
    if (t !== 0 && t.parentElement.classList.contains('pin-spacer')) scrollTo(t.parentElement);
    else scrollTo(t);
  })
);

/* =========================================================
   6. Loader → intro
   ========================================================= */
const bootLines = [
  ['> handshake tls1.3 ............................ ', 'ok', 'OK'],
  ['> loading sentinel analytics rules ............ ', 'ok', 'OK'],
  ['> syncing defender xdr telemetry .............. ', 'ok', 'OK'],
  ['> scanning for threats ........................ ', 'warn', '0 FOUND'],
  ['> rendering 3d environment .................... ', 'ok', 'OK'],
  ['> access granted // welcome, recruiter', 'ok', ''],
];
function runLoader() {
  return new Promise((resolve) => {
    const term = $('#loaderTerm');
    const count = $('#loaderCount');
    const bar = $('#loaderBar');
    const prog = { v: 0 };
    const dur = reduceMotion ? 0.6 : 2.6;
    let shown = 0;
    gsap.to(prog, {
      v: 100,
      duration: dur,
      ease: 'power2.inOut',
      onUpdate() {
        const v = Math.round(prog.v);
        count.textContent = v;
        bar.style.width = v + '%';
        const want = Math.min(bootLines.length, Math.floor((v / 100) * bootLines.length + 0.5));
        while (shown < want) {
          const [txt, cls, res] = bootLines[shown++];
          const p = document.createElement('p');
          p.innerHTML = `${txt}<span class="${cls}">${res}</span>`;
          term.appendChild(p);
        }
      },
      onComplete: resolve,
    });
  });
}

function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
    .set('#loader', { display: 'none' })
    .add(() => document.body.classList.remove('is-loading'), '<');
  if (world) tl.to(world.intro, { intro: 1, duration: reduceMotion ? 0.01 : 2.6, ease: 'power3.out' }, 0.35);
  tl.from('.hero__name .c', { yPercent: 115, rotate: 8, duration: 1.4, stagger: 0.035 }, 0.6)
    .to('.hero .reveal-fade', { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.95)
    .from('#idcard', { rotationY: -70, rotationX: 20, z: -400, opacity: 0, duration: 1.8, transformPerspective: 1200 }, 0.7)
    .from('.chip', { scale: 0, opacity: 0, duration: 1, stagger: 0.12, ease: 'back.out(2)' }, 1.4)
    .from('.nav > *', { y: -30, opacity: 0, duration: 1, stagger: 0.08 }, 0.9)
    .from('.hero__bottom', { opacity: 0, y: 30, duration: 1 }, 1.4)
    .add(() => lenis && lenis.start(), 1.0);
  return tl;
}

/* =========================================================
   7. Scroll animations
   ========================================================= */
function scrollAnimations() {
  // section heads & titles
  $$('.sec-head').forEach((h) => gsap.from(h.children, { scrollTrigger: { trigger: h, start: 'top 88%' }, y: 20, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' }));
  $$('.sec-title, .contact__title').forEach((t) =>
    gsap.from($$('.w', t), { scrollTrigger: { trigger: t, start: 'top 85%' }, yPercent: 110, rotate: 4, duration: 1.2, stagger: 0.06, ease: 'expo.out' })
  );

  // statement: words light up as you read
  const st = $('.statement');
  gsap.to($$('.w', st), { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });

  // 3D card reveals
  const reveal3d = '.role, .pbi, .stat, .pillar, .job, .flow__step, .case, .init, .skillset, .badge, .edu__item, .extra__item, .about__photo';
  gsap.set(reveal3d, { opacity: 0 });
  ScrollTrigger.batch(reveal3d, {
    start: 'top 90%',
    once: true,
    onEnter: (els) =>
      gsap.fromTo(
        els,
        { y: 90, rotationX: -28, opacity: 0, transformPerspective: 1100, transformOrigin: '50% 0%' },
        { y: 0, rotationX: 0, opacity: 1, duration: 1.3, stagger: 0.09, ease: 'expo.out', clearProps: 'transform,opacity' }
      ),
  });

  // about photo parallax
  gsap.to('.about__photo img', { yPercent: -8, scale: 1.02, ease: 'none', scrollTrigger: { trigger: '.about__photo', start: 'top bottom', end: 'bottom top', scrub: true } });

  // hero exit: card drifts back in z as you leave
  gsap.to('.hero__visual', { z: -300, rotationX: 18, opacity: 0.2, transformPerspective: 1000, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__copy', { y: -120, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: 'bottom top', scrub: true } });

  // counters
  $$('[data-count]').forEach((el) => {
    const o = { v: 0 };
    const pre = el.dataset.prefix || '';
    gsap.to(o, { v: +el.dataset.count, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => (el.textContent = pre + Math.round(o.v)) });
  });

  // contact title chars
  gsap.from('.contact__sub, .contact__actions, .socials, .contact .btn--glow', { scrollTrigger: { trigger: '.contact__title', start: 'top 80%' }, y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out' });
}

/* =========================================================
   8. Lab: pinned horizontal 3D coverflow (desktop)
   ========================================================= */
const track = $('#labTrack');
const cards = () => $$('.pcard', track).filter((c) => c.style.display !== 'none');
function coverflow() {
  const cx = window.innerWidth / 2;
  cards().forEach((c) => {
    const r = c.getBoundingClientRect();
    const off = (r.left + r.width / 2 - cx) / window.innerWidth; // -1 .. 1
    const ry = gsap.utils.clamp(-28, 28, -off * 34);
    const tz = -Math.abs(off) * 160;
    c.style.transform = `perspective(1400px) translateZ(${tz}px) rotateY(${ry}deg)`;
  });
}
let labST = null;
function setupLab() {
  labST && labST.kill();
  gsap.set(track, { x: 0 });
  $$('.pcard', track).forEach((c) => (c.style.transform = ''));
  if (!isDesktop() || reduceMotion) return;
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  labST = ScrollTrigger.create({
    trigger: '.lab',
    start: 'top top',
    end: () => '+=' + dist(),
    pin: true,
    scrub: 0.8,
    invalidateOnRefresh: true,
    animation: gsap.to(track, { x: () => -dist(), ease: 'none' }),
    onUpdate: coverflow,
    onRefresh: coverflow,
  });
  coverflow();
}

// filters
$$('.lab__filters button').forEach((b) =>
  b.addEventListener('click', () => {
    $$('.lab__filters button').forEach((x) => x.classList.toggle('is-active', x === b));
    const f = b.dataset.filter;
    const all = $$('.pcard', track);
    gsap.to(all, {
      opacity: 0, duration: 0.3, stagger: 0.015,
      onComplete() {
        all.forEach((c) => (c.style.display = f === 'all' || c.dataset.cat === f || c.dataset.cat === 'any' ? '' : 'none'));
        ScrollTrigger.refresh();
        if (labST) scrollTo(labST.start + 1);
        gsap.fromTo(cards(), { opacity: 0 }, { opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power2.out' });
        coverflow();
      },
    });
  })
);

// drag to scroll on mobile viewport (native) + wheel shift on desktop handled by pin

/* =========================================================
   8b. Defense-in-depth stack (CSS 3D, scroll-driven on desktop)
   ========================================================= */
const stackEl = $('#stack');
const layers = $$('.layer', stackEl);
const panels = $$('.spanel');
const dots = $$('.stack-dots i');
let stackST = null;
let stackIO = null;
let stackIdx = -1;
function setLayer(i) {
  if (i === stackIdx || i < 0) return;
  stackIdx = i;
  layers.forEach((l, k) => l.classList.toggle('is-active', k === i));
  panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
  dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
}
function setupStack() {
  stackST && stackST.kill();
  stackST = null;
  stackIO && stackIO.disconnect();
  stackIdx = -1;
  ['--gap', '--rz', '--rx'].forEach((v) => stackEl.style.removeProperty(v));
  if (!isDesktop() || reduceMotion) {
    if (!isDesktop()) stackEl.style.setProperty('--gap', '34px');
    setLayer(0);
    // mobile: highlight the layer whose panel is on screen
    stackIO = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setLayer(panels.indexOf(e.target))), { rootMargin: '-45% 0px -45% 0px' });
    panels.forEach((p) => stackIO.observe(p));
    return;
  }
  setLayer(0);
  stackST = ScrollTrigger.create({
    trigger: '#stackWrap',
    start: 'center center',
    end: () => '+=' + window.innerHeight * 3.2,
    pin: true,
    scrub: 0.6,
    onUpdate(self) {
      const pr = self.progress;
      const open = Math.min(1, pr / 0.12);
      stackEl.style.setProperty('--gap', 22 + open * 48 + 'px');
      stackEl.style.setProperty('--rz', -38 + pr * 56 + 'deg');
      stackEl.style.setProperty('--rx', 58 - Math.sin(pr * Math.PI) * 8 + 'deg');
      setLayer(Math.min(5, Math.floor(pr * 6)));
    },
  });
  layers.forEach((l, k) => (l.onclick = () => stackST && scrollTo(stackST.start + ((k + 0.5) / 6) * (stackST.end - stackST.start))));
}

/* =========================================================
   9. Skill sphere (DOM, true 3D projection)
   ========================================================= */
const skills = [
  ['Microsoft Sentinel', 'hot'], ['Defender XDR', 'hot'], ['Purview DLP', 'hot'], ['Intune', 'hot'], ['KQL', 'hot'], ['Logic Apps', 'hot'], ['Entra ID', 'hot'],
  ['SOAR Playbooks', 'vio'], ['Sentinel → Jira', 'vio'], ['IAM Audits', 'vio'], ['SPF / DKIM / DMARC', 'vio'], ['Watchlists'], ['Data Connectors'], ['DNS Records'], ['Data Labeling'], ['Intune Policies'], ['Teams Automation'],
  ['Incident Response', 'vio'], ['Root Cause Analysis', 'vio'], ['Phishing Analysis', 'vio'], ['Detection Engineering', 'vio'], ['SIEM Tuning', 'vio'],
  ['Defender for Endpoint'], ['Defender for O365'], ['Sensitivity Labels'], ['Custom SITs'], ['Vulnerability Mgmt'],
  ['Nessus'], ['Burp Suite'], ['Wireshark'], ['Nmap'], ['Metasploit'], ['Kali Linux'], ['IDS / IPS'], ['Firewalls'],
  ['OWASP Top 10'], ['SQL Injection'], ['XSS'], ['Python'], ['JavaScript'], ['React'], ['Firebase'], ['HTML / CSS'],
  ['Linux'], ['Windows'], ['Git'], ['Threat Intel'], ['SOP Authoring'], ['CTF'],
];
function initSphere() {
  const host = $('#sphere');
  const els = skills.map(([s, cls]) => {
    const e = document.createElement('span');
    e.className = 'sphere__tag' + (cls ? ' ' + cls : '');
    e.textContent = s;
    host.appendChild(e);
    return e;
  });
  const n = els.length;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = els.map((_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r];
  });
  let ax = 0.0015, ay = 0.004, rotX = 0, rotY = 0, dragging = false, px = 0, py = 0, visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(host);
  host.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    ay = (e.clientX - px) * 0.0006; ax = -(e.clientY - py) * 0.0006;
    px = e.clientX; py = e.clientY;
  });
  const end = () => (dragging = false);
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const R = host.clientWidth * 0.4;
    if (!dragging) { ax += (0.0015 - ax) * 0.02; ay += (0.004 - ay) * 0.02; }
    rotX += reduceMotion ? 0 : ax; rotY += reduceMotion ? 0 : ay;
    const cx = Math.cos(rotX), sx = Math.sin(rotX), cy = Math.cos(rotY), sy = Math.sin(rotY);
    for (let i = 0; i < n; i++) {
      let [x, y, z] = pts[i];
      let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      let y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const depth = (z2 + 1) / 2; // 0 back .. 1 front
      const s = 0.55 + depth * 0.65;
      const el = els[i];
      el.style.transform = `translate(-50%,-50%) translate3d(${x1 * R}px, ${y1 * R}px, 0) scale(${s})`;
      el.style.opacity = (0.15 + depth * 0.85).toFixed(3);
      el.style.zIndex = String(Math.round(depth * 100));
      el.style.filter = depth < 0.35 ? `blur(${((0.35 - depth) * 4).toFixed(1)}px)` : '';
    }
  }
  tick();
}

/* =========================================================
   10. Pointer: cursor, tilt, magnetic, parallax
   ========================================================= */
function initPointer() {
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    world && world.setMouse((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  });
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, .sphere, .term, .layer')) return;
    world && world.pulse && world.pulse();
  });
  if (!finePointer) return;

  document.body.classList.add('has-cursor');
  const cursor = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
  const rp = { x: mouse.x, y: mouse.y };
  window.addEventListener('pointermove', () => cursor.classList.add('is-on'), { once: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  document.documentElement.addEventListener('pointerenter', () => cursor.classList.add('is-on'));
  gsap.ticker.add(() => {
    rp.x += (mouse.x - rp.x) * 0.18; rp.y += (mouse.y - rp.y) * 0.18;
    dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    ring.style.transform = `translate3d(${rp.x}px, ${rp.y}px, 0)`;
  });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button');
    cursor.classList.toggle('is-hover', !!t);
    label.textContent = t ? t.dataset.cursor || '' : '';
  });

  if (reduceMotion) return;
  // tilt
  $$('[data-tilt]').forEach((el) => {
    const max = +el.dataset.tiltMax || 10;
    const glare = $('.idcard__glare', el);
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      gsap.to(el, { rotationY: (px - 0.5) * max * 2, rotationX: -(py - 0.5) * max * 2, transformPerspective: 1000, duration: 0.6, ease: 'power3.out' });
      if (glare) { el.style.setProperty('--gx', px * 100 + '%'); el.style.setProperty('--gy', py * 100 + '%'); }
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotationX: 0, rotationY: 0, duration: 1.2, ease: 'elastic.out(1, .5)' }));
  });
  // magnetic
  $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.5, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)' }));
  });
  // floating chips parallax
  const chips = $$('.chip');
  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    chips.forEach((c) => gsap.to(c, { x: nx * +c.dataset.depth, y: ny * +c.dataset.depth, duration: 1, ease: 'power3.out' }));
  });
}

/* =========================================================
   11. Small things
   ========================================================= */
function clock() {
  const el = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const tick = () => (el.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 15000);
}
$('#year').textContent = new Date().getFullYear();
$$('.copy').forEach((b) =>
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { /* clipboard blocked */ }
    b.classList.add('is-done');
    $('span', b).textContent = 'Copied!';
    setTimeout(() => { b.classList.remove('is-done'); $('span', b).textContent = 'Copy'; }, 1800);
  })
);

/* =========================================================
   Boot
   ========================================================= */
(async function boot() {
  const worldReady = initWorld();
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  await Promise.all([runLoader(), worldReady, fontsReady]);

  fixGradients();
  clock();
  initSphere();
  initPointer();
  initTerminal({ onOpen: () => lenis && lenis.stop(), onClose: () => lenis && lenis.start() });
  setupStack();
  setupLab();
  scrollAnimations();
  ScrollTrigger.addEventListener('refresh', () => { measure(); onScroll(); fixGradients(); });
  ScrollTrigger.refresh();
  if (location.hash && $(location.hash)) { world && world.intro && (world.intro.intro = 1); }
  intro();

  let w = innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(innerWidth - w) < 2) return; // ignore mobile URL-bar height changes
    const crossed = (w > 900) !== (innerWidth > 900);
    w = innerWidth;
    if (crossed) { setupStack(); setupLab(); }
    ScrollTrigger.refresh();
  });
})();
