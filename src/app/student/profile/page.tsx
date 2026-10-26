"use client";
import { useGetOwnProfileQuery } from "@/redux/features/user/userApi";
import { OwnProfileForm, StudentPasswordForm } from "@/components/student/profile-forms";
import { StudentPageHeading, RequestError } from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/student-submissions";
export default function StudentProfilePage() {
  const query = useGetOwnProfileQuery();
  const account = query.currentData?.data;
  const profile = account?.student;
  if (query.isError) return <RequestError error={query.error} retry={() => void query.refetch()} />;
  if (!account) return <ContentSkeleton rows={6} />;
  if (!profile)
    return (
      <ErrorAlert message="Your Student profile is unavailable. Contact your administrator." />
    );
  return (
    <>
      <StudentPageHeading
        title="Profile & settings"
        description="Keep your personal details up to date and manage your password."
      />
      <Card className="mb-6 rounded-xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700"
          >
            {profile.firstName.charAt(0)}
            {profile.lastName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-semibold">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="mt-1 break-all text-sm text-muted-foreground">{account.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Joined {formatDate(account.createdAt)}
              {profile.gender ? ` · ${profile.gender}` : ""}
            </p>
          </div>
          <Badge variant={account.isActive ? "green" : "red"}>
            {account.isActive ? "Active Student" : "Inactive"}
          </Badge>
        </CardContent>
      </Card>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <OwnProfileForm profile={profile} />
        <StudentPasswordForm />
      </div>
    </>
  );
}
