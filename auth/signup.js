const poolData = {
  UserPoolId: "us-east-2_lXvCqndHZ",
  ClientId: "b2k3m380g08hmtmdn9osi12vg",
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

export default function initSignupForm() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!username || !email || !password) {
      alert("Please fill in all fields");
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
        alert(err.message || JSON.stringify(err));
        return;
      }

      alert(
        "Sign up successful! Please check your email for the confirmation code."
      );

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
