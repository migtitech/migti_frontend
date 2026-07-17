import React from "react";
import PropTypes from "prop-types";
import { Card, CardContent } from "../ui";

/**
 * Standard create/edit form scaffold: a page header (title + description +
 * optional actions) above a card that holds the form fields. Same API as
 * before; presentation moved to the shadcn design system.
 */
const CrudFormPage = ({ title, description, actions, children }) => (
  <div>
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
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
    </header>

    <Card>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  </div>
);

CrudFormPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default CrudFormPage;
