import ManagementDashboard from "@/components/shared/management-dashboard";
import AdminOverview from "@/components/admin/admin-overview";
export default function AdminDashboard() {
  return (
    <>
      <ManagementDashboard workspace="admin" />
      <AdminOverview />
    </>
  );
}
