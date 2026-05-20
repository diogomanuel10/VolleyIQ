import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

export function usePushNotifications(teamId?: string) {
  const qc = useQueryClient();
  const [state, setState] = useState<PushState>("loading");

  const vapidQuery = useQuery({
    queryKey: ["vapid-public-key"],
    queryFn: () => api.get<{ key: string | null }>("/api/push/vapid-public-key"),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setState(sub ? "subscribed" : "unsubscribed");
      });
    });
  }, []);

  const subscribe = useMutation({
    mutationFn: async () => {
      const vapidKey = vapidQuery.data?.key;
      if (!vapidKey) throw new Error("VAPID key not available");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await api.post("/api/push/subscribe", { endpoint, keys, teamId });
      return sub;
    },
    onSuccess: () => {
      setState("subscribed");
      qc.invalidateQueries({ queryKey: ["push-state"] });
    },
    onError: () => setState("unsubscribed"),
  });

  const unsubscribe = useMutation({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      await api.delete("/api/push/subscribe", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    },
    onSuccess: () => setState("unsubscribed"),
  });

  const isVapidConfigured = !!vapidQuery.data?.key;

  return {
    state,
    isVapidConfigured,
    subscribe: () => subscribe.mutate(),
    unsubscribe: () => unsubscribe.mutate(),
    isLoading: subscribe.isPending || unsubscribe.isPending,
  };
}
