// state.js

let editingPostId = null;
let currentUser = null;
let pageOwner = null;
let stagedBackgroundURL = null;

export function getEditingPostId() {
  return editingPostId;
}
export function setEditingPostId(id) {
  editingPostId = id;
}

export function getCurrentUser() {
  return currentUser;
}
export function setCurrentUser(user) {
  currentUser = user;
}

export function getPageOwner() {
  return pageOwner;
}
export function setPageOwner(owner) {
  pageOwner = owner;
}

export function getStagedBackgroundURL() {
  return stagedBackgroundURL;
}
export function setStagedBackgroundURL(url) {
  stagedBackgroundURL = url;
}

export function getCurrentProjectId() {
  return pageOwner?.project?.id || null;
}
