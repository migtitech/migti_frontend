import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer } from '@coreui/react'

import routes from '../routes'
import ProtectedRoute from './ProtectedRoute'
import Loader from './Loader/Loader'

const AppContent = () => {
  return (
    <CContainer fluid className="px-3 px-md-4">
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
                    <ProtectedRoute module={route.module} action={route.action}>
                      <route.element />
                    </ProtectedRoute>
                  }
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
