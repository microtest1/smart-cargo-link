import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyAuthProvider } from "@/hooks/useCompanyAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CompanyAdminRoute } from "@/components/auth/CompanyAdminRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Shipments from "./pages/Shipments";
import ShipmentDetail from "./pages/ShipmentDetail";
import Companies from "./pages/Companies";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import MyCargo from "./pages/MyCargo";
import PaymentMethods from "./pages/PaymentMethods";
import NotificationSettings from "./pages/NotificationSettings";
import Security from "./pages/Security";
import Documents from "./pages/Documents";
import HelpSupport from "./pages/HelpSupport";
import AppSettings from "./pages/AppSettings";
import Invoices from "./pages/Invoices";
import CompanyAdminLogin from "./pages/CompanyAdminLogin";
import CompanyAdminDashboard from "./pages/company/CompanyAdminDashboard";
import CompanySettings from "./pages/company/CompanySettings";
import CompanyShipments from "./pages/company/CompanyShipments";
import CompanyNotifications from "./pages/company/CompanyNotifications";
import CompanyCustomers from "./pages/company/CompanyCustomers";
import CompanyContainers from "./pages/company/CompanyContainers";
import CompanySupport from "./pages/company/CompanySupport";
import CompanyPayments from "./pages/company/CompanyPayments";
import CompanyChinaWarehouseUpdates from "./pages/company/CompanyChinaWarehouseUpdates";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminShipments from "./pages/admin/AdminShipments";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminContainers from "./pages/admin/AdminContainers";
import AdminCompanyAdmins from "./pages/admin/AdminCompanyAdmins";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminWarehouseSubmissions from "./pages/admin/AdminWarehouseSubmissions";
import AdminManualEntry from "./pages/admin/AdminManualEntry";
import AdminPackingLists from "./pages/admin/AdminPackingLists";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminSendSMS from "./pages/admin/AdminSendSMS";
import AdminNewClientSMS from "./pages/admin/AdminNewClientSMS";
import AdminWarehouseConfirmation from "./pages/admin/AdminWarehouseConfirmation";
import AdminDeliveryRequests from "./pages/admin/AdminDeliveryRequests";
import AdminWarehouseAlerts from "./pages/admin/AdminWarehouseAlerts";
import AdminHubtelUssdUat from "./pages/admin/AdminHubtelUssdUat";
import AdminPricing from "./pages/admin/AdminPricing";
import CbmCalculator from "./pages/CbmCalculator";
import ContainerDetail from "./pages/ContainerDetail";
import PublicTracking from "./pages/PublicTracking";
import Warehouses from "./pages/Warehouses";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import BuyYuan from "./pages/BuyYuan";
import OAuthConsent from "./pages/OAuthConsent";
import ServiceLandingPage from "./pages/seo/ServiceLandingPage";
import GuidePage from "./pages/seo/GuidePage";
import ResourcesHub from "./pages/seo/ResourcesHub";
import { seoPages } from "./content/seoPages";
import { seoGuides } from "./content/seoGuides";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanyAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/track" element={<PublicTracking />} />
              <Route path="/tracking" element={<PublicTracking />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/china-warehouse-addresses" element={<Warehouses />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/resources" element={<ResourcesHub />} />
              {seoPages.map((page) => (
                <Route key={page.slug} path={page.slug} element={<ServiceLandingPage />} />
              ))}
              {seoGuides.map((guide) => (
                <Route key={guide.slug} path={guide.slug} element={<GuidePage />} />
              ))}
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/company-login" element={<CompanyAdminLogin />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
              <Route path="/shipments/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/my-cargo" element={<ProtectedRoute><MyCargo /></ProtectedRoute>} />
              <Route path="/containers/:id" element={<ProtectedRoute><ContainerDetail /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
              <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/cbm-calculator" element={<ProtectedRoute><CbmCalculator /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AppSettings /></ProtectedRoute>} />
              <Route path="/buy-yuan" element={<ProtectedRoute><BuyYuan /></ProtectedRoute>} />
              {/* Company Admin Routes */}
              <Route path="/company-admin" element={<CompanyAdminRoute><CompanyAdminDashboard /></CompanyAdminRoute>} />
              <Route path="/company-admin/settings" element={<CompanyAdminRoute><CompanySettings /></CompanyAdminRoute>} />
              <Route path="/company-admin/shipments" element={<CompanyAdminRoute><CompanyShipments /></CompanyAdminRoute>} />
              <Route path="/company-admin/notifications" element={<CompanyAdminRoute><CompanyNotifications /></CompanyAdminRoute>} />
              <Route path="/company-admin/customers" element={<CompanyAdminRoute><CompanyCustomers /></CompanyAdminRoute>} />
              <Route path="/company-admin/containers" element={<CompanyAdminRoute><CompanyContainers /></CompanyAdminRoute>} />
              <Route path="/company-admin/support" element={<CompanyAdminRoute><CompanySupport /></CompanyAdminRoute>} />
              <Route path="/company-admin/china-warehouse-updates" element={<CompanyAdminRoute><CompanyChinaWarehouseUpdates /></CompanyAdminRoute>} />
              <Route path="/company-admin/payments" element={<CompanyAdminRoute><CompanyPayments /></CompanyAdminRoute>} />
              {/* Super Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute requireManager><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/shipments" element={<ProtectedRoute requireManager><AdminShipments /></ProtectedRoute>} />
              <Route path="/admin/companies" element={<ProtectedRoute requireManager><AdminCompanies /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireManager><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute requireManager><AdminNotifications /></ProtectedRoute>} />
              <Route path="/admin/containers" element={<ProtectedRoute requireManager><AdminContainers /></ProtectedRoute>} />
              <Route path="/admin/company-admins" element={<ProtectedRoute requireManager><AdminCompanyAdmins /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute requireManager><AdminPayments /></ProtectedRoute>} />
              <Route path="/admin/warehouse" element={<ProtectedRoute requireManager><AdminWarehouseSubmissions /></ProtectedRoute>} />
              <Route path="/admin/pricing" element={<ProtectedRoute requireManager><AdminPricing /></ProtectedRoute>} />
              <Route path="/admin/manual-entry" element={<ProtectedRoute requireManager><AdminManualEntry /></ProtectedRoute>} />
              <Route path="/admin/packing-lists" element={<ProtectedRoute requireManager><AdminPackingLists /></ProtectedRoute>} />
              <Route path="/admin/sms" element={<ProtectedRoute requireManager><AdminSendSMS /></ProtectedRoute>} />
              <Route path="/admin/china-warehouse-updates" element={<ProtectedRoute requireManager><AdminNewClientSMS /></ProtectedRoute>} />
              <Route path="/admin/new-client-sms" element={<Navigate to="/admin/china-warehouse-updates" replace />} />
              <Route path="/admin/warehouse-confirmation" element={<ProtectedRoute requireManager><AdminWarehouseConfirmation /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute requireManager><AdminAuditLogs /></ProtectedRoute>} />
              <Route path="/admin/delivery-requests" element={<ProtectedRoute requireManager><AdminDeliveryRequests /></ProtectedRoute>} />
              <Route path="/admin/warehouse-alerts" element={<ProtectedRoute requireManager><AdminWarehouseAlerts /></ProtectedRoute>} />
              <Route path="/admin/hubtel-ussd-uat" element={<ProtectedRoute requireManager><AdminHubtelUssdUat /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <WhatsAppButton />
          </BrowserRouter>
        </TooltipProvider>
      </CompanyAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
