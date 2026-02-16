import { cilCloudDownload, cilPencil, cilPlus, cilTrash, cilZoom } from "@coreui/icons"
import CIcon from "@coreui/icons-react"
import {
    CButton,
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
    CTableRow
} from "@coreui/react"
import { useNavigate } from "react-router-dom"
import { useData } from '../../context/DataContext'
import Filtered from '../../filtered/Filtered'
import { useState } from "react"

const GroupList = () => {

    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const { initialGroups } = useData()
    console.log("groups", initialGroups)

    return (
        <>
            <CRow>
                <CCol>

                    <CCard>
                        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <strong>Groups</strong>
                            <CButton color="primary" onClick={() => navigate('/groups/new')}>
                                <CIcon icon={cilPlus} className="me-2" />
                                Add Group
                            </CButton>
                        </CCardHeader>

                        <CCardBody>
                            <CCol xs={12} md={5} lg={6}>
                                <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                            </CCol>
                            <CTable hover responsive>
                                <CTableHead>
                                    <CTableRow>
                                        <CTableHeaderCell scope="col">S No</CTableHeaderCell>
                                        <CTableHeaderCell scope="col">Group Name</CTableHeaderCell>
                                        <CTableHeaderCell scope="col">Sku</CTableHeaderCell>
                                        <CTableHeaderCell scope="col">Description</CTableHeaderCell>
                                        <CTableHeaderCell scope="col">Actions</CTableHeaderCell>
                                    </CTableRow>
                                </CTableHead>
                                <CTableBody>
                                    {initialGroups?.map((group, index) => (
                                        <CTableRow key={group.id}
                                        onClick={()=> navigate(`/groups/view/${group.id}`)}
                                        style={{cursor: 'pointer'}}>
                                            <CTableDataCell>{index + 1}</CTableDataCell>
                                            <CTableDataCell>{group.groupname}</CTableDataCell>
                                            <CTableDataCell>{group.sku}</CTableDataCell>
                                            <CTableDataCell>{group.description}</CTableDataCell>
                                            <CTableDataCell>
                                                <CButton
                                                    color="info"
                                                    variant="ghost"
                                                    size="sm"
                                                    title="View"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/groups/view/${group.id}`)
                                                    }}
                                                >
                                                    <CIcon icon={cilZoom} />
                                                </CButton>

                                                <CButton
                                                    color="success"
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Download"
                                                >
                                                    <CIcon icon={cilCloudDownload} />
                                                </CButton>

                                                <CButton
                                                    color="warning"
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/groups/edit/${group.id}`)
                                                    }}
                                                >
                                                    <CIcon icon={cilPencil} />
                                                </CButton>

                                                <CButton
                                                    color="danger"
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteClick(group.id)
                                                    }}
                                                >
                                                    <CIcon icon={cilTrash} />
                                                </CButton>
                                            </CTableDataCell>
                                        </CTableRow>
                                    ))}
                                </CTableBody>
                            </CTable>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </>
    )
}

export default GroupList