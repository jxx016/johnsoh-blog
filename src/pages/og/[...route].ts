import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

const posts = await getCollection('posts', ({ data }) => !data.draft);

const pages = Object.fromEntries([
  ['site', { title: 'John Soh', description: 'devrel engineer · writing, talks, projects' }],
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
