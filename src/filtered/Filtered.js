import React from 'react'
import { CFormInput, CRow, CCol, CInputGroup, CInputGroupText } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch } from '@coreui/icons'

const Filtered = ({ searchTerm, setSearchTerm }) => {
  return (
    <CRow className="mb-3">
      <CCol md={6}>
        <CInputGroup>
          <CInputGroupText>
            <CIcon icon={cilSearch} />
          </CInputGroupText>
          <CFormInput
            type="text"
            placeholder="Search ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CInputGroup>
      </CCol>
    </CRow>
  )
}

export default Filtered
