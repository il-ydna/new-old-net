export function renderLayoutStep() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <header><h2>Step 3 of 3: Choose Your Layout</h2></header>
    <main>
      <p>Pick a layout and finish customizing your page.</p>
      <!-- TODO: Render layout dropdown + custom CSS + default tag -->
      <button id="finishSetup">Finish & View My Page</button>
    </main>
  `;

  document.getElementById("finishSetup").addEventListener("click", () => {
    // Set onboarded flag in backend later
    const username = localStorage.getItem("username");
    if (username) {
      history.pushState({}, "", `/@${username}`);
      window.dispatchEvent(new Event("popstate"));
    }
  });
}
