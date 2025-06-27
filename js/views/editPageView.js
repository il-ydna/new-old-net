import { getIdToken } from "../auth.js";
import { applyUserBackground } from "../ui.js";
import { getPageOwner } from "../state.js";
let currentBackgroundURL = null;

export async function renderBackgroundTab(
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

  // ✅ Apply saved default layout
  const pageOwner = getPageOwner();
  if (!pageOwner?.project?.id) {
    console.warn("No project selected.");
    return;
  }
  if (pageOwner?.id) {
    fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/project?id=${pageOwner.project.id}`
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

  document.getElementById("saveButton").addEventListener("click", async () => {
    const token = await getIdToken();
    if (!token) {
      alert("You're not logged in.");
      return;
    }

    const cleanURL = currentBackgroundURL?.split("?")[0];

    try {
      const payload = {
        id: pageOwner.project.id,
        layout_css: editor.getValue(),
        default_layout: layoutSelect.value,
        background_url: cleanURL,
      };

      console.log("Saved background_url:", currentBackgroundURL);

      const res = await fetch(
        "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/project",
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
        console.log("✅ Theme saved");
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
}
