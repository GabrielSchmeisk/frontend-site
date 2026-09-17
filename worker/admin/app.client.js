const $ = (selector) => document.querySelector(selector);
const state = { csrf: "", products: [], setupRequired: false };
const authView = $("#authView");
const dashboardView = $("#dashboardView");
const dialog = $("#productDialog");

async function api(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  if (options.method && options.method !== "GET" && state.csrf) headers["X-CSRF-Token"] = state.csrf;
  const response = await fetch(path, { credentials: "same-origin", ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Não foi possível concluir a operação."), { status: response.status, data });
  return data;
}

function message(element, value = "") {
  element.textContent = value;
  element.classList.toggle("hidden", !value);
}

function setBusy(button, busy, label) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

function showAuth(setupRequired = false) {
  state.setupRequired = setupRequired;
  authView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  $("#logoutButton").classList.add("hidden");
  $("#confirmRow").classList.toggle("hidden", !setupRequired);
  $("#confirmPassword").required = setupRequired;
  $("#password").autocomplete = setupRequired ? "new-password" : "current-password";
  $("#authEyebrow").textContent = setupRequired ? "PRIMEIRO ACESSO" : "ACESSO PROTEGIDO";
  $("#authTitle").textContent = setupRequired ? "Crie sua senha administrativa" : "Entrar no painel";
  $("#authDescription").textContent = setupRequired ? "Essa senha protege a inclusão e a alteração dos produtos." : "Use a senha administrativa para gerenciar os produtos.";
  $("#authButton").textContent = setupRequired ? "Configurar painel" : "Entrar";
}

async function loadDashboard() {
  const session = await api("/api/admin/session");
  state.csrf = session.csrf;
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  $("#logoutButton").classList.remove("hidden");
  await loadProducts();
}

const statusLabel = { active: "Publicado", draft: "Rascunho", hidden: "Oculto" };
const healthLabel = { unchecked: "Não verificado", healthy: "Funcionando", warning: "Requer atenção", broken: "Quebrado" };
const categoryLabel = { audio: "Áudio", video: "Vídeo", iluminacao: "Iluminação", outros: "Outros" };

function appendCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.append(cell);
  return cell;
}

function renderProducts() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("pt-BR");
  const products = state.products.filter((product) => `${product.title} ${product.label} ${categoryLabel[product.category] || ""}`.toLocaleLowerCase("pt-BR").includes(query));
  const rows = $("#productRows");
  rows.replaceChildren();
  for (const product of products) {
    const row = document.createElement("tr");
    const productCell = appendCell(row, "");
    const title = document.createElement("span");
    title.className = "product-title";
    title.textContent = product.title;
    productCell.append(title);
    if (product.label) { const label = document.createElement("span"); label.className = "product-label"; label.textContent = product.label; productCell.append(label); }
    appendCell(row, categoryLabel[product.category] || product.category);
    const publication = appendCell(row, statusLabel[product.status] || product.status);
    publication.classList.add("publication");
    const healthCell = appendCell(row, "");
    const health = document.createElement("span");
    health.className = `badge ${product.linkHealth === "healthy" ? "ok" : product.linkHealth}`;
    health.textContent = healthLabel[product.linkHealth] || product.linkHealth;
    health.title = product.lastCheckMessage || "";
    healthCell.append(health);
    const actionCell = appendCell(row, "");
    const button = document.createElement("button");
    button.type = "button"; button.className = "row-button"; button.textContent = "Editar";
    button.addEventListener("click", () => openProduct(product));
    actionCell.append(button);
    rows.append(row);
  }
  $("#emptyState").classList.toggle("hidden", products.length > 0);
}

async function loadProducts() {
  const result = await api("/api/admin/products");
  state.products = result.products;
  $("#totalCount").textContent = state.products.length;
  $("#activeCount").textContent = state.products.filter((item) => item.status === "active").length;
  $("#problemCount").textContent = result.alerts;
  const broken = state.products.filter((item) => item.linkHealth === "broken").length;
  const warning = state.products.filter((item) => item.linkHealth === "warning").length;
  const alertBox = $("#alertBox");
  message(alertBox, broken || warning ? `${broken} link(s) quebrado(s) e ${warning} link(s) que precisam de nova verificação.` : "");
  renderProducts();
}

function openProduct(product = null) {
  $("#productForm").reset();
  message($("#formMessage"));
  $("#productId").value = product?.id || "";
  $("#dialogTitle").textContent = product ? "Editar produto" : "Adicionar produto";
  $("#deleteButton").classList.toggle("hidden", !product);
  for (const key of ["title", "label", "category", "status", "productUrl", "imageUrl", "videoUrl", "position"])
    if (product && product[key] !== undefined) $(`#${key}`).value = product[key];
  if (!product) { $("#category").value = "audio"; $("#status").value = "active"; $("#position").value = String(state.products.length); }
  dialog.showModal();
  $("#title").focus();
}

$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#authButton");
  message($("#authMessage"));
  const password = $("#password").value;
  try {
    setBusy(button, true, "Aguarde…");
    if (state.setupRequired) {
      if (password !== $("#confirmPassword").value) throw new Error("As senhas não são iguais.");
      const setupToken = new URLSearchParams(location.hash.slice(1)).get("setup") || "";
      if (!setupToken) throw new Error("Abra o endereço de configuração fornecido na publicação.");
      await api("/api/auth/setup", { method: "POST", body: JSON.stringify({ password, setupToken }) });
      history.replaceState(null, "", "/admin");
    } else await api("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) });
    $("#authForm").reset();
    await loadDashboard();
  } catch (error) { message($("#authMessage"), error.message); }
  finally { setBusy(button, false, ""); }
});

$("#productForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("#productId").value;
  const payload = Object.fromEntries(["title", "label", "category", "status", "productUrl", "imageUrl", "videoUrl", "position"].map((key) => [key, $(`#${key}`).value]));
  const button = $("#saveButton");
  try {
    setBusy(button, true, "Salvando…");
    await api(id ? `/api/admin/products/${id}` : "/api/admin/products", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadProducts();
  } catch (error) { message($("#formMessage"), error.message); }
  finally { setBusy(button, false, ""); }
});

$("#deleteButton").addEventListener("click", async () => {
  const id = $("#productId").value;
  const product = state.products.find((item) => item.id === id);
  if (!product || !confirm(`Excluir “${product.title}”?`)) return;
  try { await api(`/api/admin/products/${id}`, { method: "DELETE" }); dialog.close(); await loadProducts(); }
  catch (error) { message($("#formMessage"), error.message); }
});

$("#checkButton").addEventListener("click", async () => {
  const button = $("#checkButton");
  try { setBusy(button, true, "Verificando…"); await api("/api/admin/check-links", { method: "POST" }); await loadProducts(); }
  catch (error) { message($("#alertBox"), error.message); }
  finally { setBusy(button, false, ""); }
});

$("#logoutButton").addEventListener("click", async () => { await api("/api/auth/logout", { method: "POST" }); state.csrf = ""; showAuth(false); });
$("#newButton").addEventListener("click", () => openProduct());
$("#searchInput").addEventListener("input", renderProducts);
$("#closeDialog").addEventListener("click", () => dialog.close());
$("#cancelButton").addEventListener("click", () => dialog.close());

(async () => {
  try { await loadDashboard(); }
  catch {
    const status = await api("/api/auth/status").catch(() => ({ setupRequired: false }));
    showAuth(Boolean(status.setupRequired));
  }
})();
