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
        const userId = payload["sub"];
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

        await migrateUserProjects(userId, idToken);

        const returnTo =
          new URLSearchParams(window.location.search).get("returnTo") ||
          (newUser ? `/onboarding/style` : `/@${username}`);

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

  const payload = {
    tags: defaultTags,
    default_post_tag: "journal",
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

async function migrateUserProjects(userId, idToken) {
  // 1️⃣ Check if projects exist
  const resProjects = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/projects?userId=${userId}`
  );
  const projects = await resProjects.json();

  if (projects.length > 0) {
    console.log("✅ Projects already exist — no migration needed");
    return;
  }

  // 2️⃣ Fetch user-meta
  const resMeta = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${userId}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );

  if (!resMeta.ok) {
    console.warn("❌ Failed to fetch user-meta for migration");
    return;
  }

  const meta = await resMeta.json();

  // 3️⃣ Build project payload
  const payload = {
    userId: userId,
    name: "My Page",
    slug: "default",
    background_url: meta.background_url || "",
    tags: meta.tags || [],
    default_tag: meta.default_tag || "",
    layout_css: meta.layout_css || "",
    post_css: meta.post_css || "",
    default_layout: meta.default_layout || "columns",
    created_at: Date.now(),
  };

  // 4️⃣ Create default project
  const resCreate = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/project`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (resCreate.ok) {
    console.log("✅ Default project created");
  } else {
    console.error(
      "❌ Failed to create default project",
      await resCreate.text()
    );
  }
}
