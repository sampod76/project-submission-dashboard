import StudentAccount from "@/components/mentor/student-account";
export default function StudentAccountPage({ params }: { params: { id: string } }) { return <StudentAccount key={params.id} id={params.id} />; }
