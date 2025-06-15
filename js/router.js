import { renderUserPage } from "./user.js";
import { renderLoginPage } from "./views/loginView.js";
import { renderSignupPage } from "./views/signupView.js";
import { renderConfirmPage } from "./views/confirmView.js";
import { renderEditPage } from "./edit.js";
import { renderUserControls } from "./ui.js";
import { renderHomePage } from "./views/homeView.js";

import { setPageOwner } from "./state.js";
import { getUserMetaByUsername } from "./user.js"; // or wherever it's defined

function parseRoute() {
  const path = window.location.pathname;
  console.log("Routing to", path); // debug

  if (path === "/" || path === "") {
    const token = localStorage.getItem("idToken");

    if (token) {
      // ✅ Dynamically load the personalized feed
      import("./views/feedView.js").then((mod) => mod.renderFeedView());
    } else {
      // ✅ Show static homepage to logged-out users
      renderHomePage();

      const controlsEl = renderUserControls();
      const placeholder = document.getElementById("user-controls");
      if (placeholder) placeholder.replaceWith(controlsEl);
    }

    return;
  }

  if (path.startsWith("/@")) {
    const [, rawUsername, edit, tab] = path.split("/");
    const username = rawUsername.replace(/^@/, "");

    if (edit === "edit") {
      getUserMetaByUsername(username).then((meta) => {
        if (meta?.id) {
          setPageOwner({ id: meta.id, username });
        }
        renderEditPage(username, tab || "page");
      });
      return;
    }

    renderUserPage(username); // Handles /@username
    return;
  }

  if (path === "/auth/signup") {
    renderSignupPage();
    return;
  }

  if (path === "/auth/login") {
    renderLoginPage();
    return;
  }

  if (path === "/auth/confirm") {
    renderConfirmPage();
    return;
  }

  document.getElementById("app").innerHTML = "<h1>404 Not Found</h1>";
}

window.addEventListener("popstate", parseRoute);
window.addEventListener("DOMContentLoaded", parseRoute);
