"use client";
import { ErrorAlert } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
export default function StudentError({ reset }: { reset: () => void }) {
  return (
    <ErrorAlert
      message="This page could not be displayed. Please try again."
      action={<Button onClick={reset}>Retry</Button>}
    />
  );
}
