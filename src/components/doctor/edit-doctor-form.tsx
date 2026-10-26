"use client";

import type { TDoctor } from "@/types/doctor";
import ModalComponent from "../ui/modal";
import CreateDoctorForm from "./create-doctor-form";

export default function EditDoctorForm({
  doctor,
  onClose,
}: {
  doctor: TDoctor;
  onClose: () => void;
}) {
  return (
    <ModalComponent
      title="Edit Doctor"
      width={500}
      className="doctor-compact-modal"
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <CreateDoctorForm mode="edit" doctor={doctor} />
    </ModalComponent>
  );
}
