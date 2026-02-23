import { Navigate } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

interface PlatformAdminRouteProps {
  children: React.ReactNode;
}

export function PlatformAdminRoute({ children }: PlatformAdminRouteProps) {
  const { isPlatformAdmin, isCheckingAdmin } = usePlatformAdmin();

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
