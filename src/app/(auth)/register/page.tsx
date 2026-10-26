import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import AuthLayout from "@/components/shared/auth-layout";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create Your Account"
      description="Complete your registration using your invitation."
    >
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-slate-600">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-[#101d46]">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Invitation Only
        </h2>
        <p>
          Invitation registration is not available yet. Please contact your administrator for
          account access or help with an existing invitation.
        </p>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/signin" className="font-semibold text-blue-600 hover:underline">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
