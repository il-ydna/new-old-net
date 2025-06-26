import { getIdToken } from "../auth.js";
import { getUserIdFromToken } from "../auth.js";
import { applyUserBackground } from "../ui.js";
import { getPageOwner } from "../state.js";
import { compressImage } from "../upload.js";

let currentBackgroundURL = null;

export async function renderBackgroundStep(
  container = document.getElementById("app")
) {
  const defaultThemeCSS = `:root {
  --post-form-color: rgba(0, 0, 0, 0.6);
  --post-backdrop-color: rgba(0, 0, 0, 0.6);
  --button-backdrop-color: rgba(0, 0, 0, 0.6);
  --button-text-color: white;
  --text-color: white;
  --background-color: black;
}

#posts.layout-columns {
  column-count: 2;
  column-gap: 1rem;
}
#posts{
 border-radius: 10px; 
}
`;

  let savedTheme = defaultThemeCSS;

  try {
    const token = await getIdToken();
    const userId = await getUserIdFromToken();

    if (token && userId) {
      const res = await fetch(
        `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const meta = await res.json();
        const css = meta?.post_css?.trim();
        if (css) {
          savedTheme = css;
        } else {
          await fetch(
            `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ post_css: defaultCSS }),
            }
          );
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch user CSS, falling back to default", err);
  }

  // Allow onboarding override
  savedTheme = localStorage.getItem("onboarding-theme-css") || savedTheme;

  container.innerHTML = `
    <header><h2>Style Your Page</h2></header>
    <main>
      <p>Scroll down past the preview to edit the layout</p>
      <div id="theme-preview-wrapper">
        <form id="dummyForm">
          <input type="text" placeholder="Post Title" disabled />
          <textarea placeholder="Write something..." disabled></textarea>
          <div class="button-row">
            <div class="img-uploader disabled-uploader">Choose Image</div>
            <div></div>
            <button disabled style="opacity: 1;">Post</button>
          </div>
        </form>

        <section id="posts" class="layout-columns">
          <article class="post show">
            <div class="tag-pill" style="--pill-color: #e08eff;">
              <span class="pill-label">Preview</span>
            </div>
            <h3>My first theme test</h3>
            <p>This is a preview of how your posts will look. Try changing column count or post backdrop color!</p>
            <div class="post-footer">
              <small>Just now</small>
              <small>@you</small>
            </div>
          </article>

          <!-- ✅ Sample post with 2 images in grid -->
          <article class="post show">
            <div class="tag-pill" style="--pill-color: #77ccee;">
              <span class="pill-label">Preview</span>
            </div>
            <h3>Two Images Example</h3>
            <p>This post includes two preview images in a grid.</p>
            <div class="post-image-grid grid-2">
              <img src="/static/sample1.jpg" alt="Sample 1" class="grid-image" />
              <img src="/static/sample2.jpg" alt="Sample 2" class="grid-image" />
            </div>
            <div class="post-footer">
              <small>Just now</small>
              <small>@you</small>
            </div>
          </article>

          <article class="post show">
            <div class="tag-pill" style="--pill-color: #88cc88;">
              <span class="pill-label">Preview</span>
            </div>
            <h3>Another sample</h3>
            <p>Want 3 columns? Try changing <code>column-count</code> in <code>#posts.layout-columns</code>.</p>
            <div class="post-footer">
              <small>Just now</small>
              <small>@you</small>
            </div>
          </article>

          <!-- ✅ Sample post with 6 images in carousel -->
          <article class="post show">
            <div class="tag-pill" style="--pill-color: #ffcc66;">
              <span class="pill-label">Preview</span>
            </div>
            <h3>Gallery Post</h3>
            <p>This post showcases a 6-image carousel layout preview.</p>

            <div class="carousel-container" id="carousel-preview">
              <div class="carousel-images">
                <img src="/static/sample1.jpg" class="carousel-img active" alt="1" />
                <img src="/static/sample2.jpg" class="carousel-img" alt="2" />
                <img src="/static/sample3.jpg" class="carousel-img" alt="3" />
                <img src="/static/sample4.jpg" class="carousel-img" alt="4" />
                <img src="/static/sample5.jpg" class="carousel-img" alt="5" />
                <img src="/static/sample6.jpg" class="carousel-img" alt="6" />
              </div>
              <div class="carousel-nav prev" onclick="changeSlide('carousel-preview', -1)">‹</div>
              <div class="carousel-nav next" onclick="changeSlide('carousel-preview', 1)">›</div>
            </div>

            <div class="post-footer">
              <small>Just now</small>
              <small>@you</small>
            </div>
          </article>

        </section>
      </div>
      <div class="editor-panel" style="background-color: rgba(0,0,0,0.4); padding: 1rem; border-radius: 1rem; margin-top: 2rem;">
        <h3 style="margin-top: 2rem;">CSS Theme Editor</h3>
          <p>You can customize post column count, form colors, and more via CSS variables.</p>
        <div style="margin: 1rem">
          <textarea id="themeCSS" style="width: 100%; height: 300px; font-family: monospace; "></textarea>
        </div>
        <h3 style="margin-top: 2rem;">Post Layout</h3>
        <p>Select how you'd like your posts to be arranged by default.</p>
        <label>
          <select id="layoutSelect" style="margin-bottom: 1rem;">
            <option value="columns">Columns</option>
            <option value="stack">Timeline</option>
          </select>
        </label>
        <p>Choose a background image</p>
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
      
      <div style="margin-top: 1rem; display: flex; justify-content: space-between;">
        <button id="resetCSS">Reset CSS</button>
        <button id="saveButton">Save</button>
      </div>
    </main>
  `;

  const editor = CodeMirror.fromTextArea(document.getElementById("themeCSS"), {
    mode: "css",
    theme: "material-darker",
    lineNumbers: true,
    lineWrapping: true,
  });
  editor.setValue(savedTheme);

  const updateThemeStyle = () => {
    const css = editor.getValue();
    localStorage.setItem("onboarding-theme-css", css);
    let styleEl = document.getElementById("theme-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "theme-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  };
  editor.on("change", updateThemeStyle);
  updateThemeStyle();

  const layoutSelect = document.getElementById("layoutSelect");
  const postsEl = document.getElementById("posts");

  // ✅ Apply saved default layout from user-meta via query param
  const pageOwner = getPageOwner();
  if (pageOwner?.id) {
    fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${pageOwner.id}`
    )
      .then((res) => res.json())
      .then((meta) => {
        const savedLayout = meta?.default_layout || "columns";
        layoutSelect.value = savedLayout;
        postsEl.className = "";
        postsEl.classList.add(`layout-${savedLayout}`);

        // ✅ Load saved post CSS
        if (meta?.layout_css) {
          editor.setValue(meta.layout_css);
        }

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

          loadImageAndExtractPalette(
            currentBackgroundURL,
            renderColorSuggestions
          );
        }
      })
      .catch((err) => {
        console.warn("❌ Failed to fetch layout preference:", err);
      });
  }

  layoutSelect.addEventListener("change", () => {
    postsEl.className = "";
    postsEl.classList.add(`layout-${layoutSelect.value}`);
  });

  layoutSelect.addEventListener("change", () => {
    postsEl.className = "";
    postsEl.classList.add(`layout-${layoutSelect.value}`);
  });

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
        layout_css: editor.getValue(),
        default_layout: layoutSelect.value,
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
  container.querySelector("#resetCSS").addEventListener("click", () => {
    if (confirm("Reset your post CSS to default?")) {
      editor.setValue(defaultThemeCSS);
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

  colors.forEach((rgb) => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = rgb;
    swatch.style.width = "1.25rem";
    swatch.style.height = "1.25rem";
    swatch.style.borderRadius = "50%";
    swatch.style.cursor = "pointer";
    swatch.style.border = "2px solid white";
    swatch.title = rgb;

    swatch.addEventListener("click", () => {
      const targetRow = window.selectedTagRow;
      const colorInput = targetRow?.querySelector(".tag-color");
      if (colorInput) {
        const hex = rgbToHex(rgb);
        colorInput.value = hex;
        colorInput.dispatchEvent(new Event("input"));
      }
    });

    container.appendChild(swatch);
  });
}

async function loadImageAndExtractPalette(imageUrl, callback) {
  try {
    const res = await fetch(imageUrl, {
      mode: "cors",
      cache: "reload", // Force bypass of any tainted cache
    });

    if (!res.ok) {
      console.warn("❌ Failed to fetch image for palette analysis:", imageUrl);
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = objectUrl;

    img.onload = () => {
      const colors = getDistinctColorsFromImage(img, 10);
      callback(colors);
      URL.revokeObjectURL(objectUrl); // Clean up
    };

    img.onerror = () => {
      console.warn("❌ Could not load image for palette analysis:", objectUrl);
    };
  } catch (err) {
    console.warn(
      "❌ Error fetching image for palette analysis:",
      imageUrl,
      err
    );
  }
}
