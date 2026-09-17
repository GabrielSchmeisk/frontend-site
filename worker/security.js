const encoder = new TextEncoder();

export const base64url = (value) => {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const fromBase64url = (value) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function createSession(secret, username) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ sub: username, iat: now, exp: now + 60 * 60 * 12,
    csrf: base64url(crypto.getRandomValues(new Uint8Array(24))) }));
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function readSession(token, secret) {
  try {
    const [payload, signature, extra] = String(token || "").split(".");
    if (!payload || !signature || extra || await hmac(payload, secret) !== signature) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
    if (!data.sub || !data.csrf || Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(24)), iterations = 100000) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
  return { salt: base64url(salt), hash: base64url(hash), iterations };
}

export async function verifyPassword(password, stored) {
  const generated = await hashPassword(password, fromBase64url(stored.salt), stored.iterations);
  return generated.hash === stored.hash;
}

export function cookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

export const sessionCookie = (token) => `oa_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
export const clearSessionCookie = () => "oa_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
