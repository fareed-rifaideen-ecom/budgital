import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISSED_KEY = 'budgital-install-prompt-dismissed-v1';

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const safariNavigator = window.navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia?.('(display-mode: standalone)').matches || safariNavigator.standalone) return;
    try {
      if (sessionStorage.getItem(DISMISSED_KEY) === '1') {
        setDismissed(true);
        return;
      }
    } catch {
      // Storage may be unavailable in private browsing; the prompt can still work.
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!installEvent || dismissed) return null;

  async function install() {
    await installEvent?.prompt();
    const choice = await installEvent?.userChoice;
    if (choice?.outcome === 'accepted') setInstallEvent(null);
  }

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch { /* no-op */ }
  }

  return (
    <aside className="pwa-install-card" aria-label="Install Budgital">
      <span className="pwa-install-icon"><Download size={17} /></span>
      <span className="pwa-install-copy"><strong>Keep Budgital close</strong><small>Install it like an app — no account required.</small></span>
      <button className="pwa-install-action" type="button" onClick={() => void install()}>Install</button>
      <button className="pwa-install-dismiss" type="button" onClick={dismiss} aria-label="Dismiss install prompt"><X size={15} /></button>
    </aside>
  );
}
