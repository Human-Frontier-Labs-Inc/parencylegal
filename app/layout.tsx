import { PaymentStatusAlert } from "@/components/payment/payment-status-alert";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/utilities/providers";
import LayoutWrapper from "@/components/layout-wrapper";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Parency Legal - AI-Powered Evidence Management",
  description: "Professional-grade evidence organization platform for family law attorneys. Automate document classification, track discovery requests, and identify missing evidence."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  // Profile creation now happens in the dashboard layout only
  // This reduces unnecessary database calls on public pages

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Providers
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
          >
            <LayoutWrapper>
              {userId && <PaymentStatusAlert />}
              {children}
            </LayoutWrapper>
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
