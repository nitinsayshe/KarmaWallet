import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { getPaginatedPosts, getPaginatedTags } from '..';

describe('tests wp integration logic', () => {
  beforeEach(() => { });

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
  });

  beforeAll(async () => { });

  it('getPaginatedPosts returns blog posts', async () => {
    const posts = await getPaginatedPosts(1, 20);
    expect(posts.length).toBeGreaterThan(0);
  }, 10000);

  it('getPaginatedTags returns blog tags', async () => {
    const tags = await getPaginatedTags(1, 20);
    expect(tags.length).toBeGreaterThan(0);
  }, 10000);
});
