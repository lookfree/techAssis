import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { unstable_Toast as Toast } from "@ant-design/mobile";

interface PWAContextType {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => void;
  updateAvailable: boolean;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
};

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  useEffect(() => {
    // 检查是否已安装
    const checkIfInstalled = () => {
      const isInStandaloneMode = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const isIOSInstalled = (window.navigator as any).standalone === true;
      setIsInstalled(isInStandaloneMode || isIOSInstalled);
    };

    checkIfInstalled();

    // 监听网络状态
    const handleOnline = () => {
      setIsOnline(true);
      Toast.show({ content: "网络已连接", duration: 1000 });
    };

    const handleOffline = () => {
      setIsOnline(false);
      Toast.show({ content: "网络已断开，部分功能可能受限", duration: 2000 });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 监听PWA安装提示
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 监听PWA安装完成
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      Toast.show({ content: "应用已安装到桌面", duration: 2000 });
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Service Worker更新检测
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 监听Service Worker更新
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
                setWaitingWorker(newWorker);
                Toast.show({
                  content: "发现新版本，点击更新",
                  duration: 5000,
                });
              }
            });
          }
        });
      });

      // 监听SW消息
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SW_UPDATED") {
          setUpdateAvailable(true);
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error("Error prompting install:", error);
    }
  };

  const updateApp = () => {
    if (!waitingWorker) return;

    waitingWorker.postMessage({ type: "SKIP_WAITING" });

    // 监听控制权转移
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    setUpdateAvailable(false);
    setWaitingWorker(null);
  };

  const value: PWAContextType = {
    isOnline,
    isInstallable,
    isInstalled,
    promptInstall,
    updateAvailable,
    updateApp,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
};
