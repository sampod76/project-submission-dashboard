"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/ui/field";
import { toast } from "sonner";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { login } from "@/redux/features/auth/authSlice";
import { baseApi } from "@/redux/api/baseApi";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import type { LoginPayload } from "@/types/auth";
import { apiErrorMessage } from "@/utils/api-error";
import { authHeroImage, authLogoImage } from "@/config/auth-images";
import { ArrowRight, LockKeyhole, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const DEMO_EMAIL = "admin@doctortracker.com";
const DEMO_PASSWORD = "Admin@12345";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export default function LoginPage() {
  const form = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const [signIn, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const token = useAppSelector((state) => state.auth.accessToken);
  const redirectTimer = useRef<number>();
  const submitting = useRef(false);
  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);
  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [token, router]);
  function redirectToFallback() {
    if (redirectTimer.current !== undefined) return;
    toast.info(
      "We're having a temporary issue with the live server. You'll be redirected to our alternative hosting so you can continue using the application.",
    );
    redirectTimer.current = window.setTimeout(() => {
      window.location.href = "https://doctor-tracker-pro.netlify.app/";
    }, 1800);
  }
  async function handleLogin(values: LoginPayload) {
    if (submitting.current || redirectTimer.current !== undefined) return;
    submitting.current = true;
    try {
      const response = await signIn({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      }).unwrap();
      if (!response.success) {
        if (window.location.hostname === "doctor-tracker.iblossomlearn.org") {
          redirectToFallback();
          return;
        }
        toast.error(response.message || "Sign in failed");
        return;
      }
      dispatch(baseApi.util.resetApiState());
      dispatch(login(response.data));
      toast.success(response.message || "Login successful");
      router.replace("/dashboard");
    } catch (error) {
      if (window.location.hostname === "doctor-tracker.iblossomlearn.org") {
        redirectToFallback();
        return;
      }
      toast.error(apiErrorMessage(error, "Unable to sign in. Please try again."));
    } finally {
      submitting.current = false;
    }
  }
  function handleDemoFill() {
    form.reset({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  }
  return (
    <main className="flex min-h-[100svh] min-h-screen items-center justify-center bg-sky-50 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-[1500px] items-center lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 xl:gap-12">
        <div className="hidden min-w-0 items-center justify-center lg:flex" aria-hidden="true">
          <Image
            {...authHeroImage}
            alt=""
            priority
            className="h-auto max-h-[650px] w-full object-contain"
          />
        </div>
        <section className="mx-auto w-full max-w-[480px] rounded-3xl border border-white/70 bg-white/90 px-6 py-8 shadow-[0_16px_48px_rgba(42,112,170,0.08)] backdrop-blur-sm sm:px-10 sm:py-10 lg:px-8 xl:px-10 xl:py-12">
          <Link
            href="/"
            className="mx-auto mb-6 flex w-fit justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
            aria-label="Doctor Tracker Home"
          >
            <Image
              {...authLogoImage}
              alt="Doctor Tracker"
              priority
              className="h-auto w-32 object-contain xl:w-[152px]"
            />
          </Link>
          <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-[#101d46] xl:text-4xl">
            Sign In
          </h1>
          <p className="mb-8 text-center text-sm leading-6 text-slate-500 sm:text-base">
            Sign in with your email and password
          </p>
          <form noValidate onSubmit={form.handleSubmit(handleLogin)} className="w-full">
            <fieldset disabled={isLoading || isSubmitting}>
              <Field label="Email" error={errors.email?.message} className="mb-5">
                <Input
                  {...register("email")}
                  leadingIcon={<User className="text-slate-500" />}
                  placeholder="Enter your email address"
                  autoComplete="username"
                  className="rounded-xl"
                  style={{ height: 50, fontSize: 15, borderColor: "#cbd5e1" }}
                />
              </Field>
              <Field label="Password" error={errors.password?.message} className="mb-6">
                <PasswordInput
                  {...register("password")}
                  leadingIcon={<LockKeyhole className="text-slate-500" />}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="rounded-xl"
                  style={{ height: 50, fontSize: 15, borderColor: "#cbd5e1" }}
                />
              </Field>
              <Button
                type="submit"
                loading={isLoading || isSubmitting}
                className="h-[50px] w-full rounded-xl bg-[#3b82f6] text-base font-semibold"
              >
                Sign In <ArrowRight />
              </Button>
              <Button
                variant="outline"
                onClick={handleDemoFill}
                disabled={isLoading || isSubmitting}
                className="mt-3 h-[50px] w-full rounded-xl border-blue-500 bg-white text-base font-medium text-blue-600 hover:bg-blue-50"
              >
                Auto Fill Admin Login
              </Button>
            </fieldset>
          </form>
        </section>
      </div>
    </main>
  );
}
