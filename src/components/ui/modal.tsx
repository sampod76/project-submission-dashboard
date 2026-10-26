"use client";
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "./dialog";
import { cn } from "@/lib/utils";
type ModalContextType = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  openModal: () => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
};
const ModalContext = createContext<ModalContextType | null>(null);
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used inside ModalComponent");
  return context;
};
type ModalComponentProps = {
  children: ReactNode;
  title?: string;
  buttonText?: string;
  button?: ReactNode;
  loading?: boolean;
  destroyOnClose?: boolean;
  width?: number;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
export default function ModalComponent({
  children,
  title = "Project Submission Dashboard",
  buttonText,
  button,
  loading = false,
  width = 1000,
  className,
  open: controlledOpen,
  onOpenChange,
}: ModalComponentProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formLoading, setLoading] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const pending = loading || formLoading;
  const setOpen: ModalContextType["setOpen"] = (next) => {
    const value = typeof next === "function" ? next(open) : next;
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };
  return (
    <ModalContext.Provider
      value={{
        open,
        setOpen,
        openModal: () => setOpen(true),
        closeModal: () => setOpen(false),
        setLoading,
      }}
    >
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        {button ? (
          <DialogTrigger asChild>{button}</DialogTrigger>
        ) : controlledOpen === undefined ? (
          <DialogTrigger asChild>
            <Button variant="secondary">{buttonText || "Open Modal"}</Button>
          </DialogTrigger>
        ) : null}
        <DialogContent
          aria-describedby={undefined}
          showCloseButton={!pending}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (pending) event.preventDefault();
          }}
          style={{ width: `min(${width}px, calc(100vw - 32px))`, maxWidth: "none" }}
          className={cn("block max-h-[90dvh] overflow-y-auto rounded-lg", className)}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}
