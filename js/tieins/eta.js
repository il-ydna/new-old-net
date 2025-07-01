export function renderInputRow(data = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "tie-in-row";
  wrapper.style =
    "display:flex; gap:0.5rem; margin-bottom:0.5rem; flex-wrap:wrap;";

  wrapper.innerHTML = `
    <input type="text" placeholder="From" class="tie-in-from" value="${
      data.from || ""
    }" />
    <input type="text" placeholder="To" class="tie-in-to" value="${
      data.to || ""
    }" />
    <button type="button" class="fetch-tie-in button-style">Fetch ETA</button>
    <button type="button" class="remove-tie-in button-style" style="padding:0 0.5rem;">×</button>
    <div class="tie-in-result" style="margin-top:0.25rem; font-size:0.9rem; color:gray;"></div>
  `;

  const fetchBtn = wrapper.querySelector(".fetch-tie-in");
  const removeBtn = wrapper.querySelector(".remove-tie-in");
  const fromInput = wrapper.querySelector(".tie-in-from");
  const toInput = wrapper.querySelector(".tie-in-to");
  const resultEl = wrapper.querySelector(".tie-in-result");

  fetchBtn.addEventListener("click", async () => {
    resultEl.textContent = "Loading...";
    const output = await getResult({
      from: fromInput.value,
      to: toInput.value,
    });
    resultEl.textContent = output;
  });

  removeBtn.addEventListener("click", () => {
    wrapper.remove();
    updateTieInHiddenInput();
  });

  [fromInput, toInput].forEach((input) =>
    input.addEventListener("input", updateTieInHiddenInput)
  );

  updateTieInHiddenInput();

  return wrapper;
}

export async function getResult({ from, to }) {
  if (!from || !to) return "⚠ Enter both locations.";
  await new Promise((r) => setTimeout(r, 1000));
  return `Mock ETA from ${from} to ${to}: 15 min`;
}
