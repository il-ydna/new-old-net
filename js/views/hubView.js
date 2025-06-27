import { getIdToken, getUserMetaByUsername } from "../auth.js";

export async function renderUserPage(username) {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>Loading projects...</h2>";

  try {
    const meta = await getUserMetaByUsername(username);
    if (!meta?.id) {
      app.innerHTML = `<h2>User not found</h2>`;
      return;
    }

    const token = await getIdToken();
    const res = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/projects?userId=${meta.id}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (!res.ok) {
      app.innerHTML = `<h2>Failed to load projects</h2>`;
      console.error(await res.text());
      return;
    }

    const projects = await res.json();

    app.innerHTML = `
      <header>
        <h1>${username}'s Projects</h1>
      </header>
      <main>
        <ul id="projectList" style="list-style: none; padding: 0;">
          ${projects
            .map(
              (proj) => `
            <li style="margin: 0.5rem 0;">
              <a href="/@${username}/project/${
                proj.slug
              }" style="text-decoration: underline; color: #4af;">
                ${proj.name || "Untitled Project"}
              </a>
            </li>
          `
            )
            .join("")}
        </ul>
      </main>
    `;
  } catch (err) {
    console.error("Error loading user projects", err);
    app.innerHTML = `<h2>Error loading projects</h2>`;
  }
}
