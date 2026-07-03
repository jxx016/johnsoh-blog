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
