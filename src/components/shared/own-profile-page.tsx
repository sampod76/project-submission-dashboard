"use client";
import Link from "next/link";
import { useGetOwnProfileQuery } from "@/redux/features/user/userApi";
import { OwnProfileForm } from "@/components/student/profile-forms";
import {
  StudentPageHeading as PageHeading,
  RequestError,
} from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/student-submissions";
export default function OwnProfilePage({
  workspace = "mentor",
}: {
  workspace?: "mentor" | "admin";
}) {
  const label = workspace === "admin" ? "Admin" : "Mentor";
  const query = useGetOwnProfileQuery();
  const account = query.currentData?.data;
  const profile = workspace === "admin" ? account?.admin : account?.mentor;
  if (query.isError)
    return (
      <RequestError
        error={query.error}
        busy={query.isFetching}
        retry={() => void query.refetch()}
      />
    );
  if (!account) return <ContentSkeleton rows={6} />;
  return (
    <>
      <PageHeading
        title="My profile"
        description={`Update your personal information and view your ${label} account details.`}
        action={
          <Button asChild variant="outline">
            <Link href={`/${workspace}/settings`}>Account settings</Link>
          </Button>
        }
      />
      <Card className="mb-6 rounded-xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700"
          >
            {profile
              ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`
              : label.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-semibold">
              {profile ? `${profile.firstName} ${profile.lastName}` : label}
            </h2>
            <p className="mt-1 break-all text-sm text-muted-foreground">{account.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Joined {formatDate(account.createdAt)}
              {profile && "gender" in profile && profile.gender
                ? ` · ${"gender" in profile ? profile.gender : ""}`
                : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Last sign in:{" "}
              {account.lastLoginAt
                ? new Date(account.lastLoginAt).toLocaleString()
                : "Not recorded"}
            </p>
          </div>
          <Badge variant={account.isActive ? "green" : "red"}>
            {account.isActive ? `Active ${label}` : "Inactive"}
          </Badge>
        </CardContent>
      </Card>
      {profile ? (
        <div className="max-w-3xl">
          <OwnProfileForm key={profile.id} profile={profile} />
        </div>
      ) : (
        <ErrorAlert
          message={`Your ${label} profile is unavailable. Profile-dependent actions are unavailable. You can still change your password in Settings.`}
        />
      )}
    </>
  );
}
