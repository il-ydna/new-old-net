import { setCurrentUser, setPageOwner } from "./state.js";
import { getIdToken } from "./auth.js";
import { applyUserBackground, renderUserControls } from "./ui.js";
import { getUsernameFromToken, getUserIdFromToken } from "./auth.js";
import { compressImage } from "./upload.js";
import { updateHeader } from "./posts.js";

let idToken = null;
let userId = null;
let originalBackgroundURL = "";
let currentBackgroundURL = "";

export function renderEditFormHTML() {
  return `
    <form id="settingsForm">

    <section class="editor-section">
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
    </section>

    <section class="editor-section">
      <h3>Change Layout</h3>
      <label>
        Default Post Layout:
        <select id="layoutSelect">
          <option value="columns">Columns</option>
          <option value="stack">Timeline</option>
        </select>
      </label>
    </section>

    <section class="editor-section">
      <h3>Customize Tags</h3>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div class="palette-picker" id="colorSuggestions" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;"></div>
        <div style="display: flex; justify-content: center; margin-bottom: 0rem;"></div>
      </div>
      <div
        id="customTagsContainer"
        style="flex: 1; max-height: 300px; overflow-y: auto; margin: 1rem;"
      ></div>  
      <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" id="addTagBtn" class="add-tag-button">Add Tag</button>
      </div>
    </section>

    <section class="editor-section">
      <h3>Edit Styles</h3>
      <label>
        Custom CSS:
        <textarea
          id="cssInput"
          rows="10"
          placeholder="Enter your custom CSS..."
        ></textarea>
      </label>
    </section>

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
  updateHeader();
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

  let selectedTagRow = null;

  const isFinalImage = (url) => url.includes("_final");

  cssInput.value = userMeta.custom_css || "";
  layoutSelect.value = userMeta.default_layout || "columns";
  originalBackgroundURL = userMeta.background_url || "";
  currentBackgroundURL = originalBackgroundURL;

  // Load background preview
  if (currentBackgroundURL) {
    preview.style.backgroundImage = `url('${currentBackgroundURL}?t=${Date.now()}')`;
    wrapper.style.display = "block";
    preview.classList.toggle("has-image", !isFinalImage(currentBackgroundURL));
    removeBtn.style.display = isFinalImage(currentBackgroundURL)
      ? "none"
      : "inline-block";
    preview.style.backgroundImage = `url('${currentBackgroundURL}?t=${Date.now()}')`;
    wrapper.style.display = "block";
    preview.classList.toggle("has-image", !isFinalImage(currentBackgroundURL));
    removeBtn.style.display = isFinalImage(currentBackgroundURL)
      ? "none"
      : "inline-block";

    loadImageAndExtractPalette(currentBackgroundURL, renderColorSuggestions); // 👈 Add this
  }

  function createTagRow(
    tag = { name: "", value: "", color: "#888888", textColor: "#ffffff" },
    shouldSelect = false
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
        class="tag-preview tag-name"
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
        <div>
          <button type="button" class="default-tag-toggle" title="Set as default" style="font-size: 1.25rem; color: gold; background: none; border: none; cursor: pointer;">☆</button>
        </div>
      </div>
    </div>
  `;

    const preview = row.querySelector(".tag-preview");
    const colorInput = row.querySelector(".tag-color");
    const textColorInput = row.querySelector(".tag-text-color");

    row.addEventListener("click", () => {
      customTagsContainer
        .querySelectorAll(".tag-row")
        .forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
      window.selectedTagRow = row;
      console.log(row);
    });

    const starBtn = row.querySelector(".default-tag-toggle");
    starBtn.addEventListener("click", () => {
      // Reset all other stars
      customTagsContainer
        .querySelectorAll(".default-tag-toggle")
        .forEach((btn) => (btn.textContent = "☆"));
      // Set this one
      starBtn.textContent = "★";
    });

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

    // Selection logic
    row.addEventListener("click", () => {
      customTagsContainer
        .querySelectorAll(".tag-row")
        .forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
      window.selectedTagRow = row;
    });

    // ✅ Select if flagged
    if (shouldSelect) {
      row.classList.add("selected");
      window.selectedTagRow = row;
    }

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
    userMeta.tags.forEach((tag) => createTagRow(tag)); // don't select
  }

  addTagBtn.addEventListener("click", () => createTagRow(undefined, true));

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
      let defaultTagValue = null;

      customTagsContainer.querySelectorAll(".tag-row").forEach((row) => {
        const name = row.querySelector(".tag-name")?.textContent.trim();
        const color = row.querySelector(".tag-color")?.value;
        const textColor = row.querySelector(".tag-text-color")?.value;
        const value = name?.toLowerCase().replace(/\s+/g, "-");
        const isDefault =
          row.querySelector(".default-tag-toggle")?.textContent === "★";

        if (!name || !value || seen.has(value)) return;

        seen.add(value);
        tags.push({ name, value, color, textColor });

        if (isDefault) defaultTagValue = value;
      });

      const payload = {
        custom_css: cssInput.value,
        default_layout: layoutSelect.value,
        background_url: currentBackgroundURL,
        tags,
        default_tag: defaultTagValue || "",
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
        console.log("Saving tags:", tags);
        console.log("Default tag value: ", defaultTagValue);
        saveStatus.textContent = "✅ Settings saved!";
        applyUserBackground(currentBackgroundURL);
      } else {
        saveStatus.textContent = "❌ Failed to save.";
      }
    });

  async function uploadAndPreviewBackground(file) {
    const stagedKey = `bg_${userId}_staged`;
    const compressedFile = await compressImage(file, 0.75, 1920);

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
        preview.style.backgroundImage = `url('${public_url}?t=${Date.now()}')`;
        wrapper.style.display = "block";
        preview.classList.add("has-image");
        removeBtn.style.display = "inline-block";
        loadImageAndExtractPalette(public_url, renderColorSuggestions);
      } else {
        alert("Upload failed.");
      }
    };

    xhr.onerror = () => {
      progressBar.style.display = "none";
      alert("Upload failed.");
    };

    // ✅ Send
    xhr.send(compressedFile);
  }
}

function getDistinctColorsFromImage(imageElement, numColors = 5) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const colorMap = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue; // skip transparent pixels
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const sorted = [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.split(",").map(Number));

  const rgb2lab = ([r, g, b]) => {
    const srgb = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    const [xr, yr, zr] = [
      srgb[0] * 0.4124 + srgb[1] * 0.3576 + srgb[2] * 0.1805,
      srgb[0] * 0.2126 + srgb[1] * 0.7152 + srgb[2] * 0.0722,
      srgb[0] * 0.0193 + srgb[1] * 0.1192 + srgb[2] * 0.9505,
    ];

    const x = xr / 0.95047;
    const y = yr / 1.0;
    const z = zr / 1.08883;

    const fx = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    const [fxX, fxY, fxZ] = [x, y, z].map(fx);

    return [116 * fxY - 16, 500 * (fxX - fxY), 200 * (fxY - fxZ)];
  };

  const deltaE = (lab1, lab2) =>
    Math.sqrt(lab1.reduce((sum, c, i) => sum + Math.pow(c - lab2[i], 2), 0));

  const selected = [];
  for (const color of sorted) {
    const lab = rgb2lab(color);
    const minDist = Math.min(
      ...selected.map((c) => deltaE(rgb2lab(c), lab)),
      selected.length ? Infinity : 0
    );
    if (minDist > 20 || selected.length === 0) selected.push(color);
    if (selected.length >= numColors) break;
  }

  return selected.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
}

function rgbToHex(rgbString) {
  const result = rgbString.match(/\d+/g);
  if (!result || result.length < 3) return "#000000";
  return (
    "#" +
    result
      .slice(0, 3)
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function renderColorSuggestions(colors) {
  const container = document.getElementById("colorSuggestions");
  container.innerHTML = "";

  colors.forEach((hex) => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = hex;
    swatch.style.width = "1.25rem";
    swatch.style.height = "1.25rem";
    swatch.style.borderRadius = "50%";
    swatch.style.cursor = "pointer";
    swatch.style.border = "2px solid white";
    swatch.title = hex;

    swatch.addEventListener("click", () => {
      const targetRow = window.selectedTagRow;

      const colorInput = targetRow?.querySelector(".tag-color");
      if (colorInput) {
        const hexCode = rgbToHex(hex);
        colorInput.value = hexCode;
        colorInput.dispatchEvent(new Event("input"));
      }
    });

    container.appendChild(swatch);
  });
}

function loadImageAndExtractPalette(imageUrl, callback) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;

  img.onload = () => {
    const colors = getDistinctColorsFromImage(img, 6);
    callback(colors);
  };

  img.onerror = () => {
    console.warn("❌ Could not load image for palette analysis:", imageUrl);
  };
}
