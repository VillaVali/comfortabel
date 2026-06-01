import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check if already dismissed
    const wasDismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (wasDismissed) return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);

    if (ios) {
      // Show iOS instructions after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    }

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", "1");
  };

  if (!showPrompt || dismissed) return null;

  if (showIosInstructions) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-[#1E3A5F] text-white rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#C9A84C]" />
              <span className="font-semibold text-sm">Installeren op iPhone</span>
            </div>
            <button onClick={handleDismiss} className="text-white/50 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="text-sm text-white/80 space-y-2">
            <li className="flex gap-2">
              <span className="text-[#C9A84C] font-bold">1.</span>
              Tik op het <strong>Deel-icoon</strong> (vierkantje met pijl omhoog) in Safari
            </li>
            <li className="flex gap-2">
              <span className="text-[#C9A84C] font-bold">2.</span>
              Scroll naar beneden en tik op <strong>"Zet op beginscherm"</strong>
            </li>
            <li className="flex gap-2">
              <span className="text-[#C9A84C] font-bold">3.</span>
              Tik op <strong>"Voeg toe"</strong>
            </li>
          </ol>
        </div>
        {/* Arrow pointing down to bottom bar */}
        <div className="flex justify-center mt-1">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#1E3A5F]" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 z-50 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#1E3A5F] text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-[#1E3A5F]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Installeer de app</p>
          <p className="text-xs text-white/70">Voeg MijnComfortabel toe aan uw startscherm</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleInstall}
            className="bg-[#C9A84C] text-[#1E3A5F] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#d4b060] transition-colors whitespace-nowrap"
          >
            Installeer
          </button>
          <button
            onClick={handleDismiss}
            className="text-white/50 hover:text-white text-xs text-center transition-colors"
          >
            Niet nu
          </button>
        </div>
      </div>
    </div>
  );
}
