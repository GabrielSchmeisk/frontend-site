import adminHtml from "./admin/index.html";
import adminCss from "./admin/style.css";
import adminJs from "./admin/app.client.js";
import { checkProductLink, validateExternalUrl } from "./link-check.js";
import { clearSessionCookie, cookieValue, createSession, hashPassword, hmac,
  readSession, sessionCookie, verifyPassword } from "./security.js";

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", ...headers },
});
const text = (body, type, headers = {}) => new Response(body, { headers: {
  "Content-Type": `${type}; charset=utf-8`, "X-Content-Type-Options": "nosniff", ...headers,
} });
const now = () => new Date().toISOString();
const notFound = () => json({ error: "Rota não encontrada." }, 404);
const errorMessage = (error) => error instanceof Error ? error.message : "Erro inesperado.";

const securityHeaders = {
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer", "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY", "X-Robots-Tag": "noindex, nofollow",
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([env.PUBLIC_SITE_ORIGIN, env.PUBLIC_SITE_ORIGIN?.replace("https://www.", "https://")]);
  return allowed.has(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {};
}

async function bodyJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 30000) throw new Error("Dados enviados excedem o limite.");
  return request.json();
}

async function getSetting(env, key) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(key).first();
  return row?.value || "";
}

async function setSetting(env, key, value) {
  await env.DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
    .bind(key, value, now()).run();
}

async function sessionFor(request, env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return null;
  return readSession(cookieValue(request, "oa_admin"), env.SESSION_SECRET);
}

function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) throw new Error("Origem da solicitação recusada.");
}

async function requireAdmin(request, env, mutation = false) {
  const session = await sessionFor(request, env);
  if (!session) throw Object.assign(new Error("Sessão expirada."), { status: 401 });
  if (mutation) {
    assertSameOrigin(request);
    if (request.headers.get("X-CSRF-Token") !== session.csrf)
      throw Object.assign(new Error("Confirmação de segurança inválida."), { status: 403 });
  }
  return session;
}

async function loginKey(request, env) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  return hmac(`login:${address}`, env.SESSION_SECRET);
}

async function assertLoginAllowed(request, env) {
  const key = await loginKey(request, env);
  const row = await env.DB.prepare("SELECT attempts,blocked_until FROM login_attempts WHERE key=?").bind(key).first();
  if (row?.blocked_until && Date.parse(row.blocked_until) > Date.now())
    throw Object.assign(new Error("Muitas tentativas. Aguarde 15 minutos."), { status: 429 });
  return { key, attempts: Number(row?.attempts || 0) };
}

async function recordLoginFailure(env, state) {
  const attempts = state.attempts + 1;
  const blockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
  await env.DB.prepare(`INSERT INTO login_attempts (key,attempts,blocked_until,updated_at) VALUES (?,?,?,?)
    ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at`)
    .bind(state.key, attempts >= 5 ? 0 : attempts, blockedUntil, now()).run();
}

const normalizeText = (value, maximum) => String(value ?? "").trim().replace(/[\u0000-\u001F\u007F]/gu, " ").slice(0, maximum);
const categorySet = new Set(["audio", "video", "iluminacao", "outros"]);
const statusSet = new Set(["draft", "active", "hidden"]);

function validateProduct(input, existing = {}) {
  const product = {
    title: normalizeText(input.title ?? existing.title, 180),
    label: normalizeText(input.label ?? existing.label, 100),
    category: normalizeText(input.category ?? existing.category, 30),
    productUrl: validateExternalUrl(input.productUrl ?? existing.productUrl, "product"),
    videoUrl: normalizeText(input.videoUrl ?? existing.videoUrl, 500),
    imageUrl: validateExternalUrl(input.imageUrl ?? existing.imageUrl, "image"),
    position: Math.max(0, Math.min(100000, Math.trunc(Number(input.position ?? existing.position ?? 0)))),
    status: normalizeText(input.status ?? existing.status ?? "draft", 20),
  };
  if (product.title.length < 3) throw new Error("Informe um nome com pelo menos três caracteres.");
  if (!categorySet.has(product.category)) throw new Error("Categoria inválida.");
  if (!statusSet.has(product.status)) throw new Error("Situação inválida.");
  if (product.videoUrl) product.videoUrl = validateExternalUrl(product.videoUrl, "video");
  return product;
}

const publicProduct = (row) => ({ id: row.id, title: row.title, label: row.label,
  category: row.category, productUrl: row.product_url, videoUrl: row.video_url,
  image: row.image_url, position: row.position, linkHealth: row.link_health });
const adminProduct = (row) => ({ ...publicProduct(row), status: row.status,
  lastCheckedAt: row.last_checked_at, lastCheckMessage: row.last_check_message,
  consecutiveFailures: row.consecutive_failures, createdAt: row.created_at, updatedAt: row.updated_at });

async function publicCatalog(request, env) {
  const rows = await env.DB.prepare("SELECT * FROM products WHERE status='active' ORDER BY position,title COLLATE NOCASE").all();
  return json({ products: rows.results.map(publicProduct), generatedAt: now() }, 200, {
    ...corsHeaders(request, env), "Cache-Control": "public, max-age=60, s-maxage=300",
  });
}

async function authRoute(request, env, path) {
  assertSameOrigin(request);
  const passwordRecord = await getSetting(env, "admin_password");
  if (path === "/api/auth/setup") {
    if (passwordRecord) return json({ error: "O painel já foi configurado." }, 409);
    const input = await bodyJson(request);
    if (!env.SETUP_TOKEN || await hmac(String(input.setupToken || ""), env.SESSION_SECRET) !==
      await hmac(env.SETUP_TOKEN, env.SESSION_SECRET)) return json({ error: "Código de configuração inválido." }, 403);
    const password = String(input.password || "");
    if (password.length < 14 || !/[a-z]/u.test(password) || !/[A-Z]/u.test(password) ||
      !/[0-9]/u.test(password) || !/[^A-Za-z0-9]/u.test(password))
      return json({ error: "Use ao menos 14 caracteres, com maiúscula, minúscula, número e símbolo." }, 400);
    await setSetting(env, "admin_password", JSON.stringify(await hashPassword(password)));
    await setSetting(env, "setup_complete", "true");
    await env.DB.prepare("INSERT INTO audit_log (action,details,created_at) VALUES ('admin.setup','Painel configurado',?)").bind(now()).run();
    const token = await createSession(env.SESSION_SECRET, env.ADMIN_USERNAME || "admin");
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }
  if (path === "/api/auth/login") {
    if (!passwordRecord) return json({ setupRequired: true, error: "Configure o painel primeiro." }, 428);
    const state = await assertLoginAllowed(request, env);
    const input = await bodyJson(request);
    if (!await verifyPassword(String(input.password || ""), JSON.parse(passwordRecord))) {
      await recordLoginFailure(env, state);
      return json({ error: "Senha incorreta." }, 401);
    }
    await env.DB.prepare("DELETE FROM login_attempts WHERE key=?").bind(state.key).run();
    const token = await createSession(env.SESSION_SECRET, env.ADMIN_USERNAME || "admin");
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }
  if (path === "/api/auth/logout") return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  return notFound();
}

async function adminApi(request, env, path) {
  const mutation = request.method !== "GET";
  const session = await requireAdmin(request, env, mutation);
  if (path === "/api/admin/session") return json({ username: session.sub, csrf: session.csrf });
  if (path === "/api/admin/products" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM products ORDER BY position,title COLLATE NOCASE").all();
    const alerts = rows.results.filter((row) => ["warning", "broken"].includes(row.link_health)).length;
    return json({ products: rows.results.map(adminProduct), alerts });
  }
  if (path === "/api/admin/products" && request.method === "POST") {
    const product = validateProduct(await bodyJson(request));
    const timestamp = now();
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO products
        (id,title,label,category,product_url,video_url,image_url,position,status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id, product.title, product.label, product.category,
        product.productUrl, product.videoUrl, product.imageUrl, product.position, product.status, timestamp, timestamp),
      env.DB.prepare("INSERT INTO audit_log (action,entity_id,details,created_at) VALUES ('product.create',?,?,?)")
        .bind(id, product.title, timestamp),
    ]);
    return json({ product: { id, ...product } }, 201);
  }
  const match = path.match(/^\/api\/admin\/products\/([0-9a-f-]{20,50})$/u);
  if (match) {
    const id = match[1];
    const row = await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(id).first();
    if (!row) return json({ error: "Produto não encontrado." }, 404);
    if (request.method === "PUT") {
      const product = validateProduct(await bodyJson(request), adminProduct(row));
      await env.DB.batch([
        env.DB.prepare(`UPDATE products SET title=?,label=?,category=?,product_url=?,video_url=?,image_url=?,position=?,status=?,
          link_health=CASE WHEN product_url<>? THEN 'unchecked' ELSE link_health END,
          consecutive_failures=CASE WHEN product_url<>? THEN 0 ELSE consecutive_failures END,updated_at=? WHERE id=?`)
          .bind(product.title, product.label, product.category, product.productUrl, product.videoUrl,
            product.imageUrl, product.position, product.status, product.productUrl, product.productUrl, now(), id),
        env.DB.prepare("INSERT INTO audit_log (action,entity_id,details,created_at) VALUES ('product.update',?,?,?)")
          .bind(id, product.title, now()),
      ]);
      return json({ ok: true });
    }
    if (request.method === "DELETE") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM products WHERE id=?").bind(id),
        env.DB.prepare("INSERT INTO audit_log (action,entity_id,details,created_at) VALUES ('product.delete',?,?,?)")
          .bind(id, row.title, now()),
      ]);
      return json({ ok: true });
    }
  }
  if (path === "/api/admin/check-links" && request.method === "POST") {
    const result = await runLinkChecks(env);
    return json(result);
  }
  return notFound();
}

async function alertWebhook(env, product, check) {
  if (!env.ALERT_WEBHOOK_URL) return;
  await fetch(env.ALERT_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `⚠️ Link quebrado: ${product.title}\n${product.product_url}\n${check.message}` }),
    signal: AbortSignal.timeout(10000) }).catch(() => {});
}

export async function runLinkChecks(env) {
  const rows = await env.DB.prepare("SELECT * FROM products WHERE status<>'draft' ORDER BY COALESCE(last_checked_at,'') LIMIT 100").all();
  let healthy = 0, warning = 0, broken = 0;
  for (let offset = 0; offset < rows.results.length; offset += 4) {
    await Promise.all(rows.results.slice(offset, offset + 4).map(async (product) => {
      const check = await checkProductLink(product.product_url);
      const failures = check.ok ? 0 : Number(product.consecutive_failures || 0) + 1;
      const health = check.ok ? "healthy" : failures >= 2 ? "broken" : "warning";
      const timestamp = now();
      await env.DB.batch([
        env.DB.prepare(`UPDATE products SET link_health=?,last_checked_at=?,last_check_message=?,consecutive_failures=? WHERE id=?`)
          .bind(health, timestamp, check.message, failures, product.id),
        env.DB.prepare(`INSERT INTO link_checks (product_id,checked_at,ok,http_status,final_url,message) VALUES (?,?,?,?,?,?)`)
          .bind(product.id, timestamp, check.ok ? 1 : 0, check.status, check.finalUrl, check.message),
        env.DB.prepare(`DELETE FROM link_checks WHERE id IN (SELECT id FROM link_checks WHERE product_id=? ORDER BY checked_at DESC LIMIT -1 OFFSET 20)`)
          .bind(product.id),
      ]);
      if (health === "healthy") healthy += 1;
      else if (health === "warning") warning += 1;
      else broken += 1;
      if (health === "broken" && product.link_health !== "broken") await alertWebhook(env, product, check);
    }));
  }
  return { checked: rows.results.length, healthy, warning, broken, checkedAt: now() };
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS" && url.pathname === "/api/products")
    return new Response(null, { status: 204, headers: { ...corsHeaders(request, env),
      "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } });
  if (url.pathname === "/api/products" && request.method === "GET") return publicCatalog(request, env);
  if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, service: "catalog" });
  if (url.pathname === "/api/auth/status" && request.method === "GET")
    return json({ setupRequired: !(await getSetting(env, "admin_password")) });
  if (url.pathname === "/admin" || url.pathname === "/admin/") return text(adminHtml, "text/html", securityHeaders);
  if (url.pathname === "/admin/style.css") return text(adminCss, "text/css", { ...securityHeaders, "Cache-Control": "public,max-age=3600" });
  if (url.pathname === "/admin/app.js") return text(adminJs, "text/javascript", { ...securityHeaders, "Cache-Control": "no-store" });
  if (url.pathname.startsWith("/api/auth/") && request.method === "POST") return authRoute(request, env, url.pathname);
  if (url.pathname.startsWith("/api/admin/")) return adminApi(request, env, url.pathname);
  return notFound();
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (error) { return json({ error: errorMessage(error) }, Number(error?.status || 400)); }
  },
  async scheduled(_event, env, context) { context.waitUntil(runLinkChecks(env)); },
};
