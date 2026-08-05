import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attendance Live",
  description: "Live college attendance with QR sessions and proxy prevention.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen bg-paper text-ink-900 antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#111A2E",
              color: "#F6F5F1",
              fontSize: "0.875rem",
              borderRadius: "3px",
            },
          }}
        />
      </body>
    </html>
  );
}
