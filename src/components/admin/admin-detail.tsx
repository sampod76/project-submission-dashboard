"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useGetAdminByIdQuery,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
} from "@/redux/features/admin/adminApi";
import type { AdminDetail as AdminProfile, UpdateAdminBody } from "../../../docs/api/API_CONTRACTS";
import { adminProfileSchema, type AdminProfileValues } from "@/schema/admin.schema";
import { apiStatus, apiErrorMessage, mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";
import {
  RequestError,
  StudentPageHeading as PageHeading,
} from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert, MissingRecord } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function ProfileEditor({ profile }: { profile: AdminProfile }) {
  const router = useRouter();
  const form = useForm<AdminProfileValues>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
    },
  });
  const [update, updateState] = useUpdateAdminMutation();
  const [remove, deleteState] = useDeleteAdminMutation();
  const pending = useRef(false);
  const cooldown = useRequestCooldown();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>();
  const busy = updateState.isLoading || deleteState.isLoading || form.formState.isSubmitting;
  async function save(values: AdminProfileValues) {
    if (pending.current || cooldown.seconds) return;
    const fields = form.formState.dirtyFields;
    const body: UpdateAdminBody = {};
    if (fields.firstName) body.firstName = values.firstName;
    if (fields.lastName) body.lastName = values.lastName;
    if (fields.phone) body.phone = values.phone || null;
    if (fields.bio) body.bio = values.bio || null;
    if (!Object.keys(body).length) return;
    pending.current = true;
    form.clearErrors();
    try {
      await update({ id: profile.id, body }).unwrap();
      form.reset(values);
      toast.success("Admin profile updated");
    } catch (failure) {
      mapFormError(
        failure,
        form.setError,
        ["firstName", "lastName", "phone", "bio"],
        "Unable to update Admin profile.",
      );
      cooldown.block(failure);
    } finally {
      pending.current = false;
      updateState.reset();
    }
  }
  async function deleteProfile() {
    if (pending.current || cooldown.seconds) return;
    pending.current = true;
    setError(undefined);
    try {
      await remove(profile.id).unwrap();
      toast.success("Admin profile deleted; the User account remains");
      router.replace("/admin/admins");
    } catch (failure) {
      setError(failure);
      cooldown.block(failure);
    } finally {
      pending.current = false;
      deleteState.reset();
    }
  }
  return (
    <>
      <Card className="max-w-3xl rounded-xl">
        <CardContent className="p-5 sm:p-7">
          <form noValidate aria-label="Edit Admin profile" onSubmit={form.handleSubmit(save)}>
            <fieldset disabled={busy} className="min-w-0">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="First name" error={form.formState.errors.firstName?.message}>
                  <Input {...form.register("firstName")} maxLength={100} />
                </Field>
                <Field label="Last name" error={form.formState.errors.lastName?.message}>
                  <Input {...form.register("lastName")} maxLength={100} />
                </Field>
              </div>
              <Field label="Phone" error={form.formState.errors.phone?.message}>
                <Input type="tel" {...form.register("phone")} maxLength={20} />
              </Field>
              <Field label="Bio" error={form.formState.errors.bio?.message}>
                <Textarea {...form.register("bio")} rows={5} />
              </Field>
              <p className="mb-4 text-xs text-muted-foreground">
                Leave phone or bio blank to clear it.
              </p>
              {form.formState.errors.root?.message && (
                <p role="alert" className="mb-4 text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}
              <Button
                type="submit"
                loading={busy}
                disabled={!form.formState.isDirty || Boolean(cooldown.seconds)}
              >
                {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Save profile"}
              </Button>
            </fieldset>
          </form>
          <div className="mt-6 border-t pt-6">
            <h2 className="font-semibold text-destructive">Delete Admin profile</h2>
            <p className="my-3 text-sm text-muted-foreground">
              The User account retains its role and access. Deleting your own profile prevents
              Mentor creation and profile editing. Profile restoration is unavailable.
            </p>
            <Button
              variant="destructive"
              disabled={busy || Boolean(cooldown.seconds)}
              onClick={() => {
                setError(undefined);
                setConfirm(true);
              }}
            >
              Delete profile
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!pending.current) setConfirm(open);
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          onEscapeKeyDown={(event) => {
            if (pending.current) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending.current) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete this Admin profile?</DialogTitle>
            <DialogDescription>
              {profile.firstName} {profile.lastName}’s profile will be removed. Their account stays
              enabled unless separately deactivated or deleted in User Management. This profile
              cannot be restored.
            </DialogDescription>
          </DialogHeader>
          {error !== undefined && (
            <ErrorAlert message={apiErrorMessage(error, "Unable to delete this profile.")} />
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              disabled={Boolean(cooldown.seconds)}
              onClick={() => void deleteProfile()}
            >
              {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Confirm profile deletion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminDetail({ id }: { id: string }) {
  const validId = z.string().uuid().safeParse(id).success;
  const query = useGetAdminByIdQuery(id, { skip: !validId, refetchOnMountOrArgChange: true });
  const profile = query.currentData?.data;
  if (!validId || apiStatus(query.error) === 404)
    return (
      <MissingRecord
        title="Admin profile not found"
        description="This profile may have been deleted."
        action={<Link href="/admin/admins">Back to directory</Link>}
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
  if (!profile) return <ContentSkeleton rows={7} />;
  return (
    <>
      <PageHeading
        title={`${profile.firstName} ${profile.lastName}`}
        description="Administrator profile"
        action={
          <Button asChild variant="outline">
            <Link href="/admin/admins">Back to directory</Link>
          </Button>
        }
      />
      <Card className="mb-6 rounded-xl">
        <CardContent className="space-y-3 p-5">
          <p className="break-all">{profile.user.email}</p>
          <Badge variant={profile.user.isActive && !profile.user.isDeleted ? "green" : "red"}>
            {profile.user.isDeleted
              ? "Deleted account"
              : profile.user.isActive
                ? "Active account"
                : "Inactive account"}
          </Badge>
          <p className="text-sm text-muted-foreground">
            Account role: {profile.user.role} · Created{" "}
            {new Date(profile.createdAt).toLocaleString()}
          </p>
          {profile.user.role !== "ADMIN" && (
            <ErrorAlert message="This profile’s linked account no longer has the Admin role. Profiles are not synchronized by role changes." />
          )}
          {!profile.user.isDeleted && (
            <Button asChild variant="outline">
              <Link href={`/admin/users/${profile.userId}`}>Manage linked User account</Link>
            </Button>
          )}
        </CardContent>
      </Card>
      <ProfileEditor key={profile.id} profile={profile} />
    </>
  );
}
