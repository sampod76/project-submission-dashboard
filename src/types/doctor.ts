import type { TMeta, TResponse } from "./global";

export enum SPECIALIZATION {
  CARDIOLOGY = "CARDIOLOGY",
  DERMATOLOGY = "DERMATOLOGY",
  NEUROLOGY = "NEUROLOGY",
  PEDIATRICS = "PEDIATRICS",
  GYNECOLOGY = "GYNECOLOGY",
  ORTHOPEDICS = "ORTHOPEDICS",
  ENT = "ENT",
  OPHTHALMOLOGY = "OPHTHALMOLOGY",
  GENERAL_MEDICINE = "GENERAL_MEDICINE",
  GENERAL_SURGERY = "GENERAL_SURGERY",
  PSYCHIATRY = "PSYCHIATRY",
  DENTISTRY = "DENTISTRY",
  OTHER = "OTHER",
}

export interface TDoctor {
  _id: string;
  userId: string;
  createdBy: string;
  name: string;
  medicalRegistrationNo: string;
  email: string;
  specialization: SPECIALIZATION;
  hospital: string;
  phone: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patientsCount: number;
}
export interface DoctorFormValues {
  name: string;
  medicalRegistrationNo: string;
  email: string;
  password: string;
  phone: string;
  hospital: string;
  specialization: SPECIALIZATION;
}
export type UpdateDoctorValues = Pick<
  TDoctor,
  "name" | "medicalRegistrationNo" | "phone" | "hospital" | "specialization" | "isActive"
>;
export const DOCTOR_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "name",
  "specialization",
  "hospital",
] as const;
export type DoctorSortBy = (typeof DOCTOR_SORT_FIELDS)[number];
export type DoctorSortOrder = "asc" | "desc";

export interface DoctorsQueryParams {
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: DoctorSortBy;
  sortOrder?: DoctorSortOrder;
  specialization?: SPECIALIZATION;
  hospital?: string;
  isActive?: boolean;
}

export type DoctorsResponse = TResponse<TDoctor[]> & {
  data: TDoctor[];
  meta: TMeta;
};


export type DoctorDetails = Pick<
  TDoctor,
  | "_id"
  | "name"
  | "medicalRegistrationNo"
  | "email"
  | "phone"
  | "hospital"
  | "specialization"
  | "isActive"
  | "createdAt"
> &
  Partial<Pick<TDoctor, "patientsCount">>;
