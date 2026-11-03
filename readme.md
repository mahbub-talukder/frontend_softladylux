# SoftLadyLux frontend

Nuxt 3 + Vue 3 + TypeScript + Pinia + Tailwind (CSS-variable tokens) + @nuxt/image. Storefront at `/`, admin at `/admin/`.

## Commands
```
npm install
npm run dev          # needs the backend API (see backend repo compose)
npm run lint         # eslint + raw-colour check
npm test
npm run build
```
## Rules
- Colours live only in `assets/css/tokens.css` (SRS THM-05). `npm run check:colors` fails on raw hex/rgb elsewhere.
- API base: `NUXT_API_BASE_INTERNAL` (SSR) and `NUXT_PUBLIC_API_BASE` (browser). See `.env.example`.
- Comments cite SRS requirement IDs.
