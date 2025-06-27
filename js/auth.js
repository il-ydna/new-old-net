export const poolData = {
  UserPoolId: "us-east-2_lXvCqndHZ",
  ClientId: "b2k3m380g08hmtmdn9osi12vg",
};
console.log("Cognito SDK loaded?", typeof AmazonCognitoIdentity);

export const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

import { setCurrentUser } from "./state.js";

export async function fetchUserMeta() {
  const token = await getIdToken();
  const userId = await getUserIdFromToken(token);
  if (!token || !userId) return null;

  const res = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?id=${userId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;

  const userMeta = await res.json();
  const user = { id: userId, ...userMeta };
  setCurrentUser(user);
  return user;
}

export function getIdToken() {
  const user = userPool.getCurrentUser();
  return new Promise((resolve) => {
    if (!user) return resolve(null);
    user.getSession((err, session) => {
      if (err || !session.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export async function getUserIdFromToken() {
  const idToken = await getIdToken();
  return idToken ? parseJwt(idToken)?.sub || null : null;
}

export async function getUsernameFromToken() {
  const idToken = await getIdToken();
  return idToken ? parseJwt(idToken)?.["cognito:username"] || null : null;
}

export async function getUserMetaByUsername(username) {
  const res = await fetch(
    `https://6bm2adpxck.execute-api.us-east-2.amazonaws.com/user-meta?username=${username}`
  );
  if (!res.ok) return null;
  return await res.json();
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
