# Deploying Project Imladris

It's a static Vite build (`dist/`) — no server, no env vars, no database. Any static host
works; Vercel is the path of least resistance and `vercel.json` is already set up.

## Option A — Vercel dashboard (recommended, auto-deploys on push)
1. Push this repo to GitHub (it already has a remote).
2. Go to https://vercel.com/new → **Import** the repository.
3. Vercel auto-detects the settings from `vercel.json` (Framework: Vite · Build: `npm run
   build` · Output: `dist`). Just click **Deploy**.
4. Every push to the default branch now ships a new production deploy; PRs get previews.

## Option B — Vercel CLI (one-off from your machine)
Run these in the project root (the `!` prefix runs them in this session if you like):
```
npm i -g vercel       # once
vercel                # first run links the project + deploys a preview
vercel --prod         # promote to production
```

## Notes / gotchas
- **Node 18+** for the build (Vercel defaults are fine).
- **DRACO decoder** loads from the Google CDN (`gstatic.com`) at runtime — no setup needed.
  To be fully self-contained, self-host the decoder and update the path in
  `src/assets/loader.js`.
- **Model files** (`public/models/**`) are served as static assets and cached for a year
  (see `vercel.json`). The KayKit `.gltf` keeps its `.bin` + texture co-located — don't
  split them.
- `vite.config.js` uses `base: './'`, so the build also works from a sub-path or plain
  file host (e.g. GitHub Pages, Netlify, S3) if you ever move off Vercel.
- Sourcemaps are emitted; set `build.sourcemap: false` in `vite.config.js` if you'd rather
  not publish them.
