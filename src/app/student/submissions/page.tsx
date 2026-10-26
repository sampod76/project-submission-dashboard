import { Suspense } from "react";
import SubmissionList from "@/components/student/submission-list";
import { ContentSkeleton } from "@/components/shared/feedback";
export default function SubmissionsPage() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <SubmissionList />
    </Suspense>
  );
}
