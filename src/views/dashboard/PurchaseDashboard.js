import React from "react";
import { Link } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CWidgetStatsA,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CProgress,
  CButton,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilCart,
  cilFactory,
  cilClipboard,
  cilDollar,
  cilBell,
  cilFolder,
  cilArrowRight,
  cilBasket,
} from "@coreui/icons";
import { useAuth } from "../../context/AuthContext";

const PurchaseDashboard = () => {
  const { user } = useAuth();

  // Dummy data for demonstration
  const stats = {
    totalPurchases: 850000,
    pendingPOs: 15,
    activeVendors: 32,
    pendingApprovals: 7,
  };

  const purchaseOrders = [
    {
      id: "PO001",
      vendor: "Steel Suppliers Ltd",
      amount: 125000,
      status: "Approved",
      date: "2024-01-15",
    },
    {
      id: "PO002",
      vendor: "Raw Materials Inc",
      amount: 78000,
      status: "Pending",
      date: "2024-01-14",
    },
    {
      id: "PO003",
      vendor: "Component World",
      amount: 45000,
      status: "Delivered",
      date: "2024-01-13",
    },
    {
      id: "PO004",
      vendor: "Industrial Parts Co",
      amount: 92000,
      status: "In Transit",
      date: "2024-01-12",
    },
    {
      id: "PO005",
      vendor: "Machine Tools Ltd",
      amount: 156000,
      status: "Pending",
      date: "2024-01-11",
    },
  ];

  const topVendors = [
    { name: "Steel Suppliers Ltd", orders: 25, value: 1250000, rating: 4.8 },
    { name: "Raw Materials Inc", orders: 18, value: 890000, rating: 4.5 },
    { name: "Component World", orders: 15, value: 650000, rating: 4.7 },
    { name: "Industrial Parts Co", orders: 12, value: 480000, rating: 4.2 },
  ];

  const getStatusColor = (status) => {
    const colors = {
      Pending: "warning",
      Approved: "info",
      "In Transit": "primary",
      Delivered: "success",
      Cancelled: "danger",
    };
    return colors[status] || "secondary";
  };

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>Welcome, {user?.name}</h2>
          <p className="text-body-secondary">
            Purchase Dashboard - Manage procurement activities
          </p>
        </CCol>
      </CRow>

      <CRow className="mb-4">
        <CCol md={4}>
          <CCard className="h-100 border-primary border-2">
            <CCardHeader className="bg-primary text-white d-flex align-items-center">
              <CIcon icon={cilCart} className="me-2" />
              <strong>Procurement Bucket</strong>
            </CCardHeader>
            <CCardBody className="d-flex flex-column">
              <p className="text-body-secondary flex-grow-1 mb-3">
                View and manage purchase tasks, rates, and procurement
                activities.
              </p>
              <CButton
                color="primary"
                component={Link}
                to="/purchase-tasks"
                className="align-self-start"
              >
                Open <CIcon icon={cilArrowRight} className="ms-1" size="sm" />
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard className="h-100 border-info border-2">
            <CCardHeader className="bg-info text-white d-flex align-items-center">
              <CIcon icon={cilBell} className="me-2" />
              <strong>Follow up Bucket</strong>
            </CCardHeader>
            <CCardBody className="d-flex flex-column">
              <p className="text-body-secondary flex-grow-1 mb-3">
                Track and manage follow-ups on queries, quotations, and
                orders.
              </p>
              <CButton
                color="info"
                component={Link}
                to="/follow-up"
                className="align-self-start"
              >
                Open <CIcon icon={cilArrowRight} className="ms-1" size="sm" />
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard className="h-100 border-success border-2">
            <CCardHeader className="bg-success text-white d-flex align-items-center">
              <CIcon icon={cilFolder} className="me-2" />
              <strong>DMG Bucket</strong>
            </CCardHeader>
            <CCardBody className="d-flex flex-column">
              <p className="text-body-secondary flex-grow-1 mb-3">
                DMG-related items and direct material group activities.
              </p>
              <CButton
                color="success"
                component={Link}
                to="/dmg"
                className="align-self-start"
              >
                Open <CIcon icon={cilArrowRight} className="ms-1" size="sm" />
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="mb-4">
        <CCol md={4}>
          <CCard className="h-100 border-primary border-2">
            <CCardHeader className="bg-primary text-white d-flex align-items-center">
              <CIcon icon={cilBasket} className="me-2" />
              <strong>Pro Bucket</strong>
            </CCardHeader>
            <CCardBody className="d-flex flex-column">
              <p className="text-body-secondary flex-grow-1 mb-3">
                Query line items for your product groups: rates, status, and
                fulfillment.
              </p>
              <CButton
                color="primary"
                component={Link}
                to="/pro-bucket"
                className="align-self-start"
              >
                Open <CIcon icon={cilArrowRight} className="ms-1" size="sm" />
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={`₹${(stats.totalPurchases / 100000).toFixed(1)}L`}
            title="Total Purchases"
            chart={
              <CIcon
                icon={cilDollar}
                height={52}
                className="my-4 text-white opacity-25"
              />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={stats.pendingPOs.toString()}
            title="Pending Sales Orders"
            chart={
              <CIcon
                icon={cilCart}
                height={52}
                className="my-4 text-white opacity-25"
              />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={stats.activeVendors.toString()}
            title="Active Vendors"
            chart={
              <CIcon
                icon={cilFactory}
                height={52}
                className="my-4 text-white opacity-25"
              />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="danger"
            value={stats.pendingApprovals.toString()}
            title="Pending Approvals"
            chart={
              <CIcon
                icon={cilClipboard}
                height={52}
                className="my-4 text-white opacity-25"
              />
            }
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol lg={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recent Sales Orders</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Sales Order Number</CTableHeaderCell>
                    <CTableHeaderCell>Vendor</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {purchaseOrders.map((po) => (
                    <CTableRow key={po.id}>
                      <CTableDataCell>{po.id}</CTableDataCell>
                      <CTableDataCell>{po.vendor}</CTableDataCell>
                      <CTableDataCell>
                        ₹{po.amount.toLocaleString()}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(po.status)}>
                          {po.status}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{po.date}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Top Vendors</strong>
            </CCardHeader>
            <CCardBody>
              {topVendors.map((vendor, index) => (
                <div key={index} className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">{vendor.name}</span>
                    <CBadge color="success">{vendor.rating}</CBadge>
                  </div>
                  <div className="small text-body-secondary mb-1">
                    {vendor.orders} orders • ₹
                    {(vendor.value / 100000).toFixed(1)}L
                  </div>
                  <CProgress
                    value={(vendor.value / topVendors[0].value) * 100}
                    color="info"
                    className="mb-1"
                  />
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Purchase Summary</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-primary py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">
                      This Month
                    </div>
                    <div className="fs-5 fw-semibold">₹8.5L</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">
                      Cost Savings
                    </div>
                    <div className="fs-5 fw-semibold">₹1.2L (12%)</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">
                      Pending Deliveries
                    </div>
                    <div className="fs-5 fw-semibold">8 Orders</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-info py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">
                      Avg Lead Time
                    </div>
                    <div className="fs-5 fw-semibold">5 Days</div>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default PurchaseDashboard;
