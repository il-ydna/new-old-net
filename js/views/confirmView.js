import initConfirmForm from "../../auth/confirm.js";

export function renderConfirmPage() {
  document.body.classList.remove("edit-mode");

  document.getElementById("app").innerHTML = `
    <h2>Confirm Account</h2>
    <form id="confirmForm">
      <input type="text" name="username" placeholder="Username" required />
      <input type="text" name="code" placeholder="Confirmation Code" required />
      <button type="submit">Confirm</button>
    </form>
    <p><a href="/auth/login" id="goLogin">Back to Log In</a></p>
  `;

  initConfirmForm();

  const goLogin = document.getElementById("goLogin");
  if (goLogin) {
    goLogin.addEventListener("click", (e) => {
      e.preventDefault();
      const returnTo = encodeURIComponent(window.location.pathname);
      history.pushState({}, "", `/auth/login?returnTo=${returnTo}`);
      window.dispatchEvent(new Event("popstate"));
    });
  }
}
