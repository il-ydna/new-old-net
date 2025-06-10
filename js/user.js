import { renderPosts } from "./render.js";
import { setupPostLayoutDropdown } from "./ui.js";
import { updateHeader } from "./posts.js";
import { getCurrentUser, setPageOwner, getPageOwner } from "./state.js";

window.addEventListener("DOMContentLoaded", async () => {
  await updateHeader(); // ✅ Add this line
  setupPostLayoutDropdown();

  const params = new URLSearchParams(window.location.search);
  const pageOwnerId = params.get("id");
  setPageOwner({ id: pageOwnerId });

  if (!pageOwnerId) {
    document.getElementById("posts").innerHTML =
      "<p style='color:red; text-align:center;'>User not specified.</p>";
    return;
  }

  if (getCurrentUser()?.id === getPageOwner()?.id) {
    // Show form and dropdown
    document.getElementById("owner-controls").style.display = "block";

    // Import and run main logic for post creation
    const { default: initMain } = await import("./main.js");
    initMain(); // wrap main.js logic in an init function
  }

  try {
    const userMetaRes = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${
        getPageOwner()?.id
      }`
    );
    const userMeta = await userMetaRes.json();

    if (userMeta?.custom_css) {
      const existing = document.getElementById("user-custom-style");
      if (existing) existing.remove();

      const style = document.createElement("style");
      style.id = "user-custom-style";
      style.textContent = userMeta.custom_css;
      document.head.appendChild(style);
    }

    if (userMeta?.background_url) {
      const root = document.documentElement; // refers to <html>

      root.style.backgroundImage = `url('${userMeta.background_url}')`;
      root.style.backgroundSize = "cover";
      root.style.backgroundAttachment = "fixed";
      root.style.backgroundRepeat = "no-repeat";
      root.style.backgroundPosition = "center";
    }
  } catch (err) {
    console.warn("Failed to load user meta:", err);
  }

  // Always show posts
  try {
    const response = await fetch(
      "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/"
    );
    const posts = await response.json();
    const userPosts = posts.filter((p) => p.pageOwnerId === getPageOwner()?.id);
    renderPosts(userPosts);
  } catch (e) {
    document.getElementById("posts").innerHTML =
      "<p style='color:red; text-align:center;'>Failed to load posts.</p>";
  }
});
