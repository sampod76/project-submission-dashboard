import AuditDetail from "@/components/mentor/audit-detail";
export default function Page({ params }: { params: { id: string } }) {
  return <AuditDetail key={params.id} id={params.id} workspace="admin" />;
}
