import { updateHeader, loadPosts, initPostForm } from "./posts.js";
import {
  setupTagDropdown,
  setupCancelEditButton,
  setupImageLayoutDropdown,
} from "./ui.js";
import { setupImageUploader } from "./upload.js";
import "./render.js";

import { setCurrentUser } from "./state.js";
import { getIdToken, getUserIdFromToken } from "./auth.js";

async function initializeUserState() {
  const token = await getIdToken();
  if (!token) return;

  const userId = getUserIdFromToken(token);
  if (!userId) return;

  const meta = await getUserMetaById(userId);
  if (meta) {
    setCurrentUser(meta);
    await applyCombinedCSSFromUser(userId);
  }
}

export default function initMain() {
  updateHeader();
  loadPosts();
  setupTagDropdown();
  setupCancelEditButton();
  setupImageLayoutDropdown();
  setupImageUploader();
  initPostForm();
}

window.addEventListener("DOMContentLoaded", async () => {
  await initializeUserState();
  requestAnimationFrame(() => {
    initMain();
  });
});
