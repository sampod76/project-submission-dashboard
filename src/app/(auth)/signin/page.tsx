"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/ui/field";
import { toast } from "sonner";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { useAppSelector } from "@/redux/hooks";
import type { LoginBody } from "@/types/auth.types";
import type { Role } from "@/types/common.types";
import { apiErrorMessage } from "@/utils/api-error";
import { demoLoginCredentials } from "@/config/demo-login";
import AuthLayout from "@/components/shared/auth-layout";
import { ArrowRight, LockKeyhole, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { dashboardForRole } from "@/lib/auth-routing";
import Loader from "@/components/shared/loader";
import { mapFormError } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";

const roles: { value: Role; label: string }[] = [
  { value: "STUDENT", label: "Student" },
  { value: "MENTOR", label: "Mentor" },
  { value: "ADMIN", label: "Admin" },
];

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(1024),
});

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>("STUDENT");
  const form = useForm<LoginBody>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const [signIn, { isLoading, reset: resetLogin }] = useLoginMutation();
  const router = useRouter();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const submitting = useRef(false);
  const roleLabel = roles.find((role) => role.value === selectedRole)!.label;
  const demoCredentials = demoLoginCredentials[selectedRole];
  const busy = isLoading || isSubmitting;
  const cooldown = useRequestCooldown();

  useEffect(() => {
    if (accessToken && user) router.replace(dashboardForRole(user.role));
  }, [accessToken, user, router]);

  function selectRole(role: Role) {
    if (busy || submitting.current || role === selectedRole) return;
    setSelectedRole(role);
    form.reset({ email: "", password: "" });
    resetLogin();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % roles.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + roles.length - 1) % roles.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = roles.length - 1;
    else return;
    event.preventDefault();
    selectRole(roles[nextIndex].value);
    document.getElementById(`login-tab-${roles[nextIndex].value}`)?.focus();
  }

  async function handleLogin(values: LoginBody) {
    if (submitting.current || cooldown.seconds) return;
    submitting.current = true;
    form.clearErrors("root");
    try {
      const response = await signIn({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        expectedRole: selectedRole,
      }).unwrap();
      toast.success(response.message || "Login successful");
      router.replace(dashboardForRole(response.data.user.role));
    } catch (error) {
      mapFormError(
        error,
        form.setError,
        ["email", "password"],
        apiErrorMessage(error, "Unable to sign in. Check your connection and try again."),
      );
      cooldown.block(error);
    } finally {
      // Do not retain the credential/token response in the RTK mutation cache.
      resetLogin();
      submitting.current = false;
    }
  }

  if (accessToken && user) return <Loader />;
  return (
    <AuthLayout title="Sign In" description="Sign in to manage your projects and submissions.">
      <div
        role="tablist"
        aria-label="Sign in role"
        className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-sky-50 p-1"
      >
        {roles.map((role, index) => (
          <button
            key={role.value}
            id={`login-tab-${role.value}`}
            type="button"
            role="tab"
            aria-selected={selectedRole === role.value}
            aria-controls="login-panel"
            tabIndex={selectedRole === role.value ? 0 : -1}
            disabled={busy}
            onClick={() => selectRole(role.value)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={`min-h-11 rounded-lg px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 ${selectedRole === role.value ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-blue-600"}`}
          >
            {role.label}
          </button>
        ))}
      </div>
      <div id="login-panel" role="tabpanel" aria-labelledby={`login-tab-${selectedRole}`}>
        <form
          noValidate
          onSubmit={form.handleSubmit(handleLogin)}
          className="w-full"
          aria-label={`${roleLabel} Sign In`}
        >
          <fieldset disabled={busy} className="min-w-0">
            <Field label="Email" error={errors.email?.message} className="mb-5">
              <Input
                {...register("email")}
                type="email"
                leadingIcon={<User className="text-slate-500" />}
                placeholder="Enter your email address"
                autoComplete="username"
                className="rounded-xl"
                style={{ height: 50, fontSize: 15, borderColor: "#cbd5e1" }}
              />
            </Field>
            <Field label="Password" error={errors.password?.message} className="mb-6">
              <PasswordInput
                key={selectedRole}
                {...register("password")}
                leadingIcon={<LockKeyhole className="text-slate-500" />}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="rounded-xl"
                style={{ height: 50, fontSize: 15, borderColor: "#cbd5e1" }}
              />
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
              className="h-[50px] w-full rounded-xl bg-[#3b82f6] text-base font-semibold"
            >
              {cooldown.seconds ? `Try again in ${cooldown.seconds}s` : `Sign In as ${roleLabel}`}{" "}
              <ArrowRight />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!demoCredentials}
              aria-describedby="demo-login-status"
              className="mt-3 min-h-11 w-full whitespace-normal rounded-xl"
              onClick={() => {
                if (demoCredentials) form.reset(demoCredentials);
              }}
            >
              Auto Fill {roleLabel} Login
            </Button>
          </fieldset>
          <p
            id="demo-login-status"
            role="status"
            className="mt-3 text-center text-xs leading-5 text-slate-500"
          >
            {demoCredentials
              ? "Fill the demo details, then select Sign In when you are ready."
              : `${roleLabel} demo login is unavailable. Please enter your account credentials.`}
          </p>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/register" className="font-semibold text-blue-600 hover:underline">
          Registration
        </Link>
      </p>
    </AuthLayout>
  );
}
