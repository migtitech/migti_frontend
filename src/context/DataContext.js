import React, { createContext, useContext, useState } from "react";

const DataContext = createContext(null);

// Initial dummy data
const initialCompanies = [
  {
    id: 1,
    name: "Migti Industrial Pvt Ltd",
    email: "info@migti.com",
    phone: "+91 9876543210",
    location: "Mumbai, Maharashtra",
    address: "123 Industrial Area, Andheri East, Mumbai - 400069",
    gst: "27AABCU9603R1ZM",
    website: "www.migti.com",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Tech Solutions Inc",
    email: "contact@techsolutions.com",
    phone: "+91 9876543211",
    location: "Delhi, India",
    address: "456 Tech Park, Noida Sector 62, Delhi NCR - 201301",
    gst: "07AABCT1234R1ZN",
    website: "www.techsolutions.com",
    createdAt: new Date().toISOString(),
  },
];

const initialBranches = [
  {
    id: 1,
    companyId: 1,
    name: "Main Branch",
    location: "Mumbai HQ",
    email: "mumbai@migti.com",
    phone: "+91 9876543210",
    address: "123 Industrial Area, Andheri East, Mumbai",
    logo: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    companyId: 1,
    name: "Pune Branch",
    location: "Pune, Maharashtra",
    email: "pune@migti.com",
    phone: "+91 9876543212",
    address: "789 IT Park, Hinjewadi, Pune",
    logo: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    companyId: 2,
    name: "Delhi Branch",
    location: "Delhi NCR",
    email: "delhi@techsolutions.com",
    phone: "+91 9876543213",
    address: "456 Tech Park, Noida Sector 62",
    logo: null,
    createdAt: new Date().toISOString(),
  },
];

const initialBranchUsers = [
  {
    id: 1,
    branchId: 1,
    name: "John Doe",
    email: "hod@gmail.com",
    role: "head_of_department",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    branchId: 1,
    name: "Jane Smith",
    email: "sales_manager@gmail.com",
    role: "sales_manager",
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    branchId: 1,
    name: "Mike Johnson",
    email: "sales_exicutive@gmail.com",
    role: "sales_exicutive",
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    branchId: 1,
    name: "Sarah Williams",
    email: "procurement@gmail.com",
    role: "procurement",
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    branchId: 1,
    name: "Tom Brown",
    email: "purchase_exicutive@gmail.com",
    role: "purchase_exicutive",
    createdAt: new Date().toISOString(),
  },
  {
    id: 6,
    branchId: 1,
    name: "Bob Martin",
    email: "back_office_exicutive@gmail.com",
    role: "back_office_exicutive",
    createdAt: new Date().toISOString(),
  },
];

const initialProducts = [
  {
    id: 1,
    name: "Industrial Motor",
    sku: "IM-001",
    category: "Motors",
    price: 25000,
    unit: "pcs",
    description: "High-performance industrial motor for heavy machinery",
    image: "",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Steel Pipes (10ft)",
    sku: "SP-010",
    category: "Raw Materials",
    price: 1500,
    unit: "pcs",
    description: "Galvanized steel pipes, 10 feet length",
    image: "",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Lubricant Oil",
    sku: "LO-005",
    category: "Consumables",
    price: 800,
    unit: "ltr",
    description: "Industrial grade lubricant oil",
    image: "",
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

const initialQueries = [
  {
    id: 1,
    customerName: "ABC Industries",
    customerEmail: "purchase@abcindustries.com",
    customerPhone: "+91 9876543220",
    subject: "Bulk Order Inquiry - Industrial Motors",
    description:
      "We are interested in purchasing 50 industrial motors for our new plant. Please share the quotation.",
    images: [],
    status: "new",
    priority: "high",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    customerName: "XYZ Manufacturing",
    customerEmail: "info@xyzmanufacturing.com",
    customerPhone: "+91 9876543221",
    subject: "Steel Pipes Requirement",
    description:
      "Need 200 steel pipes for construction project. Need delivery within 2 weeks.",
    images: [],
    status: "in_progress",
    priority: "normal",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const initialQuotations = [];

const initialPurchaseOrders = [
  {
    id: 1,
    supplierId: 1,
    supplierName: "Steel Corp India",
    items: "500 x Steel Sheets (Grade A)\n100 x Steel Rods (10mm diameter)",
    totalAmount: 750000,
    expectedDelivery: new Date(Date.now() + 14 * 86400000).toISOString(),
    shippingAddress: "Warehouse A, Mumbai Industrial Zone",
    notes: "Quality check required before acceptance",
    status: "ordered",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    supplierId: 2,
    supplierName: "Motor World Ltd",
    items: "25 x Industrial Motors (Heavy Duty)\n50 x Spare Parts Kit",
    totalAmount: 450000,
    expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString(),
    shippingAddress: "Main Factory, Pune Branch",
    notes: "Include warranty documents",
    status: "pending",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const initialSuppliers = [
  {
    id: 1,
    name: "Steel Corp India",
    email: "sales@steelcorp.in",
    phone: "+91 9876543230",
    address: "Industrial Estate, Jamshedpur, Jharkhand",
    gst: "20AABCS1234R1ZM",
    category: "Raw Materials",
    contactPerson: "Rajesh Kumar",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Motor World Ltd",
    email: "orders@motorworld.com",
    phone: "+91 9876543231",
    address: "Engineering Hub, Coimbatore, Tamil Nadu",
    gst: "33AABCM5678R1ZN",
    category: "Motors & Parts",
    contactPerson: "Suresh Menon",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Chemical Supplies Co",
    email: "info@chemicalsupplies.com",
    phone: "+91 9876543232",
    address: "MIDC, Thane, Maharashtra",
    gst: "27AABCC9012R1ZO",
    category: "Chemicals & Lubricants",
    contactPerson: "Amit Sharma",
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

const initialFollowUps = [
  {
    id: 1,
    type: "query",
    referenceId: 1,
    title: "Follow up on ABC Industries inquiry",
    description: "Call to discuss the quotation and negotiate pricing",
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    priority: "high",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    type: "quotation",
    referenceId: 1,
    title: "Check quotation status",
    description: "Verify if customer has reviewed the quotation",
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    priority: "normal",
    status: "pending",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 3,
    type: "purchase_order",
    referenceId: 1,
    title: "Track delivery status",
    description: "Confirm with Steel Corp about delivery schedule",
    dueDate: new Date().toISOString(),
    priority: "high",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];

const initialEmployees = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul.sharma@company.com",
    phone: "+91 9876543240",
    role: "hod",
    branchId: 1,
    department: "Operations",
    designation: "Head of Department",
    joiningDate: new Date("2022-01-15").toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Priya Patel",
    email: "priya.patel@company.com",
    phone: "+91 9876543241",
    role: "sales",
    branchId: 1,
    department: "Sales",
    designation: "Senior Sales Executive",
    joiningDate: new Date("2022-06-01").toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Vikram Singh",
    email: "vikram.singh@company.com",
    phone: "+91 9876543242",
    role: "purchase",
    branchId: 1,
    department: "Procurement",
    designation: "Purchase Manager",
    joiningDate: new Date("2023-02-01").toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: "Anita Desai",
    email: "anita.desai@company.com",
    phone: "+91 9876543243",
    role: "finance",
    branchId: 1,
    department: "Finance",
    designation: "Finance Officer",
    joiningDate: new Date("2022-09-15").toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    name: "Ravi Kumar",
    email: "ravi.kumar@company.com",
    phone: "+91 9876543244",
    role: "delivery",
    branchId: 2,
    department: "Logistics",
    designation: "Delivery Coordinator",
    joiningDate: new Date("2023-05-01").toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

export const DataProvider = ({ children }) => {
  const [companies, setCompanies] = useState(initialCompanies);
  const [branches, setBranches] = useState(initialBranches);
  const [branchUsers, setBranchUsers] = useState(initialBranchUsers);
  const [products, setProducts] = useState(initialProducts);
  const [queries, setQueries] = useState(initialQueries);
  const [quotations, setQuotations] = useState(initialQuotations);
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [employees, setEmployees] = useState(initialEmployees);

  // Company CRUD
  const addCompany = (company) => {
    const newCompany = {
      ...company,
      id: Math.max(...companies.map((c) => c.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setCompanies([...companies, newCompany]);
    return newCompany;
  };

  const updateCompany = (id, data) => {
    setCompanies(companies.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteCompany = (id) => {
    setCompanies(companies.filter((c) => c.id !== id));
    setBranches(branches.filter((b) => b.companyId !== id));
  };

  const getCompanyById = (id) => companies.find((c) => c.id === id);

  // Branch CRUD
  const addBranch = (branch) => {
    const newBranch = {
      ...branch,
      id: Math.max(...branches.map((b) => b.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setBranches([...branches, newBranch]);
    return newBranch;
  };

  const updateBranch = (id, data) => {
    setBranches(branches.map((b) => (b.id === id ? { ...b, ...data } : b)));
  };

  const deleteBranch = (id) => {
    setBranches(branches.filter((b) => b.id !== id));
    setBranchUsers(branchUsers.filter((u) => u.branchId !== id));
  };

  const getBranchesByCompany = (companyId) =>
    branches.filter((b) => b.companyId === companyId);

  const getBranchById = (id) => branches.find((b) => b.id === id);

  // Branch Users CRUD
  const addBranchUser = (user) => {
    const newUser = {
      ...user,
      id: Math.max(...branchUsers.map((u) => u.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setBranchUsers([...branchUsers, newUser]);
    return newUser;
  };

  const updateBranchUser = (id, data) => {
    setBranchUsers(
      branchUsers.map((u) => (u.id === id ? { ...u, ...data } : u)),
    );
  };

  const deleteBranchUser = (id) => {
    setBranchUsers(branchUsers.filter((u) => u.id !== id));
  };

  const getUsersByBranch = (branchId) =>
    branchUsers.filter((u) => u.branchId === branchId);

  // Product CRUD
  const addProduct = (product) => {
    const newProduct = {
      ...product,
      id: Math.max(...(products.map((p) => p.id) || [0]), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setProducts([...products, newProduct]);
    return newProduct;
  };

  const updateProduct = (id, data) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const deleteProduct = (id) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  // Query CRUD
  const addQuery = (query) => {
    const newQuery = {
      ...query,
      id: Math.max(...(queries.map((q) => q.id) || [0]), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setQueries([...queries, newQuery]);
    return newQuery;
  };

  const updateQuery = (id, data) => {
    setQueries(queries.map((q) => (q.id === id ? { ...q, ...data } : q)));
  };

  const deleteQuery = (id) => {
    setQueries(queries.filter((q) => q.id !== id));
  };

  // Quotation CRUD
  const addQuotation = (quotation) => {
    const newQuotation = {
      ...quotation,
      id: Math.max(...(quotations.map((q) => q.id) || [0]), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setQuotations([...quotations, newQuotation]);
    return newQuotation;
  };

  const updateQuotation = (id, data) => {
    setQuotations(quotations.map((q) => (q.id === id ? { ...q, ...data } : q)));
  };

  const deleteQuotation = (id) => {
    setQuotations(quotations.filter((q) => q.id !== id));
  };

  // Purchase Order CRUD
  const addPurchaseOrder = (order) => {
    const newOrder = {
      ...order,
      id: Math.max(...(purchaseOrders.map((o) => o.id) || [0]), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setPurchaseOrders([...purchaseOrders, newOrder]);
    return newOrder;
  };

  const updatePurchaseOrder = (id, data) => {
    setPurchaseOrders(
      purchaseOrders.map((o) => (o.id === id ? { ...o, ...data } : o)),
    );
  };

  const deletePurchaseOrder = (id) => {
    setPurchaseOrders(purchaseOrders.filter((o) => o.id !== id));
  };

  // Supplier CRUD
  const addSupplier = (supplier) => {
    const newSupplier = {
      ...supplier,
      id: Math.max(...(suppliers.map((s) => s.id) || [0]), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setSuppliers([...suppliers, newSupplier]);
    return newSupplier;
  };

  const updateSupplier = (id, data) => {
    setSuppliers(suppliers.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  const deleteSupplier = (id) => {
    setSuppliers(suppliers.filter((s) => s.id !== id));
  };

  // Follow-up CRUD
  const addFollowUp = (followUp) => {
    const newFollowUp = {
      ...followUp,
      id: Math.max(...(followUps.map((f) => f.id) || [0]), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setFollowUps([...followUps, newFollowUp]);
    return newFollowUp;
  };

  const updateFollowUp = (id, data) => {
    setFollowUps(followUps.map((f) => (f.id === id ? { ...f, ...data } : f)));
  };

  const deleteFollowUp = (id) => {
    setFollowUps(followUps.filter((f) => f.id !== id));
  };

  // Employee CRUD
  const addEmployee = (employee) => {
    const newEmployee = {
      ...employee,
      id: Math.max(...(employees.map((e) => e.id) || [0]), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    setEmployees([...employees, newEmployee]);
    return newEmployee;
  };

  const updateEmployee = (id, data) => {
    setEmployees(employees.map((e) => (e.id === id ? { ...e, ...data } : e)));
  };

  const deleteEmployee = (id) => {
    setEmployees(employees.filter((e) => e.id !== id));
  };

  const value = {
    // Companies
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    getCompanyById,
    // Branches
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    getBranchesByCompany,
    getBranchById,
    // Branch Users
    branchUsers,
    addBranchUser,
    updateBranchUser,
    deleteBranchUser,
    getUsersByBranch,
    // Products
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    // Queries
    queries,
    addQuery,
    updateQuery,
    deleteQuery,
    // Quotations
    quotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    // Purchase Orders
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    // Suppliers
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    // Follow-ups
    followUps,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    // Employees
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export default DataContext;
