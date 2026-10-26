import { Suspense } from "react";
import StudentDirectory from "@/components/mentor/student-directory";
import { ContentSkeleton } from "@/components/shared/feedback";
export default function StudentsPage() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <StudentDirectory />
    </Suspense>
  );
}
