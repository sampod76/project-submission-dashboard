"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import AuthLayout from "@/components/shared/auth-layout";
import { useRegisterMutation } from "@/redux/features/auth/authApi";
import { useAppSelector } from "@/redux/hooks";
import { dashboardForRole } from "@/lib/auth-routing";
import { studentRegistrationSchema, type StudentRegistrationValues } from "@/schema/student.schema";
import { Input, PasswordInput } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/loader";
import { mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";

export default function RegisterPage() {
  const router = useRouter();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const form = useForm<StudentRegistrationValues>({
    resolver: zodResolver(studentRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      gender: "",
    },
  });
  const [registerStudent, { isLoading, reset }] = useRegisterMutation();
  const submitting = useRef(false);
  const cooldown = useRequestCooldown();
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const busy = isLoading || isSubmitting;
  useEffect(() => {
    if (accessToken && user) router.replace(dashboardForRole(user.role));
  }, [accessToken, user, router]);
  async function submit(values: StudentRegistrationValues) {
    if (submitting.current || cooldown.seconds) return;
    submitting.current = true;
    form.clearErrors();
    try {
      const { firstName, lastName, email, password, phone, gender } = values;
      await registerStudent({
        firstName,
        lastName,
        email,
        password,
        ...(phone ? { phone } : {}),
        ...(gender ? { gender } : {}),
      }).unwrap();
      form.reset();
      toast.success("Account created. Sign in with your Student account.");
      router.replace("/login");
    } catch (error) {
      mapFormError(
        error,
        form.setError,
        ["firstName", "lastName", "email", "password", "phone", "gender"],
        "Unable to register. Check your connection and try again.",
      );
      cooldown.block(error);
    } finally {
      submitting.current = false;
      reset();
    }
  }
  if (accessToken && user) return <Loader />;
  return (
    <AuthLayout
      title="Create your Student account"
      description="Submit your work, track its progress, and keep your projects together."
    >
      <form noValidate aria-label="Student Registration" onSubmit={form.handleSubmit(submit)}>
        <fieldset disabled={busy} className="min-w-0">
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message}>
              <Input
                {...register("firstName")}
                autoComplete="given-name"
                placeholder="First name"
              />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <Input {...register("lastName")} autoComplete="family-name" placeholder="Last name" />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <Input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Phone (optional)" error={errors.phone?.message}>
            <Input
              {...register("phone")}
              type="tel"
              autoComplete="tel"
              placeholder="Your phone number"
            />
          </Field>
          <Field label="Gender (optional)" error={errors.gender?.message}>
            <Input
              {...register("gender")}
              autoComplete="sex"
              placeholder="Self describe, or leave blank"
            />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <PasswordInput
              {...register("password", { deps: "confirmPassword" })}
              autoComplete="new-password"
            />
          </Field>
          <p className="-mt-2 mb-4 text-xs text-muted-foreground">
            8–72 characters, with an uppercase letter, a lowercase letter, and a number. Maximum 72
            UTF-8 bytes.
          </p>
          <Field label="Confirm password" error={errors.confirmPassword?.message}>
            <PasswordInput {...register("confirmPassword")} autoComplete="new-password" />
          </Field>
          {errors.root?.message && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}
          <Button
            type="submit"
            loading={busy}
            disabled={Boolean(cooldown.seconds)}
            className="h-11 w-full"
          >
            {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Create Student account"}
          </Button>
        </fieldset>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
