"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

/**
 * SignUp Page
 *
 * Standard Clerk signup with theme support
 */
export default function SignUpPage() {
  const { theme } = useTheme();

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <SignUp
        appearance={{
          baseTheme: theme === "dark" ? dark : undefined,
        }}
        routing="hash"
        signInUrl="/login"
      />
    </div>
  );
}
