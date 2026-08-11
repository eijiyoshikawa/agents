import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
