"use client";
import { useEffect, useState } from "react";
import { rateLimitDelay } from "@/utils/api-error";
export function useRequestCooldown() {
  const [until, setUntil] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    update();
    if (until <= Date.now()) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [until]);
  return {
    seconds,
    block: (error: unknown) => {
      const delay = rateLimitDelay(error);
      if (delay) {
        setSeconds(delay);
        setUntil(Date.now() + delay * 1000);
      }
    },
  };
}
