# DevRel personal blog & portfolio — design spec

**Date:** 2026-07-03
**Status:** Approved pending final user review
**Project directory:** `/Users/johnsoh/Personal_projet/devrel-blog`

## 1. Purpose & goals

A personal tech blog that doubles as a portfolio for a DevRel engineer. Primary
job: **portfolio / credibility** — a polished home base linkable from resume,
conference bios, and job applications, presenting the full body of work
(writing, talks, projects) in one place.

Success criteria:

- A visitor understands who John is and sees his best work within 10 seconds
  of landing.
- All writing — on-site and external — appears in one unified feed.
- Publishing a post takes one markdown file and one `git push`.
- Lighthouse scores near 100; site loads fast worldwide.

## 2. Stack decisions (all confirmed with user)

| Decision | Choice | Rationale |
|---|---|---|
| Framework | **Astro** (content collections, MDX) | Purpose-built for content sites; ships zero JS by default; best-in-class markdown support |
| Authoring | **Markdown/MDX in git** | Developer-native workflow, no CMS dependency |
| Hosting | **Cloudflare Pages** + custom domain | Free, fast global CDN, push-to-deploy from GitHub |
| Video hosting | **Cloudflare R2** public bucket on a media subdomain | Free ≤10GB; native `<video>` playback with poster thumbnails; stays in Cloudflare stack |
| Design | **Developer-flavored dark theme** (light toggle) | Monospace accents, terminal motifs used sparingly; single accent color |

## 3. Site structure

Five pages, everything ≤2 clicks from home:

- **Home** — terminal-style intro (`$ whoami`), short bio, latest 3–5 writing
  entries, links to sections and socials.
- **Writing** (`/writing`) — one unified chronological feed of local posts
  **and** external articles. External entries carry an "on {publication} ↗"
  badge and link out; local posts open on-site. Tag filter pills at top.
- **Post page** (`/writing/[slug]`) — article layout: back link, title,
  monospace metadata (date, reading time, tags), prose body with
  syntax-highlighted code blocks, optional embedded video.
- **Talks** (`/talks`) — rows with video thumbnail (poster image + play
  affordance), title, event, date, links to video (YouTube or R2) and slides.
- **Projects** (`/projects`) — compact cards: name, description, tech tags,
  repo/demo links.
- **About** (`/about`) — avatar, longer bio, **"Download resume" button**
  (serves static `/resume.pdf`), social + RSS links. No separate resume page.

## 4. Content model (Astro content collections, typed schemas)

```
src/content/
  posts/            # .mdx files
    my-post.mdx     # frontmatter: title, date, description, tags[],
                    #   draft?, cover?, canonicalUrl?, video?{src, poster}
  external.yaml     # [{title, url, publication, date, tags[]}]
  talks.yaml        # [{title, event, date, video?{type: youtube|r2, url,
                    #   poster}, slidesUrl?, description?}]
  projects.yaml     # [{name, description, tags[], repoUrl?, demoUrl?,
                    #   featured?}]
public/
  resume.pdf
```

The Writing feed merges `posts/` + `external.yaml`, sorted by date.
`canonicalUrl` in post frontmatter supports cross-posting to dev.to/Hashnode
later without SEO penalty.

## 5. Video support

- **Storage:** Cloudflare R2 bucket with public access via media subdomain
  (e.g. `media.<domain>`). Videos are uploaded with
  `wrangler r2 object put` or the Cloudflare dashboard — no app-level upload
  feature; the site stays fully static.
- **Thumbnails:** every video has a poster image — custom, or extracted via a
  helper script (`scripts/poster.sh`, one ffmpeg frame-grab command). Posters
  live in the repo (small images) or R2.
- **Playback:** a `<VideoPlayer>` Astro component wrapping native
  `<video controls poster preload="metadata">`. Used on Talks rows and
  embeddable in MDX posts. Talk entries accept `type: youtube` (iframe embed)
  or `type: r2` (native player) — same card layout either way.

## 6. Design system

- **Dark default** (near-black `#0b0e13` background, off-white text,
  `#161b22` raised surfaces, `#2a2f38` hairlines), light theme via toggle;
  preference persisted in `localStorage`, no flash on load.
- **One accent color** (green-teal `#5DCAA5`, defined as a CSS variable —
  trivially swappable) used for: terminal prompt lines, active states,
  primary CTA, tag highlights.
- **Typography:** readable sans-serif for body prose; monospace reserved for
  meta (nav, dates, tags, prompt lines, badges). Never monospace body text.
- **Terminal motif, sparingly:** `$ whoami`, `$ ls writing/` section headers,
  `~/johnsoh` logo. No fake terminal windows around content.
- **Dense list rows** for writing feed (title + date + one-line description),
  cards only for talks/projects.
- **External badge:** blue-bordered mono pill "on {publication} ↗".
- Syntax highlighting via Astro's built-in Shiki, theme matched to the palette.

## 7. Plumbing (built-in, not optional)

- RSS feed (`/rss.xml`) — local posts (external entries excluded).
- Sitemap, canonical URLs, meta/OG tags per page.
- Per-post OG images (generated at build with astro-og-canvas) so
  shared links look good on social — important for DevRel reach.
- Reading time on posts.
- 404 page (terminal joke permitted: `command not found`).

## 8. Publishing flow

```
write .mdx / edit .yaml → git push → GitHub → Cloudflare Pages build → live (+ RSS updates)
```

For video: `ffmpeg` poster grab → `wrangler r2 object put` → paste URL into
YAML/frontmatter → push.

## 9. Error handling & edge cases

- Missing/invalid frontmatter fails the build via collection schema (zod) —
  bad content never ships silently.
- `draft: true` posts excluded from production builds, visible in dev.
- Video poster missing → component falls back to a styled placeholder with
  play icon (as mocked).
- External YAML entries require `url` — schema-enforced.

## 10. Testing & verification

- `astro check` + `astro build` as CI gate (Cloudflare Pages runs build; a
  failing build never deploys).
- Content schema validation acts as the content test suite.
- Manual verification per milestone via local dev server preview.
- Lighthouse check before first deploy.

## 11. Milestones

1. **Scaffold + homepage** — Astro project, design tokens, layout, nav,
   homepage with sample content. *User previews in browser.*
2. **Writing** — posts collection, unified feed with external entries, post
   page, tags, syntax highlighting.
3. **Talks, Projects, About** — remaining pages, VideoPlayer component,
   resume button.
4. **Plumbing** — RSS, sitemap, OG images, 404, light-mode toggle polish.
5. **Deploy** — GitHub repo, Cloudflare Pages, custom domain, R2 bucket +
   media subdomain, upload helper script.

## 12. Out of scope (v1)

- Comments, newsletter, analytics (can add Cloudflare Web Analytics later —
  one script tag).
- CMS / admin UI.
- Search (feed + tags suffice at launch volume).
- Automated cross-posting (manual with `canonicalUrl` support is enough).

## 13. Open items (non-blocking)

- Final domain name (mockups use `johnsoh.dev` as placeholder) — needed only
  at milestone 5.
- Real bio copy, resume PDF, and initial content inventory (list of external
  articles/talks) — needed as milestones land; sample content used until then.
