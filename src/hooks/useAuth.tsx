"use client";
import { useRouter } from "next/navigation";
import { useLogoutMutation } from "@/redux/features/auth/authApi";
import { useAppSelector } from "@/redux/hooks";
import { useRef } from "react";
import { toast } from "sonner";
export default function useAuth() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [signOut, { isLoading, reset }] = useLogoutMutation();
  const pending = useRef(false);
  const logout = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      await signOut().unwrap();
      toast.success("Signed out successfully");
    } catch {
      toast.warning("Signed out on this device. Server cookie cleanup could not be confirmed.");
    } finally {
      reset();
      pending.current = false;
      router.replace("/login");
    }
  };
  return { user, logout, isLoggingOut: isLoading };
}
