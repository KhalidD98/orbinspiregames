import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex";
import { useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
});

function AdminRoute() {
  const user = useQuery(api.users.current);
  const navigate = useNavigate();
  const location = useLocation();

  const isSignInPage = location.pathname === "/admin/signin";

  useEffect(() => {
    // If user query has loaded (not undefined) and user is null, redirect to signin
    if (user === null && !isSignInPage) {
      navigate({ to: "/admin/signin" });
    }
    // If user has mustChangePassword, redirect to profile (unless already there)
    if (
      user &&
      user.mustChangePassword &&
      location.pathname !== "/admin/profile"
    ) {
      navigate({ to: "/admin/profile" });
    }
  }, [user, isSignInPage, navigate, location.pathname]);

  // Sign-in page renders without layout
  if (isSignInPage) {
    return <Outlet />;
  }

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (user === null) {
    return null;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
