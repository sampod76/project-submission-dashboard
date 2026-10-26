"use client";
import Link from "next/link";
import { z } from "zod";
import { useGetAuditLogByIdQuery } from "@/redux/features/auditLog/auditLogApi";
import { useAppSelector } from "@/redux/hooks";
import { isOwnReviewAudit } from "@/lib/mentor";
import { apiStatus } from "@/utils/api-error";
import { RequestError, StudentPageHeading as PageHeading } from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert, MissingRecord } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function AuditDetail({ id }: { id: string }) {
  const validId = z.string().uuid().safeParse(id).success;
  const query = useGetAuditLogByIdQuery(id, { skip: !validId, refetchOnMountOrArgChange: true });
  const userId = useAppSelector((state) => state.auth.user?.id);
  const log = query.currentData?.data;
  if (!validId || apiStatus(query.error) === 404) return <MissingRecord title="Activity not found" description="This audit entry is unavailable." action={<Link href="/mentor/audit-logs">Back to activity</Link>} />;
  if (query.isError) return <RequestError error={query.error} busy={query.isFetching} retry={() => void query.refetch()} />;
  if (!log) return <ContentSkeleton rows={8} />;
  if (!isOwnReviewAudit(log, userId)) return <ErrorAlert message="You can view your own submission-review activity only." />;
  return <><PageHeading title="Review activity details" description={new Date(log.createdAt).toLocaleString()} action={<Button asChild variant="outline"><Link href="/mentor/audit-logs">Back to activity</Link></Button>} /><Card className="mb-6 rounded-xl border-slate-200 shadow-sm"><CardContent className="grid gap-5 p-5 text-sm sm:grid-cols-2"><div><p className="text-muted-foreground">Action</p><p>{log.action}</p></div><div><p className="text-muted-foreground">Reviewer</p><p className="break-all">{log.actor?.email ?? "Unavailable"}</p></div><div><p className="text-muted-foreground">Submission</p>{log.entityId ? <Link className="break-all text-primary hover:underline" href={`/mentor/submissions/${log.entityId}`}>{log.entityId}</Link> : <p>Unavailable</p>}</div><div><p className="text-muted-foreground">IP address</p><p>{log.ipAddress ?? "Not recorded"}</p></div><div className="sm:col-span-2"><p className="text-muted-foreground">User agent</p><p className="break-all">{log.userAgent ?? "Not recorded"}</p></div></CardContent></Card><div className="grid gap-6 lg:grid-cols-2">{[{ title: "Before review", data: log.oldData }, { title: "After review", data: log.newData }].map((snapshot) => <Card key={snapshot.title} className="min-w-0 rounded-xl border-slate-200 shadow-sm"><CardContent className="p-5"><h2 className="mb-4 font-semibold">{snapshot.title}</h2><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-4 text-xs leading-6">{JSON.stringify(snapshot.data, null, 2)}</pre></CardContent></Card>)}</div></>;
}
