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
              borderRadius: "6px",
              boxShadow: "0 12px 32px -8px rgba(11,18,32,0.45)",
              padding: "10px 14px",
            },
            success: { iconTheme: { primary: "#1F8A5E", secondary: "#F6F5F1" } },
            error: { iconTheme: { primary: "#B0402C", secondary: "#F6F5F1" } },
            loading: { iconTheme: { primary: "#C9A227", secondary: "#F6F5F1" } },
          }}
        />
      </body>
    </html>
  );
}
