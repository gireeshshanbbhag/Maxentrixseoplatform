import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./components/layout/app-layout.tsx";
import Dashboard from "./pages/dashboard/page.tsx";
import Projects from "./pages/projects/page.tsx";
import Settings from "./pages/settings/page.tsx";
import GoogleUpdates from "./pages/google-updates/page.tsx";
import AuditPage from "./pages/audit/page.tsx";
import AuditDetailPage from "./pages/audit/detail/page.tsx";
import KeywordsPage from "./pages/keywords/page.tsx";
import RankingsPage from "./pages/rankings/page.tsx";
import SearchConsolePage from "./pages/search-console/page.tsx";
import GscCallback from "./pages/gsc/Callback.tsx";
import AnalyticsPage from "./pages/analytics/page.tsx";
import PerformancePage from "./pages/performance/page.tsx";
import GA4Callback from "./pages/ga4/Callback.tsx";
import ContentPage from "./pages/content/page.tsx";
import SchemaMarkupPage from "./pages/schema-markup/page.tsx";
import TopicMapPage from "./pages/advanced-seo/topic-map.tsx";
import InternalLinksPage from "./pages/advanced-seo/internal-links.tsx";
import CannibalizationPage from "./pages/advanced-seo/cannibalization.tsx";
import ContentGapPage from "./pages/advanced-seo/content-gap.tsx";
import ContentDecayPage from "./pages/advanced-seo/content-decay.tsx";
import EntitySeoPage from "./pages/advanced-seo/entity-seo.tsx";
import ImageSeoPage from "./pages/advanced-seo/image-seo.tsx";
import HreflangPage from "./pages/advanced-seo/hreflang.tsx";
import LocalSeoPage from "./pages/search-visibility/local-seo.tsx";
import AeoPage from "./pages/search-visibility/aeo.tsx";
import GeoPage from "./pages/search-visibility/geo.tsx";
import ReportsPage from "./pages/monitoring/reports.tsx";
import AlertsPage from "./pages/monitoring/alerts.tsx";
import ExperimentsPage from "./pages/monitoring/experiments.tsx";
import ChangeHistoryPage from "./pages/monitoring/change-history.tsx";
import KnowledgeBasePage from "./pages/monitoring/knowledge-base.tsx";
import AdminPage from "./pages/admin/page.tsx";
import UrlSeoPanel from "./pages/url-panel/page.tsx";
import ProjectSettingsPage from "./pages/projects/settings.tsx";
import TechnicalSeoPage from "./pages/technical-seo/page.tsx";
import PagesPage from "./pages/pages/page.tsx";
import SitemapsPage from "./pages/sitemaps/page.tsx";
import UrlInspectionPage from "./pages/url-inspection/page.tsx";
import KeywordResearchPage from "./pages/keyword-research/page.tsx";
import UrlRemovalPage from "./pages/url-removal/page.tsx";
import CmsConnectionsPage from "./pages/cms/connections/page.tsx";
import CmsContentPage from "./pages/cms/content/page.tsx";
import CmsInternalLinksPage from "./pages/cms/internal-links/page.tsx";
import SerpAdminPage from "./pages/serp-admin/page.tsx";
import SiteFilesPage from "./pages/site-files/page.tsx";
import TermsOfService from "./pages/legal/terms.tsx";
import PrivacyPolicy from "./pages/legal/privacy.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/gsc/callback" element={<GscCallback />} />
          <Route path="/ga4/callback" element={<GA4Callback />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/serp-admin" element={<SerpAdminPage />} />

          {/* Authenticated layout routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/audit/:auditId" element={<AuditDetailPage />} />
            <Route path="/keywords" element={<KeywordsPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/search-console" element={<SearchConsolePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/schema-markup" element={<SchemaMarkupPage />} />
            <Route path="/topic-map" element={<TopicMapPage />} />
            <Route path="/internal-links" element={<InternalLinksPage />} />
            <Route path="/cannibalization" element={<CannibalizationPage />} />
            <Route path="/content-gap" element={<ContentGapPage />} />
            <Route path="/content-decay" element={<ContentDecayPage />} />
            <Route path="/entity-seo" element={<EntitySeoPage />} />
            <Route path="/image-seo" element={<ImageSeoPage />} />
            <Route path="/hreflang" element={<HreflangPage />} />
            <Route path="/local-seo" element={<LocalSeoPage />} />
            <Route path="/aeo" element={<AeoPage />} />
            <Route path="/geo" element={<GeoPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route path="/change-history" element={<ChangeHistoryPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/url-panel" element={<UrlSeoPanel />} />
            <Route path="/technical-seo" element={<TechnicalSeoPage />} />
            <Route path="/pages" element={<PagesPage />} />
            <Route path="/sitemaps" element={<SitemapsPage />} />
            <Route path="/site-files" element={<SiteFilesPage />} />
            <Route path="/url-inspection" element={<UrlInspectionPage />} />
            <Route path="/keyword-research" element={<KeywordResearchPage />} />
            <Route path="/url-removal" element={<UrlRemovalPage />} />
            <Route path="cms">
              <Route path="connections" element={<CmsConnectionsPage />} />
              <Route path="content" element={<CmsContentPage />} />
              <Route path="internal-links" element={<CmsInternalLinksPage />} />
            </Route>
            <Route path="/settings" element={<Settings />} />
            <Route path="/google-updates" element={<GoogleUpdates />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
