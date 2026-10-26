import type { Metadata } from "next";
import Image from "next/image";
import { FileText, Users, User } from "lucide-react";
import LandingActions from "@/components/landing/landing-actions";

export const metadata: Metadata = {
  title: "Doctor Tracker | Doctor & Patient Management",
  description:
    "Keep doctors, patients, treatments and follow-up information organized in one calm, simple place.",
};

const features = [
  {
    title: "Manage Doctors",
    description: "Manage doctor profiles, specialization and hospital information.",
    icon: User,
    color: "bg-sky-100 text-sky-600",
  },
  {
    title: "Manage Patients",
    description: "Keep patient information, complaints, treatment status and follow-ups.",
    icon: Users,
    color: "bg-emerald-100 text-emerald-500",
  },
  {
    title: "Track Treatment & Follow-ups",
    description: "Stay organized with treatment records and follow-up schedules.",
    icon: FileText,
    color: "bg-violet-100 text-violet-500",
  },
];

export default function Page() {
  return (
    <main className="min-h-[100svh] bg-[#f4fcff] bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat px-5 py-10 font-sans text-[#101d46] sm:px-8 lg:flex lg:items-center lg:py-12">
      <div className="mx-auto w-full max-w-7xl">
        <section
          aria-labelledby="landing-heading"
          className="grid items-center gap-8 lg:grid-cols-2 lg:gap-6"
        >
          <div className="min-w-0">
            <Image
              src="/auth-logo.png"
              alt="Doctor Tracker"
              width={912}
              height={1148}
              priority
              className="mb-6 h-28 w-auto rounded-xl object-contain"
            />
            <p className="mb-5 inline-flex rounded-full border border-sky-200 bg-sky-100/80 px-5 py-2 text-sm font-medium text-[#0764b5] sm:text-base">
              Simple &middot; Secure &middot; Organized
            </p>
            <h1
              id="landing-heading"
              className="m-0 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl"
            >
              <span className="block">Doctor &amp; Patient</span>
              <span className="block">Management</span>
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            <p className="mb-0 mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
              Keep doctors, patients, treatments and follow-up information organized in one calm,
              simple place.
            </p>
            <LandingActions />
          </div>
          <div className="mx-auto w-full max-w-lg lg:max-w-xl">
            <Image
              src="/doctor.webp"
              alt="Doctor working at a laptop with an illustration of doctor, patient and follow-up management"
              width={1254}
              height={1254}
              sizes="(max-width: 1023px) 90vw, 50vw"
              priority
              className="h-auto w-full object-contain"
            />
          </div>
        </section>
        <section
          aria-label="Doctor Tracker features"
          className="mt-10 grid gap-4 md:grid-cols-2 lg:mt-12 lg:grid-cols-3"
        >
          {features.map(({ title, description, icon: Icon, color }) => (
            <article
              key={title}
              className="flex items-start gap-4 rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-[0_8px_24px_rgba(33,91,128,0.08)]"
            >
              <span
                aria-hidden="true"
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl ${color}`}
              >
                <Icon />
              </span>
              <div className="min-w-0">
                <h2 className="m-0 text-base font-semibold leading-6">{title}</h2>
                <p className="mb-0 mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
