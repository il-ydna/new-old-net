import { renderPosts } from "./render.js";
import {
  setupPostLayoutToggle,
  createEditPageButton,
  setupTagDropdown,
  renderTagDropdown,
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


              <button type="submit" id="submitPostBtn">Post</button>
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

            <button type="button" id="cancelEditBtn" style="display: none">Cancel Edit</button>
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
    if (userMeta.custom_css) {
      const existing = document.getElementById("user-custom-style");
      if (existing) existing.remove();

      const style = document.createElement("style");
      style.id = "user-custom-style";
      style.textContent = userMeta.custom_css;
      document.head.appendChild(style);
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
        console.warn("🚫 Tag input or default display element missing.");
      }
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

    const postsRes = await fetch(
      "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/"
    );
    const allPosts = await postsRes.json();
    const userPosts = allPosts.filter((p) => p.pageOwnerId === userMeta.id);

    renderPosts(userPosts); // Default render all

    // ✅ Setup tag filters
    const tagButtonContainer = document.getElementById("tag-filter-buttons");

    if (Array.isArray(userMeta.tags) && userMeta.tags.length > 0) {
      const clearBtn = document.createElement("button");
      clearBtn.textContent = "All";
      clearBtn.className = "button-style";
      clearBtn.addEventListener("click", () => {
        renderPosts(userPosts.slice().reverse());

        // Reset previously selected tag button styling
        if (selectedTagBtn) {
          selectedTagBtn.style.backgroundColor = "transparent";
          selectedTagBtn.style.color = "white";
          const oldDot = selectedTagBtn.querySelector(".dot");
          if (oldDot) oldDot.style.display = "inline-block";
          selectedTagBtn = null; // Clear selection
        }
      });
      tagButtonContainer.appendChild(clearBtn);

      let selectedTagBtn = null;

      userMeta.tags.forEach((tag) => {
        const btn = document.createElement("button");
        btn.className = "button-style";
        btn.dataset.tag = tag.value;

        const label = document.createElement("span");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "0.5rem";

        const leftDot = document.createElement("span");
        leftDot.className = "dot";
        leftDot.style.background = tag.color;
        leftDot.style.width = "0.75rem";
        leftDot.style.height = "0.75rem";
        leftDot.style.borderRadius = "50%";
        leftDot.style.display = "inline-block";

        const rightDot = leftDot.cloneNode(); // exact duplicate
        const text = document.createTextNode(tag.name);

        label.appendChild(leftDot);
        label.appendChild(text);
        label.appendChild(rightDot);
        btn.appendChild(label);

        btn.addEventListener("click", () => {
          const filtered = userPosts.filter((p) => p.tag === tag.value);
          renderPosts(filtered);

          // Reset previously selected
          if (selectedTagBtn) {
            selectedTagBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            selectedTagBtn.style.color = "white";
            const oldDot = selectedTagBtn.querySelector(".dot");
            if (oldDot) oldDot.style.display = "inline-block";
          }

          // Highlight current button
          btn.style.backgroundColor = tag.color;
          btn.style.color = tag.textColor || "white";
          selectedTagBtn = btn;
        });

        tagButtonContainer.appendChild(btn);
      });
    }
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
