import initLoginForm from "../../auth/login.js";

export function renderLoginPage() {
  document.body.classList.remove("edit-mode");

  document.getElementById("app").innerHTML = `
    <h2>Log In</h2>
    <form id="loginForm">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Log In</button>
    </form>
    <p><a href="/auth/signup" id="goSignup">Don't have an account?</a></p>
  `;

  initLoginForm();

  // ✅ Intercept the signup link to stay in SPA
  const goSignup = document.getElementById("goSignup");
  if (goSignup) {
    goSignup.addEventListener("click", (e) => {
      e.preventDefault();
      const returnTo = encodeURIComponent(window.location.pathname);
      history.pushState({}, "", `/auth/signup?returnTo=${returnTo}`);
      window.dispatchEvent(new Event("popstate"));
    });
  }
}
