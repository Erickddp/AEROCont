import '@fontsource-variable/sora';
import '@fontsource-variable/inter';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ?snap desactiva la inercia de la cámara (útil para capturas de pantalla)
const SNAP = new URLSearchParams(location.search).has('snap');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
// móvil / táctil: scroll nativo del teléfono (más fluido) y video ligero
const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const root = document.documentElement;
if (reduced) root.classList.add('rm');

document.body.classList.add('is-loading');
$('[data-year]').textContent = new Date().getFullYear();

/* =========================================================
   Scroll suave
   ========================================================= */
let lenis = null;
if (!reduced && !mobile) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

/* =========================================================
   Loader + escena 3D
   ========================================================= */
const loaderNum = $('.loader__num');
const loaderBar = $('.loader__bar span');
const loadState = { v: 0 };
const fakeLoad = gsap.to(loadState, {
  v: 88,
  duration: 2.4,
  ease: 'power2.out',
  onUpdate: () => {
    loaderNum.textContent = Math.round(loadState.v);
    loaderBar.style.transform = `scaleX(${loadState.v / 100})`;
  },
});

let scene = null;

async function boot() {
  const minTime = new Promise((r) => setTimeout(r, 1400));
  try {
    const { createScene } = await import('./scene.js');
    scene = createScene($('.webgl'));
  } catch (err) {
    console.warn('WebGL no disponible, se usa el fondo estático.', err);
    root.classList.add('no-webgl');
    document.body.classList.add('no-webgl');
  }
  await Promise.all([document.fonts.ready, minTime]);

  fakeLoad.kill();
  await gsap
    .to(loadState, {
      v: 100,
      duration: 0.5,
      ease: 'power1.out',
      onUpdate: () => {
        loaderNum.textContent = Math.round(loadState.v);
        loaderBar.style.transform = `scaleX(${loadState.v / 100})`;
      },
    })
    .then();

  // los triggers que dependen de posiciones se crean después de los pins
  initAnimations();
  initScrollWorld();
  initNavTriggers();
  ScrollTrigger.refresh();
  introTimeline();
}

function introTimeline() {
  const tl = gsap.timeline({
    defaults: { ease: 'expo.out' },
    onComplete: () => {
      document.body.classList.remove('is-loading');
      lenis?.start();
    },
  });
  tl.to('.loader__inner', { opacity: 0, y: -20, duration: 0.6, ease: 'power2.in' })
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'expo.inOut' }, '-=0.1')
    .set('.loader', { display: 'none' })
    .from('.hero__asr', { yPercent: 110, rotateX: -60, transformOrigin: '50% 100%', duration: 1.6 }, '-=0.6')
    .from('.hero__ren', { yPercent: 110, rotateX: -60, transformOrigin: '50% 100%', duration: 1.6 }, '-=1.4')
    .from('.hero__eyebrow', { opacity: 0, y: 20, duration: 1 }, '-=1.3')
    .from('.hero__lead', { opacity: 0, y: 30, duration: 1.2 }, '-=1.1')
    .from('.hero__actions > *', { opacity: 0, y: 30, stagger: 0.1, duration: 1.1 }, '-=1')
    .from('.hero__services li', { opacity: 0, y: 14, stagger: 0.06, duration: 0.9 }, '-=0.9')
    .from('.hero__contact a', { opacity: 0, x: 20, stagger: 0.08, duration: 1 }, '-=0.9')
    .from('.nav', { yPercent: -100, opacity: 0, duration: 1.2 }, '-=1.2')
    .from('.scroll-cue', { opacity: 0, duration: 1 }, '-=0.6')
    .to('.hud', { opacity: 1, duration: 1 }, '-=0.8');
}

/* =========================================================
   Scroll → mundo 3D (cámara, hora del día, velo)
   ========================================================= */
const hudTime = $('.hud__time');
const hudLabel = $('.hud__label');
const hudSun = $('.hud__sun');
const hudKwh = $('.hud__kwh');
const hudBat = $('.hud__bat b');
const DAY_KWH = 30; // sistema residencial de 5 kWp en Ciudad Juárez, día despejado

function updateHud(t) {
  // 06:15 → 20:10 (verano en Ciudad Juárez)
  const mins = 6 * 60 + 15 + t * (13 * 60 + 55);
  const hh = Math.floor(mins / 60);
  const mm = Math.floor(mins % 60);
  hudTime.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  hudLabel.textContent =
    t < 0.12 ? 'Amanecer' : t < 0.38 ? 'Mañana' : t < 0.62 ? 'Mediodía' : t < 0.88 ? 'Tarde' : 'Atardecer';
  const a = Math.PI * t;
  hudSun.setAttribute('cx', (60 - 54 * Math.cos(a)).toFixed(2));
  hudSun.setAttribute('cy', (60 - 54 * Math.sin(a)).toFixed(2));
  // la producción sigue la curva del sol: energía acumulada = (1 − cos πt) / 2
  const charge = (1 - Math.cos(a)) / 2;
  hudKwh.textContent = (DAY_KWH * charge).toFixed(1);
  hudBat.style.transform = `scaleX(${charge.toFixed(3)})`;
}

function initScrollWorld() {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      scene?.setProgress(self.progress, SNAP);
      updateHud(self.progress);
    },
  });
  updateHud(0);

  // velo oscuro según la sección para que el texto se lea sobre el 3D
  // (se elige la sección que ocupa el centro de la pantalla; robusto ante saltos de ancla)
  const veil = $('.veil');
  let currentVeil = -1;
  let veilTriggers = [];
  veilTriggers = $$('[data-veil]').map((sec) =>
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: () => syncVeil(),
    })
  );
  function syncVeil() {
    const active = veilTriggers.find((t) => t.isActive);
    if (!active) return;
    const v = parseFloat(active.trigger.dataset.veil);
    if (v === currentVeil) return;
    currentVeil = v;
    gsap.to(veil, { opacity: v, duration: 1.1, ease: 'power2.out', overwrite: true });
  }
  syncVeil();

  // el reloj solar se oculta al llegar a contacto (no tapa los datos ni el formulario)
  ScrollTrigger.create({
    trigger: '.contact',
    start: 'top 60%',
    end: 'max',
    onToggle: (self) => gsap.to('.hud', { opacity: self.isActive ? 0 : 1, duration: 0.5, overwrite: true }),
  });

  if (finePointer && !reduced) {
    window.addEventListener(
      'pointermove',
      (e) => scene?.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1),
      { passive: true }
    );
  }
}

/* =========================================================
   Navegación
   ========================================================= */
const nav = $('.nav');
const burger = $('.nav__burger');
const menu = $('#menu');

function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  menu.setAttribute('aria-hidden', String(!open));
  if (open) lenis?.stop();
  else lenis?.start();
}
burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#' ? null : $(id);
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    scrollToTarget(id === '#inicio' ? 0 : target);
  });
});

let lastY = 0;
function onScrollNav(y) {
  nav.classList.toggle('is-scrolled', y > 40);
  const goingDown = y > lastY && y > innerHeight * 0.6;
  if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', goingDown);
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScrollNav(scroll));
else window.addEventListener('scroll', () => onScrollNav(scrollY), { passive: true });

// enlace activo
function initNavTriggers() {
  $$('.nav__links a').forEach((link) => {
    const sec = $(link.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });
}

/* =========================================================
   Animaciones por sección
   ========================================================= */
function initAnimations() {
  /* --- títulos con líneas en 3D --- */
  $$('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', linesClass: 'split-line-inner', mask: 'lines' });
    if (reduced) return;
    gsap.from(split.lines, {
      yPercent: 115,
      rotateX: -50,
      transformOrigin: '50% 0%',
      transformPerspective: 800,
      opacity: 0,
      duration: 1.4,
      ease: 'expo.out',
      stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  /* --- revelados simples --- */
  if (!reduced) {
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });
  }

  /* --- contadores --- */
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    if (reduced) {
      el.textContent = to;
      return;
    }
    const o = { v: 0 };
    gsap.to(o, {
      v: to,
      duration: 2.2,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  /* --- marquee de marcas (duplicamos para bucle continuo) --- */
  const track = $('.marquee__track');
  if (track && !reduced) {
    [...track.children].forEach((img) => {
      const c = img.cloneNode(true);
      c.alt = '';
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
  }

  /* --- inclinación 3D con el puntero --- */
  if (finePointer && !reduced) {
    $$('.tilt').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      gsap.set(el, { transformPerspective: 1000 });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        rx((0.5 - y) * 10);
        ry((x - 0.5) * 12);
        el.style.setProperty('--gx', `${x * 100}%`);
        el.style.setProperty('--gy', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        rx(0);
        ry(0);
      });
    });

    $$('.magnetic').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.25);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => {
        mx(0);
        my(0);
      });
    });
  }

  if (reduced) {
    $$('.why__item').forEach((el) => el.classList.add('is-on'));
    $$('.step').forEach((el) => el.classList.add('is-on'));
    return;
  }

  /* --- HERO: el texto se aleja en profundidad --- */
  gsap.to('.hero__inner', {
    yPercent: -18,
    z: -300,
    opacity: 0,
    transformPerspective: 1000,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true },
  });
  gsap.to(['.hero__contact', '.scroll-cue'], {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '30% top', scrub: true },
  });

  /* --- MANIFIESTO: palabra por palabra --- */
  const mSplit = SplitText.create('.manifesto__text', { type: 'words', wordsClass: 'w' });
  gsap
    .timeline({
      scrollTrigger: { trigger: '.manifesto', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    })
    .to(mSplit.words, { opacity: 1, stagger: 0.12, ease: 'none', duration: 0.6 })
    .to('.manifesto__sticky .container', { scale: 0.94, opacity: 0, z: -200, duration: 1.2, ease: 'power1.in' }, '+=0.6');

  /* --- imágenes con profundidad (entran desde el fondo) --- */
  $$('[data-depth]').forEach((el) => {
    gsap.fromTo(
      el,
      { rotateX: 24, y: 120, z: -220, scale: 0.92, transformPerspective: 1400, transformOrigin: '50% 100%' },
      {
        rotateX: 0,
        y: 0,
        z: 0,
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 30%', scrub: 0.8 },
      }
    );
    const img = $('img', el);
    if (img && $('.depth__frame', el)) {
      gsap.fromTo(
        img,
        { yPercent: -7 },
        { yPercent: 7, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }
      );
    }
  });

  const mm = gsap.matchMedia();

  /* --- PROCESO: recorrido horizontal fijado (escritorio) --- */
  mm.add('(min-width: 901px)', () => {
    const track = $('.process__track');
    const steps = $$('.step');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 80);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.process__pin',
        start: 'top top',
        end: () => `+=${dist() + innerHeight * 0.6}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          steps.forEach((s, i) => s.classList.toggle('is-on', p >= i / steps.length - 0.02));
        },
      },
    });
    tl.to(track, { x: () => -dist(), ease: 'none', duration: 1 }, 0)
      .to('.process__line span', { scaleX: 1, ease: 'none', duration: 1 }, 0)
      .from(
        steps,
        { rotateY: -35, z: -200, opacity: 0.2, transformPerspective: 1000, stagger: 0.12, duration: 0.4, ease: 'power2.out' },
        0
      );
  });
  mm.add('(max-width: 900px)', () => {
    $$('.step').forEach((s) => {
      gsap.from(s, {
        y: 60,
        opacity: 0,
        rotateX: 20,
        transformPerspective: 900,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: s, start: 'top 88%', onEnter: () => s.classList.add('is-on') },
      });
    });
  });

  /* --- MONITOREO: el teléfono gira en 3D --- */
  gsap.fromTo(
    '.phone',
    { rotateY: -38, rotateX: 18, rotateZ: 6, y: 120 },
    {
      rotateY: 14,
      rotateX: -6,
      rotateZ: -2,
      y: -60,
      ease: 'none',
      scrollTrigger: { trigger: '.monitor', start: 'top bottom', end: 'bottom top', scrub: 1 },
    }
  );

  /* --- SEGMENTOS: túnel en profundidad --- */
  {
    const items = $$('.tunnel__item');
    const offsets = innerWidth > 900 ? [-14, 14, 0] : [0, 0, 0];
    gsap.set(items, { z: -2600, opacity: 0, xPercent: (i) => offsets[i] * 2.4 });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.segments__pin',
        start: 'top top',
        end: '+=320%',
        pin: true,
        scrub: 1,
      },
    });
    tl.to('.segments__intro', { scale: 1.5, opacity: 0, z: 200, duration: 1, ease: 'power1.in' }, 0.2);
    items.forEach((it, i) => {
      const at = (innerWidth > 900 ? 0.6 : 1.0) + i * 1.25;
      tl.to(it, { z: 0, opacity: 1, xPercent: 0, rotateY: 0, duration: 1.1, ease: 'power2.out' }, at);
      if (i < items.length - 1) tl.to(it, { z: 900, opacity: 0, duration: 0.8, ease: 'power2.in' }, at + 1.25);
    });
    tl.to({}, { duration: 0.6 });
  }

  /* --- HOGAR: tarjetas apiladas --- */
  const cards = $$('.stack__card');
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.92,
      filter: 'brightness(0.55)',
      ease: 'none',
      scrollTrigger: { trigger: next, start: 'top 75%', end: 'top 20%', scrub: true },
    });
  });
  cards.forEach((card) => {
    const img = $('.stack__media img', card);
    gsap.fromTo(
      img,
      { scale: 1.25 },
      { scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 20%', scrub: true } }
    );
  });

  /* --- INSTALADOR: la foto se abre a pantalla completa --- */
  gsap
    .timeline({
      scrollTrigger: { trigger: '.installer', start: 'top top', end: 'bottom bottom', scrub: 0.8 },
    })
    .to('.installer__media', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
    .to('.installer__media img', { scale: 1, ease: 'none' }, 0)
    .from('.installer__txt', { y: 80, opacity: 0, ease: 'power2.out', duration: 0.6 }, 0.35);

  /* --- EMPRESAS: ventana que se expande --- */
  gsap
    .timeline({
      scrollTrigger: { trigger: '.biz__pin', start: 'top top', end: '+=180%', pin: true, scrub: 1 },
    })
    .to('.biz__window', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
    .fromTo('.biz__img', { scale: 1.35 }, { scale: 1.05, ease: 'none', duration: 2.2 }, 0)
    .from('.biz__content > *', { y: 70, opacity: 0, stagger: 0.12, duration: 0.6, ease: 'power3.out' }, 0.7)
    .to('.biz__img--2', { opacity: 1, duration: 0.6, ease: 'none' }, 1.6);

  const video = $('.biz__video');
  if (video && !navigator.connection?.saveData) {
    const load = () => {
      if (video.src) return;
      video.src = mobile ? video.dataset.srcMobile : video.dataset.src;
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    };
    ScrollTrigger.create({
      trigger: '.biz',
      start: 'top 150%',
      end: 'bottom top',
      onEnter: load,
      onEnterBack: load,
      onToggle: (self) => {
        if (!video.src) return;
        if (self.isActive) video.play().catch(() => {});
        else video.pause();
      },
    });
  }

  /* --- SERVICIOS: tarjetas --- */
  gsap.from('[data-card]', {
    y: 100,
    opacity: 0,
    scale: 0.94,
    stagger: 0.12,
    duration: 1.3,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.cards', start: 'top 85%' },
  });

  /* --- POR QUÉ: se encienden conforme lees --- */
  $$('.why__item').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 72%',
      onEnter: () => el.classList.add('is-on'),
      onLeaveBack: () => el.classList.remove('is-on'),
    });
  });

  /* --- CONTACTO --- */
  gsap.from('.quote', {
    rotateY: -18,
    z: -200,
    transformPerspective: 1400,
    ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 25%', scrub: 1 },
  });

  /* --- SOL DE JUÁREZ: el disco crece y las cifras suben --- */
  gsap.fromTo(
    '.sun__disc',
    { scale: 0.4, yPercent: 40 },
    {
      scale: 1.15,
      yPercent: -20,
      ease: 'none',
      scrollTrigger: { trigger: '.sun', start: 'top bottom', end: 'bottom top', scrub: 1 },
    }
  );
  gsap.from('.sun__stat', {
    y: 80,
    opacity: 0,
    rotateX: -30,
    transformPerspective: 900,
    stagger: 0.12,
    duration: 1.2,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.sun__grid', start: 'top 85%' },
  });

  /* --- PROYECTOS: mosaico que se revela y flota a distintas velocidades --- */
  $$('.gallery__item').forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(100% 0% 0% 0% round 22px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 22px)',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 92%' },
      }
    );
    const img = $('img', el);
    gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  mm.add('(min-width: 901px)', () => {
    $$('[data-speed]').forEach((el) => {
      const sp = Number(el.dataset.speed);
      gsap.fromTo(
        el,
        { y: 90 * sp },
        { y: -90 * sp, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } }
      );
    });
  });

  /* --- CALCULADORA y FAQ --- */
  gsap.from('.calc', {
    y: 120,
    rotateX: 14,
    opacity: 0,
    transformPerspective: 1400,
    transformOrigin: '50% 100%',
    duration: 1.4,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.calc', start: 'top 85%' },
  });
  gsap.from('.faq details', {
    y: 40,
    opacity: 0,
    stagger: 0.08,
    duration: 1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.faq', start: 'top 80%' },
  });

  ScrollTrigger.refresh();
}

/* =========================================================
   Formulario de cotización (abre el correo con los datos)
   ========================================================= */
const form = $('.quote');
const note = $('.quote__note');

function readForm() {
  const data = new FormData(form);
  const name = String(data.get('nombre') || '').trim();
  const phone = String(data.get('telefono') || '').trim();
  const nameEl = $('#q-name');
  const phoneEl = $('#q-phone');
  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  nameEl.classList.toggle('is-invalid', !name);
  phoneEl.classList.toggle('is-invalid', !phoneOk);
  if (!name || !phoneOk) {
    note.textContent = 'Por favor escribe tu nombre y un teléfono de 10 dígitos.';
    (!name ? nameEl : phoneEl).focus();
    return null;
  }
  return {
    nombre: name,
    telefono: phone,
    tipo: String(data.get('tipo')),
    servicio: data.getAll('servicio').join(', ') || 'Por definir',
    mensaje: String(data.get('mensaje') || '').trim(),
  };
}

const toText = (d) =>
  [
    `Nombre: ${d.nombre}`,
    `Teléfono: ${d.telefono}`,
    `Tipo de proyecto: ${d.tipo}`,
    `Servicio: ${d.servicio}`,
    d.mensaje && `Mensaje: ${d.mensaje}`,
  ]
    .filter(Boolean)
    .join('\n');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = readForm();
  if (!d) return;
  const endpoint = form.dataset.endpoint?.trim();
  const btn = $('button[type="submit"]', form);

  if (endpoint) {
    // envío directo (Formspree, Netlify Forms, etc.)
    btn.disabled = true;
    note.textContent = 'Enviando…';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...d, _subject: `Cotización · ${d.tipo} · ${d.nombre}` }),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      note.textContent = '¡Gracias! Recibimos tu solicitud y te contactaremos pronto.';
    } catch {
      note.textContent = 'No se pudo enviar. Escríbenos por WhatsApp o llama al 656 103 1243.';
    } finally {
      btn.disabled = false;
    }
    return;
  }

  // sin endpoint: abre el correo del visitante con la solicitud lista
  const subject = `Solicitud de cotización · ${d.tipo} · ${d.nombre}`;
  window.location.href = `mailto:asr.renovables@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(toText(d))}`;
  note.textContent = 'Se abrió tu aplicación de correo con la solicitud. Si no se abrió, llámanos al 656 103 1243.';
});

$('[data-wa-send]').addEventListener('click', () => {
  const d = readForm();
  if (!d) return;
  const msg = `Hola, quiero una cotización.\n${toText(d)}`;
  window.open(`https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
});

/* =========================================================
   Calculadora de ahorro (estimación orientativa)
   ========================================================= */
const calc = $('.calc');
if (calc) {
  const HSP = 5.8; // horas solares pico promedio en Ciudad Juárez
  const PR = 0.78; // rendimiento real del sistema (pérdidas por calor, cableado, inversor)
  const PANEL_KW = 0.55; // panel de 550 W
  const PANEL_M2 = 2.6; // área por panel incluyendo separaciones
  const CO2 = 0.438; // t CO2 por MWh (factor de emisión del sistema eléctrico nacional)
  const fmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
  const fmt1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  const inBill = $('#c-bill', calc);
  const inKwh = $('#c-kwh', calc);
  const out = (k) => $(`[data-out="${k}"]`, calc);
  const shown = {};

  function animateTo(key, value, format) {
    const el = out(key);
    const from = shown[key] ?? 0;
    shown[key] = value;
    const o = { v: from };
    gsap.to(o, {
      v: value,
      duration: reduced ? 0 : 0.6,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => (el.textContent = format(o.v)),
    });
  }

  function update() {
    const bill = Number(inBill.value);
    const kwh = Number(inKwh.value);
    $('[data-val="bill"]', calc).textContent = money.format(bill);
    $('[data-val="kwh"]', calc).textContent = `${fmt.format(kwh)} kWh`;
    [inBill, inKwh].forEach((r) => r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`));

    const kwDay = kwh / 60;
    const panels = Math.max(2, Math.ceil(kwDay / (HSP * PR) / PANEL_KW));
    const kwp = panels * PANEL_KW;
    animateTo('panels', panels, (v) => fmt.format(v));
    animateTo('kwp', kwp, (v) => fmt1.format(v));
    animateTo('area', panels * PANEL_M2, (v) => fmt.format(v));
    animateTo('save', bill * 6 * 0.95, (v) => money.format(v));
    animateTo('co2', ((kwh * 6) / 1000) * CO2, (v) => fmt1.format(v));
  }
  [inBill, inKwh].forEach((r) => r.addEventListener('input', update));
  update();

  $('[data-calc-quote]', calc).addEventListener('click', () => {
    const msg = $('#q-msg');
    if (msg && !msg.value.trim()) {
      msg.value = `Pago bimestral aprox. ${money.format(Number(inBill.value))}, consumo ${fmt.format(Number(inKwh.value))} kWh por bimestre. La calculadora me sugiere ${out('panels').textContent} paneles (${out('kwp').textContent} kWp).`;
    }
  });
}

/* =========================================================
   Preguntas frecuentes: solo una abierta a la vez
   ========================================================= */
$$('.faq details').forEach((d) =>
  d.addEventListener('toggle', () => {
    if (d.open) $$('.faq details').forEach((o) => o !== d && (o.open = false));
  })
);

// cualquier contenedor que se abre cambia la altura: recalcular los pins y animaciones
let refreshTimer;
$$('details').forEach((d) =>
  d.addEventListener('toggle', () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 60);
  })
);

boot();
