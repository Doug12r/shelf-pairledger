import type { Toast } from "../hooks/useToast";

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-6 py-3 rounded-full shadow-lg text-white text-sm font-medium toast-animate pointer-events-auto ${
            t.type === "success"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          }`}
        >
          {t.type === "success" ? "\u2713" : "\u2715"} {t.message}
        </div>
      ))}
    </div>
  );
}
