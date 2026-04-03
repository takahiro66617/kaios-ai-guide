import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  stack?: string;
  action?: string;
  target?: string;
  path?: string;
}

interface DebugSession {
  sessionId: string;
  errorLogs: LogEntry[];
  consoleLogs: LogEntry[];
  networkLogs: LogEntry[];
  interactionLogs: LogEntry[];
}

interface DebugContextType {
  isActive: boolean;
  startSession: () => void;
  stopSession: () => void;
  getSessionData: () => DebugSession | null;
  errorCount: number;
}

const DebugContext = createContext<DebugContextType | null>(null);

export const useDebugMode = () => {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error("useDebugMode must be used within DebugModeProvider");
  return ctx;
};

function generateSessionId() {
  const rand = Math.random().toString(36).substring(2, 8);
  return `dbg_${Date.now()}_${rand}`;
}

export const DebugModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const sessionRef = useRef<DebugSession | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const addLog = useCallback((type: keyof Pick<DebugSession, "errorLogs" | "consoleLogs" | "networkLogs" | "interactionLogs">, entry: LogEntry) => {
    if (sessionRef.current) {
      sessionRef.current[type].push(entry);
      if (type === "errorLogs") {
        setErrorCount(c => c + 1);
      }
    }
  }, []);

  const startSession = useCallback(() => {
    const session: DebugSession = {
      sessionId: generateSessionId(),
      errorLogs: [],
      consoleLogs: [],
      networkLogs: [],
      interactionLogs: [],
    };
    sessionRef.current = session;
    setErrorCount(0);
    setIsActive(true);

    // --- Intercept console.error ---
    const origError = console.error;
    console.error = (...args: any[]) => {
      addLog("errorLogs", {
        timestamp: new Date().toISOString(),
        level: "error",
        message: args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      });
      origError.apply(console, args);
    };

    // --- Intercept console.warn ---
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      addLog("consoleLogs", {
        timestamp: new Date().toISOString(),
        level: "warn",
        message: args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      });
      origWarn.apply(console, args);
    };

    // --- window.onerror ---
    const onError = (event: ErrorEvent) => {
      addLog("errorLogs", {
        timestamp: new Date().toISOString(),
        level: "error",
        message: event.message,
        stack: event.error?.stack,
      });
    };
    window.addEventListener("error", onError);

    // --- unhandledrejection ---
    const onRejection = (event: PromiseRejectionEvent) => {
      addLog("errorLogs", {
        timestamp: new Date().toISOString(),
        level: "unhandled_rejection",
        message: String(event.reason),
        stack: event.reason?.stack,
      });
    };
    window.addEventListener("unhandledrejection", onRejection);

    // --- Fetch monkey-patch ---
    const origFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const start = Date.now();
      const req = new Request(...args);
      const method = req.method;
      const url = req.url;
      try {
        const res = await origFetch(...args);
        const elapsed = Date.now() - start;
        addLog("networkLogs", {
          timestamp: new Date().toISOString(),
          level: res.ok ? "info" : "error",
          message: `${method} ${url} → ${res.status} (${elapsed}ms)`,
        });
        return res;
      } catch (err: any) {
        const elapsed = Date.now() - start;
        addLog("networkLogs", {
          timestamp: new Date().toISOString(),
          level: "error",
          message: `${method} ${url} → FAILED (${elapsed}ms): ${err.message}`,
        });
        throw err;
      }
    };

    // --- Click tracking ---
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const actionable = target.closest("a, button, input, select, textarea, [role='button'], [role='menuitem'], [role='tab']");
      if (actionable) {
        const tag = actionable.tagName.toLowerCase();
        const text = (actionable.textContent || "").trim().slice(0, 40);
        addLog("interactionLogs", {
          timestamp: new Date().toISOString(),
          action: "click",
          target: `<${tag}> ${text}`,
          path: window.location.pathname + window.location.search,
        });
      }
    };
    document.addEventListener("click", onClick, true);

    // --- Navigation tracking ---
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...a: any[]) {
      origPush.apply(this, a as any);
      addLog("interactionLogs", {
        timestamp: new Date().toISOString(),
        action: "navigate (push)",
        path: window.location.pathname + window.location.search,
      });
    };
    history.replaceState = function (...a: any[]) {
      origReplace.apply(this, a as any);
      addLog("interactionLogs", {
        timestamp: new Date().toISOString(),
        action: "navigate (replace)",
        path: window.location.pathname + window.location.search,
      });
    };
    const onPopState = () => {
      addLog("interactionLogs", {
        timestamp: new Date().toISOString(),
        action: "navigate (popstate)",
        path: window.location.pathname + window.location.search,
      });
    };
    window.addEventListener("popstate", onPopState);

    // --- Cleanup ---
    cleanupRef.current = () => {
      console.error = origError;
      console.warn = origWarn;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.fetch = origFetch;
      document.removeEventListener("click", onClick, true);
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("popstate", onPopState);
    };
  }, [addLog]);

  const stopSession = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    sessionRef.current = null;
    setIsActive(false);
    setErrorCount(0);
  }, []);

  const getSessionData = useCallback(() => {
    return sessionRef.current ? JSON.parse(JSON.stringify(sessionRef.current)) : null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <DebugContext.Provider value={{ isActive, startSession, stopSession, getSessionData, errorCount }}>
      {children}
    </DebugContext.Provider>
  );
};
