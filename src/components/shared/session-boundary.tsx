"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { authApi, useGetSessionQuery } from "@/redux/features/auth/authApi";
import { useGetOwnProfileQuery } from "@/redux/features/user/userApi";
import { login, logout, setUser } from "@/redux/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { apiStatus } from "@/utils/api-error";
import { useRequestCooldown } from "@/hooks/use-request-cooldown";
import { RequestError } from "@/components/student/submission-shared";
import Loader from "./loader";

export default function SessionBoundary({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  const request = useRef<Promise<void> | null>(null);
  const cooldown = useRequestCooldown();

  useEffect(() => {
    let active = true;
    if (!request.current) {
      const operation = dispatch(authApi.endpoints.refreshToken.initiate());
      request.current = operation
        .unwrap()
        .then((response) => {
          dispatch(login(response.data));
        })
        .finally(() => operation.reset());
    }
    request.current
      .then(() => {
        if (active) setBootstrapped(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        // An absent/expired cookie is a normal signed-out state.
        if (apiStatus(error) === 401) setBootstrapped(true);
        else {
          setBootstrapError(error);
          cooldown.block(error);
        }
      });
    return () => {
      active = false;
    };
    // One coordinated bootstrap per attempt, including React Strict Mode remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, attempt]);

  const session = useGetSessionQuery(undefined, {
    skip: !accessToken,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const identity = session.currentData?.data;
  const validIdentity = Boolean(
    identity?.isActive && identity.id === user?.id && identity.role === user?.role,
  );
  const profile = useGetOwnProfileQuery(undefined, { skip: !accessToken || !validIdentity });
  const account = profile.currentData?.data;

  useEffect(() => {
    if (identity && !validIdentity) dispatch(logout());
    if (session.isError && [401, 403, 404].includes(apiStatus(session.error) ?? 0))
      dispatch(logout());
    if (profile.isError && [401, 403, 404].includes(apiStatus(profile.error) ?? 0))
      dispatch(logout());
  }, [
    identity,
    validIdentity,
    session.isError,
    session.error,
    profile.isError,
    profile.error,
    dispatch,
  ]);

  useEffect(() => {
    if (!account || !user || account.id !== user.id || account.role !== user.role) return;
    const details =
      account.role === "STUDENT"
        ? account.student
        : account.role === "MENTOR"
          ? account.mentor
          : account.admin;
    const name = details ? `${details.firstName} ${details.lastName}` : "N/A";
    if (name !== user.name || account.email !== user.email)
      dispatch(setUser({ ...user, name, email: account.email }));
  }, [account, user, dispatch]);

  if (bootstrapError && !bootstrapped)
    return (
      <main className="mx-auto max-w-xl p-6 pt-24">
        <RequestError
          error={bootstrapError}
          busy={Boolean(cooldown.seconds)}
          retry={() => {
            if (cooldown.seconds) return;
            request.current = null;
            setBootstrapError(undefined);
            setAttempt((value) => value + 1);
          }}
        />
        {cooldown.seconds > 0 && (
          <p role="status" className="mt-3 text-sm">
            Try again in {cooldown.seconds}s.
          </p>
        )}
      </main>
    );
  if (!bootstrapped) return <Loader />;
  if (accessToken) {
    const failed = session.isError ? session : profile.isError ? profile : null;
    if (failed)
      return (
        <main className="mx-auto max-w-xl p-6 pt-24">
          <RequestError
            error={failed.error}
            busy={failed.isFetching}
            retry={() => void failed.refetch()}
          />
        </main>
      );
    if (
      !validIdentity ||
      !account ||
      account.id !== user?.id ||
      account.role !== user?.role ||
      !account.isActive
    )
      return <Loader />;
  }
  return children;
}
