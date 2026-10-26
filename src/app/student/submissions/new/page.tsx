import SubmissionForm from "@/components/student/submission-form";
import { StudentPageHeading } from "@/components/student/submission-shared";
export default function NewSubmissionPage() {
  return (
    <>
      <StudentPageHeading
        title="Submit a project"
        description="Share your repository and live project. Your submission will start as pending."
      />
      <SubmissionForm />
    </>
  );
}
