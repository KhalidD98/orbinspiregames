import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

type Role = "owner" | "manager" | "employee";

const roleBadgeVariant: Record<Role, "default" | "secondary" | "outline"> = {
  owner: "default",
  manager: "secondary",
  employee: "outline",
};

function UsersPage() {
  const currentUser = useQuery(api.users.current);
  const users = useQuery(api.users.list);
  const setRole = useMutation(api.users.setRole);
  const setMustChangePassword = useMutation(api.users.setMustChangePassword);
  const removeUser = useMutation(api.users.remove);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [updatingPasswordId, setUpdatingPasswordId] = useState<string | null>(null);

  if (currentUser === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "owner") {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              Only the owner can manage users. Contact the shop owner if you need
              access to this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoleId(userId);
    try {
      await setRole({ userId: userId as any, role: newRole as any });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleSetMustChangePassword = async (userId: string, mustChange: boolean) => {
    setUpdatingPasswordId(userId);
    try {
      await setMustChangePassword({ userId: userId as any, mustChangePassword: mustChange });
      toast.success(
        mustChange
          ? "User must change password on next login"
          : "Password change requirement removed"
      );
    } catch {
      toast.error("Failed to update password requirement");
    } finally {
      setUpdatingPasswordId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await removeUser({ userId: userId as any });
      toast.success("User deleted");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage staff accounts, roles, and passwords
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To add a new staff member, have them sign up via the admin sign-in page.
            Once their account appears here, assign them the appropriate role. New
            accounts without a role will not have access to admin features until a
            role is assigned.
          </p>
        </CardContent>
      </Card>

      {users === undefined ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => {
                  const isSelf = user._id === currentUser._id;
                  return (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        {user.name || "Unnamed"}
                        {isSelf && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.email || "No email"}</TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Badge variant={roleBadgeVariant[user.role as Role] || "outline"}>
                            {user.role || "none"}
                          </Badge>
                        ) : (
                          <Select
                            value={user.role || ""}
                            onValueChange={(value) => handleRoleChange(user._id, value)}
                            disabled={updatingRoleId === user._id}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Assign role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <span className="text-sm text-muted-foreground">--</span>
                        ) : user.mustChangePassword ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingPasswordId === user._id}
                            onClick={() => handleSetMustChangePassword(user._id, false)}
                          >
                            {updatingPasswordId === user._id
                              ? "Updating..."
                              : "Clear Reset"}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={updatingPasswordId === user._id}
                            onClick={() => handleSetMustChangePassword(user._id, true)}
                          >
                            {updatingPasswordId === user._id
                              ? "Updating..."
                              : "Force Reset"}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSelf ? (
                          <span className="text-sm text-muted-foreground">--</span>
                        ) : deleteConfirmId === user._id ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(user._id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteConfirmId(user._id)}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
