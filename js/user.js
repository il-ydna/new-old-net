import { renderPosts } from "./render.js";
import { setupPostLayoutToggle, createEditPageButton } from "./ui.js";
import { updateHeader, loadPosts } from "./posts.js";
import { getCurrentUser, setPageOwner } from "./state.js";
import { applyUserBackground } from "./ui.js";

export function renderPostFormHTML() {
  return `
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
          <div id="tag-dropdown-wrapper">
            <div class="custom-dropdown" id="tagDropdown">
              <div class="selected-option button-style">Select a tag</div>
              <div class="dropdown-options">
                <div class="dropdown-option" data-value="general" data-color="#dcd2ca">
                  <span class="dot" style="background: #97938e"></span> General
                </div>
                <div class="dropdown-option" data-value="project" data-color="#7f8181">
                  <span class="dot" style="background: #6a747c"></span> Project
                </div>
                <div class="dropdown-option" data-value="photo" data-color="#5e6870">
                  <span class="dot" style="background: #5e6870"></span> Photo
                </div>
                <div class="dropdown-option" data-value="book" data-color="#506c7f">
                  <span class="dot" style="background: #3d5161"></span> Reading
                </div>
                <div class="dropdown-option" data-value="guest" data-color="#293e51">
                  <span class="dot" style="background: #293e51"></span> Guest
                </div>
              </div>
              <input type="hidden" name="tag" id="tagInput" required />
            </div>
          </div>

          <button type="submit" id="submitPostBtn">Add Post</button>
        </div>

        <div id="image-preview-container" class="image-preview-container">
          <div id="layout-selector" class="layout-dropdown" style="display: none">
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
  `;
}

export async function renderUserPage(username) {
  const app = document.getElementById("app");

  // Inject full shell + post form
  app.innerHTML = `
    <header>
      <div class="custom-dropdown button-style" id="post-layout-selector">
        <div class="selected-option">Timeline</div>
        <div class="dropdown-options">
          <div class="dropdown-option" data-value="columns">Columns</div>
          <div class="dropdown-option" data-value="stack">Timeline</div>
        </div>
      </div>
      <div id="user-controls"></div>
    </header>
    ${renderPostFormHTML()}
    <div id="posts-wrapper">
      <section id="posts" class="layout-columns"></section>
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
    renderPosts(userPosts);
  } catch (err) {
    app.innerHTML = `<p style="text-align:center; color:red;">Failed to load page for @${username}</p>`;
    console.error(err);
  }
}
