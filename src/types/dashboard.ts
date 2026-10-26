import type { TResponse } from "./global";

export interface DashboardPatientOverviewItem {
  month: string;
  newPatients: number;
  followUps: number;
}

export interface DashboardPatientsPerDoctorItem {
  doctorId: string;
  name: string;
  medicalRegistrationNo: string;
  patientsCount: number;
}

export interface DashboardTreatmentStatusItem {
  name: string;
  value: number;
}

export interface DashboardOverviewData {
  totalFollowUps: number;
  activeDoctors: number;
  patientsOverview: DashboardPatientOverviewItem[];
  patientsPerDoctor: DashboardPatientsPerDoctorItem[];
  treatmentStatus: DashboardTreatmentStatusItem[];
}

export type DashboardOverviewResponse = TResponse<DashboardOverviewData> & {
  data: DashboardOverviewData;
};
