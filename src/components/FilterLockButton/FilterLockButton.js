import React from "react";
import { CButton } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilLockLocked, cilLockUnlocked } from "@coreui/icons";

const FilterLockButton = ({
  filtersLocked,
  onToggle,
  pageLabel = "this page",
  className = "mb-0",
}) => (
  <CButton
    type="button"
    color={filtersLocked ? "warning" : "secondary"}
    variant="outline"
    className={className}
    title={
      filtersLocked
        ? `Unlock filters (values will not persist when you leave ${pageLabel})`
        : `Lock filters (values stay when you return to ${pageLabel})`
    }
    onClick={onToggle}
  >
    <CIcon icon={filtersLocked ? cilLockLocked : cilLockUnlocked} />
  </CButton>
);

export default FilterLockButton;
