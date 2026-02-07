import '@coreui/coreui/dist/css/coreui.min.css'
import {
    CCard,
    CCardBody,
    CCardHeader,
    CRow,
    CCol,
    CListGroup,
    CListGroupItem,
    CContainer,
    CBadge,
    CTable,
    CTableRow,
    CTableHeaderCell,
    CTableHead,
    CTableBody,
    CButton,
} from '@coreui/react'

const Queryui = () => {
    return (
        <CContainer className="mt-4">
            <CCard className="border">

                <CCardHeader className="fw-bold fs-5 text-center">
                    Query Details
                </CCardHeader>

                <CCardBody>

                    <CRow className="mb-3 bg-secondary text-white p-2 rounded text-center">
                        <CCol md={4} className="fw-bold">
                            GSTIN: 09AARCM4143L1ZW
                        </CCol>
                        <CCol md={8} className="fw-bold text-center">
                            MIGTI INDUSTRIAL Pvt Ltd
                        </CCol>
                    </CRow>

                    <CRow className="mb-4 text-center">
                        <CCol>
                            <div><strong>Address - 3rd floor , M.S. - 1-B -304</strong></div>
                            <div><strong>New Siyaganj, indore -452003</strong></div>
                            <div><strong>Mobile No-7898611052, 9971117391</strong></div>
                            <div>Email-migtiindore@gmail.com</div>
                        </CCol>
                    </CRow>

                    <CRow>
                        <CCol >
                            <CListGroup className="mb-3">
                                <CListGroupItem>
                                    <CRow>
                                        <CCol md={4} className="fw-bold">
                                            Company Name
                                        </CCol>
                                        <CCol md={8}>
                                            ABC Pvt Ltd
                                        </CCol>
                                    </CRow>
                                </CListGroupItem>
                                <CListGroupItem>
                                    <CRow>
                                        <CCol md={4} className="fw-bold">
                                            Address
                                        </CCol>
                                        <CCol md={8}>
                                            Indore, MP
                                        </CCol>
                                    </CRow>
                                </CListGroupItem>
                                <CListGroupItem>
                                    <CRow>
                                        <CCol md={4} className="fw-bold">
                                            GSTIN
                                        </CCol>
                                        <CCol md={8}>
                                            22AAAAA0000A1Z5
                                        </CCol>
                                    </CRow>
                                </CListGroupItem>
                                <CListGroupItem>
                                    <CRow>
                                        <CCol md={4} className="fw-bold">
                                            Query Owner
                                        </CCol>
                                        <CCol md={8}>
                                            Anuradha
                                        </CCol>
                                    </CRow>
                                </CListGroupItem>

                                <CListGroupItem>
                                    <CRow>
                                        <CCol md={4} className="fw-bold">
                                            Mobile No
                                        </CCol>
                                        <CCol md={8}>
                                            9876543210
                                        </CCol>
                                    </CRow>
                                </CListGroupItem>

                                <CListGroupItem>
                                    <CRow>
                                        <CCol md={4} className="fw-bold">
                                            Query Date
                                        </CCol>
                                        <CCol md={8}>
                                            06 Feb 2026
                                        </CCol>
                                    </CRow>
                                </CListGroupItem>

                                <CListGroupItem>
                                    <CRow>
                                        <CCol md={4} className="fw-bold">
                                            Query Reference By
                                        </CCol>
                                        <CCol md={8}>
                                            Website
                                        </CCol>

                                    </CRow>
                                </CListGroupItem>

                            </CListGroup>
                        </CCol>

                        <CCol md={4}>
                            <CListGroup>
                                <CListGroupItem><strong>Query No:</strong> QRY-00125</CListGroupItem>
                                <CListGroupItem><strong>Quotation No:</strong> QT-0098</CListGroupItem>
                                <CListGroupItem>
                                    <strong>Final Status:</strong>{' '}
                                    <CBadge color="success">Approved</CBadge>
                                </CListGroupItem>
                            </CListGroup>
                        </CCol>
                    </CRow>
                    <CRow className='mb-3 bg-secondary text-white p-2 rounded text-center'>
                        <CCol className="fw-bold">
                            QUERY DETAILS
                        </CCol>
                    </CRow>
                    <CRow>
                        <CTable bordered responsive hover>
                            <CTableHead color="light">
                                <CTableRow className="text-center align-middle">
                                    <CTableHeaderCell>S No</CTableHeaderCell>
                                    <CTableHeaderCell>Item Name</CTableHeaderCell>
                                    <CTableHeaderCell>Material Description</CTableHeaderCell>
                                    <CTableHeaderCell>Image</CTableHeaderCell>
                                    <CTableHeaderCell>Unit</CTableHeaderCell>
                                    <CTableHeaderCell>Req. Qty.</CTableHeaderCell>
                                    <CTableHeaderCell>Expected Time</CTableHeaderCell>
                                    <CTableHeaderCell>Client Target Price</CTableHeaderCell>
                                </CTableRow>
                            </CTableHead>
                            <CTableBody>
                                <CTableRow className="text-center align-middle">
                                    <CTableHeaderCell>1</CTableHeaderCell>
                                    <CTableHeaderCell>Item A</CTableHeaderCell>
                                    <CTableHeaderCell>Description of Item A</CTableHeaderCell>
                                    <CTableHeaderCell>
                                        <img
                                            src="https://via.placeholder.com/100"
                                            alt="Item A"
                                            style={{ width: '100px', height: '100px' }}
                                        />
                                    </CTableHeaderCell>
                                    <CTableHeaderCell>pcs</CTableHeaderCell>
                                    <CTableHeaderCell>100</CTableHeaderCell>
                                    <CTableHeaderCell>2 weeks</CTableHeaderCell>
                                    <CTableHeaderCell>$500</CTableHeaderCell>
                                </CTableRow>
                                <CTableRow className="text-center align-middle">
                                    <CTableHeaderCell>2</CTableHeaderCell>
                                    <CTableHeaderCell>Item B</CTableHeaderCell>
                                    <CTableHeaderCell>Description of Item B</CTableHeaderCell>
                                    <CTableHeaderCell>
                                        <img
                                            src="https://via.placeholder.com/100"
                                            alt="Item B"
                                            style={{ width: '100px', height: '100px' }}
                                        />
                                    </CTableHeaderCell>
                                    <CTableHeaderCell>kg</CTableHeaderCell>
                                    <CTableHeaderCell>50</CTableHeaderCell>
                                    <CTableHeaderCell>1 month</CTableHeaderCell>
                                    <CTableHeaderCell>$2000</CTableHeaderCell>
                                </CTableRow>
                                <CTableRow className="text-center align-middle">
                                    <CTableHeaderCell>3</CTableHeaderCell>
                                    <CTableHeaderCell>Item C</CTableHeaderCell>
                                    <CTableHeaderCell>Description of Item C</CTableHeaderCell>  
                                    <CTableHeaderCell>
                                        <img
                                            src="https://via.placeholder.com/100"
                                            alt="Item C"
                                            style={{ width: '100px', height: '100px' }}
                                        />
                                    </CTableHeaderCell>
                                    <CTableHeaderCell>liters</CTableHeaderCell>
                                    <CTableHeaderCell>200</CTableHeaderCell>
                                    <CTableHeaderCell>3 weeks</CTableHeaderCell>
                                    <CTableHeaderCell>$1500</CTableHeaderCell>
                                </CTableRow>
                            </CTableBody>
                        </CTable>
                    </CRow>
                    <CRow>
                        <CCol>Terms $ Condition</CCol>
                    </CRow>
                    <CRow className="text-center g-0">


                        <CCol className="border-end">
                            <div className="fw-bold mb-4">DRAFT BY</div>
                            {/* <div className="text-muted"></div> */}
                        </CCol>

                        <CCol className="border-end">
                            <div className="fw-bold mb-4">CHECK BY</div>
                            {/* <div className="text-muted"></div> */}
                        </CCol>

                        <CCol className="border-end">
                            <div className="fw-bold mb-4">APPROVE BY</div>
                            {/* <div className="text-muted"></div> */}
                        </CCol>

                        <CCol >
                            <div className="fw-bold mb-4">
                                FOR MIGTI INDUSTRIAL PVT LTD
                            </div>
                            {/* <div className="text-muted"></div> */}
                        </CCol>

                    </CRow>

                </CCardBody>
            </CCard>
        </CContainer>
    )
}

export default Queryui
