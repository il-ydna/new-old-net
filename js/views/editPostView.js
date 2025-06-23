import { setupOnboardingLayoutToggle } from "../ui.js";
import { getUserIdFromToken } from "../auth.js";
import { getIdToken } from "../auth.js";

export async function renderStyleStep(
  container = document.getElementById("app")
) {
  const defaultCSS = `/* You can edit these styles to customize how your posts look */
:root {
  --post-text-color: white;
}

.post {
  padding: 2rem;
  border-radius: 0.75rem;
  background-color: rgba(0, 0, 0, 0.6);
  font-family: "Times New Roman";
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}
.post .title {
  font-size: 1.17em;
  font-weight: bold;
  margin-bottom: 0.25rem;
}
.post .content {
  font-size: 1rem;
  line-height: 1.5;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}`;

  let savedCSS = defaultCSS;

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
          savedCSS = css;
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

  // Still allow overriding from localStorage if present (for onboarding)
  savedCSS = localStorage.getItem("onboarding-post-css") || savedCSS;

  let layout = "grid";
  let imageCount = 6;

  container.innerHTML = `
    <header><h2>Edit Your Posts</h2></header>
    <main>
      <label for="imageCount">Sample image count: <span id="imageCountLabel">${imageCount}</span></label>
      <input type="range" id="imageCount" min="0" max="6" value="${imageCount}" />
      <div id="previewContainer">
        <h3>Post Preview</h3>
        <article class="post preview-post show">
          <div class="tag-pill" style="--pill-color: #aabbcc">
            <span class="pill-label">General</span>
          </div>
          <h3 class="title">Your Preview Post</h3>
          <p class="content">
            I'm a preview of your future posts' style. Tweak the CSS below to change how I look! 
            Don't worry, you can always edit me later too.
          </p>
          <div id="image-preview-wrapper" style="position: relative; margin-top: 1rem;">
            <div id="image-preview-container" class="image-preview-container"></div>
            <div id="layout-selector" class="layout-dropdown" style="display: none;">
              <div class="selected-option">Grid</div>
              <div class="dropdown-options">
                <div class="dropdown-option" data-value="grid">Grid</div>
                <div class="dropdown-option" data-value="carousel">Carousel</div>
                <div class="dropdown-option" data-value="stack">Stack</div>
              </div>
              <input type="hidden" name="layout" id="layoutInput" value="grid" />
            </div>
          </div>
          <div class="post-footer">
            <small>${new Date().toLocaleString()}</small>
            <small>Posted by <a href="/@ilydna" style="color:white; text-decoration:underline;"><strong>@ilydna</strong></a></small>
          </div>
        </article>
      </div>
      <div>
        <textarea id="cssEditor" style="width: 100%; height: 400px; font-family: monospace;"></textarea>
      </div>
      <div style="margin-top: 1rem; display: flex; justify-content: space-between;">
        <button id="resetCSS">Reset CSS</button>
        <button id="saveButton">Save</button>
      </div>
    </main>
  `;

  const editor = CodeMirror.fromTextArea(
    container.querySelector("#cssEditor"),
    {
      mode: "css",
      theme: "material-darker",
      lineNumbers: true,
      lineWrapping: true,
    }
  );

  editor.setValue(savedCSS);

  const updateStyle = () => {
    const css = editor.getValue();
    localStorage.setItem("onboarding-post-css", css);
    let styleEl = document.getElementById("preview-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "preview-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  };

  editor.on("change", updateStyle);
  updateStyle();

  container.querySelector("#saveButton").addEventListener("click", async () => {
    const css = editor.getValue();
    const token = await getIdToken();
    if (!token) return alert("You're not logged in.");

    try {
      const res = await fetch(
        "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ post_css: css }),
        }
      );
      if (!res.ok) {
        console.error("Failed to save CSS", await res.text());
      } else {
        console.log("✅ CSS saved to user-meta");
      }
    } catch (err) {
      console.error("Network error saving CSS", err);
    }
  });

  container.querySelector("#resetCSS").addEventListener("click", () => {
    if (confirm("Reset your post CSS to default?")) {
      editor.setValue(defaultCSS);
    }
  });

  const imageCountInput = container.querySelector("#imageCount");
  const imageCountLabel = container.querySelector("#imageCountLabel");

  async function createSampleFiles(count = 6) {
    const urls = Array.from(
      { length: count },
      (_, i) => `/static/sample${i + 1}.jpg`
    );
    const files = await Promise.all(
      urls.map(async (url, i) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new File([blob], `sample${i + 1}.jpg`, { type: blob.type });
      })
    );
    return files;
  }

  async function updateLayoutPreview() {
    const files = await createSampleFiles(imageCount);
    const dummyInput = document.createElement("input");
    dummyInput.type = "file";
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    dummyInput.files = dataTransfer.files;

    const layoutInput = container.querySelector("#layoutInput");
    if (layoutInput) layoutInput.value = layout;

    await window.showImagePreview(dummyInput.files);
  }

  imageCountInput.addEventListener("input", (e) => {
    imageCount = parseInt(e.target.value);
    imageCountLabel.textContent = imageCount;
    updateLayoutPreview();
  });

  setupOnboardingLayoutToggle({
    onChange: (newLayout) => {
      layout = newLayout;
      updateLayoutPreview();
    },
  });

  updateLayoutPreview();
}
