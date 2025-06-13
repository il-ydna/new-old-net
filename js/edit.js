import { renderStyleStep } from "./views/editPostView.js";
import { renderBackgroundStep } from "./views/editPageView.js";
import { updateHeader } from "./posts.js";
import { getCurrentUser } from "./state.js";

export async function renderEditPage(username) {
  const app = document.getElementById("app");

  app.innerHTML = `
<div class="tab-bar" style="
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  width: 600px;
  margin: 0 auto 1rem auto;
  padding: 0 1rem;
">
  <div style="display: flex; gap: 0.5rem;">
    <button id="backToPageBtn">← Back</button>
    <button class="tab-button selected" data-tab="page">Posts</button>
    <button class="tab-button" data-tab="layout">Layout</button>
  </div>
  <div id="user-controls"></div>
</div>

<div id="tab-content" style="margin-top: 64px;"></div>


  `;

  const tabContent = document.getElementById("tab-content");

  function renderTab(tab) {
    tabContent.innerHTML = ""; // clear previous content
    if (tab === "page") {
      renderStyleStep(tabContent); // Pass container
    } else if (tab === "layout") {
      renderBackgroundStep(tabContent); // Pass container
    }

    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.tab === tab);
    });
  }

  renderTab("page");

  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      renderTab(btn.dataset.tab);
    });
  });

  document.getElementById("backToPageBtn").addEventListener("click", () => {
    const username = getCurrentUser()?.username || "me";
    history.pushState({}, "", `/@${username}`);
    window.dispatchEvent(new Event("popstate"));
  });
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id"); // or use `getPageOwner()?.id` if available

  if (userId) {
    fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${userId}`
    )
      .then((res) => res.json())
      .then((meta) => {
        const bg = meta?.background_url;
        if (bg) {
          const timestamped = `${bg}?t=${Date.now()}`;
          document.documentElement.style.backgroundImage = `url('${timestamped}')`;
          document.documentElement.style.backgroundSize = "cover";
          document.documentElement.style.backgroundRepeat = "no-repeat";
          document.documentElement.style.backgroundPosition = "center center";
          document.documentElement.style.backgroundAttachment = "fixed";

          const previewEl = document.getElementById("theme-preview-wrapper");
          if (previewEl) {
            previewEl.style.backgroundImage = `url('${timestamped}')`;
            previewEl.style.backgroundSize = "cover";
            previewEl.style.backgroundRepeat = "no-repeat";
            previewEl.style.backgroundPosition = "center center";
            previewEl.style.backgroundAttachment = "fixed";
          }
        }
      })
      .catch((err) => console.warn("❌ Failed to fetch background_url:", err));
  }

  updateHeader();
}
