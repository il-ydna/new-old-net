import { loadPosts } from "./posts.js";
import {
  setupPostLayoutToggle,
  createEditPageButton,
  setupTagDropdown,
  renderTagDropdown,
  renderShareDropdown,
} from "./ui.js";
import { updateHeader } from "./posts.js";
import { getCurrentUser, setPageOwner, getPageOwner } from "./state.js";
import { applyUserBackground } from "./ui.js";
export function renderPostFormHTML() {
  return `
      <section>
        <div id="owner-controls" style="display: none">
          <form id="postForm">
            <input type="text" name="title" placeholder="Post Title" />
            <textarea name="content" placeholder="Write something..." rows="5"></textarea>

            <div class="button-row">
              <div id="image-drop-zone" class="img-uploader" tabindex="0">
                <label for="imageInput">Choose/Drop Image</label>
                <input
                  type="file"
                  id="imageInput"
                  name="image"
                  accept="image/*"
                  multiple
                  hidden
                />
              </div>
              <div id="tag-dropdown-wrapper"></div>

              <div id="share-dropdown-wrapper"></div>
            </div>
            <div style="display: flex; margin-top: 1rem;">
              <button type="button" id="cancelEditBtn" style="display: none">Cancel Edit</button>
              <button type="submit" id="submitPostBtn" style="margin-left: auto;">Post</button>
            </div>
            <div id="form-error" class="form-error" style="color: red; margin-top: 1rem; display: none; text-align: center"></div>

            <div id="image-preview-container" class="image-preview-container">
              <div id="layout-selector" class="layout-dropdown" style="display: none;">
                <div class="selected-option">Grid</div>
                <div class="dropdown-options">
                  <div class="dropdown-option" data-value="grid">Grid</div>
                  <div class="dropdown-option" data-value="carousel">Carousel</div>
                  <div class="dropdown-option" data-value="stack">Stack</div>
                </div>
                <input type="hidden" name="layout" id="layoutInput" value="grid" />
              </div>
            </div>

            
          </form>
        </div>
      </section>
    `;
}

export async function renderUserPage(username) {
  document.body.classList.remove("edit-mode");
  const app = document.getElementById("app");

  // Inject full shell + post form
  app.innerHTML = `
    <header>
      <div id="user-controls"></div>
    </header>
    ${renderPostFormHTML()}
    <div id="posts-wrapper">
      <div id="tag-filter-buttons" style="
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem;
        margin: 1rem 0;
      "></div>
      <section id="posts" class="layout-timeline"></section>
    </div>
  `;

  try {
    // ✅ Wait for next paint frame to ensure DOM is hydrated
    await new Promise((r) => requestAnimationFrame(r));

    await updateHeader();
    setupPostLayoutToggle();

    const res = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?username=${username}`
    );
    const userMeta = await res.json();
    if (!userMeta?.id) throw new Error("User not found");

    setPageOwner({ id: userMeta.id, ...userMeta });

    const layout =
      userMeta.default_layout === "columns"
        ? "layout-columns"
        : "layout-timeline";
    const postsSection = document.getElementById("posts");
    postsSection.className = layout;

    if (userMeta.background_url) {
      applyUserBackground(userMeta.background_url);
    }

    // Apply custom CSS
    if (userMeta.post_css) {
      const existing = document.getElementById("user-custom-style");
      if (existing) existing.remove();

      const style = document.createElement("style");
      style.id = "user-custom-style";
      style.textContent = userMeta.post_css;
      document.head.appendChild(style);
    }

    // Apply layout_css (e.g. columns, theme vars, etc.)
    if (userMeta.layout_css) {
      let themeEl = document.getElementById("theme-style");
      if (!themeEl) {
        themeEl = document.createElement("style");
        themeEl.id = "theme-style";
        document.head.appendChild(themeEl);
      }
      themeEl.textContent = userMeta.layout_css;
    }

    // Apply background
    if (userMeta.background_url) {
      const root = document.documentElement;
      root.style.backgroundImage = `url('${userMeta.background_url}')`;
      root.style.backgroundSize = "cover";
      root.style.backgroundAttachment = "fixed";
      root.style.backgroundRepeat = "no-repeat";
      root.style.backgroundPosition = "center";
    }
    const tagWrapper = document.getElementById("tag-dropdown-wrapper");

    if (tagWrapper && Array.isArray(userMeta.tags)) {
      const dropdown = renderTagDropdown(userMeta.tags);
      tagWrapper.appendChild(dropdown);
      setupTagDropdown();

      const defaultTag = userMeta.default_tag;
      const tagInput = dropdown.querySelector('input[name="tag"]');
      const selectedDisplay = dropdown.querySelector(".selected-option");

      if (tagInput && selectedDisplay && defaultTag) {
        const option = dropdown.querySelector(
          `.dropdown-option[data-value="${defaultTag}"]`
        );

        if (option) {
          tagInput.value = defaultTag;
          selectedDisplay.innerHTML = option.innerHTML;
          selectedDisplay.className =
            "selected-option button-style tag-pill-large";
          selectedDisplay.style.backgroundColor =
            option.getAttribute("data-color");
          selectedDisplay.style.color =
            option.getAttribute("data-text") || "#ffffff";
          console.log("✅ Default tag set:", defaultTag);
        }
      } else {
        console.log("🚫 Tag input or default display element missing.");
      }
    }

    const shareWrapper = document.getElementById("share-dropdown-wrapper");
    if (shareWrapper) {
      const dropdown = renderShareDropdown();
      shareWrapper.append(dropdown);
    }

    if (getCurrentUser()?.id === userMeta.id) {
      document.getElementById("owner-controls").style.display = "block";

      const header = document.querySelector("header");
      const editBtn = createEditPageButton(userMeta.username);
      header.appendChild(editBtn);

      await new Promise((r) => requestAnimationFrame(r));
      const { default: initMain } = await import("./main.js");
      initMain();
    }

    // Add Follow / Following button if logged in and viewing someone else's page
    const currentUser = getCurrentUser();
    if (currentUser?.id && currentUser.id !== userMeta.id) {
      const header = document.querySelector("header");

      const followBtn = document.createElement("button");
      followBtn.id = "followToggleBtn";
      followBtn.textContent = "Follow";
      followBtn.className = "button-style";

      // Fetch follow state
      const token = await getIdToken();
      const res = await fetch(
        "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/following",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const { following } = await res.json();
        if (following.includes(userMeta.id)) {
          followBtn.textContent = "Following";
        }
      }

      followBtn.addEventListener("click", async () => {
        const token = await getIdToken();
        const result = await fetch(
          "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/follow",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ followed_id: userMeta.id }),
          }
        );

        if (result.ok) {
          const { status } = await result.json();
          followBtn.textContent =
            status === "followed" ? "Following" : "Follow";
        }
      });

      header.appendChild(followBtn);
    }

    await loadPosts();
  } catch (err) {
    app.innerHTML = `<p style="text-align:center; color:red;">Failed to load page for @${username}</p>`;
    console.error(err);
  }
}

import { getIdToken } from "./auth.js";

export async function getUserMetaByUsername(username) {
  const res = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?username=${username}`
  );
  if (!res.ok) return null;
  return await res.json();
}
