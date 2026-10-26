import StudentAccount from "@/components/mentor/student-account";
export default function Page({ params }: { params: { id: string } }) {
  return <StudentAccount key={params.id} id={params.id} workspace="admin" targetRole="MENTOR" />;
}
