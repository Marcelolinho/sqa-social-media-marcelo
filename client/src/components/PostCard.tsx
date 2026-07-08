"use client";

import { useState } from "react";
import { Post } from "@/service/types";

interface PostCardProps {
  post: Post;
  isAuthenticated: boolean;
  onLike: (postId: number) => Promise<void>;
  onDislike: (postId: number) => Promise<void>;
}

export default function PostCard({
  post,
  isAuthenticated,
  onLike,
  onDislike,
}: PostCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLike() {
    if (!isAuthenticated) {
      alert("Você precisa estar autenticado para curtir posts!");
      return;
    }

    setIsLoading(true);
    try {
      await onLike(post.id);
    } catch {
      alert("Erro ao curtir post. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDislike() {
    if (!isAuthenticated) {
      alert("Você precisa estar autenticado para descurtir posts!");
      return;
    }

    setIsLoading(true);
    try {
      await onDislike(post.id);
    } catch {
      alert("Erro ao descurtir post. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      role="listitem"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        padding: "1.5rem",
        marginBottom: "1rem",
        transition: "all 0.2s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "var(--card-hover)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "var(--card-bg)";
      }}
    >
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "0.75rem",
          color: "var(--foreground)",
        }}
      >
        {post.title}
      </h2>

      <p
        style={{
          color: "var(--foreground)",
          opacity: 0.9,
          lineHeight: "1.6",
          marginBottom: "1rem",
        }}
      >
        {post.body}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1rem",
        }}
      >
        <button
          onClick={handleLike}
          disabled={isLoading}
          aria-pressed={post.liked}
          aria-label={post.liked ? "Curtido" : "Curtir"}
          style={{
            background: post.liked ? "var(--secondary)" : "transparent",
            color: post.liked ? "white" : "var(--foreground)",
            border: `2px solid ${
              post.liked ? "var(--secondary)" : "var(--border)"
            }`,
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
            opacity: isLoading ? 0.7 : 1,
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span>👍</span>
          <span>{post.likes}</span>
        </button>
        <button
          onClick={handleDislike}
          disabled={isLoading}
          aria-pressed={post.disliked}
          aria-label={post.disliked ? "Não gostei marcado" : "Não gostei"}
          style={{
            background: post.disliked ? "var(--secondary)" : "transparent",
            color: post.disliked ? "white" : "var(--foreground)",
            border: `2px solid ${
              post.disliked ? "var(--secondary)" : "var(--border)"
            }`,
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
            opacity: isLoading ? 0.7 : 1,
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span>👎</span>
          <span>{post.dislikes}</span>
        </button>
      </div>
    </div>
  );
}