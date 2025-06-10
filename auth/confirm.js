const poolData = {
  UserPoolId: "us-east-2_lXvCqndHZ",
  ClientId: "b2k3m380g08hmtmdn9osi12vg",
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username") || "";
document.getElementById("username").value = username;

document.getElementById("confirmBtn").addEventListener("click", async () => {
  const code = document.getElementById("code").value.trim();
  if (!username || !code) {
    alert("Please enter username and confirmation code");
    return;
  }

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: username,
    Pool: userPool,
  });

  cognitoUser.confirmRegistration(code, true, async (err, result) => {
    if (err) {
      alert(err.message || JSON.stringify(err));
      return;
    }

    const password = prompt("Enter your password to finish setup:");
    if (!password) {
      alert("Password required to finish registration.");
      return;
    }

    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: username,
      Password: password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async (session) => {
        const idToken = session.getIdToken().getJwtToken();

        try {
          const response = await fetch(
            "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                username,
                custom_css: "",
                default_layout: "columns",
              }),
            }
          );

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to create user profile");
          }

          alert("Confirmation successful! You can now log in.");
          const returnTo =
            new URLSearchParams(window.location.search).get("returnTo") || "/";
          window.location.href = `login.html?returnTo=${encodeURIComponent(
            returnTo
          )}`;
        } catch (e) {
          alert("User confirmed, but profile setup failed: " + e.message);
          console.error(e);
        }
      },
      onFailure: (authErr) => {
        alert("Login failed: " + (authErr.message || JSON.stringify(authErr)));
      },
    });
  });
});

document.getElementById("resendBtn").addEventListener("click", () => {
  if (!username) {
    alert("Username missing");
    return;
  }

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: username,
    Pool: userPool,
  });

  cognitoUser.resendConfirmationCode((err, result) => {
    if (err) {
      alert(err.message || JSON.stringify(err));
      return;
    }
    alert("Confirmation code resent! Check your email.");
  });
});
