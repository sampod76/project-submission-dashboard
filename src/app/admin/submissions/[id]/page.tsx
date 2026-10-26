import SubmissionDetail from "@/components/mentor/submission-detail";
export default function Page({ params }: { params: { id: string } }) {
  return <SubmissionDetail key={params.id} id={params.id} workspace="admin" />;
}
