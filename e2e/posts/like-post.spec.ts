import { test, expect, Page, Locator } from "@playwright/test";
import { makeUser, TestUser } from "../helpers/user.factory";
import { seedUser, API_URL } from "../helpers/api";
import { loginAs } from "../helpers/auth.helper";

async function currentUserId(page: Page): Promise<number> {
  const raw = await page.evaluate(() => localStorage.getItem("user"));
  return JSON.parse(raw ?? "{}").id;
}

function firstPostCard(page: Page): Locator {
  return page.getByRole("listitem").first();
}

function likeButton(card: Locator): Locator {
  return card.getByRole("button", { name: /Curtir|Curtido/ });
}

async function waitForFeed(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Feed de Posts" })
  ).toBeVisible();

  await expect(
    firstPostCard(page),
    "feed should contain at least one post"
  ).toBeVisible();
}

async function clickLikeAndCaptureResponse(page: Page, action: Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/posts\/\d+\/like/.test(r.url()) && r.request().method() === "POST"
    ),
    action,
  ]);
  return response;
}

test.describe("Like a post — authenticated", () => {
  let user: TestUser;

  test.beforeEach(async ({ page, request }) => {
    user = makeUser();
    await seedUser(request, user);
    await loginAs(page, user);
    await waitForFeed(page);
  });

  test("happy path: liking the first post registers the like", async ({
    page,
    request,
  }) => {
    const card = firstPostCard(page);
    const btn = likeButton(card);

    await expect(
      btn,
      "post should start in the unliked state"
    ).toHaveAttribute("aria-pressed", "false");

    const response = await clickLikeAndCaptureResponse(page, btn.click());

    expect(
      response.status(),
      "like endpoint should return 200"
    ).toBe(200);
    const body = await response.json();
    expect(body.liked, "API should report the post as liked").toBe(true);
    const firstPostId: number = body.postId;

    await expect(
      btn,
      "button should switch to the liked (pressed) state after liking"
    ).toHaveAttribute("aria-pressed", "true");

    await expect(
      btn,
      "button accessible name should become Curtido after liking"
    ).toHaveAccessibleName("Curtido");

    const userId = await currentUserId(page);

    const likedResp = await request.get(`${API_URL}/posts/liked`, {
      params: { userId },
    });

    expect(likedResp.ok(), "GET /posts/liked should succeed").toBeTruthy();

    const likedIds = (await likedResp.json()).posts.map(
      (p: { id: number }) => p.id
    );

    expect(
      likedIds,
      "liked post should be persisted server-side"
    ).toContain(firstPostId);
  });

  test("toggle off: liking again removes the like", async ({ page, request }) => {
    const card = firstPostCard(page);
    const btn = likeButton(card);

    const likeResp = await clickLikeAndCaptureResponse(page, btn.click());

    expect(likeResp.status()).toBe(200);
    expect((await likeResp.json()).liked).toBe(true);

    await expect(btn).toHaveAttribute("aria-pressed", "true");

    const unlikeResp = await clickLikeAndCaptureResponse(page, btn.click());

    expect(unlikeResp.status(), "unlike endpoint should return 200").toBe(200);

    expect(
      (await unlikeResp.json()).liked,
      "API should report the post as unliked"
    ).toBe(false);

    await expect(
      btn,
      "button should revert to the unliked state after unliking"
    ).toHaveAttribute("aria-pressed", "false");

    const userId = await currentUserId(page);
    const likedResp = await request.get(`${API_URL}/posts/liked`, {
      params: { userId },
    });

    expect(
      (await likedResp.json()).posts,
      "user should have no liked posts after toggling off"
    ).toHaveLength(0);
  });
});

test.describe("Like a post — unauthenticated", () => {
  test("cannot like: feed is visible but liking is blocked", async ({ page }) => {
    await page.goto("/");
    await waitForFeed(page);

    let likeRequested = false;

    page.on("request", (req) => {
      if (/\/posts\/\d+\/like/.test(req.url())) likeRequested = true;
    });

    let alertMessage = "";

    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    const card = firstPostCard(page);
    const btn = likeButton(card);

    await expect(
      btn,
      "unauthenticated user still sees the like button"
    ).toHaveAttribute("aria-pressed", "false");

    await btn.click();

    expect(
      alertMessage,
      "an authentication prompt should appear"
    ).toContain("autenticado");

    expect(likeRequested, "no like request should be sent when unauthenticated").toBe(
      false
    );

    await expect(
      btn,
      "button must remain in the unliked state"
    ).toHaveAttribute("aria-pressed", "false");
  });
});