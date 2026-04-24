import React from "react";
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
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilTruck,
  cilLocationPin,
  cilClock,
  cilCheckCircle,
} from "@coreui/icons";
import { useAuth } from "../../context/AuthContext";

const DeliveryDashboard = () => {
  const { user } = useAuth();

  // Dummy data for demonstration
  const stats = {
    totalDeliveries: 245,
    pendingDeliveries: 18,
    inTransit: 12,
    completedToday: 8,
  };

  const deliveries = [
    {
      id: "DEL001",
      order: "ORD001",
      customer: "ABC Corp",
      destination: "Mumbai",
      status: "In Transit",
      eta: "2 hrs",
    },
    {
      id: "DEL002",
      order: "ORD002",
      customer: "XYZ Ltd",
      destination: "Pune",
      status: "Pending",
      eta: "4 hrs",
    },
    {
      id: "DEL003",
      order: "ORD003",
      customer: "PQR Industries",
      destination: "Delhi",
      status: "Delivered",
      eta: "-",
    },
    {
      id: "DEL004",
      order: "ORD004",
      customer: "LMN Enterprises",
      destination: "Bangalore",
      status: "In Transit",
      eta: "6 hrs",
    },
    {
      id: "DEL005",
      order: "ORD005",
      customer: "RST Solutions",
      destination: "Chennai",
      status: "Pending",
      eta: "8 hrs",
    },
  ];

  const deliveryAgents = [
    { name: "Rajesh Kumar", deliveries: 8, status: "Active", rating: 4.8 },
    { name: "Suresh Patel", deliveries: 6, status: "Active", rating: 4.6 },
    { name: "Amit Singh", deliveries: 5, status: "On Break", rating: 4.7 },
    { name: "Vijay Sharma", deliveries: 7, status: "Active", rating: 4.5 },
  ];

  const getStatusColor = (status) => {
    const colors = {
      Pending: "warning",
      "In Transit": "info",
      Delivered: "success",
      Cancelled: "danger",
      Delayed: "danger",
    };
    return colors[status] || "secondary";
  };

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>Welcome, {user?.name}</h2>
          <p className="text-body-secondary">
            Delivery Dashboard - Track and manage deliveries
          </p>
        </CCol>
      </CRow>

      <CRow>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={stats.totalDeliveries.toString()}
            title="Total Deliveries"
            chart={
              <CIcon
                icon={cilTruck}
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
            value={stats.pendingDeliveries.toString()}
            title="Pending"
            chart={
              <CIcon
                icon={cilClock}
                height={52}
                className="my-4 text-white opacity-25"
              />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={stats.inTransit.toString()}
            title="In Transit"
            chart={
              <CIcon
                icon={cilLocationPin}
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
            value={stats.completedToday.toString()}
            title="Completed Today"
            chart={
              <CIcon
                icon={cilCheckCircle}
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
              <strong>Active Deliveries</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Delivery ID</CTableHeaderCell>
                    <CTableHeaderCell>Customer</CTableHeaderCell>
                    <CTableHeaderCell>Destination</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>ETA</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {deliveries.map((delivery) => (
                    <CTableRow key={delivery.id}>
                      <CTableDataCell>{delivery.id}</CTableDataCell>
                      <CTableDataCell>{delivery.customer}</CTableDataCell>
                      <CTableDataCell>{delivery.destination}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(delivery.status)}>
                          {delivery.status}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{delivery.eta}</CTableDataCell>
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
              <strong>Delivery Agents</strong>
            </CCardHeader>
            <CCardBody>
              {deliveryAgents.map((agent, index) => (
                <div
                  key={index}
                  className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom"
                >
                  <div>
                    <div className="fw-semibold">{agent.name}</div>
                    <div className="small text-body-secondary">
                      {agent.deliveries} deliveries today
                    </div>
                  </div>
                  <div className="text-end">
                    <CBadge
                      color={
                        agent.status === "Active" ? "success" : "secondary"
                      }
                      className="mb-1"
                    >
                      {agent.status}
                    </CBadge>
                    <div className="small text-warning">★ {agent.rating}</div>
                  </div>
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
              <strong>Delivery Performance</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={6}>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>On-Time Delivery Rate</span>
                      <span className="text-success">94%</span>
                    </div>
                    <CProgress value={94} color="success" />
                  </div>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Customer Satisfaction</span>
                      <span>4.7/5</span>
                    </div>
                    <CProgress value={94} color="info" />
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Route Efficiency</span>
                      <span>87%</span>
                    </div>
                    <CProgress value={87} color="warning" />
                  </div>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Vehicle Utilization</span>
                      <span>78%</span>
                    </div>
                    <CProgress value={78} color="primary" />
                  </div>
                </CCol>
              </CRow>
              <CRow className="mt-3">
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-success py-1 px-3">
                    <div className="text-body-secondary small">
                      Avg Delivery Time
                    </div>
                    <div className="fs-5 fw-semibold">2.5 hrs</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-info py-1 px-3">
                    <div className="text-body-secondary small">
                      Active Vehicles
                    </div>
                    <div className="fs-5 fw-semibold">12</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-warning py-1 px-3">
                    <div className="text-body-secondary small">Delayed</div>
                    <div className="fs-5 fw-semibold">3</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-primary py-1 px-3">
                    <div className="text-body-secondary small">
                      Total KM Today
                    </div>
                    <div className="fs-5 fw-semibold">1,250 km</div>
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

export default DeliveryDashboard;
