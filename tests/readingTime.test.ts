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
