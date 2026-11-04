(() => {
  const installButton = document.getElementById("installAppButton");
  const installHelp = document.getElementById("installAppHelp");
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(error => {
        console.error("App offline support could not be enabled:", error);
      });
    });
  }

  let installPrompt = null;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone && installButton) installButton.hidden = true;

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
    if (installHelp) installHelp.textContent = "ဖုန်းထဲသို့ ထည့်သွင်းရန် Install ကိုနှိပ်ပါ။";
  });

  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!installPrompt) {
        if (installHelp) installHelp.textContent =
          "Chrome မီနူး (⋮) ကိုဖွင့်ပြီး Add to Home screen သို့မဟုတ် Install app ကိုရွေးပါ။";
        return;
      }
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
    });
  }

  window.addEventListener("appinstalled", () => {
    if (installButton) installButton.hidden = true;
    if (installHelp) installHelp.textContent = "App ကို ဖုန်းထဲတွင် ထည့်သွင်းပြီးပါပြီ။";
  });
})();