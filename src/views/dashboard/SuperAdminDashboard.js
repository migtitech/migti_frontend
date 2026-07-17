import React from "react";
import { Users, Building2, Briefcase, TrendingUp } from "lucide-react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components";
import {
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

const SummaryItem = ({ label, children, accent }) => (
  <div className={cn("rounded-lg border-l-4 bg-muted/40 px-3 py-2", accent)}>
    <div className="truncate text-sm text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{children}</div>
  </div>
);

const SuperAdminDashboard = () => {
  const { companies, branches, branchUsers } = useData();
  const { user } = useAuth();

  const stats = {
    totalCompanies: companies.length,
    totalBranches: branches.length,
    totalUsers: branchUsers.length,
    activeUsers: branchUsers.length, // In real app, filter by status
  };

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Super Admin Dashboard - ERP"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toString()}
          icon={TrendingUp}
          tint="bg-success-muted text-success!"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Companies</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.slice(0, 5).map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.location}</TableCell>
                    <TableCell>
                      <Badge variant="info">
                        {
                          branches.filter((b) => b.companyId === company.id)
                            .length
                        }
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Branches</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.slice(0, 5).map((branch) => {
                  const company = companies.find(
                    (c) => c.id === branch.companyId,
                  );
                  return (
                    <TableRow key={branch.id}>
                      <TableCell>{branch.name}</TableCell>
                      <TableCell>{company?.name || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="success">
                          {
                            branchUsers.filter((u) => u.branchId === branch.id)
                              .length
                          }
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryItem label="Platform" accent="border-primary!">
              ERP v1.0
            </SummaryItem>
            <SummaryItem label="Organization" accent="border-primary!">
              Migti Industrial Pvt Ltd
            </SummaryItem>
            <SummaryItem label="Status" accent="border-success!">
              <span className="text-success!">Active</span>
            </SummaryItem>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
