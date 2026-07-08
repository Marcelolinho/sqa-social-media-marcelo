package com.demoapp.demo.usecases;

import com.demoapp.demo.model.UserPostReaction;
import com.demoapp.demo.model.enums.EnumLikeDislike;
import com.demoapp.demo.repository.UserPostReactionRepository;
import com.demoapp.demo.service.PostService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PostService — testes unitários")
public class PostsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Mock
    UserPostReactionRepository reactionRepository;

    @Mock
    RestTemplate restTemplate;

    PostService postService;

    @BeforeEach
    void setup() throws Exception {
        postService = new PostService(reactionRepository);

        Field rtField = PostService.class.getDeclaredField("restTemplate");
        rtField.setAccessible(true);
        rtField.set(postService, restTemplate);
    }

    private void mockGetPostById(Long postId, int likes, int dislikes) {
        String json = """
                {
                  "id": %d,
                  "title": "Post %d",
                  "body": "Body %d",
                  "reactions": { "likes": %d, "dislikes": %d }
                }
                """.formatted(postId, postId, postId, likes, dislikes);

        when(restTemplate.getForObject("https://dummyjson.com/posts/" + postId, JsonNode.class))
                .thenReturn(parse(json));
    }

    private static JsonNode parse(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static UserPostReaction reaction(Long userId, Long postId, EnumLikeDislike type) {
        UserPostReaction r = new UserPostReaction();
        r.setUserId(userId);
        r.setPostId(postId);
        r.setType(type);
        return r;
    }

    @Nested
    @DisplayName("Listagem de posts")
    class ListagemDePosts {

        @Test
        @DisplayName("Listagem deve respeitar limit/skip e marcar liked/disliked do usuário")
        void listagemDePostsDeveSerPaginada() {
            int limit = 2;
            int skip = 0;
            Long userId = 1L;

            String jsonDaApi = """
                    {
                      "posts": [
                        {"id": 1, "title": "Post Um", "body": "Corpo um", "reactions": {"likes": 10, "dislikes": 2}},
                        {"id": 2, "title": "Post Dois", "body": "Corpo dois", "reactions": {"likes": 5, "dislikes": 1}}
                      ],
                      "total": 150,
                      "skip": 0,
                      "limit": 2
                    }
                    """;

            when(restTemplate.getForObject(anyString(), eq(String.class))).thenReturn(jsonDaApi);
            when(reactionRepository.findByUserId(userId))
                    .thenReturn(List.of(reaction(userId, 1L, EnumLikeDislike.LIKE)));

            Map<String, Object> resultado = postService.getPosts(limit, skip, userId);

            assertThat(resultado).containsKeys("posts", "total", "skip", "limit");
            assertThat(resultado.get("total")).isEqualTo(150);
            assertThat(resultado.get("skip")).isEqualTo(0);
            assertThat(resultado.get("limit")).isEqualTo(2);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> posts = (List<Map<String, Object>>) resultado.get("posts");
            assertThat(posts).hasSize(2);

            Map<String, Object> post1 = posts.stream()
                    .filter(p -> p.get("id").equals(1L)).findFirst().orElseThrow();
            assertThat(post1.get("liked")).isEqualTo(true);
            assertThat(post1.get("disliked")).isEqualTo(false);
            assertThat(post1.get("likes")).isEqualTo(10);

            Map<String, Object> post2 = posts.stream()
                    .filter(p -> p.get("id").equals(2L)).findFirst().orElseThrow();
            assertThat(post2.get("liked")).isEqualTo(false);
            assertThat(post2.get("disliked")).isEqualTo(false);

            verify(restTemplate, times(1))
                    .getForObject(
                            argThat((String url) -> url.contains("limit=2") && url.contains("skip=0")),
                            eq(String.class));
        }
    }

    @Nested
    @DisplayName("Curtidas")
    class Curtidas {

        @Test
        @DisplayName("Curtir post novo deve persistir reação LIKE, retornar liked=true e incrementar likes")
        void curtirPostNovo() {
            Long postId = 42L;
            Long userId = 999L;

            when(reactionRepository.findByUserIdAndPostId(userId, postId))
                    .thenReturn(Optional.empty());
            mockGetPostById(postId, 10, 3);

            Map<String, Object> resultado = postService.toggleLike(postId, userId);

            assertThat(resultado.get("postId")).isEqualTo(postId);
            assertThat(resultado.get("liked")).isEqualTo(true);
            assertThat(resultado.get("disliked")).isEqualTo(false);
            assertThat(resultado.get("likes")).isEqualTo(11);
            assertThat(resultado.get("dislikes")).isEqualTo(3);

            ArgumentCaptor<UserPostReaction> captor = ArgumentCaptor.forClass(UserPostReaction.class);
            verify(reactionRepository, times(1)).save(captor.capture());
            assertThat(captor.getValue().getUserId()).isEqualTo(userId);
            assertThat(captor.getValue().getPostId()).isEqualTo(postId);
            assertThat(captor.getValue().getType()).isEqualTo(EnumLikeDislike.LIKE);
            verify(reactionRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Curtir post já curtido remove a reação (toggle) — liked=false e decrementa likes")
        void descurtirPostJaCurtido() {
            Long postId = 42L;
            Long userId = 1L;

            UserPostReaction existente = reaction(userId, postId, EnumLikeDislike.LIKE);
            existente.setId(10L);

            when(reactionRepository.findByUserIdAndPostId(userId, postId))
                    .thenReturn(Optional.of(existente));
            mockGetPostById(postId, 10, 3);

            Map<String, Object> resultado = postService.toggleLike(postId, userId);

            assertThat(resultado.get("liked")).isEqualTo(false);
            assertThat(resultado.get("disliked")).isEqualTo(false);
            assertThat(resultado.get("likes")).isEqualTo(9);
            assertThat(resultado.get("dislikes")).isEqualTo(3);

            verify(reactionRepository, times(1)).delete(existente);
            verify(reactionRepository, never()).save(any());
        }

        @Test
        @DisplayName("Trocar dislike por like deve atualizar o tipo, incrementar likes e decrementar dislikes")
        void trocarDislikePorLike() {
            Long postId = 42L;
            Long userId = 1L;

            UserPostReaction existente = reaction(userId, postId, EnumLikeDislike.DISLIKE);
            existente.setId(7L);

            when(reactionRepository.findByUserIdAndPostId(userId, postId))
                    .thenReturn(Optional.of(existente));
            mockGetPostById(postId, 10, 3);

            Map<String, Object> resultado = postService.toggleLike(postId, userId);

            assertThat(resultado.get("liked")).isEqualTo(true);
            assertThat(resultado.get("disliked")).isEqualTo(false);
            assertThat(resultado.get("likes")).isEqualTo(11);
            assertThat(resultado.get("dislikes")).isEqualTo(2);

            ArgumentCaptor<UserPostReaction> captor = ArgumentCaptor.forClass(UserPostReaction.class);
            verify(reactionRepository, times(1)).save(captor.capture());
            assertThat(captor.getValue().getType()).isEqualTo(EnumLikeDislike.LIKE);
            verify(reactionRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Curtir post deve enviar PUT para dummyjson com as contagens atualizadas")
        void curtirDeveAtualizarDummyJson() {
            Long postId = 42L;
            Long userId = 5L;

            when(reactionRepository.findByUserIdAndPostId(userId, postId))
                    .thenReturn(Optional.empty());
            mockGetPostById(postId, 10, 3);

            postService.toggleLike(postId, userId);

            verify(restTemplate, times(1)).exchange(
                    eq("https://dummyjson.com/posts/" + postId),
                    eq(HttpMethod.PUT),
                    any(HttpEntity.class),
                    eq(String.class));
        }
    }

    @Nested
    @DisplayName("Descurtidas")
    class Descurtidas {

        @Test
        @DisplayName("Dar dislike em post novo deve persistir reação DISLIKE e incrementar dislikes")
        void dislikePostNovo() {
            Long postId = 42L;
            Long userId = 8L;

            when(reactionRepository.findByUserIdAndPostId(userId, postId))
                    .thenReturn(Optional.empty());
            mockGetPostById(postId, 10, 3);

            Map<String, Object> resultado = postService.toggleDislike(postId, userId);

            assertThat(resultado.get("disliked")).isEqualTo(true);
            assertThat(resultado.get("liked")).isEqualTo(false);
            assertThat(resultado.get("likes")).isEqualTo(10);
            assertThat(resultado.get("dislikes")).isEqualTo(4);

            ArgumentCaptor<UserPostReaction> captor = ArgumentCaptor.forClass(UserPostReaction.class);
            verify(reactionRepository, times(1)).save(captor.capture());
            assertThat(captor.getValue().getType()).isEqualTo(EnumLikeDislike.DISLIKE);
        }

        @Test
        @DisplayName("Dar dislike em post já 'disliked' remove a reação (toggle) e decrementa dislikes")
        void removerDislikeExistente() {
            Long postId = 42L;
            Long userId = 8L;

            UserPostReaction existente = reaction(userId, postId, EnumLikeDislike.DISLIKE);
            existente.setId(3L);

            when(reactionRepository.findByUserIdAndPostId(userId, postId))
                    .thenReturn(Optional.of(existente));
            mockGetPostById(postId, 10, 3);

            Map<String, Object> resultado = postService.toggleDislike(postId, userId);

            assertThat(resultado.get("disliked")).isEqualTo(false);
            assertThat(resultado.get("dislikes")).isEqualTo(2);
            verify(reactionRepository, times(1)).delete(existente);
            verify(reactionRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Posts curtidos por usuário")
    class PostsCurtidos {

        @Test
        @DisplayName("Usuário deve ver apenas seus posts com reação LIKE, sem vazamento de curtidas alheias")
        void usuarioDeveVerApenasSeusPostsCurtidos() {
            Long userId = 1L;

            when(reactionRepository.findByUserId(userId))
                    .thenReturn(List.of(
                            reaction(userId, 10L, EnumLikeDislike.LIKE),
                            reaction(userId, 20L, EnumLikeDislike.LIKE),
                            reaction(userId, 30L, EnumLikeDislike.DISLIKE)));

            when(restTemplate.getForObject(eq("https://dummyjson.com/posts/10"), eq(String.class)))
                    .thenReturn("{\"id\": 10, \"title\": \"Curtido 1\", \"body\": \"Body 1\"}");
            when(restTemplate.getForObject(eq("https://dummyjson.com/posts/20"), eq(String.class)))
                    .thenReturn("{\"id\": 20, \"title\": \"Curtido 2\", \"body\": \"Body 2\"}");

            Map<String, Object> resultado = postService.getLikedPosts(userId, 10, 0);

            assertThat(resultado.get("total")).isEqualTo(2);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> posts = (List<Map<String, Object>>) resultado.get("posts");
            assertThat(posts).hasSize(2);

            List<Long> ids = posts.stream().map(p -> (Long) p.get("id")).toList();
            assertThat(ids).containsExactlyInAnyOrder(10L, 20L);
            assertThat(posts).allMatch(p -> Boolean.TRUE.equals(p.get("liked")));

            verify(restTemplate, never()).getForObject(eq("https://dummyjson.com/posts/30"), eq(String.class));
            verify(reactionRepository, times(1)).findByUserId(userId);
            verify(reactionRepository, never()).findByUserId(argThat(id -> !id.equals(userId)));
        }

        @Test
        @DisplayName("getLikedPosts deve paginar via limit/skip sobre os posts curtidos")
        void getLikedPostsDevePaginar() {
            Long userId = 1L;

            when(reactionRepository.findByUserId(userId))
                    .thenReturn(List.of(
                            reaction(userId, 10L, EnumLikeDislike.LIKE),
                            reaction(userId, 20L, EnumLikeDislike.LIKE),
                            reaction(userId, 30L, EnumLikeDislike.LIKE)));

            when(restTemplate.getForObject(eq("https://dummyjson.com/posts/20"), eq(String.class)))
                    .thenReturn("{\"id\": 20, \"title\": \"C2\", \"body\": \"B2\"}");

            Map<String, Object> resultado = postService.getLikedPosts(userId, 1, 1);

            assertThat(resultado.get("total")).isEqualTo(3);
            assertThat(resultado.get("limit")).isEqualTo(1);
            assertThat(resultado.get("skip")).isEqualTo(1);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> posts = (List<Map<String, Object>>) resultado.get("posts");
            assertThat(posts).hasSize(1);
            assertThat(posts.get(0).get("id")).isEqualTo(20L);
        }
    }
}