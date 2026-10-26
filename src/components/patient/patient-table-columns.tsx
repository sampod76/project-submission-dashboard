"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Trash2, Pencil, MoreVertical, Eye } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import { useDeletePatientMutation } from "@/redux/features/patient/patientApi";
import { apiErrorMessage } from "@/utils/api-error";
import { TREATMENT_STATUS, type PatientDoctor, type TPatient } from "@/types/patient";
export const formatEnumLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export const renderDoctorRelationTooltip = (doctor: Partial<PatientDoctor>) => (
  <div className="space-y-1">
    <div>Med. Reg. No: {doctor.medicalRegistrationNo?.trim() || "N/A"}</div>
    <div>
      <span className="font-medium">Name:</span> {doctor.name?.trim() || "N/A"}
    </div>
    <div>
      <span className="font-medium">Specialization:</span>{" "}
      {doctor.specialization ? formatEnumLabel(doctor.specialization) : "N/A"}
    </div>
    <div>
      <span className="font-medium">Email:</span> {doctor.email?.trim() || "N/A"}
    </div>
  </div>
);

const renderEllipsis = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <Hint content={text}>
      <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap">{text}</div>
    </Hint>
  );
};

const statusColors = {
  [TREATMENT_STATUS.ACTIVE]: "blue",
  [TREATMENT_STATUS.UNDER_OBSERVATION]: "orange",
  [TREATMENT_STATUS.RECOVERED]: "green",
} as const;
export const usePatientColumns = ({
  onEdit,
  onDeleted,
}: {
  onEdit: (patient: TPatient) => void;
  onDeleted?: () => void;
}) => {
  const [deletingPatient, setDeletingPatient] = useState<Pick<TPatient, "_id" | "name">>();
  const [deletePatient, { isLoading: isDeleting }] = useDeletePatientMutation();
  const deletePending = useRef(false);
  const handleDeleteConfirm = (record: Pick<TPatient, "_id" | "name">) => {
    if (!isDeleting && !deletePending.current) setDeletingPatient(record);
  };
  const confirmDelete = async () => {
    if (!deletingPatient || deletePending.current) return;
    deletePending.current = true;
    try {
      const response = await deletePatient(deletingPatient._id).unwrap();
      if (!response.success) throw new Error(response.message || "Failed to delete patient");
      toast.success("Patient deleted successfully.");
      setDeletingPatient(undefined);
      onDeleted?.();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Failed to delete patient"));
    } finally {
      deletePending.current = false;
    }
  };
  const columns: ColumnDef<TPatient>[] = [
    {
      header: "Patient Name",
      accessorKey: "name",
      size: 170,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(row.original.name),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      size: 130,
      cell: ({ row }) => renderEllipsis(row.original.phone),
    },
    {
      header: "Age",
      accessorKey: "age",
      size: 70,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(row.original.age),
    },
    {
      header: "Gender",
      accessorKey: "gender",
      size: 90,
      cell: ({ row }) => renderEllipsis(formatEnumLabel(row.original.gender)),
    },
    {
      header: "Doctor",
      id: "doctor",
      size: 160,
      cell: ({ row }) => {
        const doctor = row.original.doctor?.[0];
        return doctor ? (
          <Hint content={renderDoctorRelationTooltip(doctor)}>
            <span className="block w-full cursor-help overflow-hidden text-ellipsis whitespace-nowrap">
              {doctor.name || "—"}
            </span>
          </Hint>
        ) : (
          "—"
        );
      },
    },
    {
      header: "Treatment Status",
      accessorKey: "treatmentStatus",
      size: 170,
      cell: ({ row }) => (
        <Badge variant={statusColors[row.original.treatmentStatus]}>
          {formatEnumLabel(row.original.treatmentStatus)}
        </Badge>
      ),
    },
    {
      header: "Last Visit",
      accessorKey: "lastVisitAt",
      size: 120,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(formatDate(row.original.lastVisitAt)),
    },
    {
      header: "Follow Up",
      accessorKey: "followUpDate",
      size: 120,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(formatDate(row.original.followUpDate)),
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      size: 130,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(formatDate(row.original.createdAt)),
    },
    {
      header: "Actions",
      id: "actions",
      size: 70,
      cell: ({ row: { original: record } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`Actions for ${record.name}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/patients/${encodeURIComponent(record._id)}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Patient
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(record)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Patient
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
              onSelect={() => handleDeleteConfirm(record)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Patient
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const confirmation = (
    <DeleteConfirmation
      open={Boolean(deletingPatient)}
      onOpenChange={(open) => {
        if (!open) setDeletingPatient(undefined);
      }}
      title="Delete Patient"
      pending={isDeleting}
      onConfirm={confirmDelete}
    >
      Are you sure you want to delete <strong>{deletingPatient?.name}</strong>?
    </DeleteConfirmation>
  );
  return { columns, isDeleting, handleDeleteConfirm, confirmation };
};
