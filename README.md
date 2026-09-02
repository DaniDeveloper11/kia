# Landing Template

Plantilla base: Tailwind CSS v4 + Alpine.js + Vite. Sin configuración extra: Tailwind v4
se configura desde `src/style.css` (`@import "tailwindcss"`) y detecta automáticamente
las clases usadas en `index.html` / `src/**`.

## Uso

```bash
npm install
npm run dev       # desarrollo con hot-reload
npm run build      # genera ./dist listo para publicar
npm run preview    # sirve ./dist localmente para revisar el build
```

## Estructura

```
index.html      # markup de la landing
src/main.js     # arranca Alpine.js e importa el CSS
src/style.css   # entrada de Tailwind + estilos propios
```

Normalmente no usarás esta carpeta directamente: usa `scripts/new-landing.sh` desde la
raíz del repo para copiarla como punto de partida de una landing nueva.
