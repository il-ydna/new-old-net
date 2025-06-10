import { renderUserPage } from "./user.js";
import { renderLoginPage } from "./views/loginView.js";
import { renderSignupPage } from "./views/signupView.js";
import { renderConfirmPage } from "./views/confirmView.js";

function parseRoute() {
  const path = window.location.pathname;
  console.log("Routing to", path); // debug

  if (path === "/" || path === "") {
    document.getElementById("app").innerHTML = "<h1>Welcome</h1>";
    return;
  }

  if (path.startsWith("/@")) {
    const username = path.slice(2);
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
