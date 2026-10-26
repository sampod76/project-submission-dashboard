"use client";

import { useId, type ReactElement, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  description,
  children,
  className,
}: {
  label: string;
  error?: string;
  description?: ReactNode;
  children: ReactElement;
  className?: string;
}) {
  const id = useId();
  return (
    <div data-slot="field" className={cn("mb-4 min-w-0 space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Slot
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [description ? `${id}-description` : "", error ? `${id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        {children}
      </Slot>
      {description && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
