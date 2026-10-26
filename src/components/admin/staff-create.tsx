"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateAdminMutation } from "@/redux/features/admin/adminApi";
import { useCreateMentorMutation } from "@/redux/features/mentor/mentorApi";
import { useGetOwnProfileQuery } from "@/redux/features/user/userApi";
import { staffCreationSchema, type StaffCreationValues } from "@/schema/admin.schema";
import { mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";
import {
  StudentPageHeading as PageHeading,
  RequestError,
} from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function StaffCreate({ role }: { role: "ADMIN" | "MENTOR" }) {
  const router = useRouter();
  const mentor = role === "MENTOR";
  const label = mentor ? "Mentor" : "Admin";
  const backPath = mentor ? "/admin/mentors" : "/admin/admins";
  const profile = useGetOwnProfileQuery();
  const form = useForm<StaffCreationValues>({
    resolver: zodResolver(staffCreationSchema(role)),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      bio: "",
      ...(mentor ? { gender: "" } : {}),
    },
  });
  const [createAdmin, adminState] = useCreateAdminMutation();
  const [createMentor, mentorState] = useCreateMentorMutation();
  const pending = useRef(false);
  const cooldown = useRequestCooldown();
  const busy = adminState.isLoading || mentorState.isLoading || form.formState.isSubmitting;
  async function submit(values: StaffCreationValues) {
    if (pending.current || cooldown.seconds) return;
    pending.current = true;
    form.clearErrors();
    try {
      const body = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.bio ? { bio: values.bio } : {}),
      };
      if (mentor) {
        const result = await createMentor({ ...body, gender: values.gender! }).unwrap();
        toast.success("Mentor created");
        form.reset();
        router.replace(`/admin/mentors/${result.data.userId}`);
      } else {
        const result = await createAdmin(body).unwrap();
        toast.success("Admin created");
        form.reset();
        router.replace(`/admin/admins/${result.data.id}`);
      }
    } catch (error) {
      mapFormError(
        error,
        form.setError,
        ["firstName", "lastName", "email", "password", "phone", "bio", "gender"],
        `Unable to create this ${label} account.`,
      );
      cooldown.block(error);
    } finally {
      pending.current = false;
      adminState.reset();
      mentorState.reset();
    }
  }
  if (profile.isError)
    return (
      <RequestError
        error={profile.error}
        busy={profile.isFetching}
        retry={() => void profile.refetch()}
      />
    );
  if (!profile.currentData) return <ContentSkeleton rows={6} />;
  if (mentor && !profile.currentData.data.admin)
    return (
      <ErrorAlert message="An active Admin profile is required to create Mentors. Your Admin profile is unavailable." />
    );
  const { errors } = form.formState;
  return (
    <>
      <PageHeading
        title={`Create ${label}`}
        description={`Create a new ${label} account with its own profile.`}
        action={
          <Button asChild variant="outline">
            <Link href={backPath}>Back to directory</Link>
          </Button>
        }
      />
      <Card className="max-w-3xl rounded-xl">
        <CardContent className="p-5 sm:p-7">
          <form noValidate aria-label={`Create ${label}`} onSubmit={form.handleSubmit(submit)}>
            <fieldset disabled={busy} className="min-w-0">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="First name" error={errors.firstName?.message}>
                  <Input
                    {...form.register("firstName")}
                    maxLength={100}
                    autoComplete="given-name"
                  />
                </Field>
                <Field label="Last name" error={errors.lastName?.message}>
                  <Input
                    {...form.register("lastName")}
                    maxLength={100}
                    autoComplete="family-name"
                  />
                </Field>
              </div>
              <Field label="Email" error={errors.email?.message}>
                <Input
                  {...form.register("email")}
                  type="email"
                  maxLength={255}
                  autoComplete="off"
                />
              </Field>
              <Field label="Password" error={errors.password?.message}>
                <PasswordInput
                  {...form.register("password", { deps: "confirmPassword" })}
                  autoComplete="new-password"
                />
              </Field>
              <p className="mb-4 text-xs text-muted-foreground">
                8–72 characters with uppercase, lowercase, and a number; at most 72 UTF-8 bytes.
              </p>
              <Field label="Confirm password" error={errors.confirmPassword?.message}>
                <PasswordInput {...form.register("confirmPassword")} autoComplete="new-password" />
              </Field>
              {mentor && (
                <Field label="Gender" error={errors.gender?.message}>
                  <Input
                    {...form.register("gender")}
                    maxLength={255}
                    placeholder="Free-text gender"
                  />
                </Field>
              )}
              <Field label="Phone (optional)" error={errors.phone?.message}>
                <Input {...form.register("phone")} type="tel" maxLength={20} />
              </Field>
              <Field label="Bio (optional)" error={errors.bio?.message}>
                <Textarea
                  {...form.register("bio")}
                  rows={5}
                  maxLength={mentor ? 10000 : undefined}
                />
              </Field>
              {errors.root?.message && (
                <p role="alert" className="mb-4 text-sm text-destructive">
                  {errors.root.message}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={busy} disabled={Boolean(cooldown.seconds)}>
                  {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : `Create ${label}`}
                </Button>
                <Button asChild variant="outline">
                  <Link href={backPath}>Cancel</Link>
                </Button>
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
