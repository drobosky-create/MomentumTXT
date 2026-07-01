import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SignUp routing="hash" signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </div>
  );
}
