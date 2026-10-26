"use client";
import { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IdCard, LockKeyhole, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { apiErrorMessage } from "@/utils/api-error";
import { doctorFormSchema, type DoctorFormFields } from "@/schema/doctor.schema";
import {
  type DoctorDetails,
  type DoctorFormValues,
  type UpdateDoctorValues,
  SPECIALIZATION,
} from "@/types/doctor";
import {
  useCreateDoctorAccountMutation,
  useUpdateDoctorMutation,
} from "@/redux/features/doctor/doctorApi";
import { useModal } from "../ui/modal";
import { hospitalOptions } from "@/constants/hospital";

const specializationOptions = Object.values(SPECIALIZATION).map((value) => ({
  value,
  label: value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" "),
}));
type DoctorFormProps = { onSuccess?: () => void } & (
  { mode?: "create"; doctor?: never } | { mode: "edit"; doctor: DoctorDetails }
);
export default function CreateDoctorForm({ mode = "create", doctor, onSuccess }: DoctorFormProps) {
  const submitting = useRef(false);
  const form = useForm<DoctorFormFields>({
    resolver: zodResolver(doctorFormSchema(mode)),
    defaultValues: {
      name: "",
      medicalRegistrationNo: "",
      email: "",
      password: "",
      phone: "",
      hospital: "",
    },
  });
  const {
    register,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = form;
  const { open, closeModal, setLoading } = useModal();
  const [createDoctor, { isLoading: isCreating }] = useCreateDoctorAccountMutation();
  const [updateDoctor, { isLoading: isUpdating }] = useUpdateDoctorMutation();
  const isLoading = isCreating || isUpdating || isSubmitting;
  useEffect(() => {
    setLoading(isLoading);
    return () => setLoading(false);
  }, [isLoading, setLoading]);
  useEffect(() => {
    reset(
      mode === "edit" && doctor
        ? {
            name: doctor.name,
            medicalRegistrationNo: doctor.medicalRegistrationNo,
            email: doctor.email,
            phone: doctor.phone,
            hospital: doctor.hospital,
            specialization: doctor.specialization,
            isActive: doctor.isActive,
          }
        : { name: "", medicalRegistrationNo: "", email: "", password: "", phone: "", hospital: "" },
    );
  }, [open, mode, doctor, reset]);
  const handleSubmit = async (values: DoctorFormFields) => {
    if (submitting.current || isCreating || isUpdating) return;
    submitting.current = true;
    try {
      const profile = {
        name: values.name,
        medicalRegistrationNo: values.medicalRegistrationNo.trim(),
        phone: values.phone,
        hospital: values.hospital,
        specialization: values.specialization,
      };
      if (mode === "edit") {
        if (!doctor) return;
        const body: UpdateDoctorValues = {
          ...profile,
          isActive: values.isActive ?? doctor.isActive,
        };
        await updateDoctor({ id: doctor._id, body }).unwrap();
      } else {
        if (!values.password) return;
        const body: DoctorFormValues = {
          ...profile,
          email: values.email,
          password: values.password,
        };
        await createDoctor(body).unwrap();
      }

      toast.success(
        mode === "edit" ? "Doctor updated successfully." : "Doctor created successfully",
      );
      reset();
      closeModal();
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(
        apiErrorMessage(
          error,
          mode === "edit" ? "Failed to update doctor" : "Failed to create doctor",
        ),
      );
    } finally {
      submitting.current = false;
    }
  };
  const handleReset = () => reset();
  const handleClose = () => {
    if (isLoading) return;
    reset();
    closeModal();
  };
  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="doctor-compact-form">
      <h2 className="mb-3 pr-8 text-lg font-semibold">
        {mode === "edit" ? "Edit Doctor" : "Create Doctor"}
      </h2>
      <fieldset disabled={isLoading}>
        <Field label="Doctor Name" error={errors.name?.message}>
          <Input
            {...register("name")}
            leadingIcon={<User className="text-gray-400" />}
            placeholder="Enter doctor name"
          />
        </Field>
        <Field label="Medical Registration No." error={errors.medicalRegistrationNo?.message}>
          <Input
            {...register("medicalRegistrationNo", {
              onChange: (event) =>
                form.setValue("medicalRegistrationNo", event.target.value.trim(), {
                  shouldValidate: true,
                  shouldDirty: true,
                }),
            })}
            leadingIcon={<IdCard className="text-gray-400" />}
            placeholder="Enter medical registration number"
            maxLength={100}
          />
        </Field>
        <Field label="Email Address" error={errors.email?.message}>
          <Input
            {...register("email")}
            leadingIcon={<Mail className="text-gray-400" />}
            readOnly={mode === "edit"}
            aria-disabled={mode === "edit"}
            placeholder="doctor@example.com"
          />
        </Field>
        {mode === "create" && (
          <Field label="Password" error={errors.password?.message}>
            <PasswordInput
              {...register("password")}
              leadingIcon={<LockKeyhole className="text-gray-400" />}
              placeholder="Enter password"
            />
          </Field>
        )}
        <div className="grid min-w-0 grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label="Phone Number" error={errors.phone?.message}>
            <Input
              {...register("phone")}
              leadingIcon={<Phone className="text-gray-400" />}
              placeholder="01812000000"
            />
          </Field>
          <Controller
            control={control}
            name="specialization"
            render={({ field }) => (
              <Field label="Specialization" error={errors.specialization?.message}>
                <Combobox
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  options={specializationOptions}
                  placeholder="Select specialization"
                  disabled={isLoading}
                />
              </Field>
            )}
          />
        </div>
        <div
          className={
            mode === "edit"
              ? "grid min-w-0 grid-cols-1 gap-x-3 sm:grid-cols-[minmax(0,1fr)_88px]"
              : "min-w-0"
          }
        >
          <Controller
            control={control}
            name="hospital"
            render={({ field }) => (
              <Field label="Hospital" error={errors.hospital?.message}>
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={hospitalOptions}
                  placeholder="Select or type hospital name"
                  creatable
                  disabled={isLoading}
                />
              </Field>
            )}
          />
          {mode === "edit" && (
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Field label="Active">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </Field>
              )}
            />
          )}
        </div>
      </fieldset>
      <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 border-t border-gray-100 pt-3">
        <Button variant="secondary" disabled={isLoading} onClick={handleReset}>
          Reset
        </Button>
        <Button variant="secondary" disabled={isLoading} onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading} className="bg-orange-500 hover:bg-orange-600">
          {mode === "edit" ? "Update Doctor" : "Create Doctor"}
        </Button>
      </div>
    </form>
  );
}
