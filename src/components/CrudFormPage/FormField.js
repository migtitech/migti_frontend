import React from "react";
import PropTypes from "prop-types";
import { CFormLabel } from "@coreui/react";

const FormField = ({ label, required, helper, error, children, htmlFor }) => (
  <div className="crud-form-field">
    {label && (
      <CFormLabel className="crud-form-field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </CFormLabel>
    )}
    {children}
    {error ? (
      <div className="crud-form-field__error" role="alert">
        {error}
      </div>
    ) : helper ? (
      <div className="crud-form-field__helper">{helper}</div>
    ) : null}
  </div>
);

FormField.propTypes = {
  label: PropTypes.string,
  required: PropTypes.bool,
  helper: PropTypes.string,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
  htmlFor: PropTypes.string,
};

export default FormField;
