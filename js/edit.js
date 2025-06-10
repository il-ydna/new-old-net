import { setCurrentUser, setPageOwner } from "./state.js";
import { getIdToken } from "./auth.js";
import { applyUserBackground, renderUserControls } from "./ui.js";
import { getUsernameFromToken, getUserIdFromToken } from "./auth.js";

let idToken = null;
let userId = null;
let originalBackgroundURL = "";
let currentBackgroundURL = "";

export function renderEditFormHTML() {
  return `
    <form id="settingsForm">
      <div class="preview-wrapper">
        <div id="bgPreview" class="bg-preview" tabindex="0">
          <input type="file" id="bgFileInput" accept="image/*" hidden />
          <label for="bgFileInput" class="drop-label">Choose/Drop Image</label>
        </div>
        <button id="removeBgBtn" type="button" class="remove-btn">Clear</button>
        <div id="uploadProgressBar" class="progress-bar">
          <div class="bar-fill"></div>
        </div>
      </div>

      <label>
        Default Post Layout:
        <select id="layoutSelect">
          <option value="columns">Columns</option>
          <option value="stack">Timeline</option>
        </select>
      </label>

      <label>
        Custom CSS:
        <textarea
          id="cssInput"
          rows="10"
          placeholder="Enter your custom CSS..."
        ></textarea>
      </label>

      <button type="submit">Save Changes</button>
    </form>

    
  `;
}
export async function renderEditPage(username) {
  const app = document.getElementById("app");
  // Inject full shell + post form
  app.innerHTML = `
  <header>
    <button id="backToPageBtn" >Back to Your Page</button>
    <div id="user-controls"></div>
  </header>
    <h2>Edit Your Page</h2>
    ${renderEditFormHTML()}
    <p id="saveStatus" style="text-align: center; margin-top: 1rem"></p>
  `;
  await new Promise((r) => requestAnimationFrame(r));
  const controlsWrapper = document.getElementById("user-controls");
  if (controlsWrapper) {
    const controlsEl = renderUserControls();
    controlsWrapper.replaceWith(controlsEl);
  }
  const backBtn = document.getElementById("backToPageBtn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState({}, "", `/@${username}`);
      window.dispatchEvent(new Event("popstate"));
    });
  }

  // Ensure idToken is retrieved and user is reconstructed from token
  idToken = await getIdToken();
  if (!idToken) {
    app.innerHTML = `<p style='text-align:center;'>Please log in to edit your page.</p>`;
    return;
  }

  // Rehydrate current user from token
  const usernameFromToken = await getUsernameFromToken();
  const userIdFromToken = await getUserIdFromToken();
  if (!usernameFromToken || !userIdFromToken) {
    app.innerHTML = `<p style='text-align:center;'>Please log in to edit your page.</p>`;
    return;
  }

  setCurrentUser({ id: userIdFromToken, username: usernameFromToken });
  const currentUser = { id: userIdFromToken, username: usernameFromToken };
  try {
    const res = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?username=${username}`
    );
    const userMeta = await res.json();

    if (userMeta?.id !== currentUser.id) {
      app.innerHTML = `<p style='text-align:center;'>Access denied.</p>`;
      return;
    }

    setPageOwner(userMeta);
    userId = userMeta.id;
    initForm(userMeta);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<p style="text-align:center; color:red;">Failed to load settings.</p>`;
  }
  applyUserBackground(currentBackgroundURL);
}

function initForm(userMeta) {
  const cssInput = document.getElementById("cssInput");
  const layoutSelect = document.getElementById("layoutSelect");
  const bgFileInput = document.getElementById("bgFileInput");
  const preview = document.getElementById("bgPreview");
  const wrapper = document.querySelector(".preview-wrapper");
  const removeBtn = document.getElementById("removeBgBtn");
  const progressBar = document.getElementById("uploadProgressBar");
  const fill = progressBar.querySelector(".bar-fill");
  const saveStatus = document.getElementById("saveStatus");

  const isFinalImage = (url) => url.includes("_final");

  cssInput.value = userMeta.custom_css || "";
  layoutSelect.value = userMeta.default_layout || "columns";
  originalBackgroundURL = userMeta.background_url || "";
  currentBackgroundURL = originalBackgroundURL;

  // Load background preview
  if (currentBackgroundURL) {
    preview.style.backgroundImage = `url('${currentBackgroundURL}')`;
    wrapper.style.display = "block";
    preview.classList.toggle("has-image", !isFinalImage(currentBackgroundURL));
    removeBtn.style.display = isFinalImage(currentBackgroundURL)
      ? "none"
      : "inline-block";
  }

  // Handlers
  preview.addEventListener("dragover", (e) => {
    e.preventDefault();
    preview.classList.add("dragover");
  });

  preview.addEventListener("dragleave", () => {
    preview.classList.remove("dragover");
  });

  preview.addEventListener("drop", async (e) => {
    e.preventDefault();
    preview.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) await uploadAndPreviewBackground(file);
  });

  preview.addEventListener("click", () => bgFileInput.click());

  bgFileInput.addEventListener("change", async () => {
    const file = bgFileInput.files[0];
    if (file) await uploadAndPreviewBackground(file);
  });

  removeBtn.addEventListener("click", () => {
    currentBackgroundURL = originalBackgroundURL;

    if (originalBackgroundURL) {
      preview.style.backgroundImage = `url('${originalBackgroundURL}')`;
      preview.classList.toggle(
        "has-image",
        !isFinalImage(originalBackgroundURL)
      );
      removeBtn.style.display = isFinalImage(originalBackgroundURL)
        ? "none"
        : "inline-block";
    } else {
      preview.style.backgroundImage = "none";
      preview.classList.remove("has-image");
      removeBtn.style.display = "none";
    }

    bgFileInput.value = "";
  });

  document
    .getElementById("settingsForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        custom_css: cssInput.value,
        default_layout: layoutSelect.value,
        background_url: currentBackgroundURL,
      };

      const res = await fetch(
        "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        saveStatus.textContent = "✅ Settings saved!";
        applyUserBackground(currentBackgroundURL);
      } else {
        saveStatus.textContent = "❌ Failed to save.";
      }
    });

  async function uploadAndPreviewBackground(file) {
    const stagedKey = `bg_${userId}_staged`;

    const presignRes = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/?presign&post_id=${stagedKey}&index=0`,
      {
        headers: { Authorization: `Bearer ${idToken}` },
      }
    );

    const { upload_url, public_url } = await presignRes.json();
    progressBar.style.display = "block";
    fill.style.width = "0%";

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", upload_url, true);
    xhr.setRequestHeader("Content-Type", "image/jpeg");
    xhr.setRequestHeader("x-amz-acl", "public-read");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        fill.style.width = `${(e.loaded / e.total) * 100}%`;
      }
    };

    xhr.onload = () => {
      progressBar.style.display = "none";

      if (xhr.status === 200) {
        currentBackgroundURL = public_url;
        preview.style.backgroundImage = `url('${public_url}')`;
        wrapper.style.display = "block";
        preview.classList.add("has-image");
        removeBtn.style.display = "inline-block";
      } else {
        alert("Upload failed.");
      }
    };

    xhr.onerror = () => {
      progressBar.style.display = "none";
      alert("Upload failed.");
    };

    xhr.send(file);
  }
}
