import type { TDoctor } from "./doctor";
import type { TMeta, TResponse } from "./global";

export enum ENUM_GENDER {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum TREATMENT_STATUS {
  ACTIVE = "ACTIVE",
  UNDER_OBSERVATION = "UNDER_OBSERVATION",
  RECOVERED = "RECOVERED",
}

export type PatientDoctor = Pick<
  TDoctor,
  "name" | "medicalRegistrationNo" | "specialization" | "email"
>;

export type TPatient = {
  _id: string;
  name: string;
  phone: string;
  doctorId: string;
  doctor: PatientDoctor[];
  age: number;
  gender: ENUM_GENDER;
  treatmentStatus: TREATMENT_STATUS;
  lastVisitAt: string | null;
  followUpDate: string | null;
  createdAt: string;
};

export type CreatePatientPayload = Pick<
  TPatient,
  "name" | "phone" | "doctorId" | "age" | "gender"
> & {
  patientComplaint: string;
  address?: string;
  doctorAdvice?: string;
  notes?: string;
  treatmentStatus?: TREATMENT_STATUS;
  lastVisitAt?: string | null;
  followUpDate?: string | null;
};

export const PATIENT_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "name",
  "followUpDate",
  "lastVisitAt",
  "age",
] as const;
export type PatientSortBy = (typeof PATIENT_SORT_FIELDS)[number];
export type PatientSortOrder = "asc" | "desc";

export type PatientsQueryParams = {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sortBy?: PatientSortBy;
  sortOrder?: PatientSortOrder;
  doctorId?: string;
  gender?: ENUM_GENDER;
  treatmentStatus?: TREATMENT_STATUS;
  followUpDate?: string;
  lastVisitAt?: string;
};

export type PatientsResponse = TResponse<TPatient[]> & {
  data: TPatient[];
  meta: TMeta;
};

export type PatientDetails = Omit<TPatient, "doctor" | "doctorId"> & {
  doctor?: Pick<
    TDoctor,
    "_id" | "name" | "email" | "medicalRegistrationNo" | "specialization" | "hospital" | "isActive"
  > | null;
  address?: string;
  patientComplaint?: string;
  doctorAdvice?: string;
  notes?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
};
export type UpdatePatientPayload = Partial<CreatePatientPayload>;
