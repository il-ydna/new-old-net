import {
  getIdToken,
  getUserIdFromToken,
  getUsernameFromToken,
} from "./auth.js";
import { showValidationMessage, removeValidationMessage } from "./ui.js";
import { uploadImageToS3 } from "./upload.js";
import { renderPosts } from "./render.js";

export const OWNER_ID = "b19b5500-0021-70d5-4f79-c9966e8d1abd";
export let editingPostId = null;

const postForm = document.getElementById("postForm");
const imageInput = document.getElementById("imageInput");
const layoutInput = document.getElementById("layoutInput");
const layoutSelected = document.querySelector(
  "#layout-selector .selected-option"
);
const layoutSelector = document.getElementById("layout-selector");
const previewContainer = document.getElementById("image-preview-container");
const imageLabel = document.querySelector("#image-drop-zone label");
const postsSection = document.getElementById("posts");

export async function updateHeader() {
  const userControls = document.getElementById("user-controls");
  const idToken = await getIdToken();
  const dropdownWrapper = document.getElementById("tag-dropdown-wrapper");

  if (!idToken) {
    const returnTo = encodeURIComponent(window.location.href);
    userControls.innerHTML = `
      <button onclick="location.href='auth/signup.html?returnTo=${returnTo}'">Log In/Sign Up</button>
    `;
    if (dropdownWrapper) dropdownWrapper.style.display = "none";
    return;
  }

  const username = await getUsernameFromToken();
  const userId = await getUserIdFromToken();

  userControls.innerHTML = `
    <div id="username">Signed in as ${username}</div>
    <button id="logout">Log out</button>
  `;

  if (userId !== OWNER_ID && dropdownWrapper) {
    dropdownWrapper.style.visibility = "hidden";
    dropdownWrapper.style.height = "0";
  }

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const userPool = new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: "us-east-2_lXvCqndHZ",
        ClientId: "b2k3m380g08hmtmdn9osi12vg",
      });
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) cognitoUser.signOut();
      localStorage.removeItem("idToken");
      window.location.reload();
    });
  }
}

export async function loadPosts() {
  const idToken = await getIdToken();
  let userid = null;

  if (idToken) {
    userid = await getUserIdFromToken();
  } else {
    postForm.style.display = "none";
  }

  fetch("https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load posts");
      return res.json();
    })
    .then((posts) => {
      posts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      renderPosts(posts, userid);
    })
    .catch(() => {
      postsSection.innerHTML =
        "<p style='color:red; text-align:center;'>Failed to load posts.</p>";
    });
}

export function initPostForm() {
  if (!postForm) return;

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    removeValidationMessage();

    const titleInput = postForm.querySelector('input[name="title"]');
    const formData = new FormData(postForm);
    const files = imageInput.files;

    if (!titleInput.value.trim()) {
      showValidationMessage("Give a title.");
      return;
    }

    const postId = editingPostId || crypto.randomUUID();
    const imageUrls = [];

    for (let i = 0; i < files.length; i++) {
      const url = await uploadImageToS3(files[i], postId, i);
      imageUrls.push(url);
    }

    const currentUserId = await getUserIdFromToken();
    const currentUsername = await getUsernameFromToken();

    const newPost = {
      id: editingPostId || postId,
      title: formData.get("title"),
      content: formData.get("content"),
      images: imageUrls,
      tag: formData.get("tag") || "general",
      layout: formData.get("layout") || "grid",
      timestamp: Date.now(),
      username: await getUsernameFromToken(),
      userId: currentUserId,
      pageOwnerId: OWNER_ID,
    };

    if (currentUserId !== OWNER_ID) {
      newPost.tag = "guest";
    }

    // Add `id` only if editing (your Lambda generates a new one otherwise)
    if (editingPostId) {
      newPost.id = editingPostId;
    }

    const idToken = await getIdToken();
    if (!idToken) {
      showValidationMessage("Please log in to submit posts.");
      return;
    }

    const method = editingPostId ? "PUT" : "POST";
    const endpoint = "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(newPost),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showValidationMessage(errorData.error || "Failed to submit post");
        return;
      }

      editingPostId = null;
      postForm.reset();
      previewContainer.innerHTML = "";
      layoutInput.value = "grid";
      layoutSelected.textContent = "Grid";
      layoutSelector.style.display = "none";
      imageLabel.textContent = "Choose/Drop Image";
      imageInput.value = "";
      loadPosts();

      document.getElementById("submitPostBtn").textContent = "Add Post";
      postForm.classList.remove("editing");
      document.getElementById("cancelEditBtn").style.display = "none";
    } catch (error) {
      showValidationMessage("Network error. Try again.");
    }
  });
}
