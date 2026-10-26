"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import {
  useGetSubmissionByIdQuery,
  useDeleteSubmissionMutation,
} from "@/redux/features/submission/submissionApi";
import { useAppSelector } from "@/redux/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ContentSkeleton, ErrorAlert } from "@/components/shared/feedback";
import {
  ProjectLink,
  RequestError,
  StudentPageHeading,
  SubmissionBadge,
} from "@/components/student/submission-shared";
import SubmissionForm from "@/components/student/submission-form";
import { apiErrorMessage, apiStatus } from "@/utils/api-error";
import { canEditSubmission, formatDate } from "@/lib/student-submissions";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";

export default function SubmissionDetailsPage({ params }: { params: { id: string } }) {
  const validId = z.string().uuid().safeParse(params.id).success;
  const query = useGetSubmissionByIdQuery(params.id, {
    skip: !validId,
    refetchOnMountOrArgChange: true,
  });
  const [remove, { isLoading, reset }] = useDeleteSubmissionMutation();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [actionError, setActionError] = useState("");
  const pending = useRef(false);
  const cooldown = useRequestCooldown();
  const router = useRouter();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const submission = query.currentData?.data;
  const editable = Boolean(submission && canEditSubmission(submission, userId));
  async function deleteProject() {
    if (!editable || pending.current || cooldown.seconds) return;
    pending.current = true;
    setActionError("");
    try {
      await remove(params.id).unwrap();
      toast.success("Project deleted");
      router.replace("/student/submissions");
    } catch (error) {
      setActionError(apiErrorMessage(error, "Unable to delete this project."));
      cooldown.block(error);
      if ([403, 404, 409].includes(apiStatus(error) ?? 0)) void query.refetch();
    } finally {
      pending.current = false;
      setConfirm(false);
      reset();
    }
  }
  if (!validId)
    return (
      <ErrorAlert
        message="This submission address is invalid."
        action={<Link href="/student/submissions">My submissions</Link>}
      />
    );
  if (query.isError)
    return (
      <>
        <StudentPageHeading
          title="Project unavailable"
          description="The project may have been removed, or you may not have permission to view it."
        />
        <RequestError error={query.error} retry={() => void query.refetch()} />
        <Link href="/student/submissions" className="mt-5 inline-block text-primary">
          Back to My Submissions
        </Link>
      </>
    );
  if (!submission) return <ContentSkeleton rows={7} />;
  if (submission.student.userId !== userId)
    return <ErrorAlert message="You do not have permission to view this project." />;
  return (
    <>
      <StudentPageHeading
        title={submission.projectName}
        description={`Submitted ${formatDate(submission.createdAt)} · Updated ${formatDate(submission.updatedAt)}`}
        action={
          <Button asChild variant="outline">
            <Link href="/student/submissions">My Submissions</Link>
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SubmissionBadge status={submission.status} />
        {editable ? (
          <>
            <Button
              variant="outline"
              disabled={isLoading || query.isFetching}
              onClick={() => {
                setEditing(!editing);
                setActionError("");
              }}
            >
              {editing ? "Close editor" : "Edit project"}
            </Button>
            <Button
              variant="destructive"
              disabled={isLoading || query.isFetching || Boolean(cooldown.seconds)}
              onClick={() => setConfirm(true)}
            >
              {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Delete project"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">This submission is read-only.</p>
        )}
      </div>
      {actionError && (
        <div className="mb-5">
          <ErrorAlert message={actionError} />
        </div>
      )}
      {editing && editable ? (
        <SubmissionForm
          key={submission.id}
          submission={submission}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
          onConflict={() => {
            void query.refetch();
            setActionError(
              "The submission has changed or the action was refused. Its latest information is being loaded; review it before trying again.",
            );
          }}
        />
      ) : (
        <Card className="max-w-4xl rounded-xl border-slate-200 shadow-sm">
          <CardContent className="space-y-7 p-5 sm:p-7">
            <dl className="grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="mb-2 text-sm text-muted-foreground">GitHub repository</dt>
                <dd>
                  <ProjectLink href={submission.repoUrl}>{submission.repoFullName}</ProjectLink>
                </dd>
              </div>
              <div>
                <dt className="mb-2 text-sm text-muted-foreground">Live project</dt>
                <dd>
                  <ProjectLink href={submission.liveUrl}>{submission.liveUrl}</ProjectLink>
                </dd>
              </div>
            </dl>
            <div>
              <h2 className="mb-3 font-semibold">About this project</h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                {submission.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <AlertDialog
        open={confirm}
        onOpenChange={(open) => {
          if (!pending.current) setConfirm(open);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              “{submission.projectName}” will be removed from your submissions. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Keep project</AlertDialogCancel>
            <Button
              variant="destructive"
              loading={isLoading}
              disabled={!editable || query.isFetching || Boolean(cooldown.seconds)}
              onClick={() => void deleteProject()}
            >
              Delete project
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
