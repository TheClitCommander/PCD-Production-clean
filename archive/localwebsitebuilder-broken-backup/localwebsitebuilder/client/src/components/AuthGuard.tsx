import { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  // For now, just render children without authentication
  // In production, you'd check for admin token here
  return <>{children}</>;
} 