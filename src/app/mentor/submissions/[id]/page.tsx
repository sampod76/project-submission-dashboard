import SubmissionDetail from "@/components/mentor/submission-detail";
export default function SubmissionPage({ params }: { params: { id: string } }) { return <SubmissionDetail key={params.id} id={params.id} />; }
