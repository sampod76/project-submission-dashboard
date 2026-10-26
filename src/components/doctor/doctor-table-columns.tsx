"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Trash2, Pencil, Eye, MoreVertical } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
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
import { useDeleteDoctorMutation } from "@/redux/features/doctor/doctorApi";
import { apiErrorMessage } from "@/utils/api-error";
import { SPECIALIZATION, type TDoctor } from "@/types/doctor";
export const specializationLabel = (value: SPECIALIZATION) =>
  value === SPECIALIZATION.ENT
    ? "ENT"
    : value
        .toLowerCase()
        .split("_")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");

const renderEllipsis = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);

  return (
    <Hint content={text}>
      <div
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
        }}
      >
        {text}
      </div>
    </Hint>
  );
};

export const useDoctorColumns = ({ onEdit }: { onEdit: (doctor: TDoctor) => void }) => {
  const [deletingDoctor, setDeletingDoctor] = useState<TDoctor>();
  const [deleteDoctor, { isLoading: isDeleting }] = useDeleteDoctorMutation();
  const deletePending = useRef(false);
  const confirmDelete = async () => {
    if (!deletingDoctor || deletePending.current) return;
    deletePending.current = true;
    try {
      await deleteDoctor(deletingDoctor._id).unwrap();
      toast.success("Doctor deleted successfully.");
      setDeletingDoctor(undefined);
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Failed to delete doctor"));
    } finally {
      deletePending.current = false;
    }
  };
  const columns: ColumnDef<TDoctor>[] = [
    {
      header: "Doctor Name",
      accessorKey: "name",
      size: 180,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(row.original.name),
    },
    {
      header: "Specialization",
      accessorKey: "specialization",
      size: 170,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(specializationLabel(row.original.specialization)),
    },
    {
      header: "Hospital",
      accessorKey: "hospital",
      size: 200,
      enableSorting: true,
      cell: ({ row }) => renderEllipsis(row.original.hospital),
    },
    {
      header: "Reg.No",
      accessorKey: "medicalRegistrationNo",
      size: 140,
      cell: ({ row }) => renderEllipsis(row.original.medicalRegistrationNo),
    },
    {
      header: "Patients",
      accessorKey: "patientsCount",
      size: 100,
      cell: ({ row }) => renderEllipsis(row.original.patientsCount),
    },
    {
      header: "Status",
      accessorKey: "isActive",
      size: 110,
      cell: ({ row }) => (
        <Hint content={row.original.isActive ? "Active" : "Inactive"}>
          <Badge variant={row.original.isActive ? "green" : "red"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        </Hint>
      ),
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      size: 190,
      enableSorting: true,
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return renderEllipsis(Number.isNaN(date.getTime()) ? "—" : date.toLocaleString());
      },
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
              <Link href={`/dashboard/doctors/${encodeURIComponent(record._id)}`}>
                <Eye className="mr-2 h-4 w-4" />
                Profile &amp; Patients
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(record)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Doctor
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeletingDoctor(record)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Doctor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const confirmation = (
    <DeleteConfirmation
      open={Boolean(deletingDoctor)}
      onOpenChange={(open) => {
        if (!open) setDeletingDoctor(undefined);
      }}
      title="Delete Doctor"
      pending={isDeleting}
      onConfirm={confirmDelete}
    >
      Are you sure you want to delete <strong>{deletingDoctor?.name}</strong>?
    </DeleteConfirmation>
  );
  return { columns, confirmation };
};
