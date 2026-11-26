// Responder Já — janela da extensão (RJ-13.3).
// Gera 3 respostas para a avaliação selecionada e insere a escolhida no campo de resposta da página.
// A chave fica só neste navegador (chrome.storage.local) e só é enviada para www.responderja.pt.

const API = "https://www.responderja.pt/api/extension";
const $ = (id) => document.getElementById(id);
const TIPOS = { concise: "curta", balanced: "equilibrada", detailed: "detalhada" };

async function getKey() {
  return (await chrome.storage.local.get("extensionKey")).extensionKey || null;
}

async function api(path, init = {}) {
  const key = await getKey();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Erro ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function platformFromUrl(url) {
  const u = String(url || "");
  if (/booking\.com/.test(u)) return "booking";
  if (/tripadvisor\./.test(u)) return "tripadvisor";
  if (/facebook\.com/.test(u)) return "facebook";
  return "google_maps";
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

/** Texto selecionado na página (precisa da permissão activeTab, dada ao abrir a extensão). */
async function selectedText(tabId) {
  try {
    const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: () => String(window.getSelection() || "").trim() });
    return r?.result || "";
  } catch {
    return ""; // páginas do Chrome e da loja não deixam ler
  }
}

/** Escreve o texto no campo onde o cursor estava (ou no primeiro campo de resposta vazio visível). */
function insertIntoPage(text) {
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const isEditable = (el) => el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text") || el.isContentEditable);
  let el = document.activeElement;
  if (!isEditable(el)) {
    el = [...document.querySelectorAll("textarea, [contenteditable='true'], [contenteditable='']")]
      .find((x) => visible(x) && !String(x.value ?? x.textContent ?? "").trim()) || null;
  }
  if (!el) return false;
  el.focus();
  if (el.isContentEditable) {
    document.execCommand("selectAll", false);
    document.execCommand("insertText", false, text);
  } else {
    // Atribuição pelo "setter" nativo, para os sites feitos com React reconhecerem a alteração.
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return true;
}

function showSetup(message = "") {
  $("main").hidden = true;
  $("setup").hidden = false;
  $("setup-error").textContent = message;
  $("key").focus(); // RJ-A11Y.2: o foco vai para onde há que agir
}

async function showMain() {
  $("setup").hidden = true;
  $("main").hidden = false;
  const me = await api("/me");
  $("credits").textContent = `${me.credits} créditos`;
  const select = $("business");
  select.innerHTML = "";
  for (const e of me.establishments) select.add(new Option(e.name, e.id));
  if (!me.establishments.length) select.add(new Option("(sem negócio)", ""));
  const saved = (await chrome.storage.local.get("establishmentId")).establishmentId;
  if (saved && me.establishments.some((e) => String(e.id) === String(saved))) select.value = String(saved);

  const tab = await activeTab();
  const pending = (await chrome.storage.session.get("pendingReview")).pendingReview;
  await chrome.storage.session.remove("pendingReview");
  await chrome.action.setBadgeText({ text: "" });
  $("platform").value = platformFromUrl(pending?.url || tab?.url);
  $("review").value = pending?.text || (tab?.id ? await selectedText(tab.id) : "");
}

function renderResults(data, tabId) {
  const box = $("results");
  box.innerHTML = "";
  data.variations.forEach((v, i) => {
    const card = document.createElement("div");
    card.className = "result";
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", `Resposta ${i + 1} de ${data.variations.length}${TIPOS[v.type] ? `, ${TIPOS[v.type]}` : ""}`);
    const tipo = document.createElement("div");
    tipo.className = "tipo";
    tipo.textContent = TIPOS[v.type] || v.type || "";
    const p = document.createElement("p");
    p.textContent = v.text; // texto simples: nunca interpretado como HTML
    const acoes = document.createElement("div");
    acoes.className = "acoes";
    const inserir = document.createElement("button");
    inserir.className = "inserir";
    inserir.textContent = "Inserir na página";
    inserir.setAttribute("aria-label", `Inserir a resposta ${i + 1} na página`);
    inserir.onclick = async () => {
      try {
        const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: insertIntoPage, args: [v.text] });
        if (r?.result) window.close();
        else $("error").textContent = "Não encontrei o campo de resposta. Clique primeiro no campo e volte a tentar, ou use Copiar.";
      } catch {
        $("error").textContent = "Esta página não deixa inserir texto. Use Copiar.";
      }
    };
    const copiar = document.createElement("button");
    copiar.textContent = "Copiar";
    copiar.setAttribute("aria-label", `Copiar a resposta ${i + 1}`);
    copiar.onclick = async () => {
      await navigator.clipboard.writeText(v.text);
      copiar.textContent = "Copiado";
      $("status").textContent = `Resposta ${i + 1} copiada.`;
    };
    acoes.append(inserir, copiar);
    card.append(tipo, p, acoes);
    box.append(card);
  });
  $("credits").textContent = `${data.creditsRemaining} créditos`;
  // RJ-A11Y.2: anunciar o resultado e pôr o foco na primeira resposta.
  $("status").textContent = `${data.variations.length} respostas prontas.`;
  box.querySelector("button")?.focus();
}

$("save-key").onclick = async () => {
  const key = $("key").value.trim();
  if (!/^rjx_[A-Za-z0-9]{32}$/.test(key)) return showSetup("A chave não tem o formato certo. Copie-a outra vez da app.");
  await chrome.storage.local.set({ extensionKey: key });
  try {
    await showMain();
  } catch (e) {
    await chrome.storage.local.remove("extensionKey");
    showSetup(e.message);
  }
};

$("generate").onclick = async () => {
  const btn = $("generate");
  $("error").textContent = "";
  const reviewText = $("review").value.trim();
  if (reviewText.length < 3) {
    $("error").textContent = "Selecione o texto da avaliação na página ou cole-o aqui.";
    $("review").setAttribute("aria-invalid", "true");
    $("review").focus();
    return;
  }
  $("review").removeAttribute("aria-invalid");
  btn.disabled = true;
  btn.textContent = "A gerar…";
  btn.setAttribute("aria-busy", "true");
  $("status").textContent = "A gerar respostas…";
  try {
    const establishmentId = $("business").value || null;
    await chrome.storage.local.set({ establishmentId });
    const data = await api("/generate", {
      method: "POST",
      body: JSON.stringify({ reviewText, establishmentId, platform: $("platform").value }),
    });
    const tab = await activeTab();
    renderResults(data, tab?.id);
  } catch (e) {
    if (e.status === 401) return showSetup(e.message);
    $("error").textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.textContent = "Gerar 3 respostas (1 crédito)";
  }
};

$("disconnect").onclick = async () => {
  await chrome.storage.local.remove(["extensionKey", "establishmentId"]);
  showSetup("Chave desligada neste navegador. Para a apagar de vez, use a app.");
};

(async () => {
  if (!(await getKey())) return showSetup();
  try {
    await showMain();
  } catch (e) {
    showSetup(e.message);
  }
})();
