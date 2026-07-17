import React from "react";
import PropTypes from "prop-types";
import { Inbox } from "lucide-react";

const EmptyState = ({ icon: Icon = Inbox, title, message, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icon className="h-6 w-6" />
    </div>
    {title && (
      <div className="text-base font-semibold text-foreground">{title}</div>
    )}
    {message && (
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">
        {message}
      </div>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.node,
};

export default EmptyState;
