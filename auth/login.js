const poolData = {
  UserPoolId: "us-east-2_lXvCqndHZ",
  ClientId: "b2k3m380g08hmtmdn9osi12vg",
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

export default function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: username,
      Password: password,
    });

    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        localStorage.setItem("idToken", idToken);

        const returnTo =
          new URLSearchParams(window.location.search).get("returnTo") || "/";
        history.pushState({}, "", returnTo);
        window.dispatchEvent(new Event("popstate"));
      },
      onFailure: (err) => {
        alert(err.message || JSON.stringify(err));
      },
    });
  });
}
