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
    <main className="flex min-h-[100svh] items-center justify-center bg-sky-50 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="grid w-full max-w-[1280px] items-center lg:grid-cols-2 lg:gap-10 xl:gap-16">
        <div className="hidden min-w-0 items-center justify-center lg:flex" aria-hidden="true">
          <Image
            {...authHeroImage}
            alt=""
            priority
            className="h-auto max-h-[520px] w-full object-contain"
          />
        </div>
        <section className="mx-auto w-full max-w-[520px] rounded-2xl border border-white/70 bg-white/95 p-5 shadow-[0_16px_48px_rgba(42,112,170,0.08)] backdrop-blur-sm sm:p-6 lg:p-7">
          <Link
            href="/"
            className="mx-auto mb-4 flex w-fit items-center justify-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
            aria-label="Project Submission Home"
          >
            <Image
              {...authLogoImage}
              alt=""
              priority
              className="h-10 w-10 object-contain sm:h-12 sm:w-12"
            />
            <span className="text-xs font-bold uppercase tracking-widest text-[#101d46]">
              Project Submission
            </span>
          </Link>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-[#101d46] sm:text-[28px] sm:leading-9">
            {title}
          </h1>
          <p className="mb-5 text-center text-sm leading-5 text-slate-500">{description}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
