export function createTieInRow(inputs = [], type = "", onFetch = async () => "") {
  const wrapper = document.createElement("div");
  wrapper.className = "tie-in-row";
  wrapper.dataset.type = type;
  wrapper.style = "display:flex; gap:0.5rem; margin-bottom:0.5rem; flex-wrap:wrap;";

  const inputHTML = inputs.map(input => {
    return `<input type="text" placeholder="${input.placeholder}" class="tie-in-${input.key}" value="${input.value || ''}" />`;
  }).join("");

  wrapper.innerHTML = `
    ${inputHTML}
    <button type="button" class="fetch-tie-in button-style">Fetch</button>
    <button type="button" class="remove-tie-in button-style" style="padding:0 0.5rem;">×</button>
    <div class="tie-in-result" style="margin-top:0.25rem; font-size:0.9rem; color:gray;"></div>
  `;

  const resultEl = wrapper.querySelector(".tie-in-result");
  const fetchBtn = wrapper.querySelector(".fetch-tie-in");
  const removeBtn = wrapper.querySelector(".remove-tie-in");

  fetchBtn.addEventListener("click", async () => {
    resultEl.textContent = "Loading...";
    const values = {};
    inputs.forEach(input => {
      const el = wrapper.querySelector(`.tie-in-${input.key}`);
      values[input.key] = el.value;
    });
    try {
      const output = await onFetch(values);
      resultEl.textContent = output;
    } catch (err) {
      console.error("Tie-in fetch failed", err);
      resultEl.textContent = "⚠ Failed to load data";
    }
  });

  removeBtn.addEventListener("click", () => {
    wrapper.remove();
    window.updateTieInHiddenInput();
  });

  inputs.forEach(input => {
    wrapper.querySelector(`.tie-in-${input.key}`).addEventListener("input", window.updateTieInHiddenInput);
  });

  return wrapper;
}
