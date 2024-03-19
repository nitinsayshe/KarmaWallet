import { getPaginatedPosts, updateOrCreatePost } from '../integrations/wordpress';
import { JobNames } from '../lib/constants/jobScheduler';

export const handleWordpressArticleSync = async () => {
  // iterate through all wordpress articles and save/update them in the database
  let currentPage = 1;
  let morePosts = true;

  while (morePosts) {
    const posts = await getPaginatedPosts(currentPage, 20);
    if (posts.length === 0) {
      morePosts = false;
      continue;
    }

    console.log(`Fetched page ${currentPage} of posts`);
    currentPage++;
    const updatedOrCreated = (await Promise.all(posts.map(async (post) => updateOrCreatePost(post)))).filter((post) => !!post);
    console.log(`Updated or created ${updatedOrCreated.length} posts`);
  }
};

export const exec = async () => {
  await handleWordpressArticleSync();
};

export const onComplete = async () => {
  console.log(`${JobNames.WordpressArticleSync} finished`);
};
