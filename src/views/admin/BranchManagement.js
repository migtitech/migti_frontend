import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, ArrowLeft } from "lucide-react";
import { useData } from "../../context/DataContext";
import { ConfirmDialog, PageHeader } from "../../components";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import usePermissions from "../../hooks/usePermissions";

const BranchManagement = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const {
    getCompanyById,
    getBranchesByCompany,
    addBranch,
    updateBranch,
    deleteBranch,
    getUsersByBranch,
  } = useData();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const canCreateBranches = canCreate("branches");
  const canUpdateBranches = canUpdate("branches");
  const canDeleteBranches = canDelete("branches");

  const company = getCompanyById(parseInt(companyId));
  const branches = getBranchesByCompany(parseInt(companyId));

  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    logo: "",
  });

  if (!company) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Company not found</h4>
          <Button type="button" onClick={() => navigate("/admin/dashboard")}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleOpenModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        email: branch.email,
        location: branch.location,
        logo: branch.logo || "",
      });
    } else {
      setEditingBranch(null);
      setFormData({ name: "", email: "", location: "", logo: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData({ name: "", email: "", location: "", logo: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingBranch) {
      updateBranch(editingBranch.id, formData);
    } else {
      addBranch({ ...formData, companyId: parseInt(companyId) });
    }
    handleCloseModal();
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (id != null) deleteBranch(id);
  };

  const handleViewUsers = (branchId) => {
    navigate(`/admin/companies/${companyId}/branches/${branchId}/users`);
  };

  return (
    <div>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Button>
      </div>

      <PageHeader
        title={company.name}
        description="Branch Management"
        actions={
          canCreateBranches ? (
            <Button type="button" onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4" />
              Add Branch
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
                <TableHead>Location</TableHead>
                <TableHead>Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch, index) => (
                <TableRow
                  key={branch.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/branches/${branch.id}`)}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.email}</TableCell>
                  <TableCell>{branch.location}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant="success"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewUsers(branch.id);
                      }}
                    >
                      {getUsersByBranch(branch.id).length} Users
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewUsers(branch.id);
                        }}
                        title="Manage Users"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      {canUpdateBranches ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(branch);
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
                            handleDeleteClick(branch.id);
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
              {branches.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No branches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canCreateBranches || (canUpdateBranches && editingBranch) ? (
        <Dialog open={showModal} onOpenChange={(o) => !o && handleCloseModal()}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? "Edit Branch" : "Add New Branch"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter branch name"
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
                    placeholder="Enter branch email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Enter branch location"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="logo">Logo URL (Optional)</Label>
                  <Input
                    id="logo"
                    type="text"
                    value={formData.logo}
                    onChange={(e) =>
                      setFormData({ ...formData, logo: e.target.value })
                    }
                    placeholder="Enter logo URL"
                  />
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
                  {editingBranch ? "Update" : "Create"}
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
          title="Delete Branch?"
          message="Are you sure you want to delete this branch? All users will also be removed."
          confirmText="Delete"
          cancelText="Cancel"
        />
      ) : null}
    </div>
  );
};

export default BranchManagement;
