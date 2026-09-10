/**
 * Admin Users Page - Manage all users
 */
import React, { useEffect, useState } from "react";
import { usersAPI, UserProfile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Trash2,
  Shield,
  GraduationCap,
  Search,
  AlertTriangle,
  Edit,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: "", userName: "" });
  const [editUser, setEditUser] = useState<{
    open: boolean;
    user: UserProfile | null;
  }>({ open: false, user: null });
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await usersAPI.getAll();
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const confirmDeleteUser = (userId: string, userName: string) => {
    setDeleteConfirm({ open: true, userId, userName });
  };

  const handleDeleteUser = async () => {
    try {
      await usersAPI.delete(deleteConfirm.userId);
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.userId));
      toast({
        title: "User removed successfully",
        description: `${deleteConfirm.userName} has been removed from the platform`,
      });
      setDeleteConfirm({ open: false, userId: "", userName: "" });
    } catch (err: any) {
      toast({
        title: "Error deleting user",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditUser({ open: true, user });
  };

  const handleSaveEditUser = async () => {
    if (!editUser.user) return;
    try {
      await usersAPI.update(editUser.user.id, {
        displayName: editUser.user.displayName,
        email: editUser.user.email,
        role: editUser.user.role,
        bio: editUser.user.bio,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.user!.id ? editUser.user! : u)),
      );
      setEditUser({ open: false, user: null });
      toast({
        title: "User updated successfully",
        description: `${editUser.user.displayName}'s profile has been updated`,
      });
    } catch (err: any) {
      toast({
        title: "Error updating user",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const roleBadgeClass: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive border-destructive/20",
    instructor: "bg-accent/10 text-accent border-accent/20",
    student: "bg-info/10 text-info border-info/20",
  };

  const roleIcon: Record<string, React.ReactNode> = {
    admin: <Shield size={14} />,
    instructor: <GraduationCap size={14} />,
    student: <Users size={14} />,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl lg:text-3xl font-bold">
          Manage Users
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage all platform users
        </p>
      </motion.div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredUsers.length} users
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-muted-foreground"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-muted-foreground"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-medium">
                            {user.displayName?.charAt(0) ||
                              user.email.charAt(0)}
                          </div>
                          <span className="font-medium">
                            {user.displayName || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={roleBadgeClass[user.role]}>
                          {roleIcon[user.role]}
                          <span className="ml-1 capitalize">{user.role}</span>
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              confirmDeleteUser(
                                user.id,
                                user.displayName || user.email,
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onOpenChange={() =>
          setDeleteConfirm({ open: false, userId: "", userName: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} className="text-destructive" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm.userName}</strong>? This action cannot be
              undone and will permanently remove:
              <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                <li>All their course enrollments</li>
                <li>All their progress and certificates</li>
                <li>All their discussions and reviews</li>
                <li>Their account access</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteConfirm({ open: false, userId: "", userName: "" })
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 size={16} className="mr-2" /> Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editUser.open}
        onOpenChange={() => setEditUser({ open: false, user: null })}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={20} />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          {editUser.user && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-displayname">Display Name</Label>
                <Input
                  id="edit-displayname"
                  value={editUser.user.displayName}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      user: { ...editUser.user, displayName: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.user.email}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      user: { ...editUser.user, email: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editUser.user.role}
                  onValueChange={(value: "student" | "instructor" | "admin") =>
                    setEditUser({
                      ...editUser,
                      user: { ...editUser.user, role: value },
                    })
                  }
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={editUser.user.bio || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      user: { ...editUser.user, bio: e.target.value },
                    })
                  }
                  rows={3}
                  placeholder="Tell us about this user..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditUser({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditUser}
              className="gradient-accent text-accent-foreground"
            >
              <Save size={16} className="mr-2" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
