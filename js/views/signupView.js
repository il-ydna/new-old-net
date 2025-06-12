import initSignupForm from "../auth/signup.js";

export function renderSignupPage() {
  document.body.classList.remove("edit-mode");

  document.getElementById("app").innerHTML = `
    <div style="padding: 1rem">
      <h2>Sign Up</h2>
      <form id="signupForm">
        <input type="text" name="username" placeholder="Username" />
        <input type="text" name="email" placeholder="Email" />
        <input type="password" name="password" placeholder="Password" id="passwordInput" />
        <input type="password" name="confirmPassword" placeholder="Confirm Password" />
        
        <div style="display: flex; justify-content: center; margin-top: 2rem;">
          <div style="font-size: 1rem; color: white; margin: 10px 0; text-align: left;">
            <strong>Password requirements</strong><br>
            <div id="req-number" style="margin: 2px 0;">
              <span class="check">☐</span> Contains at least 1 number
            </div>
            <div id="req-special" style="margin: 2px 0;">
              <span class="check">☐</span> Contains at least 1 special character
            </div>
            <div id="req-uppercase" style="margin: 2px 0;">
              <span class="check">☐</span> Contains at least 1 uppercase letter
            </div>
            <div id="req-lowercase" style="margin: 2px 0;">
              <span class="check">☐</span> Contains at least 1 lowercase letter
            </div>
          </div>
          
        </div>
        <div style="display: flex; justify-content: center; margin-top: 2rem;">
          <button type="submit">Sign Up</button>
        </div>
        <div style="text-align: center; margin-top: 1rem;">
          <div id="errorMessage" style="color: salmon; display: none; margin: 10px 0;"></div>
        </div>
        
        
      </form>
      <div style="text-align: center; margin-top: 1rem;">
        <button href="/auth/login" id="goLogin">Already have an account?</button>
      </div>
    </div>
  `;

  initSignupForm();

  // Add password requirement checker
  const passwordInput = document.getElementById("passwordInput");
  if (passwordInput) {
    passwordInput.addEventListener("input", (e) => {
      const password = e.target.value;

      // Check each requirement
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);

      // Update checkboxes
      updateRequirement("req-number", hasNumber);
      updateRequirement("req-special", hasSpecial);
      updateRequirement("req-uppercase", hasUppercase);
      updateRequirement("req-lowercase", hasLowercase);
    });
  }

  function updateRequirement(id, isMet) {
    const element = document.getElementById(id);
    if (element) {
      const checkbox = element.querySelector(".check");
      if (isMet) {
        checkbox.textContent = "☑";
        checkbox.style.color = "green";
        element.style.color = "white";
      } else {
        checkbox.textContent = "☐";
        checkbox.style.color = "#666";
        element.style.color = "white";
      }
    }
  }

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
