// render error messages in submission
export function showValidationMessage(message) {
  const errorDiv = document.createElement("div");
  errorDiv.id = "form-error";
  errorDiv.textContent = message;
  errorDiv.style.color = "salmon";
  errorDiv.style.marginBottom = "1rem";
  errorDiv.style.textAlign = "center";
  errorDiv.style.fontFamily = "Times New Roman";
  document.getElementById("postForm").append(errorDiv);
}

export function removeValidationMessage() {
  const existing = document.getElementById("form-error");
  if (existing) existing.remove();
}

// dropdown behavior for post tags
export function setupTagDropdown() {
  const dropdown = document.getElementById("tagDropdown");
  const selected = dropdown.querySelector(".selected-option");
  const options = dropdown.querySelector(".dropdown-options");
  const hiddenInput = document.getElementById("tagInput");

  selected.addEventListener("click", () => {
    options.style.display =
      options.style.display === "block" ? "none" : "block";
  });

  dropdown.querySelectorAll(".dropdown-option").forEach((option) => {
    option.addEventListener("click", () => {
      const label = option.innerHTML;
      const value = option.getAttribute("data-value");
      selected.innerHTML = label;
      hiddenInput.value = value;
      options.style.display = "none";
    });
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      options.style.display = "none";
    }
  });
}

// what happens when the cancel button is pressed
export function setupCancelEditButton() {
  document.getElementById("cancelEditBtn").addEventListener("click", () => {
    const form = document.getElementById("postForm");
    form.reset();
    document.getElementById("layoutInput").value = "grid";
    document.querySelector("#layout-selector .selected-option").textContent =
      "Grid";
    document.getElementById("layout-selector").style.display = "none";
    document.getElementById("image-preview-container").innerHTML = "";
    document.querySelector("#image-drop-zone label").textContent =
      "Choose/Drop Image";
    document.getElementById("imageInput").value = "";
    form.classList.remove("editing");
    document.getElementById("cancelEditBtn").style.display = "none";
    document.getElementById("submitPostBtn").textContent = "Add Post";
  });
}

// image layout dropdown
export function setupLayoutDropdown() {
  const layoutDropdown = document.getElementById("layout-selector");
  const layoutSelected = layoutDropdown.querySelector(".selected-option");
  const layoutOptions = layoutDropdown.querySelector(".dropdown-options");
  const layoutInput = document.getElementById("layoutInput");
  const imageInput = document.getElementById("imageInput");

  layoutSelected.addEventListener("click", () => {
    layoutOptions.style.display =
      layoutOptions.style.display === "block" ? "none" : "block";
  });

  layoutOptions.querySelectorAll(".dropdown-option").forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.getAttribute("data-value");
      layoutSelected.textContent = option.textContent;
      layoutInput.value = value;
      layoutOptions.style.display = "none";

      const currentFiles = imageInput.files;
      if (currentFiles && currentFiles.length > 0) {
        const event = new CustomEvent("rerender-preview");
        imageInput.dispatchEvent(event);
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!layoutDropdown.contains(e.target)) {
      layoutOptions.style.display = "none";
    }
  });
}

// page-wide post layout dropdown
export function setupPostLayoutDropdown() {
  const dropdown = document.getElementById("post-layout-selector");
  if (!dropdown) return;

  const selected = dropdown.querySelector(".selected-option");
  const options = dropdown.querySelector(".dropdown-options");
  const posts = document.getElementById("posts");

  // ✅ Restore saved layout
  const savedLayout = localStorage.getItem("preferredPostLayout");
  if (savedLayout && posts) {
    posts.className = "";
    posts.classList.add(`layout-${savedLayout}`);
    posts.dataset.layout = savedLayout;

    const matchingOption = dropdown.querySelector(
      `.dropdown-option[data-value="${savedLayout}"]`
    );
    if (matchingOption) {
      selected.textContent = matchingOption.textContent;
    }
  }

  selected.addEventListener("click", () => {
    options.style.display =
      options.style.display === "block" ? "none" : "block";
  });

  options.querySelectorAll(".dropdown-option").forEach((option) => {
    option.addEventListener("click", () => {
      const layout = option.getAttribute("data-value");
      selected.textContent = option.textContent;
      options.style.display = "none";
      posts.dataset.layout = layout;
      posts.className = "";
      posts.classList.add(`layout-${layout}`);

      // ✅ Save to localStorage
      localStorage.setItem("preferredPostLayout", layout);
    });
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      options.style.display = "none";
    }
  });
}
