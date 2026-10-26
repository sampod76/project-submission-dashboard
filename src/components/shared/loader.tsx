"use client";

import { Spinner } from "@/components/shared/feedback";

export default function Loader() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "70vh",
        background: "#ffffff",
      }}
      className="z-50 bg-white"
    >
      <Spinner />
    </div>
  );
}
