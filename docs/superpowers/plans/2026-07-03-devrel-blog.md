# DevRel Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-themed Astro blog/portfolio with a unified writing feed (local MDX + external articles), talks with video (YouTube or R2), projects, about+resume, RSS/sitemap/OG plumbing, deployable to Cloudflare Pages.

**Architecture:** Fully static Astro 5 site. Content lives in typed content collections (MDX posts via glob loader; external articles, talks, projects via YAML file loaders). A small `lib/` layer merges posts+external into one feed. One base layout owns tokens, nav, meta tags, and the theme toggle. Video is a native `<video>` component pointing at R2 URLs (or a YouTube iframe).

**Tech Stack:** Astro ^5, @astrojs/mdx, @astrojs/rss, @astrojs/sitemap, astro-og-canvas, vitest, Cloudflare Pages + R2, wrangler (deploy time only).

**Spec:** `docs/superpowers/specs/2026-07-03-devrel-blog-design.md`

## Global Constraints

- Project root: `/Users/johnsoh/Personal_projet/devrel-blog` (repo already exists with docs; all paths below relative to it).
- Dark theme is the default; light theme via `data-theme="light"` on `<html>`, persisted in `localStorage`, no flash on load.
- Single accent color, defined once: `--accent: #5DCAA5`. Never hardcode it elsewhere.
- Palette tokens: bg `#0b0e13`, raised surface `#161b22`, hairline `#2a2f38`, text `#e6edf3`, muted `#8b949e`, external-badge blue `#85B7EB` border `#378ADD`.
- Monospace is for meta only (nav, dates, tags, prompt lines, badges) — never body prose.
- Ship zero client JS except: theme toggle (inline, tiny) and native video controls.
- All content schema-validated (zod via content collections); a bad entry must fail `astro build`.
- `draft: true` posts excluded from production builds, visible in dev.
- Site URL placeholder until domain is bought: `https://johnsoh.dev` (set once in `astro.config.mjs`).
- Node 20+. Package manager: npm.
- Commit after every task (repo uses plain `git`, no remote yet).
- Sample content is clearly fake but realistic (see Task 3) — user swaps real content later.

## File Structure

```
package.json, astro.config.mjs, tsconfig.json, vitest.config.ts, .gitignore, README.md
src/
  styles/global.css            design tokens, base type, prose styles
  layouts/Base.astro           html shell, meta/OG, nav, footer, theme toggle
  components/Prompt.astro      "$ …" terminal label
  components/PostRow.astro     one feed row (local or external)
  components/TalkCard.astro    talk row w/ thumbnail
  components/ProjectCard.astro project card
  components/VideoPlayer.astro native <video> or YouTube iframe
  lib/feed.ts                  merge posts+external → FeedItem[]
  lib/readingTime.ts           words/200 helper
  content.config.ts            collections + zod schemas
  content/posts/quickstarts-devs-finish.mdx
  content/posts/dev-workshops-lessons.mdx
  content/external.yaml, content/talks.yaml, content/projects.yaml
  pages/index.astro
  pages/writing/index.astro
  pages/writing/[slug].astro
  pages/writing/tags/[tag].astro
  pages/talks.astro, pages/projects.astro, pages/about.astro
  pages/404.astro, pages/rss.xml.ts
  pages/og/[...route].ts       build-time OG images
scripts/poster.sh              ffmpeg poster frame grab
tests/feed.test.ts, tests/readingTime.test.ts
public/  (favicon.svg; user adds resume.pdf later)
```

---

### Task 1: Scaffold Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/pages/index.astro` (placeholder, replaced in Task 5)

**Interfaces:**
- Produces: working `npm run dev|build|test|check` scripts all later tasks rely on.

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "devrel-blog",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "@astrojs/mdx": "^4.0.0",
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.2.0",
    "astro": "^5.0.0",
    "astro-og-canvas": "^0.7.0",
    "canvaskit-wasm": "^0.39.1"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://johnsoh.dev',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark' }
  }
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "tests/**/*"],
  "exclude": ["dist"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] }
});
```

`.gitignore`:
```
node_modules/
dist/
.astro/
```

`src/pages/index.astro`:
```astro
---
---
<html lang="en"><head><title>devrel-blog scaffold</title></head>
<body><p>scaffold ok</p></body></html>
```

- [ ] **Step 2: Install and verify build**

Run: `cd /Users/johnsoh/Personal_projet/devrel-blog && npm install && npm run build`
Expected: build completes, `dist/index.html` exists containing "scaffold ok".

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: scaffold astro project"
```

---

### Task 2: Design tokens + Base layout with theme toggle

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Prompt.astro`, `public/favicon.svg`

**Interfaces:**
- Produces: `Base.astro` props `{ title: string; description: string; ogImage?: string }`; slot renders page content inside a 720px column. `Prompt.astro` props `{ text: string }` renders `$ {text}`. CSS classes: `.mono`, `.rows`, `.row`, `.badge`, `.pill`, `.btn`, `.prose`.

- [ ] **Step 1: Write global.css**

```css
:root {
  --bg: #0b0e13;
  --raise: #161b22;
  --line: #2a2f38;
  --ink: #e6edf3;
  --dim: #8b949e;
  --accent: #5DCAA5;
  --ext: #85B7EB;
  --ext-line: #378ADD;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
}
:root[data-theme="light"] {
  --bg: #f7f8fa;
  --raise: #ffffff;
  --line: #d8dde4;
  --ink: #1a1f26;
  --dim: #5a6472;
  --accent: #0F6E56;
  --ext: #185FA5;
  --ext-line: #378ADD;
}
* { box-sizing: border-box; margin: 0; }
html { background: var(--bg); color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }
body { font-family: var(--sans); color: var(--ink); line-height: 1.65; font-size: 16px; }
a { color: inherit; text-decoration: none; }
a:hover { color: var(--accent); }
a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.mono { font-family: var(--mono); }
.prompt { font-family: var(--mono); font-size: 13px; color: var(--accent); margin-bottom: 6px; }
.wrap { max-width: 720px; margin: 0 auto; padding: 40px 20px 64px; }
.nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; gap: 12px; }
.nav .logo { font-family: var(--mono); font-size: 15px; }
.nav .logo b { color: var(--accent); font-weight: 400; }
.nav .links { display: flex; gap: 18px; align-items: center; font-family: var(--mono); font-size: 13px; color: var(--dim); flex-wrap: wrap; }
.nav .links a[aria-current="page"] { color: var(--accent); }
.rows { border-top: 1px solid var(--line); }
.row { padding: 14px 0; border-bottom: 1px solid var(--line); }
.row .head { display: flex; justify-content: space-between; align-items: baseline; gap: 18px; }
.row .title { font-size: 15.5px; }
.row .date { font-family: var(--mono); font-size: 12px; color: var(--dim); white-space: nowrap; }
.row .desc { font-size: 13.5px; color: var(--dim); margin-top: 4px; }
.badge { font-family: var(--mono); font-size: 11px; color: var(--ext); border: 1px solid var(--ext-line); border-radius: 5px; padding: 1px 7px; white-space: nowrap; }
.pill { display: inline-block; font-family: var(--mono); font-size: 12px; color: var(--dim); border: 1px solid var(--line); border-radius: 5px; padding: 3px 11px; }
.pill.on, .pill:hover { color: var(--bg); background: var(--accent); border-color: var(--accent); }
.btn { display: inline-block; font-family: var(--mono); font-size: 13px; color: var(--bg); background: var(--accent); padding: 7px 16px; border-radius: 6px; }
.btn:hover { color: var(--bg); opacity: 0.9; }
h1 { font-size: 26px; font-weight: 600; letter-spacing: -0.01em; }
.footer { margin-top: 64px; padding-top: 18px; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 12px; color: var(--dim); display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.prose { font-size: 16px; }
.prose h2 { font-size: 21px; margin: 32px 0 12px; }
.prose h3 { font-size: 17px; margin: 24px 0 10px; }
.prose p, .prose ul, .prose ol { margin: 0 0 16px; }
.prose ul, .prose ol { padding-left: 24px; }
.prose code { font-family: var(--mono); font-size: 13.5px; background: var(--raise); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
.prose pre { background: var(--raise) !important; border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 0 0 16px; }
.prose pre code { background: none; border: none; padding: 0; font-size: 13px; }
.prose img, .prose video { max-width: 100%; border-radius: 8px; }
.prose blockquote { border-left: 3px solid var(--accent); padding-left: 16px; color: var(--dim); margin: 0 0 16px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
```

- [ ] **Step 2: Write Base.astro**

```astro
---
import '../styles/global.css';

interface Props { title: string; description: string; ogImage?: string; }
const { title, description, ogImage } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
const og = new URL(ogImage ?? '/og/site.png', Astro.site);
const path = Astro.url.pathname;
const current = (p: string) => (path === p || (p !== '/' && path.startsWith(p)) ? 'page' : undefined);
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={og} />
    <meta name="twitter:card" content="summary_large_image" />
    <script is:inline>
      const t = localStorage.getItem('theme');
      if (t === 'light') document.documentElement.dataset.theme = 'light';
    </script>
  </head>
  <body>
    <div class="wrap">
      <nav class="nav">
        <a class="logo" href="/">~/<b>johnsoh</b></a>
        <span class="links">
          <a href="/writing" aria-current={current('/writing')}>writing</a>
          <a href="/talks" aria-current={current('/talks')}>talks</a>
          <a href="/projects" aria-current={current('/projects')}>projects</a>
          <a href="/about" aria-current={current('/about')}>about</a>
          <button id="theme" aria-label="Toggle theme" style="background:none;border:none;cursor:pointer;color:var(--dim);font-size:14px;padding:0">☀</button>
        </span>
      </nav>
      <slot />
      <footer class="footer">
        <span>© 2026 John Soh</span>
        <span><a href="/rss.xml">rss</a> · <a href="https://github.com/johnsoh">github</a></span>
      </footer>
    </div>
    <script is:inline>
      document.getElementById('theme').addEventListener('click', () => {
        const root = document.documentElement;
        const light = root.dataset.theme !== 'light';
        if (light) { root.dataset.theme = 'light'; localStorage.setItem('theme', 'light'); }
        else { delete root.dataset.theme; localStorage.setItem('theme', 'dark'); }
      });
    </script>
  </body>
</html>
```

- [ ] **Step 3: Write Prompt.astro and favicon.svg**

`src/components/Prompt.astro`:
```astro
---
interface Props { text: string; }
const { text } = Astro.props;
---
<p class="prompt">$ {text}</p>
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0b0e13"/><text x="16" y="22" font-family="monospace" font-size="16" fill="#5DCAA5" text-anchor="middle">~</text></svg>
```

- [ ] **Step 4: Point placeholder index at the layout and verify**

Replace `src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="John Soh" description="DevRel engineer — writing, talks, projects.">
  <p>home placeholder</p>
</Base>
```

Run: `npm run build && grep -c "theme" dist/index.html`
Expected: build passes; grep count ≥ 2 (init script + toggle script present).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: design tokens, base layout, theme toggle"
```

---

### Task 3: Content collections + sample content

**Files:**
- Create: `src/content.config.ts`, `src/content/posts/quickstarts-devs-finish.mdx`, `src/content/posts/dev-workshops-lessons.mdx`, `src/content/external.yaml`, `src/content/talks.yaml`, `src/content/projects.yaml`

**Interfaces:**
- Produces: collections `posts` (schema: title, date, description, tags[], draft?, canonicalUrl?, video?{src,poster}), `external` (id, title, url, publication, date, tags[]), `talks` (id, title, event, date, video?{type:'youtube'|'r2', url, poster?}, slidesUrl?, description?), `projects` (id, name, description, tags[], repoUrl?, demoUrl?, featured?). Later tasks call `getCollection('<name>')`.

- [ ] **Step 1: Write content.config.ts**

```ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const video = z.object({
  type: z.enum(['youtube', 'r2']).default('r2'),
  url: z.string().url(),
  poster: z.string().optional()
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    canonicalUrl: z.string().url().optional(),
    video: video.optional()
  })
});

const external = defineCollection({
  loader: file('./src/content/external.yaml'),
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    publication: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([])
  })
});

const talks = defineCollection({
  loader: file('./src/content/talks.yaml'),
  schema: z.object({
    title: z.string(),
    event: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    video: video.optional(),
    slidesUrl: z.string().url().optional()
  })
});

const projects = defineCollection({
  loader: file('./src/content/projects.yaml'),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    repoUrl: z.string().url().optional(),
    demoUrl: z.string().url().optional(),
    featured: z.boolean().default(false)
  })
});

export const collections = { posts, external, talks, projects };
```

- [ ] **Step 2: Write sample content**

`src/content/posts/quickstarts-devs-finish.mdx`:
```mdx
---
title: "Designing SDK quickstarts that developers finish"
date: 2026-06-10
description: "Most quickstarts lose people at step 3. Here's the structure that got ours to 80% completion."
tags: ["devrel", "api-design"]
---

Most quickstarts lose people at step 3. Not because the product is hard,
but because the quickstart was written by someone who already knows it.

## Start from the aha, work backwards

Pick the single response that makes a developer grin, then delete every
step that isn't strictly required to reach it.

```ts
const client = new AcpClient({ apiKey: "..." });
const agent = await client.agents.create({ name: "buyer" });
```

## Show output, not promises

Every code block should be followed by exactly what the developer will
see when they run it. If you can't show the output, cut the step.
```

`src/content/posts/dev-workshops-lessons.mdx`:
```mdx
---
title: "What I learned running 12 developer workshops"
date: 2026-04-02
description: "Twelve workshops, three continents, one recurring mistake I kept making."
tags: ["devrel"]
---

Twelve workshops in, I finally noticed the pattern: the sessions that
went badly all had one thing in common — me talking for the first
twenty minutes.

## Ship the setup before the room fills

Send the environment setup a week early, then assume nobody did it and
budget ten silent minutes for it anyway.
```

`src/content/external.yaml`:
```yaml
- id: agent-payments-humans
  title: "Agent-to-agent payments, explained for humans"
  url: "https://virtuals.io/blog/agent-payments"
  publication: "virtuals blog"
  date: 2026-05-14
  tags: ["ai-agents"]
```

`src/content/talks.yaml`:
```yaml
- id: agents-that-buy
  title: "Agents that buy things: a live demo"
  event: "DevCon SEA"
  date: 2026-03-20
  description: "Live demo of an agent completing a real purchase end to end."
  video:
    type: youtube
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  slidesUrl: "https://speakerdeck.com/johnsoh/agents-that-buy"
- id: docs-devs-dont-hate
  title: "Docs developers don't hate"
  event: "API World"
  date: 2025-11-05
  video:
    type: r2
    url: "https://media.johnsoh.dev/talks/docs-devs-dont-hate.mp4"
    poster: "https://media.johnsoh.dev/talks/docs-devs-dont-hate.jpg"
```

`src/content/projects.yaml`:
```yaml
- id: acp-quickstart-kit
  name: "acp-quickstart-kit"
  description: "Starter templates for agent commerce integrations"
  tags: ["typescript", "sdk"]
  repoUrl: "https://github.com/johnsoh/acp-quickstart-kit"
  demoUrl: "https://acp-quickstart.pages.dev"
  featured: true
- id: webhook-inspector
  name: "webhook-inspector"
  description: "CLI to replay and debug webhook payloads locally"
  tags: ["go", "cli"]
  repoUrl: "https://github.com/johnsoh/webhook-inspector"
```

- [ ] **Step 3: Verify schemas catch bad content**

Run: `npm run build`
Expected: PASS.
Then temporarily change `url:` to `url: "not-a-url"` in `external.yaml`, run `npm run build` again.
Expected: FAIL with zod invalid url error. Revert the change, build passes again.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: content collections with schemas and sample content"
```

---

### Task 4: Feed + reading-time lib (TDD)

**Files:**
- Create: `src/lib/feed.ts`, `src/lib/readingTime.ts`
- Test: `tests/feed.test.ts`, `tests/readingTime.test.ts`

**Interfaces:**
- Produces:
  - `type FeedItem = { title: string; date: Date; description?: string; tags: string[]; href: string; external: boolean; publication?: string }`
  - `buildFeed(posts: PostLike[], externals: ExternalLike[]): FeedItem[]` — merged, sorted date-desc. `PostLike = { id: string; data: { title; date; description; tags } }`, `ExternalLike = { data: { title; url; publication; date; tags } }`.
  - `readingTime(body: string): number` — minutes, ≥1, 200 wpm.

- [ ] **Step 1: Write failing tests**

`tests/feed.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildFeed } from '../src/lib/feed';

const post = (id: string, date: string, title = id) => ({
  id,
  data: { title, date: new Date(date), description: 'd', tags: ['devrel'] }
});
const ext = (title: string, date: string) => ({
  data: { title, url: 'https://x.com/a', publication: 'pub', date: new Date(date), tags: [] }
});

describe('buildFeed', () => {
  it('merges and sorts date-descending', () => {
    const feed = buildFeed([post('a', '2026-01-01'), post('b', '2026-06-01')], [ext('c', '2026-03-01')]);
    expect(feed.map((f) => f.title)).toEqual(['b', 'c', 'a']);
  });
  it('marks externals and carries publication', () => {
    const feed = buildFeed([], [ext('c', '2026-03-01')]);
    expect(feed[0].external).toBe(true);
    expect(feed[0].publication).toBe('pub');
    expect(feed[0].href).toBe('https://x.com/a');
  });
  it('links local posts to /writing/<id>', () => {
    const feed = buildFeed([post('my-post', '2026-01-01')], []);
    expect(feed[0].href).toBe('/writing/my-post');
    expect(feed[0].external).toBe(false);
  });
});
```

`tests/readingTime.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readingTime } from '../src/lib/readingTime';

describe('readingTime', () => {
  it('rounds up at 200wpm', () => {
    expect(readingTime(Array(401).fill('word').join(' '))).toBe(3);
  });
  it('never returns less than 1', () => {
    expect(readingTime('short')).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/lib/feed` and `../src/lib/readingTime`.

- [ ] **Step 3: Implement**

`src/lib/feed.ts`:
```ts
export type FeedItem = {
  title: string;
  date: Date;
  description?: string;
  tags: string[];
  href: string;
  external: boolean;
  publication?: string;
};

type PostLike = {
  id: string;
  data: { title: string; date: Date; description?: string; tags: string[] };
};
type ExternalLike = {
  data: { title: string; url: string; publication: string; date: Date; tags: string[] };
};

export function buildFeed(posts: PostLike[], externals: ExternalLike[]): FeedItem[] {
  const local: FeedItem[] = posts.map((p) => ({
    title: p.data.title,
    date: p.data.date,
    description: p.data.description,
    tags: p.data.tags,
    href: `/writing/${p.id}`,
    external: false
  }));
  const ext: FeedItem[] = externals.map((e) => ({
    title: e.data.title,
    date: e.data.date,
    tags: e.data.tags,
    href: e.data.url,
    external: true,
    publication: e.data.publication
  }));
  return [...local, ...ext].sort((a, b) => b.date.getTime() - a.date.getTime());
}
```

`src/lib/readingTime.ts`:
```ts
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: unified feed merge and reading time helpers (TDD)"
```

---

### Task 5: PostRow component + homepage

**Files:**
- Create: `src/components/PostRow.astro`
- Modify: `src/pages/index.astro` (replace placeholder)

**Interfaces:**
- Consumes: `buildFeed`, `FeedItem` from Task 4; `Base`, `Prompt`, `.rows/.row/.badge` styles from Task 2; collections from Task 3.
- Produces: `PostRow.astro` props `{ item: FeedItem; showDesc?: boolean }` — reused by writing feed (Task 6).

- [ ] **Step 1: Write PostRow.astro**

```astro
---
import type { FeedItem } from '../lib/feed';

interface Props { item: FeedItem; showDesc?: boolean; }
const { item, showDesc = false } = Astro.props;
const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase();
---
<div class="row">
  <div class="head">
    <span class="title">
      <a href={item.href} rel={item.external ? 'noopener' : undefined}>{item.title}</a>
      {item.external && <span class="badge">on {item.publication} ↗</span>}
    </span>
    <span class="date">{fmt(item.date)}</span>
  </div>
  {showDesc && item.description && <p class="desc">{item.description}</p>}
</div>
```

- [ ] **Step 2: Write homepage**

`src/pages/index.astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Prompt from '../components/Prompt.astro';
import PostRow from '../components/PostRow.astro';
import { buildFeed } from '../lib/feed';

const posts = await getCollection('posts', ({ data }) => import.meta.env.PROD ? !data.draft : true);
const external = await getCollection('external');
const feed = buildFeed(posts, external).slice(0, 5);
---
<Base title="John Soh — devrel engineer" description="I help developers build with agent commerce protocols. Writing, talks, and projects.">
  <Prompt text="whoami" />
  <h1>John Soh — developer relations engineer</h1>
  <p style="color:var(--dim); max-width:52ch; margin-top:10px;">
    I help developers build with agent commerce protocols. I write about APIs,
    SDKs, and making developer tools people actually enjoy.
  </p>
  <p style="margin:20px 0 0; display:flex; gap:16px; align-items:center;">
    <a class="btn" href="/writing">read my writing</a>
    <span class="mono" style="font-size:13px; color:var(--dim);">
      <a href="https://github.com/johnsoh">github</a> ·
      <a href="https://twitter.com/johnsoh">twitter</a> ·
      <a href="https://linkedin.com/in/johnsoh">linkedin</a>
    </span>
  </p>
  <div style="margin-top:44px;">
    <Prompt text="ls writing/ --recent" />
    <div class="rows">
      {feed.map((item) => <PostRow item={item} />)}
    </div>
    <p class="mono" style="font-size:13px; margin-top:14px;"><a href="/writing">view all →</a></p>
  </div>
</Base>
```

- [ ] **Step 3: Verify**

Run: `npm run build && grep -o "on virtuals blog" dist/index.html | head -1 && grep -o "whoami" dist/index.html | head -1`
Expected: build passes; both strings print.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: homepage with unified recent-writing feed"
```

---

### Task 6: Writing feed page + tag pages

**Files:**
- Create: `src/pages/writing/index.astro`, `src/pages/writing/tags/[tag].astro`

**Interfaces:**
- Consumes: `buildFeed`, `PostRow`, `Prompt`, `Base`, `.pill` styles.
- Produces: routes `/writing` and `/writing/tags/<tag>`.

- [ ] **Step 1: Write /writing**

`src/pages/writing/index.astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import Prompt from '../../components/Prompt.astro';
import PostRow from '../../components/PostRow.astro';
import { buildFeed } from '../../lib/feed';

const posts = await getCollection('posts', ({ data }) => import.meta.env.PROD ? !data.draft : true);
const external = await getCollection('external');
const feed = buildFeed(posts, external);
const tags = [...new Set(feed.flatMap((f) => f.tags))].sort();
---
<Base title="Writing — John Soh" description="All articles by John Soh — on this site and around the web.">
  <Prompt text="cat writing/*" />
  <h1>Writing</h1>
  <p style="display:flex; gap:7px; flex-wrap:wrap; margin:16px 0 20px;">
    <span class="pill on">all</span>
    {tags.map((t) => <a class="pill" href={`/writing/tags/${t}`}>{t}</a>)}
  </p>
  <div class="rows">
    {feed.map((item) => <PostRow item={item} showDesc />)}
  </div>
</Base>
```

- [ ] **Step 2: Write tag pages**

`src/pages/writing/tags/[tag].astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../../../layouts/Base.astro';
import Prompt from '../../../components/Prompt.astro';
import PostRow from '../../../components/PostRow.astro';
import { buildFeed } from '../../../lib/feed';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.PROD ? !data.draft : true);
  const external = await getCollection('external');
  const feed = buildFeed(posts, external);
  const tags = [...new Set(feed.flatMap((f) => f.tags))];
  return tags.map((tag) => ({ params: { tag }, props: { items: feed.filter((f) => f.tags.includes(tag)), tags } }));
}
const { tag } = Astro.params;
const { items, tags } = Astro.props;
---
<Base title={`#${tag} — John Soh`} description={`Articles tagged ${tag}.`}>
  <Prompt text={`grep -r "#${tag}" writing/`} />
  <h1>#{tag}</h1>
  <p style="display:flex; gap:7px; flex-wrap:wrap; margin:16px 0 20px;">
    <a class="pill" href="/writing">all</a>
    {tags.sort().map((t) => <a class={`pill${t === tag ? ' on' : ''}`} href={`/writing/tags/${t}`}>{t}</a>)}
  </p>
  <div class="rows">
    {items.map((item) => <PostRow item={item} showDesc />)}
  </div>
</Base>
```

- [ ] **Step 3: Verify**

Run: `npm run build && ls dist/writing/tags/ && grep -c "row" dist/writing/index.html`
Expected: tag dirs `devrel`, `api-design`, `ai-agents` exist; grep count ≥ 3 (three feed entries).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: writing feed with external badges and tag pages"
```

---

### Task 7: Post page

**Files:**
- Create: `src/pages/writing/[slug].astro`

**Interfaces:**
- Consumes: `posts` collection, `readingTime` (Task 4), `.prose` styles (Task 2), `VideoPlayer` is NOT used here yet (posts embed video via MDX after Task 8 — no change needed here).
- Produces: route `/writing/<post id>`; per-post OG image path convention `/og/writing/<id>.png` (generated in Task 11).

- [ ] **Step 1: Write [slug].astro**

```astro
---
import { getCollection, render } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { readingTime } from '../../lib/readingTime';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.PROD ? !data.draft : true);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}
const { post } = Astro.props;
const { Content } = await render(post);
const mins = readingTime(post.body ?? '');
const fmt = post.data.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase();
---
<Base
  title={`${post.data.title} — John Soh`}
  description={post.data.description}
  ogImage={`/og/writing/${post.id}.png`}
>
  <p class="mono" style="font-size:12px; color:var(--dim); margin-bottom:16px;">
    <a href="/writing">← ~/writing</a>
  </p>
  <h1 style="text-wrap:balance;">{post.data.title}</h1>
  <p class="mono" style="font-size:12px; color:var(--dim); margin:8px 0 28px;">
    {fmt} · {mins} min ·
    {post.data.tags.map((t) => <a href={`/writing/tags/${t}`} style="color:var(--accent);">#{t} </a>)}
  </p>
  {post.data.canonicalUrl && (
    <p class="mono" style="font-size:12px; color:var(--dim); margin-bottom:20px;">
      originally published at <a href={post.data.canonicalUrl} style="color:var(--ext);">{new URL(post.data.canonicalUrl).hostname}</a>
    </p>
  )}
  <article class="prose">
    <Content />
  </article>
</Base>
```

Note: when `canonicalUrl` is set, the canonical link must point there instead of this page. Extend `Base.astro` props with `canonicalOverride?: string`:

In `Base.astro`, change:
```astro
interface Props { title: string; description: string; ogImage?: string; canonicalOverride?: string; }
const { title, description, ogImage, canonicalOverride } = Astro.props;
const canonical = canonicalOverride ?? new URL(Astro.url.pathname, Astro.site);
```
And in `[slug].astro` pass `canonicalOverride={post.data.canonicalUrl}`.

- [ ] **Step 2: Verify**

Run: `npm run build && grep -o "8 min\|[0-9] min" dist/writing/quickstarts-devs-finish/index.html | head -1 && grep -c "astro-code" dist/writing/quickstarts-devs-finish/index.html`
Expected: a "N min" reading time prints; `astro-code` count ≥ 1 (shiki highlighted block present).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: post page with reading time, tags, canonical support"
```

---

### Task 8: VideoPlayer + Talks page

**Files:**
- Create: `src/components/VideoPlayer.astro`, `src/components/TalkCard.astro`, `src/pages/talks.astro`

**Interfaces:**
- Consumes: `talks` collection (Task 3 schema: `video?{type, url, poster?}`).
- Produces: `VideoPlayer.astro` props `{ video: { type: 'youtube' | 'r2'; url: string; poster?: string }; title: string }` — also usable inside MDX posts via import.

- [ ] **Step 1: Write VideoPlayer.astro**

```astro
---
interface Props {
  video: { type: 'youtube' | 'r2'; url: string; poster?: string };
  title: string;
}
const { video, title } = Astro.props;
function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return m ? m[1] : null;
}
const yt = video.type === 'youtube' ? youtubeId(video.url) : null;
---
{yt ? (
  <iframe
    src={`https://www.youtube-nocookie.com/embed/${yt}`}
    title={title}
    loading="lazy"
    allowfullscreen
    style="width:100%; aspect-ratio:16/9; border:1px solid var(--line); border-radius:8px;"
  ></iframe>
) : (
  <video
    controls
    preload="metadata"
    poster={video.poster}
    style="width:100%; aspect-ratio:16/9; border:1px solid var(--line); border-radius:8px; background:var(--raise);"
  >
    <source src={video.url} type="video/mp4" />
    Your browser doesn't support embedded video. <a href={video.url}>Download it</a> instead.
  </video>
)}
```

- [ ] **Step 2: Write TalkCard.astro**

```astro
---
import VideoPlayer from './VideoPlayer.astro';

interface Props {
  talk: {
    data: {
      title: string; event: string; date: Date; description?: string;
      video?: { type: 'youtube' | 'r2'; url: string; poster?: string };
      slidesUrl?: string;
    };
  };
}
const { talk } = Astro.props;
const d = talk.data;
const fmt = d.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase();
---
<div style="padding:20px 0; border-bottom:1px solid var(--line);">
  <p style="font-size:16px; font-weight:600;">{d.title}</p>
  <p class="mono" style="font-size:12px; color:var(--dim); margin:4px 0 12px;">
    {d.event} · {fmt}
    {d.slidesUrl && <> · <a href={d.slidesUrl} style="color:var(--ext);">slides ↗</a></>}
  </p>
  {d.description && <p style="font-size:14px; color:var(--dim); margin-bottom:12px;">{d.description}</p>}
  {d.video && <VideoPlayer video={d.video} title={d.title} />}
</div>
```

- [ ] **Step 3: Write talks.astro**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Prompt from '../components/Prompt.astro';
import TalkCard from '../components/TalkCard.astro';

const talks = (await getCollection('talks')).sort(
  (a, b) => b.data.date.getTime() - a.data.date.getTime()
);
---
<Base title="Talks — John Soh" description="Conference and meetup talks by John Soh, with video and slides.">
  <Prompt text="ls talks/" />
  <h1>Talks</h1>
  <div style="margin-top:12px; border-top:1px solid var(--line);">
    {talks.map((talk) => <TalkCard talk={talk} />)}
  </div>
</Base>
```

- [ ] **Step 4: Verify**

Run: `npm run build && grep -o "youtube-nocookie" dist/talks/index.html | head -1 && grep -o "media.johnsoh.dev" dist/talks/index.html | head -1`
Expected: both strings print (one YouTube embed, one R2 native video).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: talks page with youtube and r2 video player"
```

---

### Task 9: Projects page

**Files:**
- Create: `src/components/ProjectCard.astro`, `src/pages/projects.astro`

**Interfaces:**
- Consumes: `projects` collection.

- [ ] **Step 1: Write ProjectCard.astro**

```astro
---
interface Props {
  project: {
    data: {
      name: string; description: string; tags: string[];
      repoUrl?: string; demoUrl?: string; featured: boolean;
    };
  };
}
const { project } = Astro.props;
const d = project.data;
---
<div style="border:1px solid var(--line); border-radius:8px; padding:14px 16px;">
  <p style="font-size:15px; font-weight:600;">
    <span style="color:var(--accent);">▸</span> {d.name}
  </p>
  <p style="font-size:13.5px; color:var(--dim); margin:4px 0 10px;">{d.description}</p>
  <p class="mono" style="font-size:11px; color:var(--dim); display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
    {d.tags.map((t) => <span style="border:1px solid var(--line); border-radius:4px; padding:1px 7px;">{t}</span>)}
    {d.repoUrl && <a href={d.repoUrl} style="color:var(--ext);">repo ↗</a>}
    {d.demoUrl && <a href={d.demoUrl} style="color:var(--ext);">demo ↗</a>}
  </p>
</div>
```

- [ ] **Step 2: Write projects.astro**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Prompt from '../components/Prompt.astro';
import ProjectCard from '../components/ProjectCard.astro';

const projects = (await getCollection('projects')).sort(
  (a, b) => Number(b.data.featured) - Number(a.data.featured)
);
---
<Base title="Projects — John Soh" description="Open-source projects, SDKs, and demos by John Soh.">
  <Prompt text="ls projects/" />
  <h1>Projects</h1>
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px; margin-top:16px;">
    {projects.map((project) => <ProjectCard project={project} />)}
  </div>
</Base>
```

- [ ] **Step 3: Verify**

Run: `npm run build && grep -c "repo ↗" dist/projects/index.html`
Expected: count = 2.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: projects page"
```

---

### Task 10: About page + resume

**Files:**
- Create: `src/pages/about.astro`
- Create: `README.md` (content inventory notes; user drops `public/resume.pdf` manually)

**Interfaces:**
- Consumes: `Base`, `Prompt`, `.btn`.

- [ ] **Step 1: Write about.astro**

```astro
---
import Base from '../layouts/Base.astro';
import Prompt from '../components/Prompt.astro';
---
<Base title="About — John Soh" description="John Soh is a developer relations engineer working on agent commerce protocols.">
  <Prompt text="cat about.md" />
  <div style="display:flex; align-items:center; gap:16px; margin:8px 0 20px;">
    <div style="width:52px; height:52px; border-radius:50%; background:var(--raise); border:1px solid var(--accent); display:flex; align-items:center; justify-content:center;" class="mono" aria-hidden="true">
      <span style="color:var(--accent); font-size:15px;">JS</span>
    </div>
    <div>
      <h1 style="font-size:20px;">John Soh</h1>
      <p class="mono" style="font-size:12px; color:var(--dim);">devrel engineer</p>
    </div>
  </div>
  <div class="prose" style="color:var(--dim); max-width:60ch;">
    <p>
      I'm a developer relations engineer working on agent commerce protocols —
      the infrastructure that lets AI agents transact on behalf of people.
      I spend my time writing docs and guides, giving talks, running workshops,
      and building SDKs and demos that make new protocols feel obvious.
    </p>
    <p>
      Before this I worked across ad-tech and developer platforms. I care a lot
      about the moment a developer goes from "reading about it" to "it works on
      my machine" — most of my writing is about shrinking that gap.
    </p>
  </div>
  <p style="margin:24px 0 14px;">
    <a class="btn" href="/resume.pdf" download>↓ download resume</a>
  </p>
  <p class="mono" style="font-size:12px; color:var(--dim);">
    <a href="https://github.com/johnsoh">github ↗</a> ·
    <a href="https://twitter.com/johnsoh">twitter ↗</a> ·
    <a href="https://linkedin.com/in/johnsoh">linkedin ↗</a> ·
    <a href="/rss.xml">rss</a>
  </p>
</Base>
```

- [ ] **Step 2: Write README.md**

```markdown
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
```

- [ ] **Step 3: Verify**

Run: `npm run build && grep -o "resume.pdf" dist/about/index.html | head -1`
Expected: prints `resume.pdf`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: about page with resume download; publishing README"
```

---

### Task 11: RSS, 404, OG images

**Files:**
- Create: `src/pages/rss.xml.ts`, `src/pages/404.astro`, `src/pages/og/[...route].ts`

**Interfaces:**
- Consumes: `posts` collection; OG path convention `/og/writing/<id>.png` from Task 7; `Base` already links `/rss.xml` and `/og/site.png`.
- Produces: `/rss.xml`, `/404.html`, `/og/writing/<id>.png` for every post plus `/og/site.png`.

- [ ] **Step 1: Write rss.xml.ts**

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return rss({
    title: 'John Soh — writing',
    description: 'Articles on devrel, APIs, and agent commerce.',
    site: context.site!,
    items: posts
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.date,
        link: `/writing/${post.id}/`
      }))
  });
}
```

- [ ] **Step 2: Write 404.astro**

```astro
---
import Base from '../layouts/Base.astro';
import Prompt from '../components/Prompt.astro';
---
<Base title="404 — John Soh" description="Page not found.">
  <Prompt text={Astro.url.pathname.replace(/^\//, '') || '???'} />
  <h1 class="mono" style="font-size:20px;">command not found</h1>
  <p style="color:var(--dim); margin-top:12px;">
    That page doesn't exist. Try <a href="/" style="color:var(--accent);">~/</a> or
    <a href="/writing" style="color:var(--accent);">~/writing</a>.
  </p>
</Base>
```

- [ ] **Step 3: Write OG image route**

`src/pages/og/[...route].ts`:
```ts
import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

const posts = await getCollection('posts', ({ data }) => !data.draft);

const pages = Object.fromEntries([
  ['site', { title: 'John Soh', description: 'devrel engineer — writing, talks, projects' }],
  ...posts.map((post) => [
    `writing/${post.id}`,
    { title: post.data.title, description: post.data.description }
  ])
]);

export const { getStaticPaths, GET } = OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[11, 14, 19]],
    border: { color: [93, 202, 165], width: 12, side: 'inline-start' },
    padding: 72,
    font: {
      title: { size: 56, weight: 'SemiBold', color: [230, 237, 243] },
      description: { size: 28, color: [139, 148, 158] }
    }
  })
});
```

- [ ] **Step 4: Verify**

Run: `npm run build && ls dist/rss.xml dist/404.html dist/og/site.png dist/og/writing/`
Expected: all paths exist; `dist/og/writing/` contains one png per post.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: rss feed, 404 page, build-time og images"
```

---

### Task 12: Poster script + full-site verification

**Files:**
- Create: `scripts/poster.sh`

**Interfaces:**
- Produces: `scripts/poster.sh <input.mp4> [timestamp]` → writes `<input>.jpg` beside the video.

- [ ] **Step 1: Write poster.sh**

```bash
#!/usr/bin/env bash
# Grab a poster frame from a video: poster.sh talk.mp4 [00:00:02]
set -euo pipefail
in="${1:?usage: poster.sh <video> [timestamp]}"
ts="${2:-00:00:02}"
out="${in%.*}.jpg"
ffmpeg -y -ss "$ts" -i "$in" -frames:v 1 -q:v 3 "$out"
echo "poster written to $out"
```

Run: `chmod +x scripts/poster.sh`

- [ ] **Step 2: Full verification pass**

Run: `npm run check && npm test && npm run build`
Expected: check passes (no type errors), 5 unit tests pass, build succeeds.

Run: `npx astro preview` then verify in browser preview: home, /writing, a post, tag page, /talks, /projects, /about, /404, theme toggle persists across reload, no console errors.
Expected: all pages render per mockups; light toggle works without flash.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: video poster helper script"
```

---

### Task 13: Deploy setup (documentation + user-gated)

**Files:**
- Modify: `README.md` (append deploy section)

Deployment needs the user's Cloudflare/GitHub accounts and domain choice — the plan prepares everything and documents exact steps; actual deploy happens with the user.

- [ ] **Step 1: Append deploy docs to README.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "docs: cloudflare pages + r2 deploy instructions"
```

- [ ] **Step 3: Hand off to user**

Confirm with the user before creating the GitHub repo / touching their Cloudflare account. Everything up to here runs and verifies locally.

---

## Self-Review

**Spec coverage:** Home (T5), unified writing feed + badges (T4–6), post page w/ reading time, tags, canonical, shiki (T7), talks + YouTube/R2 video + poster (T8, T12), projects (T9), about + resume button (T10), RSS/sitemap/OG/404 (T1 sitemap integration, T11), drafts excluded in prod (T5/6/7 filters), schema validation as build gate (T3 step 3), theme toggle no-flash (T2), publishing docs (T10, T13), deploy + R2 (T13). Reading-time and feed logic unit-tested (T4). Out-of-scope items (comments, search, CMS, auto cross-posting) — correctly absent.

**Placeholder scan:** clean — every code step has full code; social URLs/bio are explicit sample content flagged in README owner-TODO.

**Type consistency:** `FeedItem.href/external/publication` (T4) match `PostRow` usage (T5/6); `video {type,url,poster}` schema (T3) matches `VideoPlayer` props (T8); `Base` props extended once in T7 (`canonicalOverride`) and used only there; OG path `/og/writing/<id>.png` consistent between T7 and T11.
