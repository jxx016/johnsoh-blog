import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

// url accepts an absolute URL (R2 bucket, YouTube) or a site-relative path
// (e.g. /media/talks/x.mp4) so self-hosted video works in dev before R2 exists.
const assetUrl = z
  .string()
  .refine((s) => /^https?:\/\//.test(s) || s.startsWith('/'), {
    message: 'must be an absolute URL or a site-relative path starting with /'
  });

const video = z.object({
  type: z.enum(['youtube', 'r2']).default('r2'),
  url: assetUrl,
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
