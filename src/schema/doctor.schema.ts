import { z } from "zod";
import { SPECIALIZATION } from "@/types/doctor";
export const doctorFormSchema = (mode: "create" | "edit") =>
  z.object({
    name: z
      .string()
      .min(1, "Please enter doctor name")
      .min(2, "Name must be at least 2 characters"),
    medicalRegistrationNo: z
      .string()
      .trim()
      .min(1, "Please enter medical registration number")
      .max(100, "Medical registration number must be at most 100 characters"),
    email: z
      .string()
      .min(1, "Please enter email address")
      .email("Please enter a valid email address"),
    password:
      mode === "create"
        ? z
            .string()
            .min(1, "Please enter password")
            .min(8, "Password must be at least 8 characters")
        : z.string().optional(),
    phone: z.string().min(1, "Please enter phone number"),
    hospital: z.string().min(1, "Please select or enter hospital name"),
    specialization: z.nativeEnum(SPECIALIZATION, {
      required_error: "Please select specialization",
    }),
    isActive: z.boolean().optional(),
  });
export type DoctorFormFields = z.infer<ReturnType<typeof doctorFormSchema>>;
