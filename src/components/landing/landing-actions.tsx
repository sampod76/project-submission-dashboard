"use client";

import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import { dashboardForRole } from "@/lib/auth-routing";

export default function LandingActions() {
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const isLoggedIn = Boolean(accessToken && user);
  return (
    <div className="mt-8 flex flex-wrap items-stretch gap-4">
      <Link
        href={isLoggedIn ? dashboardForRole(user?.role) : "/login"}
        className="inline-flex min-h-16 items-center justify-center gap-4 rounded-full bg-blue-600 px-7 py-3 text-lg font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
        >
          <ArrowRight />
        </span>
        {isLoggedIn ? "Go to Panel" : "Login"}
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-[#182747] shadow-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        <UserPlus aria-hidden="true" className="text-2xl" />
        <span className="text-left">
          <span className="block text-base font-semibold">Registration</span>
          <span className="block text-sm text-slate-500">Create a Student account</span>
        </span>
      </Link>
    </div>
  );
}
