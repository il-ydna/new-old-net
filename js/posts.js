import {
  getIdToken,
  getUserIdFromToken,
  getUsernameFromToken,
} from "./auth.js";
import {
  showValidationMessage,
  removeValidationMessage,
  renderTieInDropdown,
} from "./ui.js";
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
import { getCurrentProjectId } from "./state.js";

import { renderUserControls } from "./ui.js";

import * as WeatherTieIn from "./tieins/weather.js";
import * as EtaTieIn from "./tieins/eta.js";

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

export async function loadPosts({ projectId = null } = {}) {
  const postForm = document.getElementById("postForm");
  const idToken = await getIdToken();
  const currentUser = getCurrentUser();
  const pageOwner = getPageOwner();

  if (!idToken || !currentUser) {
    if (postForm) postForm.style.display = "none";
  }

  try {
    const res = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/?projectId=${encodeURIComponent(
        getCurrentProjectId()
      )}`
    );

    if (!res.ok) throw new Error("Failed to load posts");

    const posts = await res.json();
    const allPosts = posts.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    let userPosts = pageOwner
      ? allPosts.filter((p) => {
          const isOwner = currentUser?.id === pageOwner.id;
          const isPublic = (p.visibility || "private") === "public";
          const ownerMatch = p.pageOwnerId === pageOwner.id;
          const projectMatch = projectId ? p.projectId === projectId : true;
          return ownerMatch && projectMatch && (isOwner || isPublic);
        })
      : allPosts;

    // Apply layout + post CSS from page owner (user-meta or project)
    if (pageOwner?.project) {
      applyCombinedCSS(
        pageOwner.project.layout_css || "",
        pageOwner.project.post_css || ""
      );
    } else if (pageOwner?.id) {
      const metaRes = await fetch(
        `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${pageOwner.id}`
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        applyCombinedCSS(meta.layout_css || "", meta.post_css || "");
      }
    }

    // ✅ Setup tag filters
    const tagContainer = document.getElementById("tag-filter-buttons");
    if (tagContainer) tagContainer.innerHTML = "";

    const tags = pageOwner?.project?.tags || [];
    if (tags.length > 0 && tagContainer) {
      let selectedTagBtn = null;

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "All";
      clearBtn.className = "button-style";
      clearBtn.addEventListener("click", () => {
        renderPosts(userPosts);
        if (selectedTagBtn) {
          const prevTagColor = selectedTagBtn.dataset.tagColor;
          selectedTagBtn.style.backgroundColor = hexToRgba(prevTagColor, 0.5);
          selectedTagBtn.style.color = "white";
          selectedTagBtn = null;
        }
      });
      tagContainer.appendChild(clearBtn);

      tags.forEach((tag) => {
        const btn = document.createElement("button");
        btn.className = "button-style";
        btn.dataset.tag = tag.value;
        btn.dataset.tagColor = tag.color;
        btn.textContent = tag.name;

        // Default: translucent version of their color
        btn.style.backgroundColor = hexToRgba(tag.color, 0.6);
        btn.style.color = tag.textColor || "white";

        btn.addEventListener("click", () => {
          const filtered = userPosts.filter((p) => p.tag === tag.value);
          renderPosts(filtered);

          if (selectedTagBtn) {
            const prevTagColor = selectedTagBtn.dataset.tagColor;
            selectedTagBtn.style.backgroundColor = hexToRgba(prevTagColor, 0.6);
            selectedTagBtn.style.color = "white";
          }

          btn.style.backgroundColor = tag.color;
          btn.style.color = tag.textColor || "white";
          selectedTagBtn = btn;
        });

        tagContainer.appendChild(btn);
      });
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

  // Setup tie-in modules
  const tieInModules = {
    weather: WeatherTieIn,
    eta: EtaTieIn,
  };

  function showTieInTypeSelector() {
    const tieInTypes = Object.keys(tieInModules);
    const tieInDropdown = renderTieInDropdown(tieInTypes);
    document
      .getElementById("tie-in-wrapper")
      .insertBefore(tieInDropdown, addTieInBtn);

    tieInDropdown.querySelectorAll(".dropdown-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const type = opt.dataset.value;
        const row = tieInModules[type].renderInputRow();
        row.dataset.type = type;
        document.getElementById("tie-in-list").appendChild(row);
        window.updateTieInHiddenInput();
      });
    });
  }

  window.updateTieInHiddenInput = function () {
    const data = Array.from(document.querySelectorAll(".tie-in-row")).map(
      (r) => {
        const inputs = r.querySelectorAll("input");
        const values = { type: r.dataset.type };
        inputs.forEach((i) => {
          const key = i.className.replace("tie-in-", "");
          values[key] = i.value;
        });
        return values;
      }
    );
    document.getElementById("apiTieInsInput").value = JSON.stringify(data);
  };

  postForm.addEventListener("submit", async (e) => {
    const submitBtn = document.getElementById("submitPostBtn");
    submitBtn.disabled = true;
    try {
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
      const MAX_IMAGES = { grid: 6, stack: 6, carousel: 6 };

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

      const tieInsRaw = formData.get("apiTieIns");
      let tieIns = [];
      try {
        tieIns = JSON.parse(tieInsRaw || "[]");
      } catch {
        console.warn("Invalid tie-in JSON, skipping");
      }

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
        projectId: getCurrentProjectId(),
        pageOwnerId,
        apiTieIns: tieIns,
      };

      if (currentUserId !== pageOwnerId) {
        newPost.tag = "guest";
      }

      const idToken = await getIdToken();
      if (!idToken) {
        showValidationMessage("Please log in to submit posts.");
        return;
      }

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
      document.getElementById("tie-in-list").innerHTML = "";
      document.getElementById("apiTieInsInput").value = "[]";


      await loadPosts({ projectId: getCurrentProjectId() });

      postForm.classList.remove("editing");
      document.getElementById("cancelEditBtn").style.display = "none";
    } catch (err) {
      showValidationMessage("Network error. Try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post";
    }
  });
}

function hexToRgba(hex, alpha = 0.5) {
  let r = 0,
    g = 0,
    b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }

  return `rgba(${r},${g},${b},${alpha})`;
}
