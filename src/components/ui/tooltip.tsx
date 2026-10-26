"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useState, type ReactElement, type ReactNode } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;

export function Hint({
  content,
  children,
  toggleOnClick = false,
}: {
  content?: ReactNode;
  children: ReactElement;
  toggleOnClick?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!content) return children;
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
      <TooltipPrimitive.Trigger
        asChild
        onClick={
          toggleOnClick
            ? (event) => {
                event.preventDefault();
                setOpen((value) => !value);
              }
            : undefined
        }
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={4}
          className="z-[1200] max-w-[min(360px,calc(100vw-24px))] rounded bg-slate-900 px-3 py-2 text-xs text-white shadow-md"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-slate-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
