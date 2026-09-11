import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import { ROLES, ROLE_HOME } from './constants/legalMetrology'

// Public pages
import LandingPage from './pages/public/LandingPage'
import BusinessLogin from './pages/public/BusinessLogin'
import OfficerLogin from './pages/officer/OfficerLogin'
import BusinessRegister from './pages/public/BusinessRegister'
import ScanQR from './pages/public/ScanQR'
import VerifyCertificate from './pages/public/VerifyCertificate'
import HelpPage from './pages/public/HelpPage'

// Business portal
import BusinessDashboard from './pages/business/BusinessDashboard'
import MyInstruments from './pages/business/MyInstruments'
import InstrumentRegister from './pages/business/InstrumentRegister'
import MyApplications from './pages/business/MyApplications'
import MyCertificates from './pages/business/MyCertificates'

// Officer portals
import LMODashboard from './pages/officer/LMODashboard'
import RecordInspection from './pages/officer/RecordInspection'
import GATCDashboard from './pages/officer/GATCDashboard'
import AdminDashboard from './pages/officer/AdminDashboard'

// Common
import ComingSoon from './pages/common/ComingSoon'
import NotFound from './pages/common/NotFound'

import PortalLayout from './components/layout/PortalLayout'
import { BUSINESS_NAV } from './pages/business/BusinessDashboard'
import { LMO_NAV } from './pages/officer/LMODashboard'
import { GATC_NAV } from './pages/officer/GATCDashboard'
import { ADMIN_NAV } from './pages/officer/AdminDashboard'

/**
 * Root route configuration.
 *
 * Public routes are reachable by everyone. Protected routes gate on
 * authentication and role. The ProtectedRoute guard is UX only — the server
 * must independently verify every privileged request.
 */
export default function App() {
  return (
    <Routes>
      {/* ---------------- Public routes ---------------- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginOrRedirect />} />
      <Route path="/register" element={<BusinessRegister />} />
      <Route path="/officer/login" element={<OfficerLoginOrRedirect />} />

      {/* Public verification — deliberately no auth required */}
      <Route path="/scan" element={<ScanQR />} />
      <Route path="/verify" element={<VerifyCertificate />} />
      <Route path="/verify/:certificateNo" element={<VerifyCertificate />} />

      <Route path="/help" element={<HelpPage />} />
      <Route path="/forgot-password" element={<ComingSoon title="Password Reset" description="Reset your password via email or mobile OTP." />} />
      <Route path="/grievance" element={<ComingSoon title="File a Complaint" description="Lodge a consumer grievance against an unverified instrument." />} />

      {/* ---------------- Business portal ---------------- */}
      <Route
        path="/business/dashboard"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <BusinessDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/instruments"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <MyInstruments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/instruments/new"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <InstrumentRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/applications"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <MyApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/applications/new"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <PortalLayout title="Business Portal" nav={BUSINESS_NAV}>
              <ComingSoon
                title="Apply for Verification"
                description="Submit a fresh verification or re-verification application."
                plannedFeatures={[
                  'Select an instrument from your register',
                  'Choose verification or re-verification',
                  'Attach supporting documents per Rule 10',
                  'Pay verification fee online',
                  'Receive application acknowledgment with tracking number',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/certificates"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <MyCertificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/alerts"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <PortalLayout title="Business Portal" nav={BUSINESS_NAV}>
              <ComingSoon
                title="Alerts & Reminders"
                description="Automatic reminders for verification expiry and renewal."
                plannedFeatures={[
                  'Alerts issued at 60, 30, 15, 7 and 1 day before expiry',
                  'Delivered via email and SMS',
                  'Mark reminders as read or snoozed',
                  'Configure alert preferences',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/profile"
        element={
          <ProtectedRoute allow={[ROLES.BUSINESS]}>
            <PortalLayout title="Business Portal" nav={BUSINESS_NAV}>
              <ComingSoon
                title="My Profile"
                description="Manage your business particulars and account settings."
                plannedFeatures={[
                  'Update contact details and premises address',
                  'Change password and notification preferences',
                  'View registration certificate',
                  'Manage authorised users',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      {/* ---------------- LMO portal ---------------- */}
      <Route
        path="/officer/lmo/dashboard"
        element={
          <ProtectedRoute allow={[ROLES.LMO]}>
            <LMODashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/lmo/inspection"
        element={
          <ProtectedRoute allow={[ROLES.LMO]}>
            <RecordInspection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/lmo/queue"
        element={
          <ProtectedRoute allow={[ROLES.LMO]}>
            <PortalLayout title="LMO Portal" nav={LMO_NAV}>
              <ComingSoon
                title="Verification Queue"
                description="Full list of applications allotted for field verification."
                plannedFeatures={[
                  'Filter by status, district, scheduled date',
                  'Bulk reschedule or reassign',
                  'Export queue to PDF or Excel',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/lmo/schedule"
        element={
          <ProtectedRoute allow={[ROLES.LMO]}>
            <PortalLayout title="LMO Portal" nav={LMO_NAV}>
              <ComingSoon
                title="My Schedule"
                description="Calendar view of scheduled verifications."
                plannedFeatures={[
                  'Day, week and month calendar views',
                  'Mark dates as unavailable',
                  'Propose reschedules',
                  'Export schedule to iCal',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/lmo/enforcement"
        element={
          <ProtectedRoute allow={[ROLES.LMO]}>
            <PortalLayout title="LMO Portal" nav={LMO_NAV}>
              <ComingSoon
                title="Enforcement Actions"
                description="Record penalties and prosecutions initiated under the Act."
                plannedFeatures={[
                  'Log violations and seizures',
                  'Issue compounding notices',
                  'Track prosecution status',
                  'Generate enforcement reports',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/lmo/reports"
        element={
          <ProtectedRoute allow={[ROLES.LMO]}>
            <PortalLayout title="LMO Portal" nav={LMO_NAV}>
              <ComingSoon
                title="Reports"
                description="Monthly and quarterly performance reports."
                plannedFeatures={[
                  'Verifications completed vs. allotted',
                  'Average turnaround time',
                  'Rejection rate by instrument category',
                  'Enforcement activity summary',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      {/* ---------------- GATC portal ---------------- */}
      <Route
        path="/officer/gatc/dashboard"
        element={
          <ProtectedRoute allow={[ROLES.GATC]}>
            <GATCDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/gatc/intake"
        element={
          <ProtectedRoute allow={[ROLES.GATC]}>
            <PortalLayout title="GATC Portal" nav={GATC_NAV}>
              <ComingSoon
                title="Instrument Intake"
                description="Register instruments received for testing."
                plannedFeatures={[
                  'Record instrument receipt details',
                  'Assign to technician',
                  'Generate job card',
                  'Issue receipt to applicant',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/gatc/tests"
        element={
          <ProtectedRoute allow={[ROLES.GATC]}>
            <PortalLayout title="GATC Portal" nav={GATC_NAV}>
              <ComingSoon
                title="Test Records"
                description="Digital test observation sheets and calibration reports."
                plannedFeatures={[
                  'Record test observations and measurements',
                  'Attach equipment calibration certificates',
                  'Sign test report digitally',
                  'Recommend certificate issuance or rejection',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/gatc/certificates"
        element={
          <ProtectedRoute allow={[ROLES.GATC]}>
            <PortalLayout title="GATC Portal" nav={GATC_NAV}>
              <ComingSoon
                title="Certificates Issued"
                description="History of verification certificates issued by this centre."
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/gatc/scope"
        element={
          <ProtectedRoute allow={[ROLES.GATC]}>
            <PortalLayout title="GATC Portal" nav={GATC_NAV}>
              <ComingSoon
                title="Notified Scope"
                description="Instrument categories and capacity ranges this centre is notified to test."
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      {/* ---------------- Admin portal ---------------- */}
      <Route
        path="/officer/admin/dashboard"
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/admin/pendency"
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <PortalLayout title="Administration" nav={ADMIN_NAV}>
              <ComingSoon
                title="Pendency Monitor"
                description="District-wise drill-down of pending and overdue applications."
                plannedFeatures={[
                  'Filter by district, officer, date range',
                  'Identify bottlenecks and reallocation needs',
                  'Export pendency report',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/admin/officers"
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <PortalLayout title="Administration" nav={ADMIN_NAV}>
              <ComingSoon
                title="Officers & GATCs"
                description="Manage officer accounts and GATC approvals."
                plannedFeatures={[
                  'Add, edit or suspend officer accounts',
                  'Manage GATC notifications and renewal',
                  'Assign jurisdiction and circles',
                  'View officer workload and performance',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/admin/businesses"
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <PortalLayout title="Administration" nav={ADMIN_NAV}>
              <ComingSoon
                title="Registered Users"
                description="Registry of businesses and instrument holders."
                plannedFeatures={[
                  'Search by business name, GSTIN or registration number',
                  'View compliance history',
                  'Flag businesses with repeated violations',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/admin/enforcement"
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <PortalLayout title="Administration" nav={ADMIN_NAV}>
              <ComingSoon
                title="Enforcement"
                description="State-wide enforcement action registry and analytics."
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/admin/certificates"
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <PortalLayout title="Administration" nav={ADMIN_NAV}>
              <ComingSoon
                title="Certificate Registry"
                description="National repository of all verification certificates issued."
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/admin/audit"
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <PortalLayout title="Administration" nav={ADMIN_NAV}>
              <ComingSoon
                title="Audit Trail"
                description="Tamper-proof log of all officer actions and data changes."
                plannedFeatures={[
                  'Filter by user, action type, date range',
                  'Drill into certificate issuance, revocation, amendment',
                  'Export audit log for compliance review',
                ]}
              />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

/** Redirect logged-in business users away from the login screen. */
function LoginOrRedirect() {
  const { user } = useAuth()
  if (user?.role === ROLES.BUSINESS) {
    return <Navigate to={ROLE_HOME[ROLES.BUSINESS]} replace />
  }
  return <BusinessLogin />
}

/** Redirect logged-in officers away from the officer login screen. */
function OfficerLoginOrRedirect() {
  const { user } = useAuth()
  if (user && user.role !== ROLES.BUSINESS) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }
  return <OfficerLogin />
}
