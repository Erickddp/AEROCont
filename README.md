# ASR Renovables — sitio web inmersivo

Sitio de una sola página para **ASR Renovables** (Ciudad Juárez, Chihuahua): paneles solares, servicios eléctricos, HVAC y generadores.

El concepto es **«un día de energía»**. El fondo es un barrio 3D de techos planos (como los de las fotos reales de ASR) y, al hacer scroll, el sol cruza el cielo del amanecer al atardecer. Al mismo tiempo, cada vez más techos "se instalan" con paneles solares.

La **batería solar** acompaña todo el recorrido: el sol avanza por su arco, la hora cambia (06:15 → 20:10) y la batería de un sistema de 5 kWp se llena conforme bajas. Llega al 100 % justo en Contacto («Atardecer · tu batería, llena»). En pantallas anchas (≥ 1440 px) es vertical, en el margen izquierdo; en móvil flota al centro, abajo, como protagonista del recorrido (sin botones de Llamar / WhatsApp encima). Mientras bajas, entran chispas de energía a la batería; al llenarse se pone verde y late.

## Tecnología

| Pieza | Uso |
| --- | --- |
| [Vite](https://vite.dev) | Servidor de desarrollo y build estático |
| [Three.js](https://threejs.org) | Escena 3D (cielo con shader, ciudad instanciada, reflejos, bloom, sombras) |
| [GSAP](https://gsap.com) + ScrollTrigger + SplitText | Animaciones ligadas al scroll, pins, textos en 3D |
| [Lenis](https://lenis.darkroom.engineering) | Scroll suave |
| Fontsource | Sora, Inter y Cinzel, alojadas localmente (sin Google Fonts) |

## Comandos

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173
npm run build     # genera /dist listo para subir a cualquier hosting estático
npm run preview   # sirve /dist para probar el build
```

`/dist` usa rutas relativas, así que funciona igual en Netlify, Vercel, GitHub Pages, cPanel, etc.

## Estructura

```
index.html            Todo el contenido (textos del sitio original de ASR)
src/main.js           Scroll suave, loader, navegación, animaciones por sección, formulario
src/scene.js          Mundo 3D (ciudad, paneles, sol, cielo, cámara)
src/styles/main.css   Estilos y diseño responsive
public/img/           Fotos reales de ASR (webp), logos de marcas y logo de ASR
```

## Recorrido (secciones)

1. **Inicio (amanecer)**: logo, llamado a cotizar y 3 garantías (visita sin costo, trámite CFE, 20 días).
2. **Tu ventaja**: 4 cifras del sol de Juárez.
3. **Soluciones**: interconectado, híbrido y aislado lado a lado, con "Cómo funciona" desplegable.
4. **Proyectos (mediodía)**: cada instalación en su propia tarjeta, con filtro Casas / Comercios / Industria y visor de foto grande. Debajo, marcas.
5. **Clientes satisfechos**: testimonios y botón para dejar reseña.
6. **Empresas**: video de dron y deducción del 100 % (Art. 34 LISR).
7. **Servicios (tarde)**: solar, eléctrico, clima y generadores.
8. **Cómo trabajamos + ¿Por qué ASR?**: 5 pasos y 6 razones con la foto del instalador.
9. **Calculadora de ahorro** y **Preguntas frecuentes**.
10. **Contacto (atardecer)**: la batería llega al 100 %; formulario por WhatsApp o correo.

En móvil, soluciones, proyectos y testimonios son carruseles horizontales (se deslizan con el dedo) para que la página no sea eterna.

### Agregar un proyecto

Copia un `<article class="project">` en `index.html`, cambia la foto, `data-cat` (`residencial`, `comercial` o `industrial`; puede llevar varias separadas por espacio) y los textos. El filtro y el visor funcionan solos.

## Pendientes del cliente

- **Formspree** (formulario directo al correo): crear cuenta en formspree.io y pegar la URL en `data-endpoint` del `<form class="quote">` en `index.html`. Sin eso, el formulario abre el correo del visitante.
- **Foto original del hero** (paneles al atardecer), en la mejor resolución posible.
- **Foto real de un generador eléctrico** (hoy usa la del atardecer) y **foto de HVAC** en mayor resolución (la actual mide 643 × 361 px).
- **Testimonios reales** (obligatorio antes de publicar): los 3 de la sección Clientes son ejemplos de formato y llevan la etiqueta "Ejemplo". Reemplazarlos por reseñas reales, con permiso del cliente, y borrar los `span.review__demo`.
- **Datos de cada proyecto**: kWp, número de paneles y colonia, para sumarlos a las tarjetas de proyecto.
- Tras publicar: dar de alta el dominio en Google Search Console y enviar `https://asrrenovables.com/sitemap.xml`.

## Video del dron

- `public/media/dron.mp4` (720p, 30 s, ~7 MB) y `dron-movil.mp4` (480p, ~2.4 MB) son versiones comprimidas del original, sin audio. Se cargan solo al acercarse a la sección Empresas, y no en modo ahorro de datos ni con movimiento reducido.
- El original (265 MB) está en `originales/` (ignorado por git, no se publica).

## Notas

- Se corrigieron erratas del sitio original: *prersonalizado/perzonalizado → personalizado*, *eligirnos → elegirnos*, *recíbo → recibo*, *fotovoltáicos → fotovoltaicos*, *especificamente → específicamente*.
- Con `prefers-reduced-motion` se desactivan el scroll suave, los pins y las animaciones pesadas, y todo el contenido queda visible.
- En móviles y equipos de bajo rendimiento la escena 3D se aligera: ciudad más pequeña, sin sombras y con bloom a media resolución.
- Si el navegador no tiene WebGL, se muestra un fondo degradado estático.
- `?snap` en la URL quita la inercia de la cámara 3D (útil para capturas).
