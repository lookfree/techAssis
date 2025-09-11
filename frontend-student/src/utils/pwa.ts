// PWA 工具函数

// Service Worker 注册
export const registerSW = async (): Promise<boolean> => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("SW registered: ", registration);

      // 监听更新
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // 新的 service worker 已安装并等待激活
              console.log("New SW installed, ready to update");
              // 可以在这里提示用户刷新页面
              showUpdateAvailableNotification();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.log("SW registration failed: ", error);
      return false;
    }
  }
  return false;
};

// 显示更新可用通知
const showUpdateAvailableNotification = () => {
  // 这里可以显示一个提示，告诉用户有新版本可用
  if (window.confirm("发现新版本，是否立即更新？")) {
    window.location.reload();
  }
};

// 检查是否为PWA
export const isPWA = (): boolean => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
};

// 检查是否可以安装PWA
export const canInstallPWA = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const checkInstallable = () => {
      if ("BeforeInstallPromptEvent" in window) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    if (document.readyState === "complete") {
      checkInstallable();
    } else {
      window.addEventListener("load", checkInstallable);
    }
  });
};

// 安装PWA提示
let deferredPrompt: any;

window.addEventListener("beforeinstallprompt", (e) => {
  // 阻止默认的安装提示
  e.preventDefault();
  // 保存事件，稍后触发
  deferredPrompt = e;
  // 显示自定义安装按钮
  showInstallButton();
});

const showInstallButton = () => {
  // 可以在这里显示自定义的安装提示
  console.log("PWA can be installed");
};

export const installPWA = async (): Promise<boolean> => {
  if (deferredPrompt) {
    // 显示安装提示
    deferredPrompt.prompt();
    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // 清除保存的提示
    deferredPrompt = null;
    return outcome === "accepted";
  }
  return false;
};

// 网络状态检测
export const getNetworkStatus = (): boolean => {
  return navigator.onLine;
};

export const onNetworkChange = (callback: (online: boolean) => void) => {
  window.addEventListener("online", () => callback(true));
  window.addEventListener("offline", () => callback(false));
};

// 推送通知相关
export const requestNotificationPermission =
  async (): Promise<NotificationPermission> => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return "denied";
  };

export const showNotification = (
  title: string,
  options?: NotificationOptions,
) => {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
};

// 后台同步
export const registerBackgroundSync = (tag: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      navigator.serviceWorker.ready
        .then((registration) => {
          return (registration as any).sync.register(tag);
        })
        .then(() => {
          console.log("Background sync registered");
          resolve();
        })
        .catch((error) => {
          console.error("Background sync registration failed:", error);
          reject(error);
        });
    } else {
      reject(new Error("Background sync not supported"));
    }
  });
};

// 缓存管理
export const clearCache = async (): Promise<void> => {
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    console.log("All caches cleared");
  }
};

export const getCacheSize = async (): Promise<number> => {
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  }
  return 0;
};

// 离线存储
export const isOnline = (): boolean => navigator.onLine;

export const saveOfflineData = (key: string, data: any): void => {
  try {
    localStorage.setItem(
      `offline_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    console.error("Failed to save offline data:", error);
  }
};

export const getOfflineData = (key: string): any => {
  try {
    const stored = localStorage.getItem(`offline_${key}`);
    if (stored) {
      const { data, timestamp } = JSON.parse(stored);
      // 检查数据是否过期（24小时）
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
      // 数据过期，删除
      localStorage.removeItem(`offline_${key}`);
    }
  } catch (error) {
    console.error("Failed to get offline data:", error);
  }
  return null;
};

export const clearOfflineData = (): void => {
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("offline_")) {
      localStorage.removeItem(key);
    }
  });
};
