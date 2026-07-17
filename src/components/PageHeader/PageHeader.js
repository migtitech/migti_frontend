import React from "react";
import PropTypes from "prop-types";

const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    )}
  </div>
);

PageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node,
};

export default PageHeader;
