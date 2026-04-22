import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Pequeno wrapper sobre o YouTube IFrame API. Expõe via ref:
 *   - getCurrentTime(): segundos (ou null se o player não estiver pronto)
 *   - seekTo(seconds): avança o player para o timestamp
 *
 * Fica deliberadamente simples — sem toasts, sem estado global. Carrega
 * `https://www.youtube.com/iframe_api` uma vez, partilhado por todas as
 * instâncias que precisem.
 */

export interface VideoPanelHandle {
  getCurrentTime: () => number | null;
  seekTo: (seconds: number) => void;
}

interface Props {
  url: string;
  className?: string;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.slice(7);
      if (u.pathname.startsWith("/shorts/")) return u.pathname.slice(8);
    }
  } catch {
    // ignorado — url inválido trata no render
  }
  return null;
}

let apiLoadPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("no window");
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
  });
  return apiLoadPromise;
}

export const VideoPanel = forwardRef<VideoPanelHandle, Props>(
  function VideoPanel({ url, className }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<any>(null);
    const videoId = extractYoutubeId(url);

    useImperativeHandle(
      ref,
      () => ({
        getCurrentTime: () => {
          const p = playerRef.current;
          if (!p?.getCurrentTime) return null;
          try {
            const t = p.getCurrentTime();
            return typeof t === "number" && isFinite(t) ? Math.round(t) : null;
          } catch {
            return null;
          }
        },
        seekTo: (seconds: number) => {
          const p = playerRef.current;
          if (p?.seekTo) {
            try {
              p.seekTo(seconds, true);
            } catch {
              // ignorado
            }
          }
        },
      }),
      [],
    );

    useEffect(() => {
      if (!videoId || !containerRef.current) return;
      let cancelled = false;
      loadYouTubeApi().then((YT) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        const el = document.createElement("div");
        containerRef.current.appendChild(el);
        playerRef.current = new YT.Player(el, {
          videoId,
          playerVars: { playsinline: 1, rel: 0 },
        });
      });
      return () => {
        cancelled = true;
        try {
          playerRef.current?.destroy?.();
        } catch {
          // ignorado
        }
        playerRef.current = null;
      };
    }, [videoId]);

    if (!videoId) {
      return (
        <div
          className={`rounded-md border bg-muted p-3 text-xs text-muted-foreground ${className ?? ""}`}
        >
          URL de vídeo inválido. Aceitamos links do YouTube (youtube.com/watch,
          youtu.be, shorts).
        </div>
      );
    }

    return (
      <div
        className={`relative w-full overflow-hidden rounded-md bg-black aspect-video ${className ?? ""}`}
      >
        <div ref={containerRef} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
      </div>
    );
  },
);
