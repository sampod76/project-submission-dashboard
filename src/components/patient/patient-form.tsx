"use client";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { OptionSelect } from "@/components/ui/option-select";
import { Combobox } from "@/components/ui/combobox";
import { Hint } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/date-picker";
import { useDebounced } from "@/hooks/use-debounce";
import { useGetDoctorsQuery } from "@/redux/features/doctor/doctorApi";
import {
  useCreatePatientMutation,
  useUpdatePatientMutation,
} from "@/redux/features/patient/patientApi";
import {
  ENUM_GENDER,
  TREATMENT_STATUS,
  type CreatePatientPayload,
  type PatientDetails,
} from "@/types/patient";
import { patientFormSchema, type PatientFormValues } from "@/schema/patient.schema";
import { apiErrorMessage } from "@/utils/api-error";
import { formatEnumLabel, renderDoctorRelationTooltip } from "./patient-table-columns";
import { useModal } from "@/components/ui/modal";
import type { DoctorOption } from "./patient-filters";

function patientDefaults(patient?: PatientDetails): DefaultValues<PatientFormValues> {
  return patient
    ? {
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        gender: patient.gender,
        treatmentStatus: patient.treatmentStatus,
        doctorId: patient.doctor?._id,
        patientComplaint: patient.patientComplaint ?? "",
        address: patient.address,
        doctorAdvice: patient.doctorAdvice,
        notes: patient.notes,
        lastVisitAt:
          patient.lastVisitAt && dayjs(patient.lastVisitAt).isValid()
            ? dayjs(patient.lastVisitAt).format("YYYY-MM-DD")
            : null,
        followUpDate:
          patient.followUpDate && dayjs(patient.followUpDate).isValid()
            ? dayjs(patient.followUpDate).format("YYYY-MM-DD")
            : null,
      }
    : {
        name: "",
        phone: "",
        patientComplaint: "",
        treatmentStatus: TREATMENT_STATUS.ACTIVE,
        lastVisitAt: null,
        followUpDate: null,
      };
}

export default function PatientForm({
  doctorId,
  onLoadingChange,
  patient,
}: {
  doctorId?: string;
  patient?: PatientDetails;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const submitting = useRef(false);
  const editingPatientId = useRef(patient?._id);
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema(doctorId)),
    defaultValues: patientDefaults(patient),
  });
  const {
    register,
    control,
    reset: resetForm,
    formState: { errors },
  } = form;
  const { closeModal, setLoading } = useModal();
  const [search, setSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption>();
  const debouncedSearch = useDebounced({ searchQuery: search, delay: 350 });
  const isDebouncing = Boolean(search.trim()) && search !== debouncedSearch;
  const { currentData, isFetching, error, refetch } = useGetDoctorsQuery(
    {
      page: 1,
      limit: 10,
      ...(search.trim() && debouncedSearch.trim() ? { searchTerm: debouncedSearch.trim() } : {}),
    },
    { skip: Boolean(doctorId) || isDebouncing },
  );
  const options = (currentData?.data ?? []).map((doctor) => ({
    value: doctor._id,
    label: doctor.name,
    medicalRegistrationNo: doctor.medicalRegistrationNo,
    specialization: doctor.specialization,
    email: doctor.email,
  }));
  if (selectedDoctor && !options.some((option) => option.value === selectedDoctor.value))
    options.unshift(selectedDoctor);
  const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();
  const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientMutation();
  const isLoading = isCreating || isUpdating || form.formState.isSubmitting;
  useEffect(() => {
    onLoadingChange?.(isLoading);
    setLoading(isLoading);
    return () => setLoading(false);
  }, [isLoading, onLoadingChange, setLoading]);

  useEffect(() => {
    if (editingPatientId.current === patient?._id) return;
    editingPatientId.current = patient?._id;
    resetForm(patientDefaults(patient));
    setSearch("");
    setSelectedDoctor(undefined);
  }, [patient, resetForm]);
  const reset = () => {
    resetForm();
    setSearch("");
    setSelectedDoctor(undefined);
  };
  const close = () => {
    if (isLoading) return;
    reset();
    closeModal();
  };
  const submit = async (values: PatientFormValues) => {
    if (submitting.current || isCreating || isUpdating) return;
    const assignedDoctorId = doctorId ?? values.doctorId;
    if (!assignedDoctorId) return;
    const payload: CreatePatientPayload = {
      ...values,
      doctorId: assignedDoctorId,
      name: values.name.trim(),
      phone: values.phone.trim(),
      patientComplaint: values.patientComplaint.trim(),
      lastVisitAt: values.lastVisitAt ?? null,
      followUpDate: values.followUpDate ?? null,
    };
    submitting.current = true;
    try {
      const response = patient
        ? await updatePatient({ id: patient._id, body: payload }).unwrap()
        : await createPatient(payload).unwrap();
      if (!response.success) {
        toast.error(
          response.message || (patient ? "Failed to update patient" : "Failed to create patient"),
        );
        return;
      }
      toast.success(patient ? "Patient updated successfully" : "Patient created successfully");
      reset();
      closeModal();
    } catch (error: unknown) {
      toast.error(
        apiErrorMessage(error, patient ? "Failed to update patient" : "Failed to create patient"),
      );
    } finally {
      submitting.current = false;
    }
  };

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">{patient ? "Edit Patient" : "Add Patient"}</h2>
      <form noValidate onSubmit={form.handleSubmit(submit)}>
        <fieldset disabled={isLoading}>
          <Field label="Patient Name" error={errors.name?.message}>
            <Input {...register("name")} maxLength={100} />
          </Field>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} maxLength={20} />
            </Field>
            <Field label="Age" error={errors.age?.message}>
              <Input
                {...register("age", { valueAsNumber: true })}
                type="number"
                min={0}
                max={150}
                step={1}
              />
            </Field>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Field label="Gender" error={errors.gender?.message}>
                  <OptionSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={Object.values(ENUM_GENDER).map((value) => ({
                      value,
                      label: formatEnumLabel(value),
                    }))}
                    disabled={isLoading}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="treatmentStatus"
              render={({ field }) => (
                <Field label="Treatment Status" error={errors.treatmentStatus?.message}>
                  <OptionSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={Object.values(TREATMENT_STATUS).map((value) => ({
                      value,
                      label: formatEnumLabel(value),
                    }))}
                    disabled={isLoading}
                  />
                </Field>
              )}
            />
          </div>
          {!doctorId && (
            <Controller
              control={control}
              name="doctorId"
              render={({ field }) => (
                <Field label="Doctor" error={errors.doctorId?.message}>
                  <Combobox
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      setSelectedDoctor(options.find((option) => option.value === value));
                      setSearch("");
                    }}
                    options={options}
                    search={search}
                    onSearchChange={setSearch}
                    clearable
                    title="Search doctors by name, email or registration no."
                    placeholder="Select Doctor"
                    loading={isFetching || isDebouncing}
                    disabled={isLoading}
                    emptyText={error ? "Unable to load doctors" : "No doctors found"}
                    renderOption={(option) => (
                      <Hint
                        content={renderDoctorRelationTooltip({ ...option, name: option.label })}
                      >
                        <span>{option.label || "—"}</span>
                      </Hint>
                    )}
                  />
                </Field>
              )}
            />
          )}
          {!doctorId && error && !isDebouncing && (
            <div role="alert" className="mb-4 text-sm text-red-600">
              {apiErrorMessage(error, "Unable to load doctors.")}{" "}
              <Button variant="link" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}
          <Field label="Patient Complaint" error={errors.patientComplaint?.message}>
            <Textarea {...register("patientComplaint")} rows={3} maxLength={5000} />
          </Field>
          <Field label="Address" error={errors.address?.message}>
            <Textarea
              {...register("address", {
                setValueAs: (value: string) =>
                  value === "" && patient?.address === undefined ? undefined : value,
              })}
              rows={2}
              maxLength={500}
            />
          </Field>
          <Field label="Doctor Advice" error={errors.doctorAdvice?.message}>
            <Textarea
              {...register("doctorAdvice", {
                setValueAs: (value: string) =>
                  value === "" && patient?.doctorAdvice === undefined ? undefined : value,
              })}
              rows={2}
              maxLength={5000}
            />
          </Field>
          <Field label="Notes" error={errors.notes?.message}>
            <Textarea
              {...register("notes", {
                setValueAs: (value: string) =>
                  value === "" && patient?.notes === undefined ? undefined : value,
              })}
              rows={2}
              maxLength={5000}
            />
          </Field>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="lastVisitAt"
              render={({ field }) => (
                <Field label="Last Visit Date" error={errors.lastVisitAt?.message}>
                  <DatePicker value={field.value} onChange={field.onChange} disabled={isLoading} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="followUpDate"
              render={({ field }) => (
                <Field label="Follow Up Date" error={errors.followUpDate?.message}>
                  <DatePicker value={field.value} onChange={field.onChange} disabled={isLoading} />
                </Field>
              )}
            />
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={reset} disabled={isLoading}>
            Reset
          </Button>
          <Button variant="secondary" onClick={close} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} className="bg-orange-500 hover:bg-orange-600">
            {patient ? "Save Changes" : "Create Patient"}
          </Button>
        </div>
      </form>
    </>
  );
}
