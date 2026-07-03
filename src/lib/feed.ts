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
