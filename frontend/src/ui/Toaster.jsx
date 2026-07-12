import { useToast } from "../hooks/useToast"
import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "../ui/Toast"

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, variant, className, ...props }) {
                const titleStr = String(title || "").toLowerCase();
                const descStr = String(description || "").toLowerCase();
                const isError = variant === "destructive" ||
                    titleStr.includes("error") ||
                    descStr.includes("failed") ||
                    descStr.includes("error");
                const isSuccess = titleStr.includes("success") ||
                    titleStr.includes("created") ||
                    titleStr.includes("updated") ||
                    titleStr.includes("added") ||
                    titleStr.includes("sent") ||
                    descStr.includes("success") ||
                    descStr.includes("successfully");

                let resolvedVariant = variant || "default";
                let resolvedClassName = className || "";

                if (isError || isSuccess) {
                    resolvedVariant = isError ? "destructive" : "success";
                    resolvedClassName = resolvedClassName
                        .replace(/\bbg-\S+/g, "")
                        .replace(/\btext-\S+/g, "")
                        .replace(/\bborder-\S+/g, "")
                        .replace(/\bborder\b/g, "");
                }

                return (
                    <Toast key={id} {...props} variant={resolvedVariant} className={resolvedClassName}>
                        <div className="grid gap-1">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && (
                                <ToastDescription>{description}</ToastDescription>
                            )}
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
