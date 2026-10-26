"use client";
import { useRouter } from "next/navigation";
import { baseApi } from "@/redux/api/baseApi";
import { logout as clearAuth } from "@/redux/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { persistor } from "@/redux/store";
export default function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const logout = async () => {
    dispatch(clearAuth());
    dispatch(baseApi.util.resetApiState());
    await persistor?.flush();
    router.replace("/signin");
  };
  return { user, logout };
}
