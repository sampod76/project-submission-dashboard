"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useCreateSubmissionMutation,
  useUpdateSubmissionMutation,
} from "@/redux/features/submission/submissionApi";
import type { CreateSubmissionBody, SubmissionRecord } from "@/types/submission.types";
import { submissionSchema } from "@/schema/student.schema";
import { apiStatus, mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SubmissionForm({
  submission,
  onCancel,
  onSaved,
  onConflict,
}: {
  submission?: SubmissionRecord;
  onCancel?: () => void;
  onSaved?: () => void;
  onConflict?: () => void;
}) {
  const form = useForm<CreateSubmissionBody>({
    resolver: zodResolver(submissionSchema),
    defaultValues: submission
      ? {
          projectName: submission.projectName,
          repoUrl: submission.repoUrl,
          liveUrl: submission.liveUrl,
          description: submission.description,
        }
      : { projectName: "", repoUrl: "", liveUrl: "", description: "" },
  });
  const [create, createState] = useCreateSubmissionMutation();
  const [update, updateState] = useUpdateSubmissionMutation();
  const router = useRouter();
  const submitting = useRef(false);
  const [completed, setCompleted] = useState(false);
  const cooldown = useRequestCooldown();
  const {
    register,
    formState: { errors, isSubmitting, isDirty },
  } = form;
  const busy = completed || isSubmitting || createState.isLoading || updateState.isLoading;
  async function submit(values: CreateSubmissionBody) {
    if (completed || submitting.current || cooldown.seconds) return;
    submitting.current = true;
    form.clearErrors();
    try {
      const response = submission
        ? await update({ id: submission.id, body: values }).unwrap()
        : await create(values).unwrap();
      toast.success(submission ? "Project updated" : "Project submitted successfully");
      form.reset(values);
      if (!submission) setCompleted(true);
      onSaved?.();
      if (!submission) router.push(`/student/submissions/${response.data.id}`);
    } catch (error) {
      mapFormError(
        error,
        form.setError,
        ["projectName", "repoUrl", "liveUrl", "description"],
        "Unable to save this project. Check your connection and try again.",
      );
      cooldown.block(error);
      if (submission && [403, 404, 409].includes(apiStatus(error) ?? 0)) onConflict?.();
    } finally {
      submitting.current = false;
      createState.reset();
      updateState.reset();
    }
  }
  return (
    <Card className="max-w-3xl rounded-xl border-slate-200 shadow-sm">
      <CardContent className="p-5 sm:p-7">
        <form
          noValidate
          aria-label={submission ? "Edit project" : "Submit project"}
          onSubmit={form.handleSubmit(submit)}
        >
          <fieldset disabled={busy} className="min-w-0">
            <Field label="Project name" error={errors.projectName?.message}>
              <Input
                {...register("projectName")}
                placeholder="e.g. Learning Portal"
                className="h-11"
              />
            </Field>
            <Field label="GitHub repository URL" error={errors.repoUrl?.message}>
              <Input
                {...register("repoUrl")}
                type="url"
                placeholder="https://github.com/your-name/your-project"
                className="h-11"
              />
            </Field>
            <p className="-mt-2 mb-5 text-xs leading-5 text-muted-foreground">
              Link to the repository itself, rather than a branch or file. Each repository can have
              one active submission.
            </p>
            <Field label="Live project URL" error={errors.liveUrl?.message}>
              <Input
                {...register("liveUrl")}
                type="url"
                placeholder="https://your-project.example.com"
                className="h-11"
              />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <Textarea
                {...register("description")}
                placeholder="Describe what you built, its main features, and anything the reviewer should know."
                rows={7}
              />
            </Field>
            <p className="-mt-2 mb-5 text-xs text-muted-foreground">
              Up to 10,000 characters. You can edit this project while it is pending.
            </p>
            {errors.root?.message && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                loading={busy}
                disabled={Boolean(cooldown.seconds) || Boolean(submission && !isDirty)}
                className="h-11"
              >
                {cooldown.seconds
                  ? `Try again in ${cooldown.seconds}s`
                  : submission
                    ? "Save changes"
                    : "Submit Project"}
              </Button>
              {onCancel ? (
                <Button variant="outline" className="h-11" onClick={onCancel}>
                  Cancel
                </Button>
              ) : (
                <Button asChild variant="outline" className="h-11">
                  <Link href="/student/submissions">Cancel</Link>
                </Button>
              )}
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
