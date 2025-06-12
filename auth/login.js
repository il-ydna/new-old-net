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
      onSuccess: async (result) => {
        const idToken = result.getIdToken().getJwtToken();
        localStorage.setItem("idToken", idToken);

        const payload = JSON.parse(atob(idToken.split(".")[1]));
        const username = payload["cognito:username"];
        let newUser = false;

        try {
          const checkRes = await fetch(
            `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?username=${username}`,
            {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            }
          );

          if (checkRes.ok) {
            const userMeta = await checkRes.json();
            if (!userMeta?.id) {
              await createUserProfile(idToken);
              newUser = true;
            } else {
              console.log("✅ Existing user, skipping profile creation");
            }
          } else {
            console.warn("⚠️ Failed to fetch user meta:", checkRes.status);
            await createUserProfile(idToken);
            newUser = true;
          }
        } catch (err) {
          console.error("❌ Error checking/creating user profile:", err);
        }

        const returnTo =
          new URLSearchParams(window.location.search).get("returnTo") ||
          (newUser ? `/@${username}/edit` : `/@${username}`);

        history.pushState({}, "", returnTo);
        window.dispatchEvent(new Event("popstate"));
      },

      onFailure: (err) => {
        alert(err.message || JSON.stringify(err));
      },
    });
  });
}

async function createUserProfile(idToken) {
  const defaultTags = [
    {
      name: "Journal",
      value: "journal",
      color: "#7f8c8d",
      textColor: "#ffffff",
    },
    {
      name: "Mood",
      value: "mood",
      color: "#3498db",
      textColor: "#ffffff",
    },
    {
      name: "Photos",
      value: "photos",
      color: "#2ecc71",
      textColor: "#ffffff",
    },
  ];

  const defaultCSS = `
    /* === BASIC CUSTOM STYLES === */

/* Text and background theme */
:root {
  --text-color: #ffffff;
  --background-color: rgba(0,0,0,0.8);
}

/* Font settings */
body {
  font-family: "Times New Roman", serif;
  color: var(--text-color);
  background-color: var(--background-color);
  max-width: 600px;
  margin: auto;
  padding: 1rem;
}

/* Optional background image settings */
html {
  background-size: cover;
  background-attachment: fixed;
  background-repeat: no-repeat;
  background-position: center center;
}

/* Post layout padding and spacing */
.post {
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 0.75rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  background-color: rgba(0, 0, 0, 0.8);
}

/* Image presentation */
img {
  max-width: 100%;
  border-radius: 6px;
  margin-top: 0.5rem;
}

/* Buttons */
button,
.button-style {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  border-radius: 6px;
  padding: 0.5rem 1rem;
}

  `;

  const payload = {
    tags: defaultTags,
    default_post_tag: "journal",
    custom_css: defaultCSS.trim(),
    created_at: Date.now(),
    default_layout: "stack",
  };

  const res = await fetch(
    "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (res.ok) {
    const data = await res.json();
    console.log("✅ User profile created:", data.message);
  } else {
    console.warn("⚠️ Failed to create user profile:", res.status);
  }
}
