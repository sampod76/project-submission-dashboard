"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  const styles = {
    button: {
      backgroundColor: "#f0f0f0",
      borderColor: "#d9d9d9",
      width: "100%",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  };
  return (
    <Button size="lg" variant="outline" onClick={() => router.back()} style={styles.button}>
      <ArrowLeft />
      Go Back
    </Button>
  );
}
