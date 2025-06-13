import { getIdToken } from "./auth.js";
import { renderGrid, renderStack, renderCarousel } from "./render.js";

export async function compressImage(file, quality = 0.7, maxWidth = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              reject(new Error("Compression failed"));
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => reject(new Error("Image load failed"));
    };

    reader.onerror = reject;
  });
}

export async function uploadImageToS3(file, postId, index) {
  const compressedFile = await compressImage(file);

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
    headers: {
      "Content-Type": "image/jpeg",
      "x-amz-acl": "public-read",
    },
    body: compressedFile,
  });

  return public_url;
}

let uploaderInitialized = false;

export function setupImageUploader() {
  if (uploaderInitialized) return;
  uploaderInitialized = true;

  const dropZone = document.getElementById("image-drop-zone");
  const imageInput = document.getElementById("imageInput");
  const imageLabel = document.querySelector("#image-drop-zone label");

  if (!dropZone || !imageInput || !imageLabel) return;

  dropZone.addEventListener("click", (e) => {
    // Only trigger if clicking the drop zone itself, not the label or input
    if (e.target === dropZone) {
      imageInput.click();
    }
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
      const files = e.dataTransfer.files;
      updateLabel(files[0].name, imageLabel);
      showImagePreview(files);
    }
  });

  imageInput.addEventListener("change", () => {
    if (imageInput.files.length > 0) {
      updateLabel(imageInput.files[0].name, imageLabel);
      showImagePreview(imageInput.files);
    } else {
      imageLabel.textContent = "Choose Image";
      const previewContainer = document.getElementById(
        "image-preview-container"
      );
      if (previewContainer) previewContainer.innerHTML = "";
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
export async function showImagePreview(files) {
  const layoutSelector = document.getElementById("layout-selector");
  const layoutInput = document.getElementById("layoutInput");
  const previewContainer = document.getElementById("image-preview-container");

  if (!layoutInput || !previewContainer || !files || files.length === 0) {
    previewContainer.innerHTML = "";
    if (layoutSelector) layoutSelector.style.display = "none";
    return;
  }

  const layout = layoutInput.value || "grid";
  const urls = await Promise.all(
    Array.from(files).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    })
  );

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

  // Clear only the preview images, not the layout selector
  [...previewContainer.childNodes].forEach((node) => {
    if (node !== layoutSelector) node.remove();
  });
  previewContainer.insertAdjacentHTML("afterbegin", html);

  if (layoutSelector) {
    layoutSelector.style.display = urls.length >= 2 ? "block" : "none";
  }
}

window.showImagePreview = showImagePreview;
