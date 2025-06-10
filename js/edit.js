import { getIdToken, getUserIdFromToken } from "./auth.js";
import { updateHeader } from "./posts.js";

const form = document.getElementById("settingsForm");
const cssInput = document.getElementById("cssInput");
const layoutSelect = document.getElementById("layoutSelect");
const bgFileInput = document.getElementById("bgFileInput");
const saveStatus = document.getElementById("saveStatus");
let originalBackgroundURL = "";

const wrapper = document.querySelector(".preview-wrapper");
const preview = document.getElementById("bgPreview");
const removeBtn = document.getElementById("removeBgBtn");
const progressBar = document.getElementById("uploadProgressBar");
const fill = progressBar.querySelector(".bar-fill");

const isFinalImage = (url) => url.includes("_final");

let userId = null;
let idToken = null;
let currentBackgroundURL = "";

window.addEventListener("DOMContentLoaded", async () => {
  await updateHeader();
  idToken = await getIdToken();
  userId = await getUserIdFromToken();

  if (!idToken || !userId) {
    alert("Please log in to access your page settings.");
    window.location.href = "/";
    return;
  }

  try {
    const res = await fetch(
      `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${userId}`
    );
    const userMeta = await res.json();

    cssInput.value = userMeta.custom_css || "";
    layoutSelect.value = userMeta.default_layout || "columns";
    originalBackgroundURL = userMeta.background_url || "";
    currentBackgroundURL = originalBackgroundURL;

    if (currentBackgroundURL) {
      preview.style.backgroundImage = `url('${currentBackgroundURL}')`;
      wrapper.style.display = "block";

      if (!isFinalImage(currentBackgroundURL)) {
        preview.classList.add("has-image");
        removeBtn.style.display = "inline-block";
      } else {
        preview.classList.remove("has-image");
        removeBtn.style.display = "none";
      }
    } else {
      // reset preview if no background exists
      preview.style.backgroundImage = "none";
      wrapper.style.display = "block";
      preview.classList.remove("has-image");
      removeBtn.style.display = "none";
    }
  } catch (err) {
    console.warn("Failed to load user profile:", err);
  }
});

// Handle drag and drop background upload
bgPreview.addEventListener("dragover", (e) => {
  e.preventDefault();
  bgPreview.classList.add("dragover");
});

bgPreview.addEventListener("dragleave", () => {
  bgPreview.classList.remove("dragover");
});

bgPreview.addEventListener("drop", async (e) => {
  e.preventDefault();
  bgPreview.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file) await uploadAndPreviewBackground(file);
});

bgPreview.addEventListener("click", () => {
  bgFileInput.click();
});

bgFileInput.addEventListener("change", async () => {
  const file = bgFileInput.files[0];
  if (file) await uploadAndPreviewBackground(file);
});

async function uploadAndPreviewBackground(file) {
  const stagedKey = `bg_${userId}_staged`;

  const presignRes = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/?presign&post_id=${stagedKey}&index=0`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );

  const { upload_url, public_url } = await presignRes.json();

  progressBar.style.display = "block";
  fill.style.width = "0%";

  const xhr = new XMLHttpRequest();
  xhr.open("PUT", upload_url, true);
  xhr.setRequestHeader("Content-Type", "image/jpeg");
  xhr.setRequestHeader("x-amz-acl", "public-read");

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      fill.style.width = `${percent}%`;
    }
  };

  if (currentBackgroundURL) {
    preview.style.backgroundImage = `url('${currentBackgroundURL}')`;
    wrapper.style.display = "block";

    if (!isFinalImage(currentBackgroundURL)) {
      preview.classList.add("has-image");
    } else {
      preview.classList.remove("has-image");
    }
  }

  xhr.onload = () => {
    progressBar.style.display = "none";

    if (xhr.status === 200) {
      currentBackgroundURL = public_url;

      preview.style.backgroundImage = `url('${public_url}')`;
      wrapper.style.display = "block";
      preview.classList.add("has-image"); // always staged = hidden label
      console.log("✔️ Background staged at:", public_url);
      removeBtn.style.display = isFinalImage(public_url)
        ? "none"
        : "inline-block";
    } else {
      alert("Upload failed.");
    }
  };

  xhr.onerror = () => {
    progressBar.style.display = "none";
    alert("Upload failed.");
  };

  xhr.send(file);
}

// Remove background
removeBtn.addEventListener("click", () => {
  currentBackgroundURL = originalBackgroundURL;

  if (originalBackgroundURL) {
    preview.style.backgroundImage = `url('${originalBackgroundURL}')`;
    preview.classList.toggle("has-image", !isFinalImage(originalBackgroundURL));
    wrapper.style.display = "block";
    removeBtn.style.display = isFinalImage(originalBackgroundURL)
      ? "none"
      : "inline-block";
  } else {
    preview.style.backgroundImage = "none";
    preview.classList.remove("has-image");
    wrapper.style.display = "block";
    removeBtn.style.display = "none";
  }

  bgFileInput.value = "";
});

// Save settings
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    custom_css: cssInput.value,
    default_layout: layoutSelect.value,
    background_url: currentBackgroundURL,
  };

  const res = await fetch(
    "https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (res.ok) {
    saveStatus.textContent = "✅ Settings saved!";
    injectCSS(payload.custom_css);
    preview.style.backgroundImage = "none";
    preview.classList.remove("has-image");
    wrapper.style.display = "block";
    fill.style.width = "0%";
    progressBar.style.display = "none";
    bgFileInput.value = "";
  } else {
    saveStatus.textContent = "❌ Failed to save.";
  }
});

// Live CSS preview
function injectCSS(css) {
  const existing = document.getElementById("user-custom-style");
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.id = "user-custom-style";
  style.textContent = css;
  document.head.appendChild(style);
}
