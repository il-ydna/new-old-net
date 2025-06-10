import { renderUserPage } from "./user.js";
import { renderLoginPage } from "./views/loginView.js";
import { renderSignupPage } from "./views/signupView.js";
import { renderConfirmPage } from "./views/confirmView.js";
import { renderEditPage } from "./edit.js";
import { renderUserControls } from "./ui.js";

function parseRoute() {
  const path = window.location.pathname;
  console.log("Routing to", path); // debug

  if (path === "/" || path === "") {
    document.getElementById("app").innerHTML = `
    <header>
      <div id="user-controls"></div>
    </header>
    <main>
      <h1>Welcome</h1>
    </main>
  `;

    const controlsEl = renderUserControls();
    const placeholder = document.getElementById("user-controls");
    if (placeholder) placeholder.replaceWith(controlsEl);

    return;
  }

  if (path.startsWith("/@")) {
    const [, rawUsername, subroute] = path.split("/");
    const username = rawUsername.replace(/^@/, "");

    console.log(username);
    if (subroute === "edit") {
      renderEditPage(username); // ✅ Handles /@username/edit
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
