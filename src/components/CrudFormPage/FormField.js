import React from "react";
import PropTypes from "prop-types";
import { Label } from "../ui";

/**
 * Labeled form field wrapper. Same API as before (label/required/helper/
 * error/children/htmlFor) so every form using it keeps working — only the
 * presentation moved to the shadcn design system.
 */
const FormField = ({ label, required, helper, error, children, htmlFor }) => (
  <div className="space-y-2">
    {label && (
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-[0.8125rem] font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
    )}
    {children}
    {error ? (
      <p className="text-xs text-destructive" role="alert">
        {error}
      </p>
    ) : helper ? (
      <p className="text-xs text-muted-foreground">{helper}</p>
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
