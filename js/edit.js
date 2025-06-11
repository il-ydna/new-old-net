import { setCurrentUser, setPageOwner } from "./state.js";
import { getIdToken } from "./auth.js";
import { applyUserBackground, renderUserControls } from "./ui.js";
import { getUsernameFromToken, getUserIdFromToken } from "./auth.js";
import { showImagePreview } from "./upload.js";

let idToken = null;
let userId = null;
let originalBackgroundURL = "";
let currentBackgroundURL = "";

export function renderEditFormHTML() {
  return `
    <form id="settingsForm">
      <h3>Change Background</h3>
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

      <h3>Change Layout</h3>
      <label>
        Default Post Layout:
        <select id="layoutSelect">
          <option value="columns">Columns</option>
          <option value="stack">Timeline</option>
        </select>
      </label>

      <h3>Customize Tags</h3>

      <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
        <button type="button" id="addTagBtn" class="add-tag-button">Add Tag</button>
      </div>

      <div
        id="customTagsContainer"
        style="flex: 1; max-height: 300px; overflow-y: auto; margin: 1rem;"
      ></div>


      <h3>Edit Styles</h3>
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
  document.body.classList.add("edit-mode");

  // Inject full shell + post form
  app.innerHTML = `
  <header>
    <button id="backToPageBtn" >Back to Your Page</button>
    <div id="user-controls"></div>
  </header>
    <h2 id="editorHeader">Page Editor</h2>
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
  const customTagsContainer = document.getElementById("customTagsContainer");
  const addTagBtn = document.getElementById("addTagBtn");

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

  function createTagRow(
    tag = { name: "", value: "", color: "#888888", textColor: "#ffffff" }
  ) {
    const row = document.createElement("div");
    row.className = "tag-row";

    const name = tag.name || "";
    const color = tag.color || "#888888";
    const textColor = tag.textColor || "#ffffff";

    row.innerHTML = `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      width: 100%;
    ">
      <div
        class="tag-preview"
        contenteditable="true"
        spellcheck="false"
        style="
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          background-color: ${color};
          color: ${textColor};
          text-align: center;
          white-space: nowrap;
          outline: none;
          cursor: text;
          margin-left: 4px;
        "
      >${name || "New Tag"}</div>

      <!-- RIGHT: Color + delete buttons -->
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          <button type="button" class="button-style tag-color-btn">Tag Color</button>
          <input type="color" class="tag-color" value="${color}" style="display: none;" />
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          <button type="button" class="button-style tag-text-color-btn">Text Color</button>
          <input type="color" class="tag-text-color" value="${textColor}" style="display: none;" />
        </div>

        <button type="button" class="remove-tag button-style">Delete</button>
      </div>
    </div>
  `;

    const preview = row.querySelector(".tag-preview");
    const colorInput = row.querySelector(".tag-color");
    const textColorInput = row.querySelector(".tag-text-color");

    row
      .querySelector(".tag-color-btn")
      .addEventListener("click", () => colorInput.click());
    row
      .querySelector(".tag-text-color-btn")
      .addEventListener("click", () => textColorInput.click());

    const updateStyles = () => {
      preview.style.backgroundColor = colorInput.value;
      preview.style.color = textColorInput.value;
    };

    colorInput.addEventListener("input", updateStyles);
    textColorInput.addEventListener("input", updateStyles);

    row
      .querySelector(".remove-tag")
      .addEventListener("click", () => row.remove());

    updateStyles();
    customTagsContainer.appendChild(row);

    // Remove it after animation completes
    preview.addEventListener(
      "animationend",
      () => {
        preview.classList.remove("pulse");
      },
      { once: true }
    );
  }

  if (Array.isArray(userMeta.tags)) {
    userMeta.tags.forEach(createTagRow);
  }

  addTagBtn.addEventListener("click", () => createTagRow());

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

      const seen = new Set();
      const tags = [];

      customTagsContainer.querySelectorAll(".tag-row").forEach((row) => {
        const name = row.querySelector(".tag-name")?.value.trim();
        const color = row.querySelector(".tag-color")?.value;
        const textColor = row.querySelector(".tag-text-color")?.value;
        const value = name?.toLowerCase().replace(/\s+/g, "-");

        if (!name || !value || seen.has(value)) return;

        seen.add(value);
        tags.push({ name, value, color, textColor });
      });

      const payload = {
        custom_css: cssInput.value,
        default_layout: layoutSelect.value,
        background_url: currentBackgroundURL,
        tags,
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
