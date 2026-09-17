import test from "node:test";
import assert from "node:assert/strict";
import { createSession, hashPassword, readSession, verifyPassword } from "../worker/security.js";

test("cria e valida uma sessão assinada", async () => {
  const secret = "uma-chave-de-teste-com-mais-de-trinta-e-dois-caracteres";
  const token = await createSession(secret, "admin");
  const session = await readSession(token, secret);
  assert.equal(session.sub, "admin");
  assert.ok(session.csrf.length > 20);
  assert.equal(await readSession(`${token}x`, secret), null);
});

test("hash de senha não armazena senha e valida corretamente", async () => {
  const stored = await hashPassword("SenhaForte!1234", new Uint8Array(24).fill(7), 1000);
  assert.notEqual(stored.hash, "SenhaForte!1234");
  assert.equal(await verifyPassword("SenhaForte!1234", stored), true);
  assert.equal(await verifyPassword("SenhaErrada!1234", stored), false);
});
