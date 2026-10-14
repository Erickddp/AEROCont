# ASR Renovables — sitio web inmersivo

Sitio de una sola página para **ASR Renovables** (Ciudad Juárez, Chihuahua): paneles solares, servicios eléctricos, HVAC y generadores.

El concepto es **«un día de energía»**. El fondo es un barrio 3D de techos planos (como los de las fotos reales de ASR) y, al hacer scroll, el sol cruza el cielo del amanecer al atardecer. Al mismo tiempo, cada vez más techos "se instalan" con paneles solares. Un reloj solar abajo a la izquierda marca la hora del recorrido.

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

1. **Inicio**: amanecer sobre el barrio, logo y llamado a cotizar.
2. **Compromiso**: el texto se ilumina palabra por palabra.
3. **Paneles solares**: foto con entrada en profundidad.
4. **Proceso**: 5 pasos en recorrido horizontal fijado.
5. **Monitoreo**: teléfono en 3D con la captura real de monitoreo.
6. **Residencial / Comercial / Industrial**: túnel 3D de fotos.
7. **Hogar**: interconectado (contador 98%), híbrido y aislado en tarjetas apiladas.
8. **Conoce nuestro trabajo**: personalizados, K2, marquesina de marcas y la foto del instalador, que se abre a pantalla completa.
9. **Empresas**: ventana que se expande a pantalla completa (lista para video de dron).
10. **Servicios**: 4 tarjetas con inclinación 3D.
11. **¿Por qué elegirnos?**: los puntos se encienden conforme lees (contador de 20 días).
12. **Contacto**: atardecer y formulario de cotización.

## Pendientes del cliente

- **Video de dron** (`dji_fly_20260107_144246_666_…mp4` del sitio actual). Guárdalo como `public/media/dron.mp4` y descomenta la etiqueta `<video>` en la sección `#empresas` de `index.html`.
- **Foto original del hero** (paneles al atardecer del sitio actual), en la mejor resolución disponible.
- **Foto real de un generador eléctrico**. Hoy esa tarjeta usa la foto del atardecer, igual que el sitio original.
- **Foto de HVAC en mayor resolución**. La actual mide 643 × 361 px.
- **WhatsApp**: confirmar qué número lo usa para agregar un botón directo.
- **Formulario**: hoy abre el correo del visitante con la solicitud lista. Si quieren que llegue sin abrir el correo, se puede conectar a Formspree, Netlify Forms o similar.
- **Dominio** y **hosting** donde se publicará.

## Notas

- Se corrigieron erratas del sitio original: *prersonalizado/perzonalizado → personalizado*, *eligirnos → elegirnos*, *recíbo → recibo*, *fotovoltáicos → fotovoltaicos*, *especificamente → específicamente*.
- Con `prefers-reduced-motion` se desactivan el scroll suave, los pins y las animaciones pesadas, y todo el contenido queda visible.
- En móviles y equipos de bajo rendimiento la escena 3D se aligera: ciudad más pequeña, sin sombras y con bloom a media resolución.
- Si el navegador no tiene WebGL, se muestra un fondo degradado estático.
- `?snap` en la URL quita la inercia de la cámara 3D (útil para capturas).
