import { z } from "zod";
import { ENUM_GENDER, TREATMENT_STATUS } from "@/types/patient";
const nameError = "Enter a name between 2 and 100 characters";
const phoneError = "Enter a phone number between 6 and 20 characters";
const ageError = "Enter a whole-number age from 0 to 150";
const complaintError = "Enter a patient complaint (up to 5000 characters)";
export const patientFormSchema = (doctorId?: string) =>
  z.object({
    name: z
      .string()
      .min(2, nameError)
      .max(100, nameError)
      .refine((value) => Boolean(value.trim()), nameError),
    phone: z
      .string()
      .min(6, phoneError)
      .max(20, phoneError)
      .refine((value) => Boolean(value.trim()), phoneError),
    age: z
      .number({ required_error: ageError, invalid_type_error: ageError })
      .int(ageError)
      .min(0, ageError)
      .max(150, ageError),
    gender: z.nativeEnum(ENUM_GENDER, { required_error: "Select gender" }),
    treatmentStatus: z.nativeEnum(TREATMENT_STATUS).optional(),
    doctorId: doctorId
      ? z.string().optional()
      : z.string({ required_error: "Select a doctor" }).min(1, "Select a doctor"),
    patientComplaint: z
      .string()
      .min(1, complaintError)
      .max(5000, complaintError)
      .refine((value) => Boolean(value.trim()), complaintError),
    address: z.string().max(500, "'address' cannot be longer than 500 characters").optional(),
    doctorAdvice: z
      .string()
      .max(5000, "'doctorAdvice' cannot be longer than 5000 characters")
      .optional(),
    notes: z.string().max(5000, "'notes' cannot be longer than 5000 characters").optional(),
    lastVisitAt: z.string().nullable().optional(),
    followUpDate: z.string().nullable().optional(),
  });
export type PatientFormValues = z.infer<ReturnType<typeof patientFormSchema>>;
