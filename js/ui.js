import { getCurrentUser } from "./state.js";

// Show validation error below the post form
export function showValidationMessage(message) {
  const errorBox = document.getElementById("form-error");
  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.style.display = "block";
}

export function removeValidationMessage() {
  const errorBox = document.getElementById("form-error");
  if (errorBox) {
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }
}

// Set up the tag selector dropdown
export function setupTagDropdown() {
  const dropdown = document.getElementById("tagDropdown");
  if (!dropdown) return;

  const selected = dropdown.querySelector(".selected-option");
  const options = dropdown.querySelector(".dropdown-options");
  const hiddenInput = document.getElementById("tagInput");
  if (!selected || !options || !hiddenInput) return;

  selected.onclick = () => {
    options.style.display =
      options.style.display === "block" ? "none" : "block";
  };

  dropdown.querySelectorAll(".dropdown-option").forEach((option) => {
    option.addEventListener("click", () => {
      const label =
        option.querySelector("span:last-child")?.textContent || "Unknown";
      const value = option.getAttribute("data-value");
      const color = option.getAttribute("data-color");
      const textColor = option.getAttribute("data-text") || "#ffffff";

      selected.innerHTML = `<span>${label}</span>`;
      selected.className = "selected-option button-style tag-pill-large";
      selected.style.backgroundColor = color;
      selected.style.color = textColor;

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

// Handle cancel edit post behavior
export function setupCancelEditButton() {
  const cancelBtn = document.getElementById("cancelEditBtn");
  if (!cancelBtn) return;

  cancelBtn.addEventListener("click", () => {
    const form = document.getElementById("postForm");
    if (!form) return;
    form.reset();

    const layoutSelector = document.getElementById("layout-selector");
    const layoutInput = document.getElementById("layoutInput");
    const layoutSelected = layoutSelector?.querySelector(".selected-option");
    const previewContainer = document.getElementById("image-preview-container");
    const imageLabel = document.querySelector("#image-drop-zone label");
    const imageInput = document.getElementById("imageInput");
    const submitBtn = document.getElementById("submitPostBtn");

    if (layoutInput) layoutInput.value = "grid";
    if (layoutSelected) layoutSelected.textContent = "Grid";
    if (layoutSelector) layoutSelector.style.display = "none";
    if (previewContainer) previewContainer.innerHTML = "";
    if (imageLabel) imageLabel.textContent = "Choose/Drop Image";
    if (imageInput) imageInput.value = "";
    if (submitBtn) submitBtn.textContent = "Post";

    form.classList.remove("editing");
    cancelBtn.style.display = "none";
  });
}

// Post image layout dropdown (inside form)
export function setupImageLayoutDropdown() {
  const layoutSelector = document.getElementById("layout-selector");
  if (!layoutSelector) return;

  const layoutSelected = layoutSelector.querySelector(".selected-option");
  const layoutOptions = layoutSelector.querySelector(".dropdown-options");
  const layoutInput = document.getElementById("layoutInput");
  const imageInput = document.getElementById("imageInput");

  if (!layoutSelected || !layoutOptions || !layoutInput || !imageInput) return;

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

      if (imageInput.files.length > 0) {
        const event = new CustomEvent("rerender-preview");
        imageInput.dispatchEvent(event);
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!layoutSelector.contains(e.target)) {
      layoutOptions.style.display = "none";
    }
  });
}

// Page-wide layout dropdown (e.g. columns vs timeline)
export function setupPostLayoutToggle() {
  const dropdown = document.getElementById("post-layout-selector");
  const posts = document.getElementById("posts");
  if (!dropdown || !posts) return;

  const selected = dropdown.querySelector(".selected-option");
  const options = dropdown.querySelector(".dropdown-options");

  if (!selected || !options) return;

  // Restore saved preference
  const savedLayout = localStorage.getItem("preferredPostLayout");
  if (savedLayout) {
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
      posts.className = "";
      posts.classList.add(`layout-${layout}`);
      posts.dataset.layout = layout;
      localStorage.setItem("preferredPostLayout", layout);
    });
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      options.style.display = "none";
    }
  });
}

export function createEditPageButton(username) {
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.style.marginLeft = "1rem";

  editBtn.addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState({}, "", `/@${username}/edit`);
    window.dispatchEvent(new Event("popstate"));
  });

  return editBtn;
}

export function applyUserBackground(url) {
  const root = document.documentElement;
  if (!url) return;
  root.style.backgroundImage = `url('${url}')`;
  root.style.backgroundSize = "cover";
  root.style.backgroundAttachment = "fixed";
  root.style.backgroundRepeat = "no-repeat";
  root.style.backgroundPosition = "center";
}

export function renderUserControls() {
  const wrapper = document.createElement("div");
  wrapper.id = "user-controls";

  const user = getCurrentUser();

  if (!user) {
    wrapper.innerHTML = `<button id="signupBtn">Log In/Sign Up</button>`;
    wrapper.querySelector("#signupBtn").addEventListener("click", (e) => {
      e.preventDefault();
      const returnTo = encodeURIComponent(window.location.pathname);
      history.pushState({}, "", `/auth/signup?returnTo=${returnTo}`);
      window.dispatchEvent(new Event("popstate"));
    });
    return wrapper;
  }

  wrapper.innerHTML = `
    <div id="username">
      Signed in as <a href="/@${user.username}" id="userLink" style="color: var(--post-text-color); text-decoration: underline;">@${user.username}</a>
    </div>
    <button id="logout">Log out</button>
  `;

  wrapper.querySelector("#logout").addEventListener("click", () => {
    const userPool = new AmazonCognitoIdentity.CognitoUserPool({
      UserPoolId: "us-east-2_lXvCqndHZ",
      ClientId: "b2k3m380g08hmtmdn9osi12vg",
    });
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    localStorage.removeItem("idToken");
    history.pushState({}, "", `/`);
    window.dispatchEvent(new Event("popstate"));
    setTimeout(() => location.reload(), 50);
  });

  return wrapper;
}

export function renderShareDropdown() {
  const wrapper = document.createElement("div");
  wrapper.className = "custom-dropdown";
  wrapper.id = "shareDropdown";

  const selected = document.createElement("div");
  selected.className = "selected-option button-style";
  selected.textContent = "Public";

  const options = document.createElement("div");
  options.className = "dropdown-options";

  const values = [
    { value: "public", label: "Public" },
    { value: "private", label: "Private" },
  ];

  values.forEach(({ value, label }) => {
    const option = document.createElement("div");
    option.className = "dropdown-option";
    option.setAttribute("data-value", value);
    option.textContent = label;
    options.appendChild(option);
  });

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = "visibility";
  hidden.id = "visibilityInput";
  hidden.required = true;
  hidden.value = "public"; // default

  wrapper.appendChild(selected);
  wrapper.appendChild(options);
  wrapper.appendChild(hidden);

  selected.addEventListener("click", () => {
    options.style.display =
      options.style.display === "block" ? "none" : "block";
  });

  options.querySelectorAll(".dropdown-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      selected.textContent = opt.textContent;
      hidden.value = opt.getAttribute("data-value");
      options.style.display = "none";
    });
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      options.style.display = "none";
    }
  });

  return wrapper;
}

export function renderTagDropdown(tags) {
  const wrapper = document.createElement("div");
  wrapper.className = "custom-dropdown";
  wrapper.id = "tagDropdown";

  const selected = document.createElement("div");
  selected.className = "selected-option button-style";
  selected.textContent = "Pick a tag";

  const options = document.createElement("div");
  options.className = "dropdown-options";

  tags.forEach((tag) => {
    const option = document.createElement("div");
    option.className = "dropdown-option";
    option.setAttribute("data-value", tag.value);
    option.setAttribute("data-color", tag.color);
    option.setAttribute("data-text", tag.textColor || "#ffffff");

    option.style.display = "inline-flex";
    option.style.alignItems = "center";
    option.style.gap = "0.5rem";
    option.style.padding = "0.25rem 0.75rem";
    option.style.borderRadius = "999px";
    option.style.backgroundColor = tag.color;
    option.style.color = tag.textColor || "#ffffff";
    option.style.fontSize = "0.75rem";
    option.style.whiteSpace = "nowrap";
    option.style.margin = "0.25rem";
    option.style.cursor = "pointer";

    option.innerHTML = `<span>${tag.name}</span>`;

    options.appendChild(option);
  });

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = "tag";
  hidden.id = "tagInput";
  hidden.required = true;

  wrapper.appendChild(selected);
  wrapper.appendChild(options);
  wrapper.appendChild(hidden);
  return wrapper;
}

export function setupOnboardingLayoutToggle({ onChange }) {
  const selector = document.getElementById("layout-selector");
  const selected = selector?.querySelector(".selected-option");
  const options = selector?.querySelector(".dropdown-options");
  const input = document.getElementById("layoutInput");

  if (!selector || !selected || !options || !input) return;

  selected.addEventListener("click", () => {
    options.style.display =
      options.style.display === "block" ? "none" : "block";
  });

  options.querySelectorAll(".dropdown-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      const layout = opt.dataset.value;
      input.value = layout;
      selected.textContent = opt.textContent;
      options.style.display = "none";
      if (onChange) onChange(layout);
    });
  });
}

export function applyCombinedCSS(layoutCSS = "", postCSS = "") {
  try {
    let themeEl = document.getElementById("theme-style");
    if (!themeEl) {
      themeEl = document.createElement("style");
      themeEl.id = "theme-style";
      document.head.appendChild(themeEl);
    }

    themeEl.textContent = `${layoutCSS}\n${postCSS}`;
  } catch (err) {
    console.error("❌ Failed to apply user CSS:", err);
  }
}
