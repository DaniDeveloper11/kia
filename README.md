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

## Cloudflare Pages deploy

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(empty)* |

Node version comes from `.node-version` (20). Cloudflare runs `npm install`
before the build command, so don't add it yourself.

### Contact form

`functions/api/contact.js` is a Pages Function that emails quote requests
through [Resend](https://resend.com). Set these under
**Settings -> Environment variables** (Production *and* Preview):

| Variable | Example |
| --- | --- |
| `RESEND_API_KEY` | `re_...` (mark as a secret) |
| `CONTACT_TO_EMAIL` | `estimating@kiacontractorsinc.com` |
| `CONTACT_FROM_EMAIL` | `KIA Website <noreply@kiacontractorsinc.com>` |

`CONTACT_FROM_EMAIL` must be on a domain verified in Resend, or delivery
fails. Without these three the endpoint returns a 500 and the form shows
"temporarily unavailable" instead of silently losing the lead.

Test locally with `npx wrangler pages dev dist` (plain `vite preview` does
not run Functions, so the form will 405 there).

### Analytics

Web Analytics is a toggle in the Pages project
(**Settings -> Web Analytics -> Enable**) — Cloudflare injects the beacon, so
no snippet belongs in `index.html`. `src/main.js` already fires `track()`
events for `quote_submitted`, `phone_click`, `whatsapp_click` and the mobile
CTAs; they forward to `gtag` or `dataLayer` if you later add GA4 or GTM, and
are a no-op until then.

### Languages

| Locale | URLs |
| --- | --- |
| English (default) | `/`, `/privacy.html`, `/terms.html` |
| Spanish | `/es/`, `/es/privacidad.html`, `/es/terminos.html` |

Both locales are full static pages with `hreflang` alternates and their own
canonical, so Google indexes them separately — there is no client-side
language switching. The nav carries a switcher between them.

Source files live at `index.html` and `es/index.html`. **They are maintained
in parallel: a copy change on one must be mirrored on the other**, and both
are registered in `vite.config.js` under `build.rollupOptions.input`.
