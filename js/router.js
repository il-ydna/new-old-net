import { renderUserPage } from "./user.js";
import { renderLoginPage } from "./views/loginView.js";
import { renderSignupPage } from "./views/signupView.js";
import { renderConfirmPage } from "./views/confirmView.js";
import { renderEditPage } from "./edit.js";
import { renderUserControls } from "./ui.js";
import { renderHomePage } from "./views/homeView.js";
import { renderStyleStep } from "./views/styleView.js";
import { renderBackgroundStep } from "./views/backgroundView.js";
import { renderLayoutStep } from "./views/layoutView.js";

function parseRoute() {
  const path = window.location.pathname;
  console.log("Routing to", path); // debug

  if (path === "/" || path === "") {
    renderHomePage();

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

  if (path === "/onboarding/style") {
    renderStyleStep();
    return;
  }
  if (path === "/onboarding/background") {
    renderBackgroundStep();
    return;
  }
  if (path === "/onboarding/layout") {
    renderLayoutStep();
    return;
  }

  document.getElementById("app").innerHTML = "<h1>404 Not Found</h1>";
}

window.addEventListener("popstate", parseRoute);
window.addEventListener("DOMContentLoaded", parseRoute);
