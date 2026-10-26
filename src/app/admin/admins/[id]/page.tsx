import AdminDetail from "@/components/admin/admin-detail";
export default function Page({ params }: { params: { id: string } }) {
  return <AdminDetail key={params.id} id={params.id} />;
}
