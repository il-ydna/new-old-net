import { getIdToken } from "./auth.js";
import { loadPosts } from "./posts.js";

export function renderGrid(images) {
  return `
    <div class="post-image-grid">
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

export function renderPosts(posts, currentUserId = null) {
  const postsSection = document.getElementById("posts");
  postsSection.innerHTML = posts
    .slice()
    .reverse()
    .map((post) => {
      const tagLabel = post.tag.charAt(0).toUpperCase() + post.tag.slice(1);
      const color = getTagColor(post.tag);
      const username = post.username || "Unknown User";

      const isPostOwner = post.userId && post.userId === currentUserId;
      const isSiteOwner =
        currentUserId === "b19b5500-0021-70d5-4f79-c9966e8d1abd";

      const deleteBtn =
        isPostOwner || isSiteOwner
          ? `<button onclick="deletePost('${post.id}')">Delete</button>`
          : "";
      const editBtn = isPostOwner
        ? `<button onclick="editPost('${post.id}')">Edit</button>`
        : "";

      const signature = isPostOwner
        ? ""
        : `<small>Posted by <strong>${username}</strong></small>`;

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

      return `
        <article class="post" data-id="${post.id}">
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
        </article>
      `;
    })
    .join("");

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
  const postEl = document.querySelector(`[data-id="${id}"]`);
  if (!postEl) return;

  const form = document.getElementById("postForm");
  form.scrollIntoView({ behavior: "smooth" });

  const response = await fetch(
    "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/"
  );
  const posts = await response.json();
  const post = posts.find((p) => p.id === id);
  if (!post) return;

  form.querySelector('input[name="title"]').value = post.title;
  form.querySelector('textarea[name="content"]').value = post.content;
  form.querySelector('input[name="tag"]').value = post.tag;

  const layoutInput = document.getElementById("layoutInput");
  const layoutSelected = document.querySelector(
    "#layout-selector .selected-option"
  );
  layoutInput.value = post.layout || "grid";
  layoutSelected.textContent =
    (post.layout || "grid").charAt(0).toUpperCase() +
    (post.layout || "grid").slice(1);

  const layoutSelector = document.getElementById("layout-selector");
  layoutSelector.style.display = post.images?.length >= 2 ? "block" : "none";

  const previewContainer = document.getElementById("image-preview-container");
  previewContainer.innerHTML = "";
  if (layoutSelector) previewContainer.appendChild(layoutSelector);

  (post.images || []).forEach((url) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Preview";
    img.classList.add("preview-image");
    previewContainer.appendChild(img);
  });

  editingPostId = id;
  form.classList.add("editing");
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  document.getElementById("submitPostBtn").textContent = "Edit Post";
};
