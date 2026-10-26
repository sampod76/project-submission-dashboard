"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useChangePasswordMutation } from "@/redux/features/auth/authApi";
import { passwordSetSchema, PasswordSetValues } from "@/schema/change-password.schema";
import { apiErrorMessage } from "@/utils/api-error";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/input";
import { useRef } from "react";
export default function SettingsPage() {
  const form = useForm<PasswordSetValues>({
    resolver: zodResolver(passwordSetSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const submitting = useRef(false);
  async function submit(values: PasswordSetValues) {
    if (submitting.current || isLoading) return;
    const parsed = passwordSetSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    submitting.current = true;
    try {
      const response = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      if (!response.success) {
        toast.error(apiErrorMessage({ data: response }, "Unable to change password"));
        return;
      }
      form.reset();
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Unable to change password"));
    } finally {
      submitting.current = false;
    }
  }
  return (
    <div className="p-4 sm:p-6">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Settings</h2>
      <Card className="mx-auto w-full max-w-xl rounded-lg shadow-md shadow-blue-200">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={form.handleSubmit(submit)}>
            <fieldset disabled={isLoading || isSubmitting}>
              <Field label="Current Password" error={errors.currentPassword?.message}>
                <PasswordInput {...register("currentPassword")} autoComplete="current-password" />
              </Field>
              <Field label="New Password" error={errors.newPassword?.message}>
                <PasswordInput
                  {...register("newPassword", { deps: "confirmPassword" })}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm New Password" error={errors.confirmPassword?.message}>
                <PasswordInput {...register("confirmPassword")} autoComplete="new-password" />
              </Field>
              <Button type="submit" loading={isLoading || isSubmitting}>
                Change Password
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
