/**
 * @file App.tsx
 * @version 2.0.0
 * @description Componente principal da aplicação EPS Campanhas
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Layouts
import PublicLayout from '@/components/layouts/PublicLayout'
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout'

// Guards
import ProtectedRoute from '@/components/guards/ProtectedRoute'
import AdminRoute from '@/components/guards/AdminRoute'
import ManagerRoute from '@/components/guards/ManagerRoute'

// Loading
import LoadingScreen from '@/components/ui/LoadingScreen'

// Pages - Lazy loading para otimização
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = React.lazy(() => import('@/pages/auth/RegisterPage'))

// Dashboard
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'))

// Campanhas
const CampaignListPage = React.lazy(() => import('@/pages/campaigns/CampaignListPage'))
const CampaignDetailsPage = React.lazy(() => import('@/pages/campaigns/CampaignDetailsPage'))
const CreateCampaignPage = React.lazy(() => import('@/pages/campaigns/CreateCampaignPage'))
const EditCampaignPage = React.lazy(() => import('@/pages/campaigns/EditCampaignPage'))

// Prêmios
const PremioListPage = React.lazy(() => import('@/pages/premios/PremioListPage'))
const PremioDetailsPage = React.lazy(() => import('@/pages/premios/PremioDetailsPage'))
const CreatePremioPage = React.lazy(() => import('@/pages/premios/CreatePremioPage'))

// Submissões
const SubmissionListPage = React.lazy(() => import('@/pages/submissions/SubmissionListPage'))
const CreateSubmissionPage = React.lazy(() => import('@/pages/submissions/CreateSubmissionPage'))
const ValidationPage = React.lazy(() => import('@/pages/submissions/ValidationPage'))

// Usuários
const UserListPage = React.lazy(() => import('@/pages/users/UserListPage'))
const UserDetailsPage = React.lazy(() => import('@/pages/users/UserDetailsPage'))
const CreateUserPage = React.lazy(() => import('@/pages/users/CreateUserPage'))
const ProfilePage = React.lazy(() => import('@/pages/profile/ProfilePage'))

// Earnings
const EarningListPage = React.lazy(() => import('@/pages/earnings/EarningListPage'))
const FinancialReportPage = React.lazy(() => import('@/pages/earnings/FinancialReportPage'))

// Validação de planilhas
const ValidationSpreadsheetPage = React.lazy(() => import('@/pages/validation/ValidationSpreadsheetPage'))

// Páginas especiais
const NotFoundPage = React.lazy(() => import('@/pages/errors/NotFoundPage'))
const UnauthorizedPage = React.lazy(() => import('@/pages/errors/UnauthorizedPage'))

function App() {
  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
            </Route>

            {/* Rotas autenticadas */}
            <Route path="/app" element={
              <ProtectedRoute>
                <AuthenticatedLayout />
              </ProtectedRoute>
            }>
              {/* Dashboard */}
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Perfil */}
              <Route path="profile" element={<ProfilePage />} />

              {/* Campanhas */}
              <Route path="campaigns">
                <Route index element={<CampaignListPage />} />
                <Route path=":id" element={<CampaignDetailsPage />} />
                <Route path="create" element={
                  <AdminRoute>
                    <CreateCampaignPage />
                  </AdminRoute>
                } />
                <Route path=":id/edit" element={
                  <AdminRoute>
                    <EditCampaignPage />
                  </AdminRoute>
                } />
              </Route>

              {/* Prêmios */}
              <Route path="premios">
                <Route index element={<PremioListPage />} />
                <Route path=":id" element={<PremioDetailsPage />} />
                <Route path="create" element={
                  <AdminRoute>
                    <CreatePremioPage />
                  </AdminRoute>
                } />
              </Route>

              {/* Submissões */}
              <Route path="submissions">
                <Route index element={<SubmissionListPage />} />
                <Route path="create" element={<CreateSubmissionPage />} />
                <Route path="validate" element={
                  <ManagerRoute>
                    <ValidationPage />
                  </ManagerRoute>
                } />
              </Route>

              {/* Usuários (Admin/Gerente) */}
              <Route path="users">
                <Route index element={
                  <ManagerRoute>
                    <UserListPage />
                  </ManagerRoute>
                } />
                <Route path=":id" element={
                  <ManagerRoute>
                    <UserDetailsPage />
                  </ManagerRoute>
                } />
                <Route path="create" element={
                  <AdminRoute>
                    <CreateUserPage />
                  </AdminRoute>
                } />
              </Route>

              {/* Earnings */}
              <Route path="earnings">
                <Route index element={<EarningListPage />} />
                <Route path="reports" element={
                  <ManagerRoute>
                    <FinancialReportPage />
                  </ManagerRoute>
                } />
              </Route>

              {/* Validação de planilhas (Gerente/Admin) */}
              <Route path="validation" element={
                <ManagerRoute>
                  <ValidationSpreadsheetPage />
                </ManagerRoute>
              } />

            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </div>
  )
}

export default App
