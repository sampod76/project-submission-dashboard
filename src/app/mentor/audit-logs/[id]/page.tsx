import AuditDetail from "@/components/mentor/audit-detail";
export default function AuditDetailPage({ params }: { params: { id: string } }) {
  return <AuditDetail id={params.id} />;
}
