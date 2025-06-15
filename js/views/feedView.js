import { getIdToken, getUserIdFromToken } from "../auth.js";
import { renderPosts } from "../render.js";
import { getCurrentUser, setCurrentUser } from "../state.js";

const defaultPostCSS = `/* Default post styles */
:root {
  --post-text-color: white;
}
.post {
  padding: 2rem;
  border-radius: 0.75rem;
  background-color: rgba(0, 0, 0, 0.6);
  font-family: "Times New Roman";
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}
.post .title {
  font-size: 1.17em;
  font-weight: bold;
  margin-bottom: 0.25rem;
}
.post .content {
  font-size: 1rem;
  line-height: 1.5;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}`;

function scopeCSS(css, userId) {
  const scopeClass = `.post-owner-${userId}`;
  return css.replace(/(^|\})\s*([^\{@}]+)\s*\{/g, (_, close, selector) => {
    const scoped = selector
      .split(",")
      .map((s) => `${scopeClass} ${s.trim()}`)
      .join(", ");
    return `${close} ${scoped} {`;
  });
}

export async function renderFeedView() {
  document.body.classList.remove("edit-mode");

  document.getElementById("app").innerHTML = `
    <header><div id="user-controls"></div></header>
    <main>
      <div id="feed-toggle" style="text-align:center; margin: 1rem 0;">
        <button data-mode="following" class="feed-toggle-btn selected">Following</button>
        <button data-mode="global" class="feed-toggle-btn">Global</button>
      </div>
      <section id="posts" class="layout-timeline"></section>
    </main>
  `;

  const token = await getIdToken();
  const postsEl = document.getElementById("posts");

  // Load current user
  if (!getCurrentUser()) {
    const userId = await getUserIdFromToken(token);
    if (userId) {
      const res = await fetch(
        `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const userMeta = await res.json();
        setCurrentUser({ id: userId, ...userMeta });
      }
    }
  }

  const { renderUserControls } = await import("../ui.js");
  const controlsEl = renderUserControls();
  document.getElementById("user-controls").replaceWith(controlsEl);

  let following = [];
  try {
    const res = await fetch(
      "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/following",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) ({ following } = await res.json());
  } catch (e) {
    console.warn("Failed to load following list", e);
  }

  let allPosts = [];
  try {
    const res = await fetch(
      "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/"
    );
    if (res.ok) allPosts = await res.json();
  } catch (e) {
    postsEl.innerHTML = `<p style="text-align:center; color:red;">Error loading posts</p>`;
    return;
  }

  const showPosts = async (mode) => {
    const filtered =
      mode === "following"
        ? allPosts.filter((p) => following.includes(p.pageOwnerId))
        : allPosts;

    if (filtered.length === 0) {
      postsEl.innerHTML =
        mode === "following"
          ? `<p style="text-align:center; color:#fff;">You’re not following anyone yet.<br><a href="/@ilydna" class="spa-link" style="text-decoration: underline;">Explore a sample page</a></p>`
          : `<p style="text-align:center; color:#fff;">No posts to show (yet)</p>`;
      return;
    }

    const sorted = filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Fetch user CSS
    const userCSSMap = {};
    const uniqueUserIds = [...new Set(sorted.map((p) => p.pageOwnerId))];

    await Promise.all(
      uniqueUserIds.map(async (id) => {
        try {
          const res = await fetch(
            `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${id}`
          );
          if (res.ok) {
            const meta = await res.json();
            const rawCSS = meta?.post_css?.trim() || "";
            const scoped = scopeCSS(
              rawCSS.length > 0 ? rawCSS : defaultPostCSS,
              id
            );
            userCSSMap[id] = scoped;
          }
        } catch (e) {
          console.warn(`⚠️ Could not load post_css for ${id}`, e);
        }
      })
    );

    // Inject styles
    document
      .querySelectorAll("style[data-user-style]")
      .forEach((el) => el.remove());

    for (const [userId, css] of Object.entries(userCSSMap)) {
      const style = document.createElement("style");
      style.setAttribute("data-user-style", userId);
      style.textContent = css;
      document.head.appendChild(style);
    }

    renderPosts(sorted, userCSSMap);
  };

  showPosts("following");

  document.querySelectorAll(".feed-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".feed-toggle-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      showPosts(btn.dataset.mode);
    });
  });
}
