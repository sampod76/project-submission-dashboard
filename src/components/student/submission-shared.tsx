"use client";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/shared/feedback";
import type { SubmissionStatus } from "@/types/common.types";
import { isSafeWebUrl } from "@/schema/student.schema";
import { statusLabel } from "@/lib/student-submissions";
import { apiErrorMessage } from "@/utils/api-error";
export function SubmissionBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge
      variant={
        status === "APPROVED"
          ? "green"
          : status === "REJECTED"
            ? "red"
            : status === "REVISION_REQUIRED"
              ? "cyan"
              : "orange"
      }
    >
      {statusLabel(status)}
    </Badge>
  );
}
export function ProjectLink({ href, children }: { href: string; children: ReactNode }) {
  if (!isSafeWebUrl(href)) return <span className="text-muted-foreground">Unavailable link</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 break-all text-primary hover:underline"
    >
      {children}
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
    </a>
  );
}
export function RequestError({
  error,
  retry,
  busy,
}: {
  error: unknown;
  retry: () => void;
  busy?: boolean;
}) {
  return (
    <ErrorAlert
      message={apiErrorMessage(
        error,
        "Unable to load this information. Check your connection and try again.",
      )}
      action={
        <Button variant="outline" loading={busy} onClick={retry}>
          Retry
        </Button>
      }
    />
  );
}
export function StudentPageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
