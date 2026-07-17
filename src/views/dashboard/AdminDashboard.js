import React, { useState } from "react";
import {
  Building2,
  Briefcase,
  Users,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, PageHeader } from "../../components";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from "../../components/ui";
import { cn } from "../../lib/utils";

const StatCard = ({ title, value, icon: Icon, tint }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              tint,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const {
    companies,
    branches,
    branchUsers,
    addCompany,
    updateCompany,
    deleteCompany,
  } = useData();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
  });

  const stats = {
    totalCompanies: companies.length,
    totalBranches: branches.length,
    totalUsers: branchUsers.length,
  };

  const handleOpenModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        email: company.email,
        location: company.location,
      });
    } else {
      setEditingCompany(null);
      setFormData({ name: "", email: "", location: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setFormData({ name: "", email: "", location: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCompany) {
      updateCompany(editingCompany.id, formData);
    } else {
      addCompany(formData);
    }
    handleCloseModal();
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (id != null) deleteCompany(id);
  };

  const handleViewBranches = (companyId) => {
    navigate(`/admin/companies/${companyId}/branches`);
  };

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Admin Dashboard - Company Management"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Companies"
          value={stats.totalCompanies.toString()}
          icon={Building2}
          tint="bg-primary/10 text-primary!"
        />
        <StatCard
          title="Total Branches"
          value={stats.totalBranches.toString()}
          icon={Briefcase}
          tint="bg-accent text-accent-foreground"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toString()}
          icon={Users}
          tint="bg-warning-muted text-warning!"
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Companies</CardTitle>
          <Button type="button" size="sm" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company, index) => (
                <TableRow key={company.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{company.name}</TableCell>
                  <TableCell>{company.email}</TableCell>
                  <TableCell>{company.location}</TableCell>
                  <TableCell>
                    <Badge
                      variant="info"
                      className="cursor-pointer"
                      onClick={() => handleViewBranches(company.id)}
                    >
                      {
                        branches.filter((b) => b.companyId === company.id)
                          .length
                      }{" "}
                      Branches
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewBranches(company.id)}
                        title="View Branches"
                      >
                        <Briefcase className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(company)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(company.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No companies found. Click &quot;Add Company&quot; to create
                    one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Company Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && handleCloseModal()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Edit Company" : "Add New Company"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter company name"
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
                  placeholder="Enter company email"
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
                  placeholder="Enter company location"
                  required
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
                {editingCompany ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Company?"
        message="Are you sure you want to delete this company? All branches will also be deleted."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default AdminDashboard;
