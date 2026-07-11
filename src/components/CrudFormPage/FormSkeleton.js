import React from "react";

const FormSkeleton = () => (
  <div
    className="crud-form-skeleton"
    aria-busy="true"
    aria-label="Loading form"
  >
    <div>
      <div className="crud-form-skeleton__section-title" />
      <div className="crud-form-skeleton__grid">
        {[0, 1].map((index) => (
          <div className="crud-form-skeleton__field" key={index}>
            <div className="crud-form-skeleton__label" />
            <div className="crud-form-skeleton__line" />
          </div>
        ))}
      </div>
    </div>
    <div>
      <div className="crud-form-skeleton__section-title" />
      <div className="crud-form-skeleton__grid">
        <div className="crud-form-skeleton__field">
          <div className="crud-form-skeleton__label" />
          <div className="crud-form-skeleton__line" />
        </div>
      </div>
    </div>
    <div>
      <div className="crud-form-skeleton__section-title" />
      <div className="crud-form-skeleton__field">
        <div className="crud-form-skeleton__label" />
        <div className="crud-form-skeleton__line crud-form-skeleton__line--tall" />
      </div>
    </div>
  </div>
);

export default FormSkeleton;
