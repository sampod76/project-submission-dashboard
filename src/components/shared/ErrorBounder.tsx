"use client";

import RouteState from "@/components/shared/route-state";
import React from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

type ErrorBounderComProps = {
  children: React.ReactNode;
};

function Fallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <RouteState
      variant="dashboard"
      title="Unable to load this content"
      description="We encountered an unexpected error. Please try again or return to your dashboard."
      homeHref="/dashboard"
      homeLabel="Dashboard Home"
      reset={resetErrorBoundary}
    />
  );
}

export default function ErrorBounderCom({ children }: ErrorBounderComProps) {
  const handleError = (error: unknown, info: React.ErrorInfo) => {
    if (process.env.NODE_ENV !== "development") return;
    console.error("🚀 ~ Error Boundary Error:", error);
    console.error("🚀 ~ Component Stack:", info.componentStack);

    if (error instanceof Error) {
      console.error("🚀 ~ Error Message:", error.message);
      console.error("🚀 ~ Error Stack:", error.stack);
    }
  };

  const handleReset = () => {
    if (process.env.NODE_ENV === "development") console.log("🚀 ~ Resetting Error Boundary");
  };

  return (
    <ErrorBoundary FallbackComponent={Fallback} onError={handleError} onReset={handleReset}>
      {children}
    </ErrorBoundary>
  );
}
