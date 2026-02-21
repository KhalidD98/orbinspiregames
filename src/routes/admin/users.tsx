import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const pendingInvites = useQuery(api.invites.listPending);
  const setRole = useMutation(api.users.setRole);
  const setMustChangePassword = useMutation(api.users.setMustChangePassword);
  const removeUser = useMutation(api.users.remove);
  const createInvite = useMutation(api.invites.create);
  const removeInvite = useMutation(api.invites.remove);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [updatingPasswordId, setUpdatingPasswordId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("employee");
  const [inviteLoading, setInviteLoading] = useState(false);

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

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      await createInvite({ email: inviteEmail, name: inviteName, role: inviteRole });
      toast.success("Invite created — tell them to sign up at the admin signin page");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("employee");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await removeInvite({ inviteId: inviteId as any });
      toast.success("Invite cancelled");
    } catch {
      toast.error("Failed to cancel invite");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage staff accounts, roles, and passwords
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Staff member name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={inviteLoading}>
                {inviteLoading ? "Creating..." : "Create Invite"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[140px]">Role</TableHead>
                  <TableHead className="w-[130px]">Password</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
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

      {pendingInvites && pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pending Invites</h2>
          <Card className="py-0 gap-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite: any) => (
                    <TableRow key={invite._id}>
                      <TableCell className="font-medium">{invite.name}</TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[invite.role as Role] || "outline"}>
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvite(invite._id)}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
