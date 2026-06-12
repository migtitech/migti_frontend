import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
  CWidgetStatsF,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilBell,
  cilCalendar,
  cilCheck,
  cilClock,
  cilWarning,
  cilPlus,
  cilPencil,
} from "@coreui/icons";
import { useData } from "../../context/DataContext";

const FollowUpDashboard = () => {
  const navigate = useNavigate();
  const {
    followUps,
    addFollowUp,
    updateFollowUp,
    queries,
    quotations,
    purchaseOrders,
  } = useData();
  const [activeTab, setActiveTab] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [formData, setFormData] = useState({
    type: "query",
    referenceId: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "normal",
    status: "pending",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter follow-ups
  const pendingFollowUps =
    followUps?.filter((f) => f.status === "pending") || [];
  const overdueFollowUps =
    followUps?.filter((f) => {
      const dueDate = new Date(f.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return f.status === "pending" && dueDate < today;
    }) || [];
  const todayFollowUps =
    followUps?.filter((f) => {
      const dueDate = new Date(f.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return f.status === "pending" && dueDate.getTime() === today.getTime();
    }) || [];
  const completedFollowUps =
    followUps?.filter((f) => f.status === "completed") || [];

  const handleOpenModal = (followUp = null) => {
    if (followUp) {
      setEditingFollowUp(followUp);
      setFormData({
        type: followUp.type || "query",
        referenceId: followUp.referenceId || "",
        title: followUp.title || "",
        description: followUp.description || "",
        dueDate: followUp.dueDate ? followUp.dueDate.split("T")[0] : "",
        priority: followUp.priority || "normal",
        status: followUp.status || "pending",
      });
    } else {
      setEditingFollowUp(null);
      setFormData({
        type: "query",
        referenceId: "",
        title: "",
        description: "",
        dueDate: "",
        priority: "normal",
        status: "pending",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFollowUp(null);
    setFormData({
      type: "query",
      referenceId: "",
      title: "",
      description: "",
      dueDate: "",
      priority: "normal",
      status: "pending",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      referenceId: formData.referenceId ? parseInt(formData.referenceId) : null,
      dueDate: formData.dueDate
        ? new Date(formData.dueDate).toISOString()
        : null,
    };
    if (editingFollowUp) {
      updateFollowUp(editingFollowUp.id, data);
    } else {
      addFollowUp(data);
    }
    handleCloseModal();
  };

  const markAsComplete = (id) => {
    updateFollowUp(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <CBadge color="danger">High</CBadge>;
      case "normal":
        return <CBadge color="secondary">Normal</CBadge>;
      case "low":
        return <CBadge color="info">Low</CBadge>;
      default:
        return <CBadge color="secondary">{priority}</CBadge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <CBadge color="warning">Pending</CBadge>;
      case "completed":
        return <CBadge color="success">Completed</CBadge>;
      default:
        return <CBadge color="secondary">{status}</CBadge>;
    }
  };

  const getReferenceOptions = () => {
    switch (formData.type) {
      case "query":
        return (
          queries?.map((q) => ({ id: q.id, label: `Query: ${q.subject}` })) ||
          []
        );
      case "quotation":
        return (
          quotations?.map((q) => ({
            id: q.id,
            label: `QT-${String(q.id).padStart(4, "0")}: ${q.customerName}`,
          })) || []
        );
      case "purchase_order":
        return (
          purchaseOrders?.map((o) => ({
            id: o.id,
            label: `Sales Order-${String(o.id).padStart(4, "0")}: ${o.supplierName}`,
          })) || []
        );
      default:
        return [];
    }
  };

  const renderFollowUpTable = (items) => (
    <CTable hover responsive bordered>
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell>Title</CTableHeaderCell>
          <CTableHeaderCell>Type</CTableHeaderCell>
          <CTableHeaderCell>Due Date</CTableHeaderCell>
          <CTableHeaderCell>Priority</CTableHeaderCell>
          <CTableHeaderCell>Status</CTableHeaderCell>
          <CTableHeaderCell>Actions</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {items.map((followUp) => {
          const dueDate = new Date(followUp.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const isOverdue = followUp.status === "pending" && dueDate < today;
          return (
            <CTableRow
              key={followUp.id}
              className={isOverdue ? "table-danger" : ""}
            >
              <CTableDataCell>
                <strong>{followUp.title}</strong>
                {followUp.description && (
                  <>
                    <br />
                    <small className="text-muted">
                      {followUp.description.substring(0, 50)}...
                    </small>
                  </>
                )}
              </CTableDataCell>
              <CTableDataCell>
                <CBadge color="info">{followUp.type?.replace("_", " ")}</CBadge>
              </CTableDataCell>
              <CTableDataCell>
                {followUp.dueDate ? (
                  <>
                    {new Date(followUp.dueDate).toLocaleDateString()}
                    {isOverdue && (
                      <CBadge color="danger" className="ms-2">
                        Overdue
                      </CBadge>
                    )}
                  </>
                ) : (
                  "-"
                )}
              </CTableDataCell>
              <CTableDataCell>
                {getPriorityBadge(followUp.priority)}
              </CTableDataCell>
              <CTableDataCell>{getStatusBadge(followUp.status)}</CTableDataCell>
              <CTableDataCell>
                {followUp.status === "pending" && (
                  <CButton
                    color="success"
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsComplete(followUp.id)}
                    title="Mark Complete"
                  >
                    <CIcon icon={cilCheck} />
                  </CButton>
                )}
                <CButton
                  color="warning"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(followUp)}
                  title="Edit"
                >
                  <CIcon icon={cilPencil} />
                </CButton>
              </CTableDataCell>
            </CTableRow>
          );
        })}
        {items.length === 0 && (
          <CTableRow>
            <CTableDataCell colSpan={6} className="text-center">
              No follow-ups found
            </CTableDataCell>
          </CTableRow>
        )}
      </CTableBody>
    </CTable>
  );

  return (
    <>
      <CRow className="mb-4">
        <CCol className="d-flex justify-content-between align-items-center">
          <div>
            <h4>Follow-up Dashboard</h4>
            <p className="text-muted mb-0">Track and manage your follow-ups</p>
          </div>
          <CButton color="primary" onClick={() => handleOpenModal()}>
            <CIcon icon={cilPlus} className="me-2" />
            Add Follow-up
          </CButton>
        </CCol>
      </CRow>

      {/* Stats Cards */}
      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="danger"
            icon={<CIcon icon={cilWarning} height={24} />}
            title="Overdue"
            value={overdueFollowUps.length}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="warning"
            icon={<CIcon icon={cilCalendar} height={24} />}
            title="Due Today"
            value={todayFollowUps.length}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="info"
            icon={<CIcon icon={cilClock} height={24} />}
            title="Pending"
            value={pendingFollowUps.length}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="success"
            icon={<CIcon icon={cilCheck} height={24} />}
            title="Completed"
            value={completedFollowUps.length}
          />
        </CCol>
      </CRow>

      {/* Tabs */}
      <CCard>
        <CCardHeader>
          <CNav variant="tabs" role="tablist">
            <CNavItem>
              <CNavLink
                active={activeTab === 1}
                onClick={() => setActiveTab(1)}
                style={{ cursor: "pointer" }}
              >
                <CIcon icon={cilWarning} className="me-2" />
                Overdue ({overdueFollowUps.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 2}
                onClick={() => setActiveTab(2)}
                style={{ cursor: "pointer" }}
              >
                <CIcon icon={cilCalendar} className="me-2" />
                Today ({todayFollowUps.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 3}
                onClick={() => setActiveTab(3)}
                style={{ cursor: "pointer" }}
              >
                <CIcon icon={cilClock} className="me-2" />
                All Pending ({pendingFollowUps.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 4}
                onClick={() => setActiveTab(4)}
                style={{ cursor: "pointer" }}
              >
                <CIcon icon={cilCheck} className="me-2" />
                Completed ({completedFollowUps.length})
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>
        <CCardBody>
          <CTabContent>
            <CTabPane visible={activeTab === 1}>
              {renderFollowUpTable(overdueFollowUps)}
            </CTabPane>
            <CTabPane visible={activeTab === 2}>
              {renderFollowUpTable(todayFollowUps)}
            </CTabPane>
            <CTabPane visible={activeTab === 3}>
              {renderFollowUpTable(pendingFollowUps)}
            </CTabPane>
            <CTabPane visible={activeTab === 4}>
              {renderFollowUpTable(completedFollowUps)}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* Add/Edit Modal */}
      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>
            {editingFollowUp ? "Edit Follow-up" : "Add New Follow-up"}
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="title">Title *</CFormLabel>
                  <CFormInput
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="dueDate">Due Date *</CFormLabel>
                  <CFormInput
                    type="date"
                    id="dueDate"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    required
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={4}>
                <div className="mb-3">
                  <CFormLabel htmlFor="type">Type</CFormLabel>
                  <CFormSelect
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        referenceId: "",
                      })
                    }
                  >
                    <option value="query">Query</option>
                    <option value="quotation">Quotation</option>
                    <option value="purchase_order">Sales Order</option>
                    <option value="general">General</option>
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={4}>
                <div className="mb-3">
                  <CFormLabel htmlFor="referenceId">Reference</CFormLabel>
                  <CFormSelect
                    id="referenceId"
                    value={formData.referenceId}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceId: e.target.value })
                    }
                    disabled={formData.type === "general"}
                  >
                    <option value="">Select Reference (Optional)</option>
                    {getReferenceOptions().map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={4}>
                <div className="mb-3">
                  <CFormLabel htmlFor="priority">Priority</CFormLabel>
                  <CFormSelect
                    id="priority"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>
            {editingFollowUp && (
              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="status">Status</CFormLabel>
                    <CFormSelect
                      id="status"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </CFormSelect>
                  </div>
                </CCol>
              </CRow>
            )}
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel htmlFor="description">Description</CFormLabel>
                  <CFormTextarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit">
              {editingFollowUp ? "Update" : "Create"}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  );
};

export default FollowUpDashboard;
