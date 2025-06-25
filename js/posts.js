import {
  getIdToken,
  getUserIdFromToken,
  getUsernameFromToken,
} from "./auth.js";
import { showValidationMessage, removeValidationMessage } from "./ui.js";
import { uploadImageToS3 } from "./upload.js";
import { renderPosts } from "./render.js";
import {
  getEditingPostId,
  setEditingPostId,
  setCurrentUser,
  getCurrentUser,
  getPageOwner,
} from "./state.js";
import { applyCombinedCSS } from "./ui.js"; // or wherever it's defined

import { renderUserControls } from "./ui.js";

export async function updateHeader() {
  const idToken = await getIdToken();
  const userControls = document.getElementById("user-controls");
  const dropdownWrapper = document.getElementById("tag-dropdown-wrapper");

  if (!idToken) {
    if (userControls) {
      userControls.innerHTML = `<button id="signupBtn">Log In/Sign Up</button>`;
      document.getElementById("signupBtn").addEventListener("click", (e) => {
        e.preventDefault();
        const returnTo = encodeURIComponent(window.location.pathname);
        history.pushState({}, "", `/auth/signup?returnTo=${returnTo}`);
        window.dispatchEvent(new Event("popstate"));
      });
    }
    if (dropdownWrapper) dropdownWrapper.style.display = "none";
    return;
  }

  const username = await getUsernameFromToken();
  const userId = await getUserIdFromToken();
  setCurrentUser({ id: userId, username });

  if (userControls) {
    const controlsEl = renderUserControls();
    userControls.replaceWith(controlsEl); // ✅ replace static placeholder
  }
}

export async function loadPosts() {
  const postForm = document.getElementById("postForm");
  const idToken = await getIdToken();
  const currentUser = getCurrentUser();
  const pageOwner = getPageOwner();

  if (!idToken || !currentUser) {
    if (postForm) postForm.style.display = "none";
  }

  try {
    const res = await fetch(
      "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/"
    );
    if (!res.ok) throw new Error("Failed to load posts");

    const posts = await res.json();
    const allPosts = posts.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const userPosts = pageOwner
      ? allPosts.filter((p) => {
          const isOwner = currentUser?.id === pageOwner.id;
          const isPublic = (p.visibility || "private") === "public";
          return p.pageOwnerId === pageOwner.id && (isOwner || isPublic);
        })
      : allPosts;

    // Apply layout + post CSS from page owner
    if (pageOwner?.id) {
      const metaRes = await fetch(
        `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${pageOwner.id}`
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        applyCombinedCSS(meta.layout_css || "", meta.post_css || "");

        // ✅ Setup tag filters
        const tagContainer = document.getElementById("tag-filter-buttons");
        if (tagContainer) tagContainer.innerHTML = "";

        if (Array.isArray(meta.tags) && meta.tags.length > 0 && tagContainer) {
          let selectedTagBtn = null;

          const clearBtn = document.createElement("button");
          clearBtn.textContent = "All";
          clearBtn.className = "button-style";
          clearBtn.addEventListener("click", () => {
            renderPosts(userPosts);
            if (selectedTagBtn) {
              selectedTagBtn.style.backgroundColor = "transparent";
              selectedTagBtn.style.color = "white";
              const dot = selectedTagBtn.querySelector(".dot");
              if (dot) dot.style.display = "inline-block";
              selectedTagBtn = null;
            }
          });
          tagContainer.appendChild(clearBtn);

          meta.tags.forEach((tag) => {
            const btn = document.createElement("button");
            btn.className = "button-style";
            btn.dataset.tag = tag.value;

            const label = document.createElement("span");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.gap = "0.5rem";

            // const leftDot = document.createElement("span");
            // leftDot.className = "dot";
            // leftDot.style.background = tag.color;
            // leftDot.style.width = "0.75rem";
            // leftDot.style.height = "0.75rem";
            // leftDot.style.borderRadius = "50%";
            // leftDot.style.display = "inline-block";

            // const rightDot = leftDot.cloneNode();
            const text = document.createTextNode(tag.name);

            // label.appendChild(leftDot);
            label.appendChild(text);
            // label.appendChild(rightDot);
            btn.appendChild(label);

            btn.addEventListener("click", () => {
              const filtered = userPosts.filter((p) => p.tag === tag.value);
              renderPosts(filtered);

              if (selectedTagBtn) {
                selectedTagBtn.style.backgroundColor = "rgba(255, 255, 255, 0)";
                selectedTagBtn.style.color = "white";
                const dot = selectedTagBtn.querySelector(".dot");
                if (dot) dot.style.display = "inline-block";
              }

              btn.style.backgroundColor = tag.color;
              btn.style.color = tag.textColor || "white";
              selectedTagBtn = btn;
            });

            tagContainer.appendChild(btn);
          });
        }
      }
    }

    renderPosts(userPosts);
  } catch (err) {
    console.error("Error loading posts:", err);
    const postsSection = document.getElementById("posts");
    if (postsSection) {
      postsSection.innerHTML =
        "<p style='color:red; text-align:center;'>Failed to load posts.</p>";
    }
  }
}

export function initPostForm() {
  const postForm = document.getElementById("postForm");
  if (!postForm) return;

  const imageInput = document.getElementById("imageInput");
  const layoutInput = document.getElementById("layoutInput");
  const layoutSelected = document.querySelector(
    "#layout-selector .selected-option"
  );
  const layoutSelector = document.getElementById("layout-selector");
  const previewContainer = document.getElementById("image-preview-container");
  const imageLabel = document.querySelector("#image-drop-zone label");

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    removeValidationMessage();

    const editingId = getEditingPostId();
    const postId = editingId || crypto.randomUUID();

    const titleInput = postForm.querySelector('input[name="title"]');
    const formData = new FormData(postForm);

    if (!titleInput?.value.trim()) {
      showValidationMessage("Give a title.");
      return;
    }

    const tagValue = formData.get("tag");
    if (!tagValue) {
      showValidationMessage("Select a tag.");
      return;
    }

    const files = imageInput.files;
    const layout = formData.get("layout") || "grid";
    const MAX_IMAGES = {
      grid: 6,
      stack: 6,
      carousel: 6,
    };

    if (files.length > MAX_IMAGES[layout]) {
      showValidationMessage(
        `${
          layout.charAt(0).toUpperCase() + layout.slice(1)
        } layout supports up to ${MAX_IMAGES[layout]} images.`
      );
      return;
    }

    const imageUrls = [];

    for (let i = 0; i < files.length; i++) {
      const url = await uploadImageToS3(files[i], postId, i);
      imageUrls.push(url);
    }

    const { id: currentUserId, username: currentUsername } =
      getCurrentUser() || {};
    const pageOwnerId = getPageOwner()?.id || currentUserId;

    const newPost = {
      id: postId,
      title: formData.get("title"),
      content: formData.get("content"),
      images: imageUrls,
      tag: formData.get("tag") || "general",
      visibility: formData.get("visibility") || "public",
      layout: formData.get("layout") || "grid",
      timestamp: Date.now(),
      username: currentUsername,
      userId: currentUserId,
      pageOwnerId,
    };

    if (currentUserId !== pageOwnerId) {
      newPost.tag = "guest";
    }

    const idToken = await getIdToken();
    if (!idToken) {
      showValidationMessage("Please log in to submit posts.");
      return;
    }

    try {
      const response = await fetch(
        "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(newPost),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        showValidationMessage(errorData.error || "Failed to submit post");
        return;
      }

      setEditingPostId(null);
      postForm.reset();
      previewContainer.innerHTML = "";
      layoutInput.value = "grid";
      layoutSelected.textContent = "Grid";
      layoutSelector.style.display = "none";
      imageLabel.textContent = "Choose/Drop Image";
      imageInput.value = "";

      loadPosts();

      document.getElementById("submitPostBtn").textContent = "Post";
      postForm.classList.remove("editing");
      document.getElementById("cancelEditBtn").style.display = "none";
    } catch (error) {
      showValidationMessage("Network error. Try again.");
    }
  });
}
