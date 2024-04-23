import WPAPI from 'wpapi';
import type {
  WP_REST_API_Posts as wpRestApiPosts,
  WP_REST_API_Tags as wpRestApiTags,
  WP_REST_API_Error as wpRestApiError,
  WP_REST_API_Post as wpRestApiPost,
} from 'wp-types';
import process from 'process';
import { HttpPort, HttpsPort } from '../../lib/constants';
import { IWPArticleDocument, WPArticleModel } from '../../models/wpArticle';

const { WP_SERVER, WP_PORT, WP_PROTOCOL } = process.env;

const blogUrl = WP_PORT === HttpPort || WP_PORT === HttpsPort
  ? `${WP_PROTOCOL}://${WP_SERVER}/wp-json`
  : `${WP_PROTOCOL}://${WP_SERVER}:${WP_PORT}/wp-json`;

export const getPaginatedTags = async (page: number, perPage: number): Promise<wpRestApiTags> => {
  try {
    const wp = new WPAPI({ endpoint: blogUrl });
    const response = await wp.tags().perPage(perPage).page(page);
    return response;
  } catch (err) {
    const wpError = err as wpRestApiError;
    if (!!wpError && !!wpError.message) {
      console.error('Error fetching data from WordPress:', wpError.message);
    } else {
      console.error('Error fetching data from WordPress:', err);
    }
    return [];
  }
};

export const getPaginatedPosts = async (page: number, perPage: number): Promise<wpRestApiPosts> => {
  try {
    const wp = new WPAPI({ endpoint: blogUrl });
    const response = await wp.posts().perPage(perPage).page(page);
    return response;
  } catch (err) {
    const wpError = err as wpRestApiError;
    if (!!wpError && !!wpError.message) {
      console.error('Error fetching data from WordPress:', wpError.message);
    } else {
      console.error('Error fetching data from WordPress:', err);
    }
    return [];
  }
};

export const updateOrCreatePost = async (post: wpRestApiPost): Promise<IWPArticleDocument> => {
  try {
    // check if post exists in database
    // if it does, update it
    // if it doesn't, create it
    const updatedPost = await WPArticleModel.findOneAndUpdate({ id: post.id }, { ...post }, { new: true, upsert: true });
    return updatedPost as IWPArticleDocument;
  } catch (err) {
    console.error('Error updating or creating post:', err);
  }
};
