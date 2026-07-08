import api from "@/service/api";
import {
  PostsResponse,
  LikedPostsResponse,
  ToggleReactionResponse,
} from "@/service/types";

interface GetPostsParams {
  skip?: number;
  limit?: number;
  userId?: number;
}

interface GetLikedPostsParams {
  userId: number;
  limit?: number;
}

interface LikePostParams {
  postId: number;
  userId: number;
}

async function getPosts(params: GetPostsParams): Promise<PostsResponse> {
  const { limit = 10, skip = 0, userId } = params;
  const response = await api.get<PostsResponse>("/posts", {
    params: { limit, skip, userId },
  });
  return response.data;
}

async function getLikedPosts(
  params: GetLikedPostsParams
): Promise<LikedPostsResponse> {
  const { userId, limit = 10 } = params;
  const response = await api.get<LikedPostsResponse>("/posts/liked", {
    params: { userId, limit },
  });
  return response.data;
}

async function toggleLikePost(
  params: LikePostParams
): Promise<ToggleReactionResponse> {
  const { postId, userId } = params;
  const response = await api.post<ToggleReactionResponse>(
    `/posts/${postId}/like`,
    null,
    { params: { userId } }
  );
  return response.data;
}

async function toggleDislikePost(
  params: LikePostParams
): Promise<ToggleReactionResponse> {
  const { postId, userId } = params;
  const response = await api.post<ToggleReactionResponse>(
    `/posts/${postId}/dislike`,
    null,
    { params: { userId } }
  );
  return response.data;
}

export const postsService = {
  getPosts,
  getLikedPosts,
  toggleLikePost,
  toggleDislikePost,
};
