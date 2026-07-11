import React from "react";
import PropTypes from "prop-types";
import { CCard, CCardBody } from "@coreui/react";
import "./CrudFormPage.scss";

const CrudFormPage = ({ title, description, actions, children }) => (
  <div className="crud-form-page">
    <header className="crud-form-page__header">
      <div>
        <h1 className="crud-form-page__title">{title}</h1>
        {description && (
          <p className="crud-form-page__description">{description}</p>
        )}
      </div>
      {actions && <div className="crud-form-page__actions">{actions}</div>}
    </header>

    <CCard className="crud-form-card border-0">
      <CCardBody className="crud-form-card__body">{children}</CCardBody>
    </CCard>
  </div>
);

CrudFormPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default CrudFormPage;
