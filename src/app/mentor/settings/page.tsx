"use client";
import { StudentPasswordForm as PasswordForm } from "@/components/student/profile-forms";
import { StudentPageHeading as PageHeading } from "@/components/student/submission-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import useAuth from "@/hooks/useAuth";
export default function MentorSettings() {
  const { logout, isLoggingOut } = useAuth();
  return <><PageHeading title="Account settings" description="Manage your password and sign-in session." /><div className="grid items-start gap-6 lg:grid-cols-2"><PasswordForm /><Card className="rounded-xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-6"><h2 className="text-lg font-semibold">Sign out</h2><p className="text-sm text-muted-foreground">Sign out of your account on this device.</p><Button variant="outline" loading={isLoggingOut} onClick={() => void logout()}>Logout</Button></CardContent></Card></div></>;
}
