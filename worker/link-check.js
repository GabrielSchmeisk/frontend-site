const ALLOWED_PRODUCT_HOSTS = [
  "meli.la", "mercadolivre.com.br", "mercadolibre.com", "shopee.com.br",
  "s.shopee.com.br", "aliexpress.com", "pt.aliexpress.com", "s.click.aliexpress.com",
];
const ALLOWED_VIDEO_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be"];
const ALLOWED_IMAGE_HOSTS = [
  "i.imgur.com", "http2.mlstatic.com", "down-br.img.susercontent.com",
  "ae-pic-a1.aliexpress-media.com",
];

const hostAllowed = (hostname, allowed) => allowed.some((host) => hostname === host || hostname.endsWith(`.${host}`));

export function validateExternalUrl(value, type = "product") {
  let parsed;
  try { parsed = new URL(String(value || "").trim()); } catch { throw new Error("Endereço inválido."); }
  if (parsed.protocol !== "https:") throw new Error("O endereço precisa usar HTTPS.");
  const allowed = type === "video" ? ALLOWED_VIDEO_HOSTS : type === "image" ? ALLOWED_IMAGE_HOSTS : ALLOWED_PRODUCT_HOSTS;
  if (!hostAllowed(parsed.hostname.toLowerCase(), allowed)) throw new Error(`Domínio não permitido para ${type}.`);
  if (parsed.username || parsed.password) throw new Error("O endereço não pode conter credenciais.");
  return parsed.toString();
}

const suspiciousDestination = (url) => {
  const parsed = new URL(url);
  const path = parsed.pathname.toLowerCase().replace(/\/+$/u, "");
  if (parsed.hostname.endsWith("mercadolivre.com.br") &&
      (/\/social\/[^/]+\/lists$/u.test(path) ||
       (/^\/social\/[^/]+$/u.test(path) && !parsed.searchParams.has("ref"))))
    return "O link terminou em uma página genérica do Mercado Livre.";
  if (parsed.hostname.endsWith("shopee.com.br") && ["", "/", "/buyer/login"].includes(path))
    return "O link terminou em uma página genérica da Shopee.";
  if (parsed.hostname.endsWith("aliexpress.com") && ["", "/", "/p/error/404.html"].includes(path))
    return "O link terminou em uma página genérica do AliExpress.";
  return "";
};

export async function checkProductLink(url, fetcher = fetch) {
  let current = validateExternalUrl(url, "product");
  for (let redirect = 0; redirect <= 8; redirect += 1) {
    let response;
    try {
      response = await fetcher(current, {
        method: "GET", redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 OtimizandoOAltar-LinkMonitor/1.0", "Range": "bytes=0-65535" },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      return { ok: false, inconclusive: true, status: 0, finalUrl: current, message: `Verificação inconclusiva: ${error?.name || "erro de conexão"}.` };
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (!location) return { ok: false, status: response.status, finalUrl: current, message: "Redirecionamento sem destino." };
      try { current = validateExternalUrl(new URL(location, current).toString(), "product"); }
      catch { return { ok: false, status: response.status, finalUrl: current, message: "O link redirecionou para um domínio não permitido." }; }
      continue;
    }
    const destinationProblem = suspiciousDestination(current);
    if (destinationProblem) return { ok: false, status: response.status, finalUrl: current, message: destinationProblem };
    if (response.status < 200 || response.status >= 400)
      return { ok: false, status: response.status, finalUrl: current, message: `A loja respondeu com HTTP ${response.status}.` };
    const contentType = response.headers.get("Content-Type") || "";
    const body = contentType.includes("text/html") ? (await response.text()).slice(0, 65536).toLowerCase() : "";
    const unavailableMarkers = ["anúncio finalizado", "anuncio finalizado", "produto indisponível",
      "produto indisponivel", "página não encontrada", "pagina nao encontrada", "item is unavailable"];
    const marker = unavailableMarkers.find((text) => body.includes(text));
    if (marker) return { ok: false, status: response.status, finalUrl: current, message: `A página informa: ${marker}.` };
    return { ok: true, status: response.status, finalUrl: current, message: "Link funcionando." };
  }
  return { ok: false, status: 0, finalUrl: current, message: "O link excedeu o limite de redirecionamentos." };
}

export const urlRules = { ALLOWED_PRODUCT_HOSTS, ALLOWED_VIDEO_HOSTS, ALLOWED_IMAGE_HOSTS };
