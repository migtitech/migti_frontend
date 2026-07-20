import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui";
import { cn } from "../../lib/utils";

/**
 * History-aware back button. Goes to the exact previous page when the app
 * has navigation history; otherwise falls back to the section's list page
 * (the `fallback` route). Renders nothing special beyond a ghost button so
 * it can sit inside PageHeader / CrudFormPage or any toolbar.
 *
 * @param {string} [fallback="/"] - Route to use when there is no in-app history
 * @param {string} [label="Back"] - Button label
 */
const BackButton = ({
  fallback = "/",
  label = "Back",
  className,
  ...props
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleBack}
      className={cn("gap-1.5", className)}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
};

BackButton.propTypes = {
  fallback: PropTypes.string,
  label: PropTypes.string,
  className: PropTypes.string,
};

export default BackButton;
