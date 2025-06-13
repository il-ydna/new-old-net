import { setupOnboardingLayoutToggle } from "../ui.js";
import { getIdToken } from "../auth.js";
import { getCurrentUser } from "../state.js";

export function renderStyleStep() {
  const app = document.getElementById("app");

  const defaultCSS = `/* You can edit these styles to customize how your posts look */
.post {
  padding: 2rem;                            /* how thick is the padding? */
  border-radius: 0.75rem;                   /* how round are the edges? */
  background-color: rgba(0, 0, 0, 0.6);   /* background color of the post */
  color: white;                             /* text color */
  font-family: "Times New Roman";           /* Look up what fonts css has!*/
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);   /* optional drop shadow */
  transition: all 0.3s ease;                
}

/* Title formatting */
.post .title {
  font-size: 1.17em;        /* size of the title */
  font-weight: bold;        /* bold or normal */
  margin-bottom: 0.25rem;   /* space below the title */
}

/* Content formatting */
.post .content {
  font-size: 1rem;          /* paragraph font size */
  line-height: 1.5;         /* vertical spacing between lines */
}

/* Image formatting */
img {
  max-width: 100%;          /* scale to fit container */
  height: auto;             /* keep natural aspect ratio */
  display: block;           /* put on its own line */
  margin: 1rem auto;        /* space above/below, centered */
  border-radius: 6px;       /* slightly rounded corners */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); /* subtle shadow */
}`;

  const savedCSS = localStorage.getItem("onboarding-css") || defaultCSS;
  let layout = "grid";
  let imageCount = 6;
  app.innerHTML = `
    <header><h2>Step 1 of 3: Style Your Posts</h2></header>
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
        <button id="nextStep">Next: Background</button>
      </div>
      
    </main>
  `;

  const editor = CodeMirror.fromTextArea(document.getElementById("cssEditor"), {
    mode: "css",
    theme: "material-darker",
    lineNumbers: true,
    lineWrapping: true,
  });

  editor.setValue(savedCSS);

  const updateStyle = () => {
    const css = editor.getValue();
    localStorage.setItem("onboarding-css", css);
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

  document.getElementById("nextStep").addEventListener("click", async () => {
    const css = editor.getValue();
    const token = await getIdToken();
    console.log(token);

    if (!token) {
      alert("You're not logged in.");
      return;
    }

    try {
      const res = await fetch(
        "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            custom_css: css,
          }),
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

    history.pushState({}, "", "/onboarding/background");
    window.dispatchEvent(new Event("popstate"));
  });

  document.getElementById("resetCSS").addEventListener("click", () => {
    if (
      confirm("Reset your post CSS to default? This will erase your changes.")
    ) {
      editor.setValue(defaultCSS);
    }
  });

  const imageCountInput = document.getElementById("imageCount");
  const layoutButtons = document.querySelectorAll("#layoutSelector button");
  const previewWrapper = document.getElementById("layout-preview-wrapper");

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

    // Inject dummy input so showImagePreview can use it
    const layoutInput = document.getElementById("layoutInput");
    if (!layoutInput) {
      const hidden = document.createElement("input");
      hidden.id = "layoutInput";
      hidden.name = "layout";
      hidden.value = layout;
      hidden.type = "hidden";
      document.body.appendChild(hidden);
    } else {
      layoutInput.value = layout;
    }

    await window.showImagePreview(dummyInput.files);
  }

  imageCountInput.addEventListener("input", (e) => {
    imageCount = parseInt(e.target.value);
    imageCountLabel.textContent = imageCount; // ✅ Update label text
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
