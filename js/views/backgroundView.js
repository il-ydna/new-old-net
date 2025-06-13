export function renderBackgroundStep() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <header><h2>Step 2 of 3: Choose a Background</h2></header>
    <main>
      <p>Upload an image and see how it looks behind your posts.</p>
      <!-- TODO: Reuse background dropzone from edit.js -->
      <button id="nextStep">Next: Layout</button>
    </main>
  `;

  document.getElementById("nextStep").addEventListener("click", () => {
    history.pushState({}, "", "/onboarding/layout");
    window.dispatchEvent(new Event("popstate"));
  });
}
