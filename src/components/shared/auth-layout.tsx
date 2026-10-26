import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { authHeroImage, authLogoImage } from "@/config/auth-images";

export default function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
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
            className="mx-auto mb-6 flex w-fit flex-col items-center justify-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
            aria-label="Project Submission Home"
          >
            <Image
              {...authLogoImage}
              alt=""
              priority
              className="h-auto w-32 object-contain xl:w-[152px]"
            />
            <span className="text-center text-sm font-bold uppercase tracking-widest text-[#101d46]">
              Project Submission
            </span>
          </Link>
          <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-[#101d46] xl:text-4xl">
            {title}
          </h1>
          <p className="mb-8 text-center text-sm leading-6 text-slate-500 sm:text-base">
            {description}
          </p>
          {children}
        </section>
      </div>
    </main>
  );
}
