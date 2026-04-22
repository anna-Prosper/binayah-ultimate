"use client";

/**
 * mockupsMap — lazy component map for per-stage mockup code-splitting.
 *
 * Each entry is a next/dynamic lazy component (ssr:false) accepting { t: T }.
 * Stage.tsx renders <MockupComponent t={t} /> instead of calling a render function.
 *
 * Grouping strategy: one file per pipeline section → 7 chunks.
 * Only the chunk for the open stage's pipeline loads, not all mockup code.
 */

import dynamic from "next/dynamic";
import React from "react";
import { T } from "@/lib/themes";
import { MockupSkeleton } from "@/components/ui/Skeletons";

type MockupProps = { t: T };

// Skeleton factory — needs t at render time, not at module-level.
// We use a wrapper component so we can pass t to MockupSkeleton.
function makeSkeleton() {
  // This is the loading slot. next/dynamic loading() does NOT receive props,
  // so we render a static placeholder. The real skeleton with t colors
  // is shown via Suspense wrapping in Stage.tsx.
  return function MockupLoadingPlaceholder() {
    return (
      <div
        style={{
          height: 200,
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          animation: "skeletonPulse 1.5s ease-in-out infinite",
        }}
      />
    );
  };
}

const loadingPlaceholder = makeSkeleton();

// ─── RESEARCH ──────────────────────────────────────────────────────────────
const OpenClawResearch = dynamic<MockupProps>(
  () => import("./ResearchMockups").then(m => ({ default: m.OpenClawResearch })),
  { ssr: false, loading: loadingPlaceholder }
);
const DevPipelineResearch = dynamic<MockupProps>(
  () => import("./ResearchMockups").then(m => ({ default: m.DevPipelineResearch })),
  { ssr: false, loading: loadingPlaceholder }
);
const QdrantResearch = dynamic<MockupProps>(
  () => import("./ResearchMockups").then(m => ({ default: m.QdrantResearch })),
  { ssr: false, loading: loadingPlaceholder }
);
const HostingStrategy = dynamic<MockupProps>(
  () => import("./ResearchMockups").then(m => ({ default: m.HostingStrategy })),
  { ssr: false, loading: loadingPlaceholder }
);
const InfraSetup = dynamic<MockupProps>(
  () => import("./ResearchMockups").then(m => ({ default: m.InfraSetup })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── DEV PIPELINE ──────────────────────────────────────────────────────────
const PMAgent = dynamic<MockupProps>(
  () => import("./DevMockups").then(m => ({ default: m.PMAgent })),
  { ssr: false, loading: loadingPlaceholder }
);
const DevAgent = dynamic<MockupProps>(
  () => import("./DevMockups").then(m => ({ default: m.DevAgent })),
  { ssr: false, loading: loadingPlaceholder }
);
const QAAgent = dynamic<MockupProps>(
  () => import("./DevMockups").then(m => ({ default: m.QAAgent })),
  { ssr: false, loading: loadingPlaceholder }
);
const CodeReview = dynamic<MockupProps>(
  () => import("./DevMockups").then(m => ({ default: m.CodeReview })),
  { ssr: false, loading: loadingPlaceholder }
);
const ContentFactory = dynamic<MockupProps>(
  () => import("./DevMockups").then(m => ({ default: m.ContentFactory })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── CORE PLATFORM ─────────────────────────────────────────────────────────
const PropertyAPI = dynamic<MockupProps>(
  () => import("./CoreMockups").then(m => ({ default: m.PropertyAPI })),
  { ssr: false, loading: loadingPlaceholder }
);
const CRMIntegration = dynamic<MockupProps>(
  () => import("./CoreMockups").then(m => ({ default: m.CRMIntegration })),
  { ssr: false, loading: loadingPlaceholder }
);
const ApprovalHub = dynamic<MockupProps>(
  () => import("./CoreMockups").then(m => ({ default: m.ApprovalHub })),
  { ssr: false, loading: loadingPlaceholder }
);
const KnowledgeBase = dynamic<MockupProps>(
  () => import("./CoreMockups").then(m => ({ default: m.KnowledgeBase })),
  { ssr: false, loading: loadingPlaceholder }
);
const KPIDashboard = dynamic<MockupProps>(
  () => import("./CoreMockups").then(m => ({ default: m.KPIDashboard })),
  { ssr: false, loading: loadingPlaceholder }
);
const TranslationMemory = dynamic<MockupProps>(
  () => import("./CoreMockups").then(m => ({ default: m.TranslationMemory })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── COMMS HUB ─────────────────────────────────────────────────────────────
const WATranslation = dynamic<MockupProps>(
  () => import("./CommsMockups").then(m => ({ default: m.WATranslation })),
  { ssr: false, loading: loadingPlaceholder }
);
const AISalesAgent = dynamic<MockupProps>(
  () => import("./CommsMockups").then(m => ({ default: m.AISalesAgent })),
  { ssr: false, loading: loadingPlaceholder }
);
const TimezoneDrips = dynamic<MockupProps>(
  () => import("./CommsMockups").then(m => ({ default: m.TimezoneDrips })),
  { ssr: false, loading: loadingPlaceholder }
);
const WACompliance = dynamic<MockupProps>(
  () => import("./CommsMockups").then(m => ({ default: m.WACompliance })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── MULTILINGUAL ENGINE ───────────────────────────────────────────────────
const MultilingualDirs = dynamic<MockupProps>(
  () => import("./MultiMockups").then(m => ({ default: m.MultilingualDirs })),
  { ssr: false, loading: loadingPlaceholder }
);
const RegionalSEO = dynamic<MockupProps>(
  () => import("./MultiMockups").then(m => ({ default: m.RegionalSEO })),
  { ssr: false, loading: loadingPlaceholder }
);
const DataCollection = dynamic<MockupProps>(
  () => import("./MultiMockups").then(m => ({ default: m.DataCollection })),
  { ssr: false, loading: loadingPlaceholder }
);
const DynamicHomepage = dynamic<MockupProps>(
  () => import("./MultiMockups").then(m => ({ default: m.DynamicHomepage })),
  { ssr: false, loading: loadingPlaceholder }
);
const NewslettersMulti = dynamic<MockupProps>(
  () => import("./MultiMockups").then(m => ({ default: m.Newsletters })),
  { ssr: false, loading: loadingPlaceholder }
);
const GeoCampaigns = dynamic<MockupProps>(
  () => import("./MultiMockups").then(m => ({ default: m.GeoCampaigns })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── LEAD LIFECYCLE ────────────────────────────────────────────────────────
const LeadResponder = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.LeadResponder })),
  { ssr: false, loading: loadingPlaceholder }
);
const BehaviorScoring = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.BehaviorScoring })),
  { ssr: false, loading: loadingPlaceholder }
);
const LeadPrediction = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.LeadPrediction })),
  { ssr: false, loading: loadingPlaceholder }
);
const LeakDetector = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.LeakDetector })),
  { ssr: false, loading: loadingPlaceholder }
);
const ViewingScheduler = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.ViewingScheduler })),
  { ssr: false, loading: loadingPlaceholder }
);
const DealBroadcaster = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.DealBroadcaster })),
  { ssr: false, loading: loadingPlaceholder }
);
const PostSaleNurture = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.PostSaleNurture })),
  { ssr: false, loading: loadingPlaceholder }
);
const WACommunities = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.WACommunities })),
  { ssr: false, loading: loadingPlaceholder }
);
const InvestorPortal = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.InvestorPortal })),
  { ssr: false, loading: loadingPlaceholder }
);
const CRMLeaderboard = dynamic<MockupProps>(
  () => import("./LeadMockups").then(m => ({ default: m.CRMLeaderboard })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── CONTENT & INTEL ───────────────────────────────────────────────────────
const PriceMonitor = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.PriceMonitor })),
  { ssr: false, loading: loadingPlaceholder }
);
const MorningBrief = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.MorningBrief })),
  { ssr: false, loading: loadingPlaceholder }
);
const MarketReports = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.MarketReports })),
  { ssr: false, loading: loadingPlaceholder }
);
const DevReports = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.DevReports })),
  { ssr: false, loading: loadingPlaceholder }
);
const OffPlanEval = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.OffPlanEval })),
  { ssr: false, loading: loadingPlaceholder }
);
const ViralAgent = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.ViralAgent })),
  { ssr: false, loading: loadingPlaceholder }
);
const VideoAgent = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.VideoAgent })),
  { ssr: false, loading: loadingPlaceholder }
);
const SignalDetection = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.SignalDetection })),
  { ssr: false, loading: loadingPlaceholder }
);
const ROICalculator = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.ROICalculator })),
  { ssr: false, loading: loadingPlaceholder }
);
const CryptoBuyerPage = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.CryptoBuyerPage })),
  { ssr: false, loading: loadingPlaceholder }
);
const AreaGuides = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.AreaGuides })),
  { ssr: false, loading: loadingPlaceholder }
);
const MarketDashboard = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.MarketDashboard })),
  { ssr: false, loading: loadingPlaceholder }
);
const SocialAgent = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.SocialAgent })),
  { ssr: false, loading: loadingPlaceholder }
);
const Newsletter = dynamic<MockupProps>(
  () => import("./ContentMockups").then(m => ({ default: m.Newsletter })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── OUTBOUND ──────────────────────────────────────────────────────────────
const LinkedInScrape = dynamic<MockupProps>(
  () => import("./OutboundMockups").then(m => ({ default: m.LinkedInScrape })),
  { ssr: false, loading: loadingPlaceholder }
);
const ForumListener = dynamic<MockupProps>(
  () => import("./OutboundMockups").then(m => ({ default: m.ForumListener })),
  { ssr: false, loading: loadingPlaceholder }
);
const ColdOutreachSystem = dynamic<MockupProps>(
  () => import("./OutboundMockups").then(m => ({ default: m.ColdOutreachSystem })),
  { ssr: false, loading: loadingPlaceholder }
);

// ─── WEB TOOLS ─────────────────────────────────────────────────────────────
const LoginMyList = dynamic<MockupProps>(
  () => import("./WebToolsMockups").then(m => ({ default: m.LoginMyList })),
  { ssr: false, loading: loadingPlaceholder }
);
const PropertyMap = dynamic<MockupProps>(
  () => import("./WebToolsMockups").then(m => ({ default: m.PropertyMap })),
  { ssr: false, loading: loadingPlaceholder }
);
const PropertyCompare = dynamic<MockupProps>(
  () => import("./WebToolsMockups").then(m => ({ default: m.PropertyCompare })),
  { ssr: false, loading: loadingPlaceholder }
);
const NeighbourhoodQuiz = dynamic<MockupProps>(
  () => import("./WebToolsMockups").then(m => ({ default: m.NeighbourhoodQuiz })),
  { ssr: false, loading: loadingPlaceholder }
);
const CityCalculator = dynamic<MockupProps>(
  () => import("./WebToolsMockups").then(m => ({ default: m.CityCalculator })),
  { ssr: false, loading: loadingPlaceholder }
);
const ScamChecker = dynamic<MockupProps>(
  () => import("./WebToolsMockups").then(m => ({ default: m.ScamChecker })),
  { ssr: false, loading: loadingPlaceholder }
);
const AreaFutureMap = dynamic<MockupProps>(
  () => import("./WebToolsMockups").then(m => ({ default: m.AreaFutureMap })),
  { ssr: false, loading: loadingPlaceholder }
);

/**
 * Map of stage name → lazy React component.
 * Stage.tsx renders: const MockupComp = mockupsMap[name]; return <MockupComp t={t} />;
 */
const mockupsMap: Record<string, React.ComponentType<MockupProps>> = {
  // Research
  "OpenClaw Research": OpenClawResearch,
  "Dev Pipeline Research": DevPipelineResearch,
  "Qdrant Research": QdrantResearch,
  "Hosting Strategy": HostingStrategy,
  "Infra Setup": InfraSetup,
  // Dev
  "PM Agent": PMAgent,
  "Dev Agent": DevAgent,
  "QA Agent": QAAgent,
  "Code Review": CodeReview,
  "Content Factory": ContentFactory,
  // Core
  "Property API": PropertyAPI,
  "CRM Integration": CRMIntegration,
  "Approval Hub": ApprovalHub,
  "Knowledge Base": KnowledgeBase,
  "KPI Dashboard": KPIDashboard,
  "Translation Memory": TranslationMemory,
  // Comms
  "WA Translation": WATranslation,
  "AI Sales Agent": AISalesAgent,
  "Timezone Drips": TimezoneDrips,
  "WA Compliance": WACompliance,
  // Multi
  "Multilingual Dirs": MultilingualDirs,
  "Regional SEO": RegionalSEO,
  "Data Collection": DataCollection,
  "Dynamic Homepage": DynamicHomepage,
  "Newsletters": NewslettersMulti,
  "Geo Campaigns": GeoCampaigns,
  // Lead
  "Lead Responder": LeadResponder,
  "Behavior Scoring": BehaviorScoring,
  "Lead Prediction": LeadPrediction,
  "Leak Detector": LeakDetector,
  "Viewing Scheduler": ViewingScheduler,
  "Deal Broadcaster": DealBroadcaster,
  "Post-Sale Nurture": PostSaleNurture,
  "WA Communities": WACommunities,
  "Investor Portal": InvestorPortal,
  "CRM Leaderboard": CRMLeaderboard,
  // Content
  "Price Monitor": PriceMonitor,
  "Morning Brief": MorningBrief,
  "Market Reports": MarketReports,
  "Dev Reports": DevReports,
  "Off-Plan Eval": OffPlanEval,
  "Viral Agent": ViralAgent,
  "Video Agent": VideoAgent,
  "Signal Detection": SignalDetection,
  "ROI Calculator": ROICalculator,
  "Crypto Buyer Page": CryptoBuyerPage,
  "Area Guides": AreaGuides,
  "Market Dashboard": MarketDashboard,
  "Social Agent": SocialAgent,
  "Newsletter": Newsletter,
  // Outbound
  "LinkedIn Scrape": LinkedInScrape,
  "Forum Listener": ForumListener,
  "Cold Outreach System": ColdOutreachSystem,
  // Web Tools
  "Login & My List": LoginMyList,
  "Property Map": PropertyMap,
  "Property Compare": PropertyCompare,
  "Neighbourhood Quiz": NeighbourhoodQuiz,
  "City Calculator": CityCalculator,
  "Scam Checker": ScamChecker,
  "Area Future Map": AreaFutureMap,
};

export type { MockupProps };
export default mockupsMap;
