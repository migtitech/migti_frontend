import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useData } from "../../context/DataContext";
import { ROLE_LABELS } from "../../context/AuthContext";
import { ConfirmDialog, PageHeader, BackButton } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import usePermissions from "../../hooks/usePermissions";

const BRANCH_ROLES = [
  "head_of_department",
  "sales_manager",
  "sales_exicutive",
  "purchase_exicutive",
  "procurement",
  "back_office_exicutive",
  "administrator",
];

const BranchUserManagement = () => {
  const { companyId, branchId } = useParams();
  const navigate = useNavigate();
  const {
    getCompanyById,
    getBranchById,
    getUsersByBranch,
    addBranchUser,
    updateBranchUser,
    deleteBranchUser,
  } = useData();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const canCreateBranches = canCreate("branches");
  const canUpdateBranches = canUpdate("branches");
  const canDeleteBranches = canDelete("branches");

  const company = getCompanyById(parseInt(companyId));
  const branch = getBranchById(parseInt(branchId));
  const users = getUsersByBranch(parseInt(branchId));

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
  });

  if (!company || !branch) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Branch not found</h4>
          <Button type="button" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", role: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", role: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUser) {
      updateBranchUser(editingUser.id, formData);
    } else {
      addBranchUser({ ...formData, branchId: parseInt(branchId) });
    }
    handleCloseModal();
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (id != null) deleteBranchUser(id);
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      head_of_department: "default",
      sales_manager: "success",
      sales_exicutive: "info",
      purchase_exicutive: "info",
      procurement: "warning",
      back_office_exicutive: "secondary",
      administrator: "secondary",
    };
    return colors[role] || "secondary";
  };

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback={`/admin/companies/${companyId}/branches`} />
      </div>

      <PageHeader
        title={branch.name}
        description={`User Management - ${company.name}`}
        actions={
          canCreateBranches ? (
            <Button type="button" onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => handleOpenModal(user)}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeColor(user.role)}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {canUpdateBranches ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(user);
                          }}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDeleteBranches ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(user.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canCreateBranches || (canUpdateBranches && editingUser) ? (
        <Dialog open={showModal} onOpenChange={(o) => !o && handleCloseModal()}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit User" : "Add New User"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Role</option>
                    {BRANCH_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {canDeleteBranches ? (
        <ConfirmDialog
          visible={confirmDelete.visible}
          onClose={() => setConfirmDelete({ visible: false, id: null })}
          onConfirm={handleDeleteConfirm}
          title="Delete User?"
          message="Are you sure you want to delete this user? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />
      ) : null}
    </div>
  );
};

export default BranchUserManagement;
