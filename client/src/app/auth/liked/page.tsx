"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import Button from "@/components/Button";
import { postsService } from "@/service/posts/posts";
import { Post } from "@/service/types";
import { useAuth } from "@/contexts/AuthContext";
import { AxiosError } from "axios";

export default function LikedPosts() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      router.push("/signin");
      return;
    }
    
    loadLikedPosts();
  }, [isAuthenticated, isLoadingAuth, router]);

  async function loadLikedPosts() {
    if (!user) {
      return;
    }

    try {
      setIsLoadingPosts(true);
      setError(null);

      const response = await postsService.getLikedPosts({
        userId: user.id,
        limit: 50,
      });

      setPosts(response.posts);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(
          err.response?.data?.message ||
            "Erro ao carregar posts curtidos. Tente novamente mais tarde."
        );
      } else {
        setError(
          "Erro ao carregar posts curtidos. Tente novamente mais tarde."
        );
      }
    } finally {
      setIsLoadingPosts(false);
    }
  }

  async function handleLike(postId: number) {
    if (!user) return;

    try {
      await postsService.toggleLikePost({ postId, userId: user.id });
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
    } catch {
      alert("Erro ao descurtir post. Tente novamente.");
    }
  }

  async function handleDislike(postId: number) {
    if (!user) return;

    try {
      await postsService.toggleDislikePost({ postId, userId: user.id });
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
    } catch {
      alert("Erro ao descurtir post. Tente novamente.");
    }
  }

  if (isLoadingAuth) {
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
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--foreground)",
            }}
          >
            Carregando...
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
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
          Posts Curtidos
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

        {isLoadingPosts ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--foreground)",
            }}
          >
            Carregando posts curtidos...
          </div>
        ) : (
          <>
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isAuthenticated={true}
                  onLike={handleLike}
                  onDislike={handleDislike}
                />
              ))}
            </div>

            {!isLoadingPosts && posts.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "var(--foreground)",
                  opacity: 0.7,
                }}
              >
                <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
                  Você ainda não curtiu nenhum post.
                </p>
                <Button
                  onClick={() => router.push("/")}
                  style={{ padding: "0.75rem 1.5rem" }}
                >
                  Ver posts
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
