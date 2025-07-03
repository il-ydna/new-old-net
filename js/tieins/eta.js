import { geocodeLocation } from "./geocode.js";

const ORS_API_KEY = '5b3ce3597851110001cf6248ae776a511fb745d0ac34924af2617b9e';

export function renderInputRow(data = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "tie-in-row";
  wrapper.dataset.type = "eta";
  wrapper.style = "display:flex; gap:0.5rem; margin-bottom:0.5rem; flex-wrap:wrap;";

  wrapper.innerHTML = `
    <input type="text" placeholder="From" class="tie-in-from" value="${data.from || ''}" />
    <input type="text" placeholder="To" class="tie-in-to" value="${data.to || ''}" />
    <select class="tie-in-mode">
      <option value="driving-car" ${data.mode === "driving-car" ? "selected" : ""}>Driving</option>
      <option value="cycling-regular" ${data.mode === "cycling-regular" ? "selected" : ""}>Cycling</option>
      <option value="foot-walking" ${data.mode === "foot-walking" ? "selected" : ""}>Walking</option>
    </select>
    <button type="button" class="fetch-tie-in button-style">Fetch</button>
    <button type="button" class="remove-tie-in button-style" style="padding:0 0.5rem;">×</button>
    <div class="tie-in-result" style="margin-top:0.25rem; font-size:0.9rem; color:gray;"></div>
  `;

  const resultEl = wrapper.querySelector(".tie-in-result");
  const fetchBtn = wrapper.querySelector(".fetch-tie-in");
  const removeBtn = wrapper.querySelector(".remove-tie-in");

  fetchBtn.addEventListener("click", async () => {
    resultEl.textContent = "Loading...";
    const from = wrapper.querySelector(".tie-in-from").value;
    const to = wrapper.querySelector(".tie-in-to").value;
    const mode = wrapper.querySelector(".tie-in-mode").value;

    const output = await getResult({ from, to, mode });
    resultEl.textContent = output;
  });

  removeBtn.addEventListener("click", () => {
    wrapper.remove();
    window.updateTieInHiddenInput();
  });

  ["from", "to", "mode"].forEach((key) => {
    wrapper.querySelector(`.tie-in-${key}`).addEventListener("input", window.updateTieInHiddenInput);
  });

  return wrapper;
}

export async function getResult({ from, to, mode = "driving-car" }) {
  if (!from || !to) return "⚠ Enter both locations";
  try {
    const fromCoords = await geocodeLocation(from);
    const toCoords = await geocodeLocation(to);
    if (!fromCoords || !toCoords) return "⚠ Could not geocode locations";

    const url = `https://api.openrouteservice.org/v2/directions/${encodeURIComponent(mode)}?api_key=${ORS_API_KEY}&start=${fromCoords.lon},${fromCoords.lat}&end=${toCoords.lon},${toCoords.lat}`;
    const res = await fetch(url);
    if (!res.ok) return "⚠ Failed to fetch route";

    const data = await res.json();
    if (!data.features || data.features.length === 0) return "⚠ No route found";

    const { duration, distance } = data.features[0].properties.summary;
    return `${mode} ETA from ${from} to ${to}: <strong>${(duration / 60).toFixed(1)} min</strong>, ${(distance / 1000).toFixed(1)} km`;
  } catch (err) {
    console.error("ETA getResult error:", err);
    return "⚠ Error loading ETA";
  }
}
