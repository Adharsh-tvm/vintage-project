import { toast as sonnerToast } from "sonner"

export function toast({ title, description, variant, ...props }) {
    const titleText = title ? `${title}` : "";
    const descText = description ? `${description}` : "";
    const message = titleText && descText ? `${titleText}: ${descText}` : (titleText || descText || "");

    const isError = variant === "destructive" ||
        titleText.toLowerCase().includes("error") ||
        descText.toLowerCase().includes("failed") ||
        descText.toLowerCase().includes("error");

    const isSuccess = titleText.toLowerCase().includes("success") ||
        titleText.toLowerCase().includes("created") ||
        titleText.toLowerCase().includes("updated") ||
        titleText.toLowerCase().includes("added") ||
        titleText.toLowerCase().includes("sent") ||
        descText.toLowerCase().includes("success") ||
        descText.toLowerCase().includes("successfully");

    if (isError) {
        return sonnerToast.error(message, props);
    } else if (isSuccess) {
        return sonnerToast.success(message, props);
    } else {
        return sonnerToast(message, props);
    }
}

export function useToast() {
    return {
        toasts: [],
        toast,
        dismiss: (toastId) => sonnerToast.dismiss(toastId),
    }
}