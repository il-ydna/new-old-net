const poolData = {
  UserPoolId: "us-east-2_lXvCqndHZ",
  ClientId: "b2k3m380g08hmtmdn9osi12vg",
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

function showErrorMessage(message) {
  const errorDiv = document.getElementById("errorMessage");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
}

export default function initSignupForm() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    // Comprehensive input validation
    if (!username) {
      showErrorMessage("Username is required");
      return;
    }

    if (!email) {
      showErrorMessage("Email is required");
      return;
    }

    // Robust email validation regex
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      showErrorMessage("Please enter a valid email address");
      return;
    }

    if (!password) {
      showErrorMessage("Password is required");
      return;
    }

    if (password.length < 8) {
      showErrorMessage("Password must be at least 8 characters long");
      return;
    }

    if (!confirmPassword) {
      showErrorMessage("Please confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      showErrorMessage("Passwords do not match");
      return;
    }

    const attributeList = [
      new AmazonCognitoIdentity.CognitoUserAttribute({
        Name: "email",
        Value: email,
      }),
    ];

    userPool.signUp(username, password, attributeList, null, (err, result) => {
      if (err) {
        showErrorMessage(err.message || JSON.stringify(err));
        return;
      }

      const returnTo =
        new URLSearchParams(window.location.search).get("returnTo") || "/";
      // Use pushState so your SPA router can render the view
      const confirmUrl = `/auth/confirm?username=${encodeURIComponent(
        username
      )}&returnTo=${encodeURIComponent(returnTo)}`;
      history.pushState({}, "", confirmUrl);
      window.dispatchEvent(new Event("popstate"));
    });
  });
}
