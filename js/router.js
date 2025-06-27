import { renderUserPage } from "./views/hubView.js";
import { renderLoginPage } from "./views/loginView.js";
import { renderSignupPage } from "./views/signupView.js";
import { renderConfirmPage } from "./views/confirmView.js";
import { renderProjectPage } from "./views/projectView.js";
import { renderEditPage } from "./edit.js";
import { renderUserControls } from "./ui.js";
import { renderHomePage } from "./views/homeView.js";

import { setPageOwner } from "./state.js";
import { getUserMetaByUsername } from "./auth.js";

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
    const parts = path.split("/");
    const rawUsername = parts[1];
    const username = rawUsername.replace(/^@/, "");
    const next = parts[2];
    const sub = parts[3];
    const subsub = parts[4];

    if (next === "project" && sub && subsub === "edit") {
      // /@username/project/:slug/edit
      getUserMetaByUsername(username).then(async (meta) => {
        if (meta?.id) {
          const projectRes = await fetch(
            `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/projects?userId=${meta.id}`
          );
          const projects = await projectRes.json();
          const project = projects.find((p) => p.slug === sub);
          if (project) {
            setPageOwner({ id: meta.id, username, project });
            renderEditPage(username);
          } else {
            console.warn("❌ Project not found for editing");
            history.replaceState({}, "", `/@${username}`);
            window.dispatchEvent(new Event("popstate"));
          }
        }
      });
      return;
    }

    if (next === "edit") {
      getUserMetaByUsername(username).then((meta) => {
        if (meta?.id) {
          setPageOwner({ id: meta.id, username });
        }
        renderEditPage(username);
      });
      return;
    }

    if (next === "project" && sub) {
      renderProjectPage(username, sub);
      return;
    }

    renderUserPage(username);
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
