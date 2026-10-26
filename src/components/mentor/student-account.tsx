"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useDeleteUserMutation,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
} from "@/redux/features/user/userApi";
import type { UserRecord } from "@/types/user.types";
import { canManageStudent, studentAccountBody } from "@/lib/mentor";
import { studentAccountSchema, type StudentAccountValues } from "@/schema/mentor.schema";
import { apiStatus, apiErrorMessage, mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";
import {
  RequestError,
  StudentPageHeading as PageHeading,
} from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert, MissingRecord } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function AccountEditor({ account, refresh }: { account: UserRecord; refresh: () => void }) {
  const router = useRouter();
  const form = useForm<StudentAccountValues>({
    resolver: zodResolver(studentAccountSchema),
    defaultValues: { email: account.email, password: "", confirmPassword: "" },
  });
  const [update, updateState] = useUpdateUserMutation();
  const [status, statusState] = useUpdateUserStatusMutation();
  const [remove, deleteState] = useDeleteUserMutation();
  const [confirm, setConfirm] = useState<"update" | "status" | "delete" | null>(null);
  const [values, setValues] = useState<StudentAccountValues | null>(null);
  const [error, setError] = useState<unknown>();
  const [blocked, setBlocked] = useState(false);
  const pending = useRef(false);
  const cooldown = useRequestCooldown();
  const busy = updateState.isLoading || statusState.isLoading || deleteState.isLoading;
  async function execute() {
    if (pending.current || cooldown.seconds || blocked || !canManageStudent(account)) return;
    pending.current = true;
    setError(undefined);
    form.clearErrors();
    try {
      if (confirm === "delete") {
        await remove(account.id).unwrap();
        toast.success("Student account deleted");
        router.replace("/mentor/students");
      } else if (confirm === "status") {
        await status({ id: account.id, body: { isActive: !account.isActive } }).unwrap();
        toast.success(
          account.isActive ? "Student account deactivated" : "Student account activated",
        );
      } else if (confirm === "update" && values) {
        const result = await update({
          id: account.id,
          body: studentAccountBody(values, account.email),
        }).unwrap();
        form.reset({ email: result.data.email, password: "", confirmPassword: "" });
        toast.success("Student account updated");
      }
      setValues(null);
      setConfirm(null);
    } catch (failure) {
      setError(failure);
      cooldown.block(failure);
      mapFormError(
        failure,
        form.setError,
        ["email", "password"],
        "Unable to update this Student account.",
      );
      if ([403, 404].includes(apiStatus(failure) ?? 0)) {
        setBlocked(true);
        refresh();
      }
      if (apiStatus(failure) === 409) refresh();
    } finally {
      pending.current = false;
      updateState.reset();
      statusState.reset();
      deleteState.reset();
    }
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold">Edit Student account</h2>
          <form
            noValidate
            aria-label="Edit Student account"
            onSubmit={form.handleSubmit((next) => {
              if (pending.current || blocked) return;
              const body = studentAccountBody(next, account.email);
              if (!Object.keys(body).length) return;
              setValues(next);
              setError(undefined);
              setConfirm("update");
            })}
          >
            <fieldset disabled={busy || blocked} className="min-w-0">
              <Field label="Account email" error={form.formState.errors.email?.message}>
                <Input
                  type="email"
                  maxLength={255}
                  {...form.register("email")}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="New password (optional)"
                error={form.formState.errors.password?.message}
              >
                <PasswordInput
                  {...form.register("password", { deps: "confirmPassword" })}
                  autoComplete="new-password"
                />
              </Field>
              <p className="-mt-2 mb-4 text-xs text-muted-foreground">
                Leave blank to keep the password. New passwords need 8–72 characters, uppercase,
                lowercase, a number, and at most 72 UTF-8 bytes.
              </p>
              <Field
                label="Confirm new password"
                error={form.formState.errors.confirmPassword?.message}
              >
                <PasswordInput {...form.register("confirmPassword")} autoComplete="new-password" />
              </Field>
              {form.formState.errors.root?.message && (
                <p role="alert" className="mb-4 text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}
              <Button type="submit" disabled={!form.formState.isDirty || Boolean(cooldown.seconds)}>
                Review account changes
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Account access</h2>
          <div>
            <Badge variant={account.isActive ? "green" : "red"}>
              {account.isActive ? "Active" : "Inactive"}
            </Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Deactivating an account prevents the student from signing in. You can activate it
              again later.
            </p>
            <Button
              className="mt-3"
              variant="outline"
              disabled={busy || blocked || Boolean(cooldown.seconds)}
              onClick={() => {
                setError(undefined);
                setConfirm("status");
              }}
            >
              {account.isActive ? "Deactivate account" : "Activate account"}
            </Button>
          </div>
          <div className="border-t pt-5">
            <h3 className="font-medium text-destructive">Delete Student account</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The student loses access, and their projects are removed from visible submission lists
              and totals. Account restoration is unavailable.
            </p>
            <Button
              className="mt-3"
              variant="destructive"
              disabled={busy || blocked || Boolean(cooldown.seconds)}
              onClick={() => {
                setError(undefined);
                setConfirm("delete");
              }}
            >
              Delete account
            </Button>
          </div>
          {blocked && (
            <ErrorAlert message="Account management is no longer available for this record. Return to the directory to load the latest accounts." />
          )}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !pending.current) {
            setConfirm(null);
            setValues(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="max-h-[90svh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl"
          onEscapeKeyDown={(event) => {
            if (pending.current) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending.current) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {confirm === "delete"
                ? "Delete Student account?"
                : confirm === "status"
                  ? `${account.isActive ? "Deactivate" : "Activate"} Student account?`
                  : "Save Student account changes?"}
            </DialogTitle>
            <DialogDescription>
              {account.email}
              {confirm === "delete"
                ? " will lose access. This action cannot be restored from this application."
                : confirm === "status"
                  ? ` will be ${account.isActive ? "deactivated" : "activated"}.`
                  : " will receive the account changes below."}
            </DialogDescription>
          </DialogHeader>
          {confirm === "update" && values && (
            <ul className="space-y-2 break-all text-sm">
              {values.email !== account.email && <li>New email: {values.email}</li>}
              {values.password && <li>Replace account password</li>}
            </ul>
          )}
          {error !== undefined && (
            <ErrorAlert
              message={apiErrorMessage(error, "Unable to complete the account action.")}
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirm(null);
                setValues(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={confirm === "delete" ? "destructive" : "default"}
              loading={busy}
              disabled={blocked || Boolean(cooldown.seconds)}
              onClick={() => void execute()}
            >
              {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentAccount({ id }: { id: string }) {
  const validId = z.string().uuid().safeParse(id).success;
  const query = useGetUserByIdQuery(id, { skip: !validId, refetchOnMountOrArgChange: true });
  const account = query.currentData?.data;
  if (!validId || apiStatus(query.error) === 404)
    return (
      <MissingRecord
        title="Student account not found"
        description="This account may have been deleted."
        action={<Link href="/mentor/students">Return to directory</Link>}
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
  if (!account) return <ContentSkeleton rows={6} />;
  if (!canManageStudent(account))
    return (
      <ErrorAlert message="You can manage Student accounts only. This account is unavailable." />
    );
  return (
    <>
      <PageHeading
        title="Student account"
        description={account.email}
        action={
          <Button asChild variant="outline">
            <Link href="/mentor/students">Back to directory</Link>
          </Button>
        }
      />
      <Card className="mb-6 rounded-xl border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 p-5 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p>{new Date(account.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last sign in</p>
            <p>
              {account.lastLoginAt
                ? new Date(account.lastLoginAt).toLocaleString()
                : "Has not signed in"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last updated</p>
            <p>{new Date(account.updatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
      <AccountEditor key={account.id} account={account} refresh={() => void query.refetch()} />
    </>
  );
}
