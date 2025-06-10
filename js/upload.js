import { getIdToken } from "./auth.js";
import { renderGrid, renderStack, renderCarousel } from "./render.js";

const imageInput = document.getElementById("imageInput");
const layoutInput = document.getElementById("layoutInput");
const layoutSelector = document.getElementById("layout-selector");
const previewContainer = document.getElementById("image-preview-container");
const imageLabel = document.querySelector("#image-drop-zone label");

export async function uploadImageToS3(file, postId, index) {
  const presignRes = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/?presign&post_id=${postId}&index=${index}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${await getIdToken()}` },
    }
  );
  const { upload_url, public_url } = await presignRes.json();

  await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg", "x-amz-acl": "public-read" },
    body: file,
  });

  return public_url;
}

export function setupImageUploader() {
  const dropZone = document.getElementById("image-drop-zone");
  const imageInput = document.getElementById("imageInput");
  const imageLabel = document.querySelector("#image-drop-zone label");

  if (!dropZone || !imageInput || !imageLabel) return; // graceful fail

  dropZone.addEventListener("click", (e) => {
    if (e.target.tagName !== "LABEL") imageInput.click();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");

    if (e.dataTransfer.files.length > 0) {
      imageInput.files = e.dataTransfer.files;
      updateLabel(e.dataTransfer.files[0].name, imageLabel);
      showImagePreview(e.dataTransfer.files);
    }
  });

  imageInput.addEventListener("change", () => {
    if (imageInput.files.length > 0) {
      updateLabel(imageInput.files[0].name, imageLabel);
      showImagePreview(imageInput.files);
    } else {
      imageLabel.textContent = "Choose Image";
    }
  });

  imageInput.addEventListener("rerender-preview", () => {
    showImagePreview(imageInput.files);
  });
}

function updateLabel(fileName, labelEl) {
  const maxLen = 20;
  const truncated =
    fileName.length > maxLen ? fileName.slice(0, maxLen) + "…" : fileName;
  labelEl.innerHTML = `<span style="text-decoration: underline;">${truncated}</span>`;
}
webkitURL;
function showImagePreview(files) {
  const layoutSelector = document.getElementById("layout-selector");
  const layoutInput = document.getElementById("layoutInput");
  const previewContainer = document.getElementById("image-preview-container");

  if (!layoutInput || !previewContainer) return;

  const layout = layoutInput.value || "grid";
  const readAll = Array.from(files).map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      })
  );

  Promise.all(readAll).then((urls) => {
    let html = "";
    switch (layout) {
      case "carousel":
        html = renderCarousel(urls);
        break;
      case "stack":
        html = renderStack(urls);
        break;
      default:
        html = renderGrid(urls);
    }

    previewContainer.innerHTML = html;

    if (layoutSelector) {
      previewContainer.appendChild(layoutSelector);
      layoutSelector.style.display = urls.length >= 2 ? "block" : "none";
    }
  });
}
