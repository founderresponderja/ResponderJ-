// Responder Já — extensão de Chrome (RJ-13.3).
// Menu do botão direito: selecionar o texto de uma avaliação → "Gerar resposta com Responder Já".
// O texto fica guardado para a janela da extensão o usar.

const MENU_ID = "rj-generate";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Gerar resposta com Responder Já",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  await chrome.storage.session.set({
    pendingReview: { text: String(info.selectionText || "").slice(0, 5000), tabId: tab?.id ?? null, url: tab?.url ?? "" },
  });
  try {
    await chrome.action.openPopup();
  } catch {
    // Versões do Chrome sem openPopup a partir do menu: avisar no ícone.
    await chrome.action.setBadgeText({ text: "1" });
    await chrome.action.setBadgeBackgroundColor({ color: "#E39A1F" });
  }
});
