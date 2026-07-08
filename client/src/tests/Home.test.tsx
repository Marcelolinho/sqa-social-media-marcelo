import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "@/app/page";
import { useAuth } from "@/contexts/AuthContext";
import { postsService } from "@/service/posts/posts";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../service/posts/posts", () => ({
  postsService: {
    getPosts: jest.fn(),
    toggleLikePost: jest.fn(),
    toggleDislikePost: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockGetPosts = postsService.getPosts as jest.Mock;
const mockToggleLikePost = postsService.toggleLikePost as jest.Mock;

const postsDeMock = [
  {
    id: 1,
    title: "Post de Teste",
    body: "Conteúdo do post de teste para integração",
    liked: false,
    disliked: false,
    likes: 0,
    dislikes: 0,
  },
];

describe("apenasUsuariosLogadosPodemCurtirPosts", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("usuário deslogado ao clicar em Curtir deve ver alerta de autenticação", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });
    mockGetPosts.mockResolvedValue({
      posts: postsDeMock,
      total: 1,
      skip: 0,
      limit: 10,
    });
    jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<Home />);

    await screen.findByText("Post de Teste");
    const curtirButton = screen.getByRole("button", { name: /curtir/i });
    fireEvent.click(curtirButton);

    expect(window.alert).toHaveBeenCalledWith(
      "Você precisa estar autenticado para curtir posts!"
    );
  });

  it("usuário logado ao clicar em Curtir deve ver feedback visual de curtido", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "marcelo@email.com" },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });
    mockGetPosts.mockResolvedValue({
      posts: postsDeMock,
      total: 1,
      skip: 0,
      limit: 10,
    });
    mockToggleLikePost.mockResolvedValue({
      postId: 1,
      liked: true,
      disliked: false,
      likes: 1,
      dislikes: 0,
    });

    render(<Home />);

    await screen.findByText("Post de Teste");
    const curtirButton = screen.getByRole("button", { name: /curtir/i });
    fireEvent.click(curtirButton);

    expect(
      await screen.findByRole("button", { name: /curtido/i })
    ).toBeInTheDocument();
  });
});
