import { Suspense } from "react";
import SubmissionQueue from "@/components/mentor/submission-queue";
import { ContentSkeleton } from "@/components/shared/feedback";
export default function SubmissionsPage() { return <Suspense fallback={<ContentSkeleton />}><SubmissionQueue /></Suspense>; }
