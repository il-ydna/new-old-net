import { getIdToken } from "../auth.js";
import { getUserIdFromToken } from "../auth.js";
import { applyUserBackground } from "../ui.js";
import { getPageOwner } from "../state.js";
import { compressImage } from "../upload.js";
import { fetchUserMeta } from "../auth.js";
import {
  loadImageAndExtractPalette,
  renderColorSuggestions,
} from "../palette.js";

let currentBackgroundURL = null;

export async function renderProjectTab(
  container = document.getElementById("app")
) {
  const meta = fetchUserMeta;

  container.innerHTML = `
    <main>
        <div class="editor-panel" style="background-color: rgba(0,0,0,0.4); padding: 1rem; border-radius: 1rem; margin-top: 2rem;">
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

            <h3>Customize Tags</h3>
            <div style="display: flex; flex-direction: column; align-items: center;">
            <div class="palette-picker" id="colorSuggestions" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;"></div>
            </div>
            <div
            id="customTagsContainer"
            style="flex: 1; max-height: 300px; overflow-y: auto; margin: 1rem;"
            ></div>  
            <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
            <button type="button" id="addTagBtn" class="add-tag-button">Add Tag</button>
            </div>
        </div>
      </div>
      <div style="margin-top: 1rem; display: flex; justify-content: space-between;">
        <button id="saveButton">Save</button>
      </div>
    </main>
  `;
  const layoutSelect = document.getElementById("layoutSelect");

  const pageOwner = getPageOwner();
  if (pageOwner?.id) {
    fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${pageOwner.id}`
    )
      .then((res) => res.json())
      .then((meta) => {
        // ✅ Render existing tags
        if (Array.isArray(meta.tags)) {
          meta.tags.forEach((tag) => createTagRow(tag));
        }

        // ✅ Mark default tag
        if (meta.default_tag) {
          const defaultRow = Array.from(
            customTagsContainer.querySelectorAll(".tag-row")
          ).find((row) => {
            const name = row
              .querySelector(".tag-name")
              ?.textContent.trim()
              .toLowerCase()
              .replace(/\s+/g, "-");
            return name === meta.default_tag;
          });
          if (defaultRow) {
            defaultRow.querySelector(".default-tag-toggle").textContent = "★";
          }
        }

        // ✅ Only update background if it's new
        if (
          meta?.background_url &&
          meta.background_url !== currentBackgroundURL
        ) {
          currentBackgroundURL = meta.background_url;
          const timestamped = `${currentBackgroundURL}?t=${Date.now()}`;

          document.documentElement.style.backgroundImage = `url('${timestamped}')`;
          document.documentElement.style.backgroundSize = "cover";
          document.documentElement.style.backgroundRepeat = "no-repeat";
          document.documentElement.style.backgroundPosition = "center center";
          document.documentElement.style.backgroundAttachment = "fixed";

          preview.style.backgroundImage = `url('${timestamped}')`;
          removeBtn.style.display = currentBackgroundURL.includes("_final")
            ? "none"
            : "inline-block";
        }
        loadImageAndExtractPalette(
          currentBackgroundURL,
          renderColorSuggestions
        );
      })
      .catch((err) => {
        console.warn("❌ Failed to fetch layout preference:", err);
      });
  }
  const bgFileInput = document.getElementById("bgFileInput");
  const preview = document.getElementById("bgPreview");
  const wrapper = document.querySelector(".preview-wrapper");
  const removeBtn = document.getElementById("removeBgBtn");
  const progressBar = document.getElementById("uploadProgressBar");
  const fill = progressBar.querySelector(".bar-fill");

  async function uploadAndPreviewBackground(file) {
    const token = await getIdToken();
    if (!token) {
      alert("You're not logged in.");
      return;
    }

    const compressedFile = await compressImage(file);

    const userId = await getUserIdFromToken();
    const stagedKey = `bg_${userId}_staged`;

    const presignRes = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/?presign&post_id=${stagedKey}&index=0`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { upload_url, public_url } = await presignRes.json();

    progressBar.style.display = "block";
    fill.style.width = "0%";

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", upload_url, true);
    xhr.setRequestHeader("Content-Type", "image/jpeg");
    // xhr.setRequestHeader("x-amz-acl", "public-read");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        fill.style.width = `${(e.loaded / e.total) * 100}%`;
      }
    };

    xhr.onload = () => {
      progressBar.style.display = "none";
      if (xhr.status === 200) {
        currentBackgroundURL = public_url;
        const timestamped = `${public_url}?t=${Date.now()}`;
        preview.style.backgroundImage = `url('${timestamped}')`;
        wrapper.style.display = "block";

        document.documentElement.style.backgroundImage = `url('${timestamped}')`;
        document.documentElement.style.backgroundSize = "cover";
        document.documentElement.style.backgroundRepeat = "no-repeat";
        document.documentElement.style.backgroundPosition = "center center";
        document.documentElement.style.backgroundAttachment = "fixed";

        const isFinalImage = (url) => url.includes("_final");
        preview.classList.toggle("has-image", !isFinalImage(public_url));
        removeBtn.style.display = isFinalImage(public_url)
          ? "none"
          : "inline-block";

        loadImageAndExtractPalette(public_url, renderColorSuggestions);
      } else {
        alert("Upload failed.");
      }
    };

    xhr.onerror = () => {
      progressBar.style.display = "none";
      alert("Upload failed.");
    };

    xhr.send(compressedFile);
  }

  preview.addEventListener("dragover", (e) => {
    e.preventDefault();
    preview.classList.add("dragover");
  });
  preview.addEventListener("dragleave", () =>
    preview.classList.remove("dragover")
  );
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
    preview.style.backgroundImage = "none";
    preview.classList.remove("has-image");
    removeBtn.style.display = "none";
    currentBackgroundURL = null;
    bgFileInput.value = "";
  });

  document.getElementById("saveButton").addEventListener("click", async () => {
    const token = await getIdToken();
    if (!token) {
      alert("You're not logged in.");
      return;
    }

    // gather tag data etc.
    const seen = new Set();
    const tags = [];
    let defaultTagValue = null;

    document.querySelectorAll(".tag-row").forEach((row) => {
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

    const cleanURL = currentBackgroundURL?.split("?")[0];

    try {
      const payload = {
        background_url: cleanURL,
        tags,
        default_tag: defaultTagValue || "",
      };

      console.log("Saved background_url:", currentBackgroundURL);

      const res = await fetch(
        "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        console.error("Failed to save", await res.text());
      } else {
        console.log("✅ Theme and background saved");
        applyUserBackground(currentBackgroundURL);
      }
    } catch (err) {
      console.error("Save error", err);
    }
  });
  function createTagRow(
    tag = { name: "", value: "", color: "#888888", textColor: "#ffffff" },
    shouldSelect = false
  ) {
    const row = document.createElement("div");
    row.className = "tag-row";

    if (shouldSelect) {
      customTagsContainer
        .querySelectorAll(".tag-row")
        .forEach((r) => r.classList.remove("selected"));
    }

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

    row.addEventListener("click", (e) => {
      // Avoid conflicts with color picker and delete buttons
      const isButtonClick =
        e.target.closest("button") || e.target.tagName === "INPUT";
      if (isButtonClick) return;

      customTagsContainer
        .querySelectorAll(".tag-row")
        .forEach((r) => r.classList.remove("selected"));

      row.classList.add("selected");
      window.selectedTagRow = row;
    });

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
  addTagBtn.addEventListener("click", () => createTagRow(undefined, true));

  if (!currentBackgroundURL) {
    currentBackgroundURL =
      "https://andyli-portfolio-bucket.s3.us-east-2.amazonaws.com/defaults/bg.jpg";
    const timestamped = `${currentBackgroundURL}?t=${Date.now()}`;
    preview.style.backgroundImage = `url('${timestamped}')`;
    document.documentElement.style.backgroundImage = `url('${timestamped}')`;
    document.documentElement.style.backgroundSize = "cover";
    document.documentElement.style.backgroundRepeat = "no-repeat";
    document.documentElement.style.backgroundPosition = "center center";
    document.documentElement.style.backgroundAttachment = "fixed";

    const isFinalImage = (url) => url.includes("_final");
    removeBtn.style.display = isFinalImage(currentBackgroundURL)
      ? "none"
      : "inline-block";
    loadImageAndExtractPalette(currentBackgroundURL, renderColorSuggestions);
  }
  // ✅ Extract palette from current background
}
