"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "read-confirm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700",
  secondary:
    "bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700",
  outline:
    "border-2 border-primary-500 text-primary-700 hover:bg-primary-50 active:bg-primary-100",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200",
  danger:
    "bg-error text-white hover:bg-red-700 active:bg-red-800",
  "read-confirm":
    "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 min-h-16 text-xl font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, fullWidth, className = "", children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-lg min-h-14 px-6 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
