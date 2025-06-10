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

export async function updateHeader() {
  const userControls = document.getElementById("user-controls");
  const idToken = await getIdToken();
  const dropdownWrapper = document.getElementById("tag-dropdown-wrapper");

  if (!idToken) {
    const returnTo = encodeURIComponent(window.location.href);
    userControls.innerHTML = `<button id="signupBtn">Log In/Sign Up</button>`;
    document.getElementById("signupBtn").addEventListener("click", (e) => {
      e.preventDefault();
      const returnTo = encodeURIComponent(window.location.pathname);
      history.pushState({}, "", `/auth/signup?returnTo=${returnTo}`);
      window.dispatchEvent(new Event("popstate"));
    });
    if (dropdownWrapper) dropdownWrapper.style.display = "none";
    return;
  }

  const username = await getUsernameFromToken();
  const userId = await getUserIdFromToken();
  setCurrentUser({ id: userId, username });

  userControls.innerHTML = `
    <div id="username">Signed in as ${username}</div>
    <button id="logout">Log out</button>
  `;

  if (userId !== getPageOwner()?.id && dropdownWrapper) {
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
  const postForm = document.getElementById("postForm");
  const idToken = await getIdToken();
  const currentUser = getCurrentUser();
  if (!idToken || !currentUser) {
    if (postForm) postForm.style.display = "none";
  }

  try {
    const res = await fetch(
      "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/"
    );
    if (!res.ok) throw new Error("Failed to load posts");
    const posts = await res.json();
    posts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    renderPosts(posts);
  } catch {
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
    const titleInput = postForm.querySelector('input[name="title"]');
    const formData = new FormData(postForm);
    const files = imageInput?.files || [];

    if (!titleInput?.value.trim()) {
      showValidationMessage("Give a title.");
      return;
    }

    const postId = editingId || crypto.randomUUID();
    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadImageToS3(files[i], postId, i);
      imageUrls.push(url);
    }

    const { id: currentUserId, username: currentUsername } =
      getCurrentUser() || {};
    const pageOwnerId = getPageOwner()?.id || currentUserId;

    const newPost = {
      id: editingId || postId,
      title: formData.get("title"),
      content: formData.get("content"),
      images: imageUrls,
      tag: formData.get("tag") || "general",
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

      // Reset form
      setEditingPostId(null);
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
