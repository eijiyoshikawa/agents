import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "unread";
}

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const base = "rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]";
  const variants = {
    default: "bg-white",
    unread: "bg-primary-50 border-l-4 border-primary-500",
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
