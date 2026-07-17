import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import routes from "../routes";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "./Loader/Loader";

const AppContent = () => {
  return (
    <div className="container-fluid px-3 px-md-4">
      <Suspense fallback={<Loader message="Loading..." />}>
        <Routes>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={
                    <ProtectedRoute
                      module={route.module}
                      action={route.action}
                      allowedRoles={route.allowedRoles}
                      allowedRolePrefix={route.allowedRolePrefix}
                      excludeRolePrefix={route.excludeRolePrefix}
                      allowRolePrefixOrModule={route.allowRolePrefixOrModule}
                    >
                      <route.element />
                    </ProtectedRoute>
                  }
                />
              )
            );
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default React.memo(AppContent);
