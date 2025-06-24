import { getIdToken } from "./auth.js";
import { loadPosts } from "./posts.js";
import { setEditingPostId, getCurrentUser } from "./state.js";

export function renderGrid(images) {
  const count = images.length;

  let gridClass = "grid-3";
  let customStyles = "";

  if (count === 1) {
    gridClass = "grid-single";
  } else if (count === 2) {
    gridClass = "grid-2";
  } else if (count === 4) {
    gridClass = "grid-2"; // 2x2 layout
  } else if (count === 5) {
    gridClass = "grid-3 uneven-5"; // handle 3 top, 2 bottom
  }

  return `
    <div class="post-image-grid ${gridClass}">
      ${images
        .map((url) => `<img src="${url}" alt="Image" class="grid-image">`)
        .join("")}
    </div>
  `;
}

export function renderStack(images) {
  return `
    <div class="post-image-stack">
      ${images
        .map((url) => `<img src="${url}" alt="Image" class="stack-image">`)
        .join("")}
    </div>
  `;
}

window.changeSlide = function (id, direction) {
  const container = document.getElementById(id);
  if (!container) return;

  const images = container.querySelectorAll(".carousel-img");
  const currentIndex = Array.from(images).findIndex((img) =>
    img.classList.contains("active")
  );
  if (currentIndex === -1) return;

  images[currentIndex].classList.remove("active");

  const nextIndex = (currentIndex + direction + images.length) % images.length;
  images[nextIndex].classList.add("active");
};

export function renderCarousel(images) {
  if (!images.length) return "";
  const id = "carousel-" + Math.random().toString(36).slice(2, 9);

  return `
    <div class="carousel-container" id="${id}">
      <div class="carousel-images">
        ${images
          .map(
            (url, i) =>
              `<img src="${url}" class="carousel-img ${
                i === 0 ? "active" : ""
              }">`
          )
          .join("")}
      </div>
      <div class="carousel-nav prev" onclick="changeSlide('${id}', -1)">‹</div>
      <div class="carousel-nav next" onclick="changeSlide('${id}', 1)">›</div>
    </div>
  `;
}
const insertedUserStyles = new Set();

export function renderPosts(posts, userCSSMap = {}) {
  console.log("🧩 Rendering posts:", posts.length);
  const postsSection = document.getElementById("posts");
  postsSection.innerHTML = "";

  for (const post of posts) {
    const ownerId = post.pageOwnerId;
    const css = userCSSMap[ownerId];

    if (css && !insertedUserStyles.has(ownerId)) {
      const style = document.createElement("style");
      style.textContent = css;
      style.dataset.owner = ownerId;
      document.head.appendChild(style);
      insertedUserStyles.add(ownerId);
      console.log(`🎨 Injected CSS for user ${ownerId}`, css.slice(0, 120));
    } else if (!css) {
      // console.log(`⚠️ No CSS found for user ${ownerId}`);
    }

    const tagLabel = post.tag.charAt(0).toUpperCase() + post.tag.slice(1);
    const color = getTagColor(post.tag);
    const username = post.username || "Unknown User";

    const currentUser = getCurrentUser();
    const isPostOwner = post.userId && post.userId === currentUser?.id;
    const isSiteOwner =
      currentUser?.id === "b19b5500-0021-70d5-4f79-c9966e8d1abd";

    const deleteBtn =
      isPostOwner || isSiteOwner
        ? `<button onclick="deletePost('${post.id}')">Delete</button>`
        : "";
    const editBtn = isPostOwner
      ? `<button onclick="editPost('${post.id}')">Edit</button>`
      : "";

    const signature = isPostOwner
      ? ""
      : `<small>Posted by <a href="/@${username}" class="spa-link" style="text-decoration:underline;"><strong>@${username}</strong></a></small>`;

    let imageHTML = "";
    if (Array.isArray(post.images) && post.images.length > 0) {
      switch (post.layout) {
        case "carousel":
          imageHTML = renderCarousel(post.images);
          break;
        case "stack":
          imageHTML = renderStack(post.images);
          break;
        case "grid":
        default:
          imageHTML = renderGrid(post.images);
      }
    } else if (post.image) {
      imageHTML = `<img src="${post.image}" alt="Post Image" class="preview-image">`;
    }

    const articleWrapper = document.createElement("div");
    articleWrapper.className = `post-owner-${ownerId}`;

    const article = document.createElement("article");
    article.className = "post";
    article.dataset.id = post.id;
    article.innerHTML = `
      <div class="tag-pill" style="--pill-color: ${color};" title="${tagLabel}">
        <span class="pill-label">${tagLabel}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${(post.content || "").replace(/\n/g, "<br>")}</p>
      ${imageHTML}
      <div class="post-footer">
        <small>${new Date(post.timestamp).toLocaleString()}</small>
        ${signature}
        <div class="post-actions">
          ${editBtn}
          ${deleteBtn}
        </div>
      </div>
    `;

    articleWrapper.appendChild(article);
    postsSection.appendChild(articleWrapper);

    // console.log(
    //   `📌 Rendered post ${post.id} by ${username} (owner ${ownerId})`
    // );
  }

  requestAnimationFrame(() => {
    document.querySelectorAll(".post").forEach((el, i) => {
      setTimeout(() => el.classList.add("show"), i * 80);
    });
  });
}

function getTagColor(tag) {
  const option = document.querySelector(
    `.dropdown-option[data-value="${tag}"]`
  );
  return option?.dataset.color || "#ccc";
}

// Attach global handlers for post buttons
window.deletePost = async function (id) {
  if (!confirm("Delete this post?")) return;

  const idToken = await getIdToken();
  if (!idToken) {
    alert("Please log in to delete posts.");
    return;
  }

  try {
    const response = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/?id=${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    if (!response.ok) throw new Error("Delete failed");

    loadPosts();
  } catch (err) {
    alert("Failed to delete post.");
    console.error(err);
  }
};

window.editPost = async function (id) {
  setEditingPostId(id);
  const form = document.getElementById("postForm");
  if (!form) return;

  setEditingPostId(id);
  form.scrollIntoView({ behavior: "smooth" });

  try {
    const response = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/?id=${encodeURIComponent(
        id
      )}`
    );

    if (!response.ok) {
      alert("Failed to load post for editing.");
      return;
    }

    const post = await response.json();
    if (!post) return;

    // Fill form fields with post data
    form.querySelector('input[name="title"]').value = post.title || "";
    form.querySelector('textarea[name="content"]').value = post.content || "";
    form.querySelector('input[name="tag"]').value = post.tag || "";

    // Set layout value and label from post
    const layout = post.layout || "grid";
    const layoutInput = document.getElementById("layoutInput");
    const layoutSelected = document.querySelector(
      "#layout-selector .selected-option"
    );
    if (layoutInput) layoutInput.value = layout;
    if (layoutSelected) {
      layoutSelected.textContent =
        layout.charAt(0).toUpperCase() + layout.slice(1);
    }

    // Show/hide layout selector if needed
    const layoutSelector = document.getElementById("layout-selector");
    if (layoutSelector) {
      layoutSelector.style.display =
        Array.isArray(post.images) && post.images.length >= 2
          ? "block"
          : "none";
    }

    // Render image previews from post.images
    const previewContainer = document.getElementById("image-preview-container");
    if (previewContainer) {
      previewContainer.innerHTML = "";
      if (layoutSelector) previewContainer.appendChild(layoutSelector);

      const layout = post.layout || "grid";
      let html = "";
      switch (layout) {
        case "carousel":
          html = renderCarousel(post.images);
          break;
        case "stack":
          html = renderStack(post.images);
          break;
        default:
          html = renderGrid(post.images);
      }

      previewContainer.innerHTML = html;
      if (layoutSelector) {
        previewContainer.appendChild(layoutSelector);
      }
    }

    // Mark form as editing
    form.classList.add("editing");
    document.getElementById("cancelEditBtn").style.display = "inline-block";
    document.getElementById("submitPostBtn").textContent = "Edit Post";
  } catch (err) {
    console.error("editPost error:", err);
    alert("Something went wrong loading the post.");
  }
};
