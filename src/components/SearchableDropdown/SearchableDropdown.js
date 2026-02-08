import React, { useState, useRef, useEffect } from 'react'
import { CFormInput, CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChevronBottom } from '@coreui/icons'
import './SearchableDropdown.scss'

const DEFAULT_MAX_DISPLAY = 5

const SearchableDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  maxDisplayCount = DEFAULT_MAX_DISPLAY,
  getOptionLabel = (opt) => (opt?.name != null ? opt.name : opt?.label ?? String(opt?.value ?? '')),
  getOptionValue = (opt) => opt?._id ?? opt?.id ?? opt?.value,
  disabled = false,
  label,
}) => {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef(null)

  const normalizedOptions = Array.isArray(options) ? options : []
  const searchLower = (searchQuery || '').trim().toLowerCase()
  const filtered = searchLower
    ? normalizedOptions.filter((opt) =>
        getOptionLabel(opt).toLowerCase().includes(searchLower),
      )
    : normalizedOptions
  const displayOptions = filtered.slice(0, maxDisplayCount)

  const selectedOption = normalizedOptions.find(
    (opt) => getOptionValue(opt) === value || getOptionValue(opt) === value?._id,
  )
  const displayValue = selectedOption ? getOptionLabel(selectedOption) : ''

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelect = (opt) => {
    onChange(opt ? getOptionValue(opt) : '')
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e) => {
    e?.stopPropagation()
    handleSelect(null)
  }

  return (
    <div className="searchable-dropdown position-relative">
      {label && <label className="form-label small text-body-secondary mb-1">{label}</label>}
      <CDropdown
        variant="input-group"
        placement="bottom-end"
        visible={open}
        onHide={() => setOpen(false)}
        onShow={() => setOpen(true)}
        portal={true}
      >
        <CDropdownToggle
          caret={false}
          className="d-flex align-items-center justify-content-between text-start bg-white border"
          style={{ minHeight: '38px' }}
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          <span className={displayValue ? 'text-dark' : 'text-muted'}>
            {displayValue || placeholder}
          </span>
          <CIcon icon={cilChevronBottom} className="ms-2 opacity-75" />
        </CDropdownToggle>
        <CDropdownMenu
          className="p-0 searchable-dropdown-menu"
          style={{ minWidth: '220px', zIndex: 1060 }}
        >
          <div className="p-2 border-bottom bg-white">
            <CFormInput
              ref={inputRef}
              size="sm"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="searchable-dropdown-options bg-white" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {displayOptions.length === 0 && (
              <div className="px-3 py-2 text-muted small">No matches</div>
            )}
            {displayOptions.map((opt) => {
              const optValue = getOptionValue(opt)
              const optLabel = getOptionLabel(opt)
              const isSelected = optValue === value || optValue === value?._id
              return (
                <CDropdownItem
                  key={optValue}
                  component="button"
                  type="button"
                  className="text-start"
                  active={!!isSelected}
                  onClick={() => handleSelect(opt)}
                >
                  {optLabel}
                </CDropdownItem>
              )
            })}
          </div>
          {value && (
            <div className="p-2 border-top">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
          )}
        </CDropdownMenu>
      </CDropdown>
    </div>
  )
}

export default SearchableDropdown
