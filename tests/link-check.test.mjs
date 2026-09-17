import test from "node:test";
import assert from "node:assert/strict";
import { checkProductLink, validateExternalUrl } from "../worker/link-check.js";

test("aceita links HTTPS de lojas permitidas", () => {
  assert.equal(validateExternalUrl("https://meli.la/abc", "product"), "https://meli.la/abc");
  assert.equal(validateExternalUrl("https://youtu.be/abc", "video"), "https://youtu.be/abc");
});

test("recusa protocolos e domínios não permitidos", () => {
  assert.throws(() => validateExternalUrl("javascript:alert(1)", "product"), /HTTPS/u);
  assert.throws(() => validateExternalUrl("https://example.com/item", "product"), /Domínio/u);
});

test("identifica destino genérico do Mercado Livre", async () => {
  const responses = [
    new Response(null, { status: 302, headers: { Location: "https://www.mercadolivre.com.br/social/vendedor/lists" } }),
    new Response("<html>lista</html>", { status: 200, headers: { "Content-Type": "text/html" } }),
  ];
  const result = await checkProductLink("https://meli.la/abc", async () => responses.shift());
  assert.equal(result.ok, false);
  assert.match(result.message, /página genérica/u);
});

test("aceita uma página válida após redirecionamento", async () => {
  const responses = [
    new Response(null, { status: 302, headers: { Location: "https://www.mercadolivre.com.br/produto/MLB-1" } }),
    new Response("<html>produto disponível</html>", { status: 200, headers: { "Content-Type": "text/html" } }),
  ];
  const result = await checkProductLink("https://meli.la/abc", async () => responses.shift());
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("recusa redirecionamento para domínio externo", async () => {
  const result = await checkProductLink("https://meli.la/abc", async () =>
    new Response(null, { status: 302, headers: { Location: "https://evil.example/phishing" } }));
  assert.equal(result.ok, false);
  assert.match(result.message, /domínio não permitido/u);
});
