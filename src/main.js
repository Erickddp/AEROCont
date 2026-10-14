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
const root = document.documentElement;
// móvil / pantalla táctil: sin escena 3D y con scroll nativo (más rápido y fluido)
const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
root.classList.add('calm');

document.body.classList.add('is-loading');
$('[data-year]').textContent = new Date().getFullYear();

/* =========================================================
   Scroll suave
   ========================================================= */
let lenis = null;
if (!reduced && !mobile) {
  lenis = new Lenis({ lerp: 0.14, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
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
  duration: 1.4,
  ease: 'power2.out',
  onUpdate: () => {
    loaderNum.textContent = Math.round(loadState.v);
    loaderBar.style.transform = `scaleX(${loadState.v / 100})`;
  },
});

let scene = null;

async function boot() {
  const minTime = new Promise((r) => setTimeout(r, mobile ? 500 : 900));
  try {
    if (mobile) throw new Error('móvil: se usa foto de fondo');
    const { createScene } = await import('./scene.js');
    scene = createScene($('.webgl'));
  } catch (err) {
    if (!mobile) console.warn('WebGL no disponible, se usa el fondo estático.', err);
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
    defaults: { ease: 'power2.out' },
    onComplete: () => {
      document.body.classList.remove('is-loading');
      lenis?.start();
    },
  });
  tl.to('.loader', { opacity: 0, duration: 0.5, ease: 'power1.inOut' })
    .set('.loader', { display: 'none' })
    .from('.hero__eyebrow', { opacity: 0, y: 12, duration: 0.7 }, '-=0.1')
    .from('.hero__title', { opacity: 0, y: 20, duration: 0.9 }, '-=0.5')
    .from('.hero__lead', { opacity: 0, y: 16, duration: 0.8 }, '-=0.6')
    .from('.hero__actions > *', { opacity: 0, y: 14, stagger: 0.08, duration: 0.7 }, '-=0.5')
    .from('.hero__services, .hero__contact', { opacity: 0, duration: 0.8 }, '-=0.4');
}

/* =========================================================
   Scroll → mundo 3D (cámara, hora del día, velo)
   ========================================================= */
const hudTime = $('.hud__time');
const hudLabel = $('.hud__label');
const hudSun = $('.hud__sun');

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

  // el reloj solar se oculta al llegar al pie de página
  ScrollTrigger.create({
    trigger: '.footer',
    start: 'top bottom',
    onToggle: (self) => gsap.to('.hud', { opacity: self.isActive ? 0 : 1, duration: 0.5, overwrite: true }),
  });
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
  /* Diseño sobrio: solo aparición suave (opacidad + desplazamiento corto).
     Sin 3D, sin pins y sin efectos que dependan del puntero. */
  $$('[data-split]').forEach((el) => {
    // se mantiene la estructura de líneas, pero la entrada es un fundido simple
    if (!reduced) {
      gsap.from(el, {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    }
  });

  if (!reduced) {
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });

    // grupos que entran escalonados
    [
      ['.cards', '[data-card]'],
      ['.tunnel', '.tunnel__item'],
      ['.process__track', '.step'],
      ['.stack', '.stack__card'],
    ].forEach(([group, items]) => {
      const targets = $$(items);
      if (!targets.length) return;
      gsap.set(targets, { clearProps: 'all' });
      gsap.from(targets, {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: group, start: 'top 85%', once: true },
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
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
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

  /* --- pasos del proceso y puntos de "por qué" visibles sin animación --- */
  $$('.step, .why__item').forEach((el) => el.classList.add('is-on'));

  /* --- video de empresas: solo reproduce mientras se ve --- */
  const video = $('.biz__video');
  if (video) {
    ScrollTrigger.create({
      trigger: '.biz',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? video.play().catch(() => {}) : video.pause()),
    });
  }
}

/* =========================================================
   Formulario de cotización (abre el correo con los datos)
   ========================================================= */
const form = $('.quote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const name = String(data.get('nombre') || '').trim();
  const phone = String(data.get('telefono') || '').trim();
  const nameEl = $('#q-name');
  const phoneEl = $('#q-phone');
  nameEl.classList.toggle('is-invalid', !name);
  phoneEl.classList.toggle('is-invalid', phone.replace(/\D/g, '').length < 10);
  const note = $('.quote__note');
  if (!name || phone.replace(/\D/g, '').length < 10) {
    note.textContent = 'Por favor escribe tu nombre y un teléfono de 10 dígitos.';
    (!name ? nameEl : phoneEl).focus();
    return;
  }
  const servicios = data.getAll('servicio').join(', ') || 'Por definir';
  const body = [
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    `Tipo de proyecto: ${data.get('tipo')}`,
    `Servicio: ${servicios}`,
    '',
    String(data.get('mensaje') || '').trim(),
  ].join('\n');
  const subject = `Solicitud de cotización · ${data.get('tipo')} · ${name}`;
  window.location.href = `mailto:asr.renovables@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  note.textContent = '¡Listo! Se abrió tu aplicación de correo con la solicitud. Si no se abrió, llámanos al 656 103 1243.';
});

boot();
