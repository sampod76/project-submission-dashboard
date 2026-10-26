import { ThemeProvider } from "@/components/theme-context";
import ImagePreloads from "@/components/shared/image-preloads";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Doctor Tracker",
  description: "A reusable Doctor Tracker boilerplate.",
};

const ReduxProvider = dynamic(() => import("@/provider/redux-provider"), {
  ssr: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ImagePreloads />
      </head>
      <body className="custom-sidebar-menu" suppressHydrationWarning>
        <ReduxProvider>
          <ThemeProvider>
            <TooltipProvider delayDuration={250}>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
