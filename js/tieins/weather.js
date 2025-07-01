export function renderInputRow(data = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "tie-in-row";
  wrapper.style =
    "display:flex; gap:0.5rem; margin-bottom:0.5rem; flex-wrap:wrap;";

  wrapper.innerHTML = `
    <input type="text" placeholder="City/Location" class="tie-in-location" value="${
      data.location || ""
    }" />
    <button type="button" class="fetch-tie-in button-style">Fetch Weather</button>
    <button type="button" class="remove-tie-in button-style" style="padding:0 0.5rem;">×</button>
    <div class="tie-in-result" style="margin-top:0.25rem; font-size:0.9rem; color:gray;"></div>
  `;

  const fetchBtn = wrapper.querySelector(".fetch-tie-in");
  const removeBtn = wrapper.querySelector(".remove-tie-in");
  const locationInput = wrapper.querySelector(".tie-in-location");
  const resultEl = wrapper.querySelector(".tie-in-result");

  fetchBtn.addEventListener("click", async () => {
    resultEl.textContent = "Loading...";
    const output = await getResult({ location: locationInput.value });
    resultEl.textContent = output;
  });

  removeBtn.addEventListener("click", () => {
    wrapper.remove();
    updateTieInHiddenInput();
  });

  locationInput.addEventListener("input", updateTieInHiddenInput);

  updateTieInHiddenInput();

  return wrapper;
}

export async function getResult({ location }) {
  if (!location) return "⚠ Please enter a location.";
  await new Promise((r) => setTimeout(r, 1000)); // Simulate API delay
  return `Mock Weather for ${location}: 75°F`;
}
