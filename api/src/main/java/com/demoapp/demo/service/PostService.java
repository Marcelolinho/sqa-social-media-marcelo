package com.demoapp.demo.service;

import com.demoapp.demo.model.enums.EnumLikeDislike;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.demoapp.demo.model.UserPostReaction;
import com.demoapp.demo.repository.UserPostReactionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

@Service
public class PostService {

  private final UserPostReactionRepository reactionRepository;
  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  public PostService(UserPostReactionRepository reactionRepository) {
    this.reactionRepository = reactionRepository;
    this.restTemplate = new RestTemplate();
    this.objectMapper = new ObjectMapper();
  }

  public Map<String, Object> getPosts(Integer limit, Integer skip, Long userId) {
    try {
      StringBuilder url = new StringBuilder("https://dummyjson.com/posts");
      List<String> params = new ArrayList<>();
      
      if (limit != null) {
        params.add("limit=" + limit);
      }
      if (skip != null) {
        params.add("skip=" + skip);
      }

      if (!params.isEmpty()) {
        url.append("?").append(String.join("&", params));
      }

      String response = restTemplate.getForObject(url.toString(), String.class);
      JsonNode rootNode = objectMapper.readTree(response);

      Map<Long, EnumLikeDislike> reactionsByPost = new HashMap<>();
      if (userId != null) {
        for (UserPostReaction r : reactionRepository.findByUserId(userId)) {
          reactionsByPost.put(r.getPostId(), r.getType());
        }
      }

      List<Map<String, Object>> posts = new ArrayList<>();
      JsonNode postsArray = rootNode.get("posts");

      for (JsonNode postNode : postsArray) {
        Map<String, Object> post = new HashMap<>();
        Long postId = postNode.get("id").asLong();
        EnumLikeDislike reaction = reactionsByPost.get(postId);

        post.put("id", postId);
        post.put("title", postNode.get("title").asText());
        post.put("body", postNode.get("body").asText());
        post.put("liked", reaction == EnumLikeDislike.LIKE);
        post.put("disliked", reaction == EnumLikeDislike.DISLIKE);

        JsonNode reactions = postNode.get("reactions");

        if (reactions != null) {
          post.put("likes", reactions.get("likes").asInt());
          post.put("dislikes", reactions.get("dislikes").asInt());
        }

        posts.add(post);
      }

      Map<String, Object> result = new HashMap<>();
      result.put("posts", posts);
      result.put("total", rootNode.get("total").asInt());
      result.put("skip", rootNode.get("skip").asInt());
      result.put("limit", rootNode.get("limit").asInt());

      return result;

    } catch (Exception e) {
      throw new RuntimeException("Erro ao buscar posts: " + e.getMessage(), e);
    }
  }

  public Map<String, Object> getLikedPosts(Long userId, Integer limit, Integer skip) {
    try {
      if (limit == null) limit = 5;
      if (skip == null) skip = 0;

      List<UserPostReaction> allLikes = reactionRepository.findByUserId(userId);

      List<Long> likedPostIds = allLikes.stream()
        .filter(r -> r.getType() == EnumLikeDislike.LIKE)
        .map(UserPostReaction::getPostId)
        .toList();

      int total = likedPostIds.size();
      
      int fromIndex = Math.min(skip, total);
      int toIndex = Math.min(skip + limit, total);
      
      List<Long> paginatedIds = likedPostIds.subList(fromIndex, toIndex);

      List<Map<String, Object>> posts = new ArrayList<>();
      
      for (Long postId : paginatedIds) {
        String url = "https://dummyjson.com/posts/" + postId;
        String response = restTemplate.getForObject(url, String.class);
        JsonNode postNode = objectMapper.readTree(response);

        Map<String, Object> post = new HashMap<>();
        post.put("id", postNode.get("id").asLong());
        post.put("title", postNode.get("title").asText());
        post.put("body", postNode.get("body").asText());
        post.put("liked", true);
        post.put("disliked", false);

        JsonNode reactions = postNode.get("reactions");
        if (reactions != null) {
          post.put("likes", reactions.get("likes").asInt());
          post.put("dislikes", reactions.get("dislikes").asInt());
        }

        posts.add(post);
      }

      Map<String, Object> result = new HashMap<>();
      result.put("posts", posts);
      result.put("total", total);
      result.put("skip", skip);
      result.put("limit", limit);

      return result;

    } catch (Exception e) {
      throw new RuntimeException("Erro ao buscar posts curtidos: " + e.getMessage(), e);
    }
  }

  public Map<String, Object> toggleLike(Long postId, Long userId) {
    return applyReaction(postId, userId, EnumLikeDislike.LIKE);
  }

  public Map<String, Object> toggleDislike(Long postId, Long userId) {
    return applyReaction(postId, userId, EnumLikeDislike.DISLIKE);
  }

  private Map<String, Object> applyReaction(Long postId, Long userId, EnumLikeDislike type) {
    Optional<UserPostReaction> existing = reactionRepository.findByUserIdAndPostId(userId, postId);

    Map<String, Object> postObject = getPostById(postId);
    int likes = (int) postObject.get("likes");
    int dislikes = (int) postObject.get("dislikes");

    boolean liked = false;
    boolean disliked = false;

    if (existing.isPresent() && existing.get().getType() == type) {
      reactionRepository.delete(existing.get());

      if (type == EnumLikeDislike.LIKE) likes--; else dislikes--;
    } else if (existing.isPresent()) {
      existing.get().setType(type);
      reactionRepository.save(existing.get());

      if (type == EnumLikeDislike.LIKE) {
        likes++;
        dislikes--;
        liked = true;
      } else {
        dislikes++;
        likes--;
        disliked = true;
      }
    } else {
      UserPostReaction reaction = new UserPostReaction();
      reaction.setUserId(userId);
      reaction.setPostId(postId);
      reaction.setType(type);
      reactionRepository.save(reaction);
      if (type == EnumLikeDislike.LIKE) {
        likes++;
        liked = true;
      } else {
        dislikes++;
        disliked = true;
      }
    }

    postObject.put("likes", likes);
    postObject.put("dislikes", dislikes);
    updateDummyJsonPost(postId, postObject);

    Map<String, Object> result = new HashMap<>();
    result.put("postId", postId);
    result.put("liked", liked);
    result.put("disliked", disliked);
    result.put("likes", likes);
    result.put("dislikes", dislikes);

    return result;
  }

  public void updateDummyJsonPost(Long postId, Map<String, Object> postObject) {
    try {
      String baseUrl = "https://dummyjson.com/posts/" + postId;
      restTemplate.exchange(
              baseUrl,
              HttpMethod.PUT,
              new HttpEntity<>(postObject),
              String.class
      );
    } catch (Exception ignored) {
    }
  }

  public Map<String, Object> getPostById(Long postId) {
    if (postId == null) {
      return null;
    }

    Map<String, Object> result = new HashMap<>();

    try {
      String baseUrl = "https://dummyjson.com/posts/" + postId;

      JsonNode response = restTemplate.getForObject(baseUrl, JsonNode.class);

      if (response != null) {
        result.put("id", postId);
        result.put("title", response.get("title").asText());
        result.put("body", response.get("body").asText());

        JsonNode reactions = response.get("reactions");

        if (reactions != null) {
          result.put("likes", reactions.get("likes").asInt());
          result.put("dislikes", reactions.get("dislikes").asInt());
        }
      }
    } catch(Exception e) {
      throw new RuntimeException("Erro ao buscar post com id " + postId);
    }

    return result;
  }

}
