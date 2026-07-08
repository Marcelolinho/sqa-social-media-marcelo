"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import Button from "@/components/Button";
import { postsService } from "@/service/posts/posts";
import { Post } from "@/service/types";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth) {
      loadPosts();
    }
  }, [page, isLoadingAuth, isAuthenticated]);

  async function loadPosts() {
    try {
      setIsLoadingPosts(true);
      setError(null);

      const POSTS_PER_PAGE = 10;

      const response = await postsService.getPosts({
        skip: page * POSTS_PER_PAGE,
        limit: POSTS_PER_PAGE,
        userId: user?.id,
      });

      if (page === 0) {
        setPosts(response.posts);
      } else {
        setPosts((prev) => [...prev, ...response.posts]);
      }

      setHasMore(response.posts.length === POSTS_PER_PAGE);
    } catch {
      setError("Erro ao carregar posts. Tente novamente mais tarde.");
    } finally {
      setIsLoadingPosts(false);
    }
  }

  async function handleLike(postId: number) {
    if (!user) {
      alert("Você precisa estar autenticado para curtir posts!");
      return;
    }

    const result = await postsService.toggleLikePost({
      postId,
      userId: user.id,
    });

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: result.liked,
              disliked: result.disliked,
              likes: result.likes,
              dislikes: result.dislikes,
            }
          : post
      )
    );
  }

  async function handleDislike(postId: number) {
    if (!user) {
      alert("Você precisa estar autenticado para descurtir posts!");
      return;
    }

    const result = await postsService.toggleDislikePost({
      postId,
      userId: user.id,
    });

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: result.liked,
              disliked: result.disliked,
              likes: result.likes,
              dislikes: result.dislikes,
            }
          : post
      )
    );
  }

  function handleLoadMore() {
    setPage((prev) => prev + 1);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <Header />

      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "2rem",
            color: "var(--foreground)",
          }}
        >
          Feed de Posts
        </h1>

        {error && (
          <div
            style={{
              background: "var(--error)",
              color: "white",
              padding: "1rem",
              borderRadius: "0.375rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {isLoadingAuth || (isLoadingPosts && page === 0) ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--foreground)",
            }}
          >
            Carregando posts...
          </div>
        ) : (
          <>
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isAuthenticated={isAuthenticated}
                  onLike={handleLike}
                  onDislike={handleDislike}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <Button
                  onClick={handleLoadMore}
                  isLoading={isLoadingPosts}
                  style={{ padding: "0.75rem 2rem" }}
                >
                  Carregar mais
                </Button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: "2rem",
                  color: "var(--foreground)",
                  opacity: 0.7,
                }}
              >
                Você chegou ao fim dos posts!
              </p>
            )}
          </>
        )}

        {!isLoadingAuth && !isLoadingPosts && posts.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--foreground)",
              opacity: 0.7,
            }}
          >
            <p style={{ fontSize: "1.125rem" }}>Nenhum post encontrado.</p>
          </div>
        )}
      </main>
    </div>
  );
}
