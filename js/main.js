import { updateHeader, loadPosts } from "./posts.js";
import {
  setupLayoutDropdown,
  setupTagDropdown,
  setupCancelEditButton,
  setupPostLayoutDropdown,
} from "./ui.js";
import { setupImageUploader } from "./upload.js";
import "./render.js";

window.addEventListener("DOMContentLoaded", () => {
  updateHeader();
  loadPosts();
  setupLayoutDropdown();
  setupTagDropdown();
  setupImageUploader();
  setupCancelEditButton();
  setupPostLayoutDropdown();
});
