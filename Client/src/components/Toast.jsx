import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./ToastContext";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast, dismiss }), [dismiss, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          const color = toast.type === "success"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
            : toast.type === "error"
              ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
              : "border-sky-400/30 bg-sky-400/10 text-sky-100";

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md ${color}`}
            >
              <Icon size={19} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm leading-5">{toast.message}</p>
              <button
                type="button"
                title="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 opacity-70 hover:opacity-100"
              >
                <X size={17} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
