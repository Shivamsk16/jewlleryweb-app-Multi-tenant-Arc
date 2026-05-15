"use client";
import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

type ToastVariant = "default" | "success" | "error";

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: ToastVariant }
>(({ className, variant = "default", ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "pointer-events-auto flex w-full items-center justify-between gap-2 rounded-md border px-4 py-3 shadow-modal text-sm",
      variant === "success" && "border-success/30 bg-success/10 text-success",
      variant === "error" && "border-danger/30 bg-danger/10 text-danger",
      variant === "default" && "border-border bg-surface text-textPrimary",
      className,
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

type ToastItem = { id: string; title: string; variant?: ToastVariant };

const ToastContext = React.createContext<{
  toast: (title: string, variant?: ToastVariant) => void;
} | null>(null);

export function ToastContainer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((title: string, variant: ToastVariant = "default") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, title, variant }]);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            duration={4000}
            onOpenChange={(open) => !open && remove(t.id)}
          >
            <span className="font-semibold">{t.title}</span>
            <ToastPrimitive.Close className="rounded-md p-1 opacity-70 hover:opacity-100">
              <X className="size-3.5" />
            </ToastPrimitive.Close>
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastContainer");
  return ctx;
}
