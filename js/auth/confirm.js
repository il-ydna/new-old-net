const poolData = {
  UserPoolId: "us-east-2_lXvCqndHZ",
  ClientId: "b2k3m380g08hmtmdn9osi12vg",
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

export default function initConfirmForm() {
  const form = document.getElementById("confirmForm");
  if (!form) return;

  const usernameInput = form.username;
  const params = new URLSearchParams(window.location.search);
  const passedUsername = params.get("username");

  if (passedUsername) {
    usernameInput.value = passedUsername;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const code = form.code.value.trim();

    if (!username || !code) {
      alert("Please enter both username and confirmation code.");
      return;
    }

    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        alert(err.message || JSON.stringify(err));
        return;
      }

      alert("Confirmation successful! You can now log in.");

      const returnTo = params.get("returnTo") || "/";
      history.pushState(
        {},
        "",
        `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      );
      window.dispatchEvent(new Event("popstate"));
    });
  });
}
