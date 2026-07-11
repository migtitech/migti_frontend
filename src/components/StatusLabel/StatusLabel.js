import React from "react";
import { getStatusLabel, isActiveStatus } from "../../constants/colorTheme";
import "./StatusLabel.scss";

const StatusLabel = ({ status, className = "" }) => {
  const isActive = isActiveStatus(status);

  return (
    <span
      className={`status-label ${
        isActive ? "status-label--active" : "status-label--inactive"
      } ${className}`.trim()}
    >
      {getStatusLabel(status)}
    </span>
  );
};

export default StatusLabel;
