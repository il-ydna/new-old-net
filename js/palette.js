export async function getDistinctColorsFromImage(imageElement, numColors = 5) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const colorMap = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue; // skip transparent pixels
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const sorted = [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.split(",").map(Number));

  const rgb2lab = ([r, g, b]) => {
    const srgb = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    const [xr, yr, zr] = [
      srgb[0] * 0.4124 + srgb[1] * 0.3576 + srgb[2] * 0.1805,
      srgb[0] * 0.2126 + srgb[1] * 0.7152 + srgb[2] * 0.0722,
      srgb[0] * 0.0193 + srgb[1] * 0.1192 + srgb[2] * 0.9505,
    ];

    const x = xr / 0.95047;
    const y = yr / 1.0;
    const z = zr / 1.08883;

    const fx = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    const [fxX, fxY, fxZ] = [x, y, z].map(fx);

    return [116 * fxY - 16, 500 * (fxX - fxY), 200 * (fxY - fxZ)];
  };

  const deltaE = (lab1, lab2) =>
    Math.sqrt(lab1.reduce((sum, c, i) => sum + Math.pow(c - lab2[i], 2), 0));

  const selected = [];
  for (const color of sorted) {
    const lab = rgb2lab(color);
    const minDist = Math.min(
      ...selected.map((c) => deltaE(rgb2lab(c), lab)),
      selected.length ? Infinity : 0
    );
    if (minDist > 20 || selected.length === 0) selected.push(color);
    if (selected.length >= numColors) break;
  }

  return selected.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
}

export function rgbToHex(rgbString) {
  const result = rgbString.match(/\d+/g);
  if (!result || result.length < 3) return "#000000";
  return (
    "#" +
    result
      .slice(0, 3)
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function renderColorSuggestions(colors) {
  const container = document.getElementById("colorSuggestions");
  container.innerHTML = "";

  colors.forEach((rgb) => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = rgb;
    swatch.style.width = "1.25rem";
    swatch.style.height = "1.25rem";
    swatch.style.borderRadius = "50%";
    swatch.style.cursor = "pointer";
    swatch.style.border = "2px solid white";
    swatch.title = rgb;

    swatch.addEventListener("click", () => {
      const targetRow = window.selectedTagRow;
      const colorInput = targetRow?.querySelector(".tag-color");
      if (colorInput) {
        const hex = rgbToHex(rgb);
        colorInput.value = hex;
        colorInput.dispatchEvent(new Event("input"));
      }
    });

    container.appendChild(swatch);
  });
}

export async function loadImageAndExtractPalette(imageUrl, callback) {
  try {
    const res = await fetch(imageUrl, {
      mode: "cors",
      cache: "reload", // Force bypass of any tainted cache
    });

    if (!res.ok) {
      console.warn("❌ Failed to fetch image for palette analysis:", imageUrl);
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = objectUrl;

    img.onload = async () => {
      const colors = await getDistinctColorsFromImage(img, 10);
      callback(colors);
      URL.revokeObjectURL(objectUrl); // Clean up
    };

    img.onerror = () => {
      console.warn("❌ Could not load image for palette analysis:", objectUrl);
    };
  } catch (err) {
    console.warn(
      "❌ Error fetching image for palette analysis:",
      imageUrl,
      err
    );
  }
}
