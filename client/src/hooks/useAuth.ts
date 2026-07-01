import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import type { User } from "@shared/schema";

export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();

  // Only fetch the app user (with company/companyId) once Clerk confirms a session.
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isLoaded && isSignedIn === true,
    retry: false,
  });

  return {
    user,
    isLoading: !isLoaded || (isSignedIn === true && userLoading),
    isAuthenticated: isLoaded ? isSignedIn === true : false,
  };
}
