import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-xl border border-border bg-card px-3 py-1 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50",
        type === "color" && "p-1",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-[11px] font-medium uppercase tracking-wider text-muted", className)} {...props} />
  )
);
Label.displayName = "Label";

export { Input, Textarea, Label };
