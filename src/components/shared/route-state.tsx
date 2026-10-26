"use client";

import BackButton from "@/components/shared/back-button";
import { FileSearch, LockKeyhole, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

type RouteStateProps = {
  variant?: "global" | "auth" | "dashboard";
  statusCode?: "403" | "404";
  title: string;
  description: string;
  homeHref: "/" | "/signin" | "/dashboard";
  homeLabel: string;
  reset?: () => void;
  children?: ReactNode;
};

export default function RouteState({
  variant = "global",
  statusCode,
  title,
  description,
  homeHref,
  homeLabel,
  reset,
  children,
}: RouteStateProps) {
  const router = useRouter();
  const Icon =
    statusCode === "404" ? FileSearch : statusCode === "403" ? LockKeyhole : TriangleAlert;
  const card = (
    <section className="w-full max-w-[480px] rounded-3xl border border-sky-100 bg-white/95 p-6 text-center shadow-[0_16px_48px_rgba(42,112,170,0.08)] sm:p-10">
      <p className="mb-6 text-sm font-semibold tracking-wide text-blue-600">
        Project Submission Dashboard
      </p>
      <span
        aria-hidden="true"
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-blue-600"
      >
        <Icon />
      </span>
      {statusCode && (
        <p className="mb-3 text-7xl font-bold tracking-tight text-[#101d46] sm:text-8xl">
          {statusCode}
        </p>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-[#101d46]">{title}</h1>
      <p className="mb-0 mt-3 text-sm leading-6 text-slate-500 sm:text-base">{description}</p>
      <div className="mt-8 flex flex-col gap-3">
        {reset && (
          <Button variant="default" size="lg" onClick={reset}>
            Try again
          </Button>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <BackButton />
          <Button
            variant={reset ? "secondary" : "default"}
            size="lg"
            onClick={() => router.push(homeHref)}
            className="w-full"
          >
            {homeLabel}
          </Button>
        </div>
        {children}
      </div>
    </section>
  );
  if (variant === "dashboard") {
    return (
      <div className="flex min-h-[calc(100svh-80px)] items-center justify-center px-4 py-8 sm:px-6">
        {card}
      </div>
    );
  }
  return (
    <main className="flex min-h-[100svh] min-h-screen items-center justify-center bg-sky-50 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat px-4 py-8 sm:px-6">
      {variant === "auth" ? (
        <div className="grid w-full max-w-[1500px] items-center lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 xl:gap-12">
          <div className="hidden items-center justify-center lg:flex" aria-hidden="true">
            <Image
              src="/auth-banner.webp"
              alt=""
              width={1536}
              height={1024}
              sizes="(min-width: 1564px) 799px, 55vw"
              className="h-auto max-h-[650px] w-full object-contain"
            />
          </div>
          <div className="flex justify-center">{card}</div>
        </div>
      ) : (
        card
      )}
    </main>
  );
}
