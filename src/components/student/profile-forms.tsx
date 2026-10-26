"use client";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useUpdateOwnProfileMutation,
  useChangePasswordMutation,
} from "@/redux/features/user/userApi";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setUser } from "@/redux/features/auth/authSlice";
import type { ProfileFields, UpdateOwnProfileBody } from "@/types/user.types";
import {
  ownProfileSchema,
  studentPasswordSchema,
  type OwnProfileValues,
  type StudentPasswordValues,
} from "@/schema/student.schema";
import { mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OwnProfileForm({ profile }: { profile: ProfileFields }) {
  const form = useForm<OwnProfileValues>({
    resolver: zodResolver(ownProfileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
    },
  });
  const [update, { isLoading, reset }] = useUpdateOwnProfileMutation();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const pending = useRef(false);
  const cooldown = useRequestCooldown();
  const {
    register,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = form;
  async function submit(values: OwnProfileValues) {
    if (pending.current || cooldown.seconds) return;
    pending.current = true;
    form.clearErrors();
    const body: UpdateOwnProfileBody = {};
    if (dirtyFields.firstName) body.firstName = values.firstName;
    if (dirtyFields.lastName) body.lastName = values.lastName;
    if (dirtyFields.phone) body.phone = values.phone || null;
    if (dirtyFields.bio) body.bio = values.bio || null;
    if (!Object.keys(body).length) {
      pending.current = false;
      return;
    }
    try {
      const result = await update(body).unwrap();
      const updated = result.data.role === "MENTOR" ? result.data.mentor : result.data.role === "ADMIN" ? result.data.admin : result.data.student;
      if (updated && user)
        dispatch(setUser({ ...user, name: `${updated.firstName} ${updated.lastName}` }));
      form.reset(values);
      toast.success("Profile updated");
    } catch (error) {
      mapFormError(
        error,
        form.setError,
        ["firstName", "lastName", "phone", "bio"],
        "Unable to update your profile.",
      );
      cooldown.block(error);
    } finally {
      pending.current = false;
      reset();
    }
  }
  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Personal information</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate aria-label="Update profile" onSubmit={form.handleSubmit(submit)}>
          <fieldset disabled={isLoading || isSubmitting} className="min-w-0">
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="First name" error={errors.firstName?.message}>
                <Input {...register("firstName")} autoComplete="given-name" />
              </Field>
              <Field label="Last name" error={errors.lastName?.message}>
                <Input {...register("lastName")} autoComplete="family-name" />
              </Field>
            </div>
            <Field label="Phone" error={errors.phone?.message}>
              <Input
                {...register("phone")}
                type="tel"
                autoComplete="tel"
                placeholder="Optional phone number"
              />
            </Field>
            <Field label="Bio" error={errors.bio?.message}>
              <Textarea
                {...register("bio")}
                rows={5}
                placeholder="Tell us a little about yourself"
              />
            </Field>
            <p className="mb-4 text-xs text-muted-foreground">
              Leave phone or bio blank to clear it.
            </p>
            {errors.root?.message && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <Button
              type="submit"
              loading={isLoading || isSubmitting}
              disabled={!isDirty || Boolean(cooldown.seconds)}
            >
              {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Save profile"}
            </Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}

export function StudentPasswordForm() {
  const form = useForm<StudentPasswordValues>({
    resolver: zodResolver(studentPasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const [changePassword, { isLoading, reset }] = useChangePasswordMutation();
  const pending = useRef(false);
  const cooldown = useRequestCooldown();
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  async function submit(values: StudentPasswordValues) {
    if (pending.current || cooldown.seconds) return;
    pending.current = true;
    form.clearErrors();
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      form.reset();
      toast.success(result.data.message || "Password changed");
    } catch (error) {
      mapFormError(
        error,
        form.setError,
        ["currentPassword", "newPassword"],
        "Unable to change your password.",
      );
      cooldown.block(error);
    } finally {
      pending.current = false;
      reset();
    }
  }
  return (
    <Card id="password" className="scroll-mt-24 rounded-xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate aria-label="Change password" onSubmit={form.handleSubmit(submit)}>
          <fieldset disabled={isLoading || isSubmitting} className="min-w-0">
            <Field label="Current password" error={errors.currentPassword?.message}>
              <PasswordInput {...register("currentPassword")} autoComplete="current-password" />
            </Field>
            <Field label="New password" error={errors.newPassword?.message}>
              <PasswordInput
                {...register("newPassword", { deps: "confirmPassword" })}
                autoComplete="new-password"
              />
            </Field>
            <p className="-mt-2 mb-4 text-xs text-muted-foreground">
              8–72 characters, including uppercase, lowercase, and a number. Maximum 72 UTF-8 bytes.
            </p>
            <Field label="Confirm new password" error={errors.confirmPassword?.message}>
              <PasswordInput {...register("confirmPassword")} autoComplete="new-password" />
            </Field>
            {errors.root?.message && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <Button
              type="submit"
              loading={isLoading || isSubmitting}
              disabled={Boolean(cooldown.seconds)}
            >
              {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Change password"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              You will stay signed in after changing your password.
            </p>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
