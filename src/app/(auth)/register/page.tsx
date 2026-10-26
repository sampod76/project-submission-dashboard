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
      title="Create Student account"
      description="Submit projects and track your progress."
    >
      <form noValidate aria-label="Student Registration" onSubmit={form.handleSubmit(submit)}>
        <fieldset disabled={busy} className="min-w-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={errors.firstName?.message} className="mb-0">
              <Input
                {...register("firstName")}
                autoComplete="given-name"
                placeholder="First name"
              />
            </Field>
            <Field label="Last name" error={errors.lastName?.message} className="mb-0">
              <Input {...register("lastName")} autoComplete="family-name" placeholder="Last name" />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message} className="mb-0">
            <Input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone (optional)" error={errors.phone?.message} className="mb-0">
              <Input
                {...register("phone")}
                type="tel"
                autoComplete="tel"
                placeholder="Your phone number"
              />
            </Field>
            <Field label="Gender (optional)" error={errors.gender?.message} className="mb-0">
              <Input {...register("gender")} autoComplete="sex" placeholder="Optional" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Password" error={errors.password?.message} className="mb-0">
              <PasswordInput
                {...register("password", { deps: "confirmPassword" })}
                autoComplete="new-password"
              />
            </Field>
            <Field
              label="Confirm password"
              error={errors.confirmPassword?.message}
              className="mb-0"
            >
              <PasswordInput {...register("confirmPassword")} autoComplete="new-password" />
            </Field>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            8–72 characters with uppercase, lowercase, and a number. Maximum 72 UTF-8 bytes.
          </p>
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
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
