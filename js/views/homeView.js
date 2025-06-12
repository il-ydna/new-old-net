import { renderUserControls } from "../ui.js";
import { updateHeader } from "../posts.js";

export function renderHomePage() {
  document.body.classList.remove("edit-mode");

  document.getElementById("app").innerHTML = `
    <header>
        <div style="display: flex; justify-content: flex-end; width: 100%;">
            <div id="user-controls"></div>
        </div>    
    </header>
    <main>
      <h1>Welcome to ___________</h1>
      <section id="posts" class="layout-timeline">
        <article class="post show">
          <div class="tag-pill" style="--pill-color: #ff6f91;" title="Hey!!!">
            <span class="pill-label">Hey!!!</span>
          </div>
          <h3>Make yourself.</h3>
          <p>Curate a portfolio, journal, or collection of rambling thoughts (or all three). Go nuts!</p>
          <div class="post-footer">
            <small>6/11/2025, 11:20:12 AM</small>
            <small><strong>@ilydna</strong></small>
          </div>
        </article>
        <article class="post show">
            <div class="tag-pill" style="--pill-color: #ff6f91;" title="Hey!!!">
              <span class="pill-label">Hey!!!</span>
            </div>
            <h3>You ready?</h3>
            <p>
            <span id="getStartedPrefix">Click here to get started</span>
            <a href="#" id="userPageLink" style="text-decoration: underline; color: #fff; display: none;"></a>
            </p>
            <div class="post-footer">
                <small>${new Date().toLocaleString()}</small>
                <small><strong>@ilydna</strong></small>
            </div>
        </article>

      </section>
    </main>
  `;

  const controlsEl = renderUserControls();
  document.getElementById("user-controls").replaceWith(controlsEl);

  const userLink = document.getElementById("userPageLink");
  const prefixSpan = document.getElementById("getStartedPrefix");

  const token = localStorage.getItem("idToken");

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const username = payload["cognito:username"];
      userLink.textContent = `@${username}`;
      userLink.href = `/@${username}`;
      userLink.style.display = "inline";

      prefixSpan.textContent = "Visit your page ";

      userLink.addEventListener("click", (e) => {
        e.preventDefault();
        history.pushState({}, "", `/@${username}`);
        window.dispatchEvent(new Event("popstate"));
      });
    } catch {
      // fallback if token can't be parsed
      setFallbackLink();
    }
  } else {
    setFallbackLink();
  }

  function setFallbackLink() {
    // Entire phrase becomes a link
    const wrapper = prefixSpan.parentElement;
    wrapper.innerHTML = `
    <a href="#" id="fallbackStartLink" style="text-decoration: underline; color: #fff;">
      Click here to get started
    </a>
  `;
    const fallbackLink = document.getElementById("fallbackStartLink");
    fallbackLink.addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState({}, "", "/auth/signup?returnTo=/");
      window.dispatchEvent(new Event("popstate"));
    });
  }
  updateHeader();
}
