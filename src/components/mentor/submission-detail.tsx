"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useGetSubmissionByIdQuery } from "@/redux/features/submission/submissionApi";
import { useCreateReviewMutation } from "@/redux/features/review/reviewApi";
import { useAppSelector } from "@/redux/hooks";
import type { ReviewDecision } from "@/types/common.types";
import { canReviewSubmission } from "@/lib/mentor";
import { reviewSchema, type ReviewValues } from "@/schema/mentor.schema";
import { apiStatus, mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";
import {
  ProjectLink,
  RequestError,
  StudentPageHeading as PageHeading,
  SubmissionBadge,
} from "@/components/student/submission-shared";
import { ContentSkeleton, MissingRecord } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ReviewHistory from "./review-history";

function ReviewForm({
  id,
  decision,
  onDone,
  onConflict,
  onDenied,
  onCancel,
  onPending,
}: {
  id: string;
  decision: ReviewDecision;
  onDone: (decision: ReviewDecision) => void;
  onConflict: () => void;
  onDenied: () => void;
  onCancel: () => void;
  onPending: (value: boolean) => void;
}) {
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { status: decision, feedback: "" },
  });
  const [review, mutation] = useCreateReviewMutation();
  const pending = useRef(false);
  const cooldown = useRequestCooldown();
  async function submit(values: ReviewValues) {
    if (pending.current || cooldown.seconds) return;
    pending.current = true;
    onPending(true);
    form.clearErrors();
    try {
      const result = await review({
        id,
        body: { status: values.status, feedback: values.feedback || null },
      }).unwrap();
      toast.success(result.message || "Review saved");
      onDone(result.data.status);
    } catch (error) {
      if (apiStatus(error) === 409) {
        toast.warning("This submission changed. Loading its latest status and review history.");
        onConflict();
      } else {
        mapFormError(
          error,
          form.setError,
          ["status", "feedback"],
          "Unable to save this review. Please try again.",
        );
        cooldown.block(error);
        if ([401, 403, 404].includes(apiStatus(error) ?? 0)) {
          toast.error(
            "This review is unavailable. Your session or the submission may have changed.",
          );
          onDenied();
        }
      }
    } finally {
      pending.current = false;
      onPending(false);
      mutation.reset();
    }
  }
  const busy = mutation.isLoading || form.formState.isSubmitting;
  return (
    <form
      noValidate
      aria-label={`${decision === "APPROVED" ? "Approve" : "Reject"} submission`}
      onSubmit={form.handleSubmit(submit)}
    >
      <fieldset disabled={busy} className="min-w-0">
        <input type="hidden" {...form.register("status")} />
        <Field label="Feedback (optional)" error={form.formState.errors.feedback?.message}>
          <Textarea
            {...form.register("feedback")}
            rows={6}
            maxLength={10000}
            placeholder="Share the reasoning behind your decision."
          />
        </Field>
        <p className="mb-4 text-xs text-muted-foreground">
          Up to 10,000 characters. This decision is final.
        </p>
        {form.formState.errors.root?.message && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={decision === "REJECTED" ? "destructive" : "default"}
            loading={busy}
            disabled={Boolean(cooldown.seconds)}
          >
            {cooldown.seconds
              ? `Try again in ${cooldown.seconds}s`
              : decision === "APPROVED"
                ? "Confirm approval"
                : "Confirm rejection"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

export default function SubmissionDetail({ id }: { id: string }) {
  const validId = z.string().uuid().safeParse(id).success;
  const query = useGetSubmissionByIdQuery(id, {
    skip: !validId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const user = useAppSelector((state) => state.auth.user);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [confirmed, setConfirmed] = useState<ReviewDecision | null>(null);
  const [denied, setDenied] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const submission = query.currentData?.data;
  if (!validId || apiStatus(query.error) === 404)
    return (
      <MissingRecord
        title="Submission not found"
        description="This project may have been removed or is no longer available."
        action={<Link href="/mentor/submissions">Back to submissions</Link>}
      />
    );
  if (query.isError)
    return (
      <RequestError
        error={query.error}
        busy={query.isFetching}
        retry={() => void query.refetch()}
      />
    );
  if (!submission) return <ContentSkeleton rows={8} />;
  const eligible = canReviewSubmission(submission, user?.role) && !confirmed && !denied;
  return (
    <>
      <PageHeading
        title={submission.projectName}
        description={`Submitted ${new Date(submission.createdAt).toLocaleString()}`}
        action={<SubmissionBadge status={confirmed ?? submission.status} />}
      />
      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="min-w-0 rounded-xl border-slate-200 shadow-sm">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold">Project overview</h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {submission.description}
              </p>
            </div>
            <div className="space-y-3 border-t pt-5 text-sm">
              <div>
                <p className="mb-1 text-muted-foreground">GitHub repository</p>
                <ProjectLink href={submission.repoUrl}>{submission.repoUrl}</ProjectLink>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground">Live project</p>
                <ProjectLink href={submission.liveUrl}>{submission.liveUrl}</ProjectLink>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 rounded-xl border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold">Student</h2>
            <Link
              className="block break-words font-medium text-primary hover:underline"
              href={`/mentor/students/${submission.student.userId}`}
            >
              {submission.student.firstName} {submission.student.lastName}
            </Link>
            <p className="break-all text-sm text-muted-foreground">
              {submission.student.user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(submission.updatedAt).toLocaleString()}
            </p>
            {eligible ? (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Inspect the repository and live project before making your decision.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={query.isFetching || reviewing}
                    onClick={() => setDecision("APPROVED")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={query.isFetching || reviewing}
                    onClick={() => setDecision("REJECTED")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              <p role="status" className="border-t pt-4 text-sm text-muted-foreground">
                {denied
                  ? "This review action is unavailable. Refresh to check the latest submission."
                  : "This submission is no longer eligible for a review."}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Refresh submission
            </Button>
          </CardContent>
        </Card>
      </div>
      <ReviewHistory submissionId={id} />
      <Dialog
        open={Boolean(decision)}
        onOpenChange={(open) => {
          if (!open && !reviewing) setDecision(null);
        }}
      >
        <DialogContent
          showCloseButton={!reviewing}
          onEscapeKeyDown={(event) => {
            if (reviewing) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (reviewing) event.preventDefault();
          }}
          className="max-h-[90svh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl"
        >
          <DialogHeader>
            <DialogTitle>
              {decision === "APPROVED" ? "Approve project" : "Reject project"}
            </DialogTitle>
            <DialogDescription>
              Confirm your review for {submission.projectName}. Only pending submissions can be
              reviewed.
            </DialogDescription>
          </DialogHeader>
          {decision && (
            <ReviewForm
              key={decision}
              id={id}
              decision={decision}
              onDone={(status) => {
                setConfirmed(status);
                setDecision(null);
              }}
              onConflict={() => {
                setDecision(null);
                void query.refetch();
              }}
              onDenied={() => {
                setDenied(true);
                setDecision(null);
                void query.refetch();
              }}
              onCancel={() => setDecision(null)}
              onPending={setReviewing}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
