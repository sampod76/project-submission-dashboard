"use client";

import { useGetProfileQuery } from "@/redux/features/auth/authApi";
import { useAppSelector } from "@/redux/hooks";
import { apiErrorMessage } from "@/utils/api-error";
import { User } from "lucide-react";
import { ErrorAlert } from "@/components/shared/feedback";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/shared/feedback";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ProfilePage() {
  const token = useAppSelector((state) => state.auth.accessToken);
  const { data, error, isLoading, isFetching, refetch } = useGetProfileQuery(undefined, {
    skip: !token,
  });
  const user = data?.data?.user;
  const name = user?.profile?.name.trim() || user?.email || "User";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="p-4 sm:p-6">
      <Card className="mx-auto w-full max-w-2xl rounded-lg shadow-md shadow-blue-200">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || (isFetching && !data) || !token ? (
            <ContentSkeleton rows={4} />
          ) : error || !data?.success || !user ? (
            <ErrorAlert
              message={apiErrorMessage(error, "Unable to load your profile.")}
              action={
                <Button variant="secondary" loading={isFetching} onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          ) : (
            <>
              <div className="mb-6 flex min-w-0 items-center gap-4">
                <UserAvatar
                  size={64}
                  className="shrink-0 bg-indigo-600"
                  icon={!initials ? <User /> : undefined}
                >
                  {initials || undefined}
                </UserAvatar>
                <div className="min-w-0">
                  <h2 className="mb-1 break-words text-xl font-semibold text-gray-800">{name}</h2>
                  <Badge variant="blue">{user.role}</Badge>
                </div>
              </div>
              <dl className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all">{user.email}</dd>
                </div>
                <div className="flex flex-wrap gap-4">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{user.profile?.phone || "Not provided"}</dd>
                </div>
                <div className="flex flex-wrap gap-4">
                  <dt className="text-muted-foreground">Account Status</dt>
                  <dd>
                    <Badge variant={user.isActive ? "green" : "red"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
