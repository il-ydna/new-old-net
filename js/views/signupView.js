import initSignupForm from "../../auth/signup.js";

export function renderSignupPage() {
  document.body.classList.remove("edit-mode");

  document.getElementById("app").innerHTML = `
    <h2>Sign Up</h2>
    <form id="signupForm">
      <input type="text" name="username" placeholder="Username" required />
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Sign Up</button>
    </form>
    <p><a href="/auth/login" id="goLogin">Already have an account?</a></p>
  `;

  initSignupForm();

  // ✅ Intercept the login link to route within the SPA
  const goLogin = document.getElementById("goLogin");
  if (goLogin) {
    goLogin.addEventListener("click", (e) => {
      e.preventDefault();
      const returnTo =
        new URLSearchParams(window.location.search).get("returnTo") || "/";
      history.pushState(
        {},
        "",
        `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      );
      window.dispatchEvent(new Event("popstate"));
    });
  }
}
