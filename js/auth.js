export const poolData = {
  UserPoolId: "us-east-2_lXvCqndHZ",
  ClientId: "b2k3m380g08hmtmdn9osi12vg",
};
export const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

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
