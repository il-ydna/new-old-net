import { renderStyleTab } from "./views/editPostView.js";
import { renderBackgroundTab } from "./views/editPageView.js";
import { renderTagTab } from "./views/editTagView.js";
import { updateHeader } from "./posts.js";
import { getCurrentUser, getPageOwner } from "./state.js";
import { fetchUserMeta } from "./auth.js";

export async function renderEditPage(username) {
  const app = document.getElementById("app");

  let currentUser = getCurrentUser();
  if (!currentUser) {
    currentUser = await fetchUserMeta();
  }

  const pageOwner = getPageOwner();
  const project = pageOwner?.project;

  if (!currentUser || pageOwner?.id !== currentUser.id) {
    history.replaceState({}, "", `/@${currentUser?.username || "me"}`);
    window.dispatchEvent(new Event("popstate"));
    return;
  }

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
      <button class="tab-button" data-tab="projects">Tags</button>
    </div>
    <div id="user-controls"></div>
  </div>

  <div id="tab-content" style="margin-top: 64px;"></div>
  `;

  const tabContent = document.getElementById("tab-content");

  async function renderTab(tab) {
    tabContent.innerHTML = "";
    if (tab === "page") {
      await renderStyleTab(tabContent);
    } else if (tab === "layout") {
      await renderBackgroundTab(tabContent);
    } else if (tab === "projects") {
      await renderTagTab(tabContent);
    }

    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.tab === tab);
    });
  }

  await renderTab("page");

  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await renderTab(btn.dataset.tab);
    });
  });

  document.getElementById("backToPageBtn").addEventListener("click", () => {
    const u = currentUser?.username || "me";
    if (project?.slug) {
      history.pushState({}, "", `/@${u}/project/${project.slug}`);
    } else {
      history.pushState({}, "", `/@${u}`);
    }
    window.dispatchEvent(new Event("popstate"));
  });

  // Set background
  const bgUrl = project?.background_url || pageOwner?.background_url;
  if (bgUrl) {
    const timestamped = `${bgUrl}?t=${Date.now()}`;
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

  updateHeader();
}
