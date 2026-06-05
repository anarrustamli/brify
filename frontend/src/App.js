import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";

import PublicLayout from "@/components/layout/PublicLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";

import Home from "@/pages/public/Home";
import Services from "@/pages/public/Services";
import PortfolioSearch from "@/pages/public/PortfolioSearch";
import PortfolioDetail from "@/pages/public/PortfolioDetail";
import Companies from "@/pages/public/Companies";
import Category from "@/pages/public/Category";
import CompanyProfile from "@/pages/public/CompanyProfile";
import ServiceDetail from "@/pages/public/ServiceDetail";
import ProviderLanding from "@/pages/public/ProviderLanding";
import BuyerLanding from "@/pages/public/BuyerLanding";
import Pricing from "@/pages/public/Pricing";
import Blog from "@/pages/public/Blog";
import BlogPost from "@/pages/public/BlogPost";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Faq from "@/pages/public/Faq";
import Terms from "@/pages/public/Terms";

import Login from "@/pages/auth/Login";
import RegisterChoice from "@/pages/auth/RegisterChoice";
import RegisterBuyer from "@/pages/auth/RegisterBuyer";
import RegisterProvider from "@/pages/auth/RegisterProvider";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

import BuyerDashboard from "@/pages/buyer/Dashboard";
import BuyerShortlist from "@/pages/buyer/Shortlist";
import BuyerCompare from "@/pages/buyer/Compare";
import BuyerSavedComparisons from "@/pages/buyer/SavedComparisons";
import BuyerCreateBrief from "@/pages/buyer/CreateBrief";
import BuyerMyBriefs from "@/pages/buyer/MyBriefs";
import BuyerBriefDetail from "@/pages/buyer/BriefDetail";
import BuyerProposals from "@/pages/buyer/Proposals";
import BuyerMessages from "@/pages/buyer/Messages";
import BuyerSettings from "@/pages/buyer/Settings";

import ProviderDashboard from "@/pages/provider/Dashboard";
import ProviderProfile from "@/pages/provider/CompanyProfileEdit";
import ProviderServices from "@/pages/provider/Services";
import ProviderServiceForm from "@/pages/provider/ServiceForm";
import ProviderPortfolio from "@/pages/provider/Portfolio";
import ProviderPortfolioForm from "@/pages/provider/PortfolioForm";
import ProviderCaseStudies from "@/pages/provider/CaseStudies";
import ProviderCaseStudyForm from "@/pages/provider/CaseStudyForm";
import ProviderTeam from "@/pages/provider/Team";
import ProviderTeamForm from "@/pages/provider/TeamMemberForm";
import ProviderCertifications from "@/pages/provider/Certifications";
import ProviderStatistics from "@/pages/provider/Statistics";
import ProviderVisibility from "@/pages/provider/Visibility";
import ProviderReviewsPage from "@/pages/provider/Reviews";
import ProviderLeads from "@/pages/provider/Leads";
import ProviderProposalsSent from "@/pages/provider/ProposalsSent";
import ProviderAnalytics from "@/pages/provider/Analytics";
import ProviderAdvertising from "@/pages/provider/Advertising";
import ProviderBilling from "@/pages/provider/Billing";
import ProviderSettings from "@/pages/provider/Settings";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCompanies from "@/pages/admin/Companies";
import AdminUsers from "@/pages/admin/Users";
import AdminCategories from "@/pages/admin/Categories";
import AdminReviews from "@/pages/admin/Reviews";
import AdminLeads from "@/pages/admin/Leads";
import AdminBriefs from "@/pages/admin/Briefs";
import AdminAds from "@/pages/admin/Ads";
import AdminPlans from "@/pages/admin/Plans";
import AdminSettings from "@/pages/admin/Settings";
import AdminIntegrations from "@/pages/admin/Integrations";
import AdminAuditLogs from "@/pages/admin/AuditLogs";
import AdminResourcePage from "@/pages/admin/ResourcePage";

function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Yüklənir...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicOrBuyerRoute({ children, buyerTo }) {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams();
  if (user?.role === "buyer") {
    const target = typeof buyerTo === "function" ? buyerTo(params) : buyerTo;
    return <Navigate to={`${target}${location.search}`} replace state={{ returnTo: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<PublicOrBuyerRoute buyerTo="/buyer/search/services"><Services /></PublicOrBuyerRoute>} />
              <Route path="/search/services" element={<PublicOrBuyerRoute buyerTo="/buyer/search/services"><Services /></PublicOrBuyerRoute>} />
              <Route path="/portfolio" element={<PublicOrBuyerRoute buyerTo="/buyer/search/portfolio"><PortfolioSearch /></PublicOrBuyerRoute>} />
              <Route path="/search/portfolio" element={<PublicOrBuyerRoute buyerTo="/buyer/search/portfolio"><PortfolioSearch /></PublicOrBuyerRoute>} />
              <Route path="/portfolio/:id" element={<PublicOrBuyerRoute buyerTo={({ id }) => `/buyer/portfolio/${id}`}><PortfolioDetail /></PublicOrBuyerRoute>} />
              <Route path="/companies" element={<PublicOrBuyerRoute buyerTo="/buyer/search/companies"><Companies /></PublicOrBuyerRoute>} />
              <Route path="/search/companies" element={<PublicOrBuyerRoute buyerTo="/buyer/search/companies"><Companies /></PublicOrBuyerRoute>} />
              <Route path="/categories/:slug" element={<Category />} />
              <Route path="/companies/:slug" element={<PublicOrBuyerRoute buyerTo={({ slug }) => `/buyer/company/${slug}`}><CompanyProfile /></PublicOrBuyerRoute>} />
              <Route path="/company/:slug" element={<PublicOrBuyerRoute buyerTo={({ slug }) => `/buyer/company/${slug}`}><CompanyProfile /></PublicOrBuyerRoute>} />
              <Route path="/service/:id" element={<PublicOrBuyerRoute buyerTo={({ id }) => `/buyer/service/${id}`}><ServiceDetail /></PublicOrBuyerRoute>} />
              <Route path="/provider" element={<ProviderLanding />} />
              <Route path="/buyer" element={<BuyerLanding />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Terms />} />
              <Route path="/cookies" element={<Terms />} />
            </Route>

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterChoice />} />
            <Route path="/register/buyer" element={<RegisterBuyer />} />
            <Route path="/register/provider" element={<RegisterProvider />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Buyer */}
            <Route element={<ProtectedRoute roles={["buyer"]}><DashboardLayout role="buyer" /></ProtectedRoute>}>
              <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
              <Route path="/buyer/search/services" element={<Services buyerMode />} />
              <Route path="/buyer/search/companies" element={<Companies buyerMode />} />
              <Route path="/buyer/search/portfolio" element={<PortfolioSearch buyerMode />} />
              <Route path="/buyer/company/:slug" element={<CompanyProfile buyerMode />} />
              <Route path="/buyer/service/:id" element={<ServiceDetail buyerMode />} />
              <Route path="/buyer/portfolio/:id" element={<PortfolioDetail buyerMode />} />
              <Route path="/buyer/shortlist" element={<BuyerShortlist />} />
              <Route path="/buyer/compare/saved" element={<BuyerSavedComparisons />} />
              <Route path="/buyer/compare" element={<BuyerCompare />} />
              <Route path="/buyer/briefs/new" element={<BuyerCreateBrief />} />
              <Route path="/buyer/briefs" element={<BuyerMyBriefs />} />
              <Route path="/buyer/briefs/:id/edit" element={<BuyerCreateBrief />} />
              <Route path="/buyer/briefs/:id" element={<BuyerBriefDetail />} />
              <Route path="/buyer/proposals" element={<BuyerProposals />} />
              <Route path="/buyer/messages" element={<BuyerMessages />} />
              <Route path="/buyer/settings" element={<BuyerSettings />} />
            </Route>

            {/* Provider */}
            <Route element={<ProtectedRoute roles={["provider"]}><DashboardLayout role="provider" /></ProtectedRoute>}>
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/provider/profile" element={<ProviderProfile />} />
              <Route path="/provider/profile/description" element={<ProviderProfile />} />
              <Route path="/provider/profile/contact" element={<ProviderProfile />} />
              <Route path="/provider/profile/social" element={<ProviderProfile />} />
              <Route path="/provider/profile/locations" element={<ProviderProfile />} />
              <Route path="/provider/visibility" element={<ProviderVisibility />} />
              <Route path="/provider/services" element={<ProviderServices />} />
              <Route path="/provider/services/new" element={<ProviderServiceForm />} />
              <Route path="/provider/services/:id/edit" element={<ProviderServiceForm />} />
              <Route path="/provider/portfolio" element={<ProviderPortfolio />} />
              <Route path="/provider/portfolio/new" element={<ProviderPortfolioForm />} />
              <Route path="/provider/portfolio/:id/edit" element={<ProviderPortfolioForm />} />
              <Route path="/provider/case-studies" element={<ProviderCaseStudies />} />
              <Route path="/provider/case-studies/new" element={<ProviderCaseStudyForm />} />
              <Route path="/provider/case-studies/:id/edit" element={<ProviderCaseStudyForm />} />
              <Route path="/provider/team" element={<ProviderTeam />} />
              <Route path="/provider/team/new" element={<ProviderTeamForm />} />
              <Route path="/provider/team/:id/edit" element={<ProviderTeamForm />} />
              <Route path="/provider/certifications" element={<ProviderCertifications />} />
              <Route path="/provider/statistics" element={<ProviderStatistics />} />
              <Route path="/provider/reviews" element={<ProviderReviewsPage />} />
              <Route path="/provider/leads" element={<ProviderLeads />} />
              <Route path="/provider/proposals" element={<ProviderProposalsSent />} />
              <Route path="/provider/messages" element={<BuyerMessages />} />
              <Route path="/provider/analytics" element={<ProviderAnalytics />} />
              <Route path="/provider/advertising" element={<ProviderAdvertising />} />
              <Route path="/provider/billing" element={<ProviderBilling />} />
              <Route path="/provider/settings" element={<ProviderSettings />} />
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute roles={["admin"]}><DashboardLayout role="admin" /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/companies" element={<AdminCompanies />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/services" element={<AdminResourcePage resource="services" />} />
              <Route path="/admin/portfolio" element={<AdminResourcePage resource="portfolio" />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin/leads" element={<AdminLeads />} />
              <Route path="/admin/briefs" element={<AdminBriefs />} />
              <Route path="/admin/proposals" element={<AdminResourcePage resource="proposals" />} />
              <Route path="/admin/verification" element={<AdminResourcePage resource="verification-requests" />} />
              <Route path="/admin/ads" element={<AdminAds />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/subscriptions" element={<AdminResourcePage resource="subscriptions" />} />
              <Route path="/admin/payments" element={<AdminResourcePage resource="payments" />} />
              <Route path="/admin/invoices" element={<AdminResourcePage resource="invoices" />} />
              <Route path="/admin/reports" element={<AdminResourcePage resource="reports" />} />
              <Route path="/admin/complaints" element={<AdminResourcePage resource="complaints" />} />
              <Route path="/admin/content-pages" element={<AdminResourcePage resource="content-pages" />} />
              <Route path="/admin/seo-pages" element={<AdminResourcePage resource="seo-pages" />} />
              <Route path="/admin/faqs" element={<AdminResourcePage resource="faqs" />} />
              <Route path="/admin/email-templates" element={<AdminResourcePage resource="email-templates" />} />
              <Route path="/admin/media" element={<AdminResourcePage resource="media-assets" />} />
              <Route path="/admin/roles" element={<AdminResourcePage resource="admin-roles" />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/integrations" element={<AdminIntegrations />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
