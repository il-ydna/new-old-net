import { updateHeader, loadPosts, initPostForm } from "./posts.js";
import {
  setupTagDropdown,
  setupCancelEditButton,
  setupImageLayoutDropdown,
} from "./ui.js";
import { setupImageUploader } from "./upload.js";
import "./render.js";

export default function initMain() {
  updateHeader();
  loadPosts();
  setupTagDropdown();
  setupCancelEditButton();
  setupImageLayoutDropdown();
  setupImageUploader();
  initPostForm();
}

window.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => {
    initMain();
  });
});
