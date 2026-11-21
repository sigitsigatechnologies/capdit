import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-45 outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default: "gradient-accent text-white shadow-lg shadow-violet-950/30 hover:brightness-110 active:brightness-95",
        secondary: "bg-white/[0.07] text-foreground border border-white/10 hover:bg-white/[0.12]",
        ghost: "text-muted hover:text-foreground hover:bg-white/[0.07]",
        outline: "border border-white/12 bg-transparent hover:bg-white/[0.06]",
        destructive: "bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25",
        accent: "bg-violet-500/15 text-violet-200 border border-violet-400/25 hover:bg-violet-500/25",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
