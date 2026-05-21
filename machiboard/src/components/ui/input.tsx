"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id || label.replace(/\s/g, "-").toLowerCase();

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-base font-semibold text-neutral-700">
          {label}
          {props.required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-14 px-4 text-lg rounded-xl border-2 border-neutral-200 bg-white transition-colors placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none ${
            error ? "border-error" : ""
          } ${className}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-base text-error flex items-center gap-1" role="alert">
            <span aria-hidden="true">!</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
