# devrel-blog

Personal blog + portfolio. Astro, markdown-in-git, Cloudflare Pages.

## Publishing

- New post: add `src/content/posts/<slug>.mdx` (frontmatter: title, date,
  description, tags; optional draft, canonicalUrl, video) → push.
- External article: add an entry to `src/content/external.yaml`.
- Talk: add to `src/content/talks.yaml`. Project: `src/content/projects.yaml`.
- Video: `scripts/poster.sh video.mp4` to grab a poster frame, upload both to
  R2 (`wrangler r2 object put blog-media/talks/<name>.mp4 --file video.mp4`),
  reference `https://media.<domain>/talks/<name>.mp4` in content.

## Before going live (owner TODO)

- [ ] Drop real resume at `public/resume.pdf`
- [ ] Replace sample posts/talks/projects/external entries with real content
- [ ] Replace social URLs in `Base.astro`, `index.astro`, `about.astro`
- [ ] Set final domain in `astro.config.mjs` (`site:`)

## Commands

`npm run dev` · `npm run build` · `npm test` · `npm run check`

## Deploy (Cloudflare Pages)

1. Create GitHub repo, push `main`.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect repo.
   Build command: `npm run build`. Output dir: `dist`. Node 20.
3. Custom domain: add domain in Pages → Custom domains (DNS on Cloudflare).
4. Update `site:` in `astro.config.mjs` to the final domain; push.

## R2 video bucket

1. `wrangler r2 bucket create blog-media`
2. R2 → blog-media → Settings → Public access → connect custom domain
   `media.<domain>`.
3. Upload: `wrangler r2 object put blog-media/talks/<name>.mp4 --file <file>`
   (same for `.jpg` posters from `scripts/poster.sh`).
