// === AVATARS ===
export const AVATARS = [
  { id: "av_hacker_girl",    img: "/avatars/av_hacker_girl.jpg",    name: "Ghost" },
  { id: "av_hacker_glasses", img: "/avatars/av_hacker_glasses.jpg", name: "Coder" },
  { id: "av_hacker_blue",    img: "/avatars/av_hacker_blue.jpg",    name: "Cipher" },
  { id: "av_hacker_mask",    img: "/avatars/av_hacker_mask.jpg",    name: "Mask" },
  { id: "av_fox_hacker",     img: "/avatars/av_fox_hacker.jpg",     name: "Fox" },
  { id: "av_ceo_guy",        img: "/avatars/av_ceo_guy.jpg",        name: "Boss" },
  { id: "av_ceo_woman",      img: "/avatars/av_ceo_woman.jpg",      name: "CEO" },
  { id: "av_boss_older",     img: "/avatars/av_boss_older.jpg",     name: "Chief" },
  { id: "av_boss_curly",     img: "/avatars/av_boss_curly.jpg",     name: "Queen" },
  { id: "av_boss_watch",     img: "/avatars/av_boss_watch.jpg",     name: "Flex" },
  { id: "av_wolf_street",    img: "/avatars/av_wolf_street.jpg",    name: "Wolf" },
  { id: "av_locs_guy",       img: "/avatars/av_locs_guy.jpg",       name: "Vibes" },
  { id: "av_street_woman",   img: "/avatars/av_street_woman.jpg",   name: "Slay" },
  { id: "av_beanie_guy",     img: "/avatars/av_beanie_guy.jpg",     name: "Low" },
  { id: "av_curtain_girl",   img: "/avatars/av_curtain_girl.jpg",   name: "Chill" },
  { id: "av_beard_guy",      img: "/avatars/av_beard_guy.jpg",      name: "Grind" },
  { id: "av_robo_girl",      img: "/avatars/av_robo_girl.jpg",      name: "Cyber" },
  { id: "av_bunny_girl",     img: "/avatars/av_bunny_girl.jpg",     name: "Bunny" },
  { id: "av_shaved_woman",   img: "/avatars/av_shaved_woman.jpg",   name: "Power" },
  { id: "av_trenchcoat_guy", img: "/avatars/av_trenchcoat_guy.jpg", name: "Neo" },
  { id: "av_abdullah",      img: "/avatars/av_abdullah.jpg",      name: "Backbone" },
];

export const USERS_DEFAULT = [
  {id:"usama",name:"Usama",role:"The Visionary",avatar:"",color:"#bf5af2"},
  {id:"anna",name:"Anna",role:"The PM",avatar:"",color:"#ff6b35"},
  {id:"aakarshit",name:"Aakarshit",role:"Tech Wizard",avatar:"",color:"#00ff88"},
  {id:"ahsan",name:"Ahsan",role:"Build Engineer",avatar:"",color:"#00d4ff"},
  {id:"abdallah",name:"Abdallah",role:"The Backbone",avatar:"av_abdullah",color:"#ffcc00"},
];

export const REACTIONS = ["🔥","💀","🚀","🧠","⚡","🫡"];

export const ONBOARDING = [
  {title:"gm legend",desc:"welcome to the command center. every AI tool, every pipeline, every initiative — mapped and tracked.",icon:"🏴‍☠️",sub:"// the ecosystem starts here"},
  {title:"show your energy",desc:"smash reactions on stages you're excited about. the team sees your conviction in real-time.",icon:"🔥",sub:"// reactions = signal"},
  {title:"claim your territory",desc:"see something you want to own? claim it. your avatar shows up. you're accountable now.",icon:"💀",sub:"// ownership > opinions"},
  {title:"let's build",desc:"every pipeline feeds the next. every stage earns points. the one who ships the most, wins.",icon:"🚀",sub:"// talk is cheap. ship it."},
];

// === PIPELINE DATA (45 stages, April 2026 trim) ===
export const pipelineData = [
  {id:"research",name:"Research & Foundation",icon:"🔬",colorKey:"red",totalHours:"20-30h",priority:"NOW",desc:"Research OpenClaw, dev pipeline, hosting",stages:["OpenClaw Research","Dev Pipeline Research","Hosting Strategy","Infra Setup"],points:100},
  {id:"core",name:"Core Platform",icon:"🏗️",colorKey:"slate",totalHours:"70-100h",priority:"HIGH",desc:"Property API, CRM integration, approvals, analytics, translations",stages:["Property API","CRM Integration","Approval Hub","KPI Dashboard","Translation Memory"],points:250},
  {id:"multi",name:"Multilingual Engine",icon:"🌍",colorKey:"cyan",totalHours:"145-210h",priority:"HIGH",desc:"Content → SEO → personalization → campaigns",stages:["Multilingual Dirs","Regional SEO","Data Collection","Dynamic Homepage","Newsletters","Geo Campaigns"],points:350},
  {id:"leads",name:"Lead Lifecycle",icon:"🎯",colorKey:"purple",totalHours:"130-185h",priority:"HIGH",desc:"Capture → score → manage → nurture → CRM",stages:["Lead Responder","Behavior Scoring","Lead Prediction","Leak Detector","Viewing Scheduler","Deal Broadcaster","Post-Sale Nurture","WA Communities","CRM Leaderboard"],points:400},
  {id:"comms",name:"Comms Hub",icon:"💬",colorKey:"green",totalHours:"85-120h",priority:"HIGH",desc:"Translation → AI agent → drips → compliance",stages:["WA Translation","AI Sales Agent","Timezone Drips","WA Compliance"],points:250},
  {id:"content",name:"Content & Intel",icon:"📊",colorKey:"amber",totalHours:"195-265h",priority:"MEDIUM",desc:"Data → reports → viral → video → signals",stages:["Price Monitor","Morning Brief","Market Reports","Dev Reports","Off-Plan Eval","Anti-Pitch","Viral Agent","Video Agent","Signal Detection","ROI Calculator"],points:400},
  {id:"outbound",name:"Outbound",icon:"🚀",colorKey:"orange",totalHours:"30-45h",priority:"LOW",desc:"LinkedIn + Reddit → cold outreach system",stages:["LinkedIn Scrape","Forum Listener","Cold Outreach System"],points:120},
  {id:"tools",name:"Web Tools",icon:"🛠",colorKey:"lime",totalHours:"40-60h",priority:"MEDIUM",desc:"Interactive tools that capture leads",stages:["Property Compare","Quiz","City Calculator"],points:180},
  {id:"dev",name:"Dev Pipeline",icon:"⚡",colorKey:"cyan",totalHours:"25-35h",priority:"NOW",desc:"PM → Dev → QA → Content Factory",stages:["PM Agent","Dev Agent","QA Agent","Content Factory"],points:150},
];

export const stageDescs: Record<string, string> = {
  "OpenClaw Research": "Open-source AI agent framework evaluation. Compare Qwen, Ollama, Claude proxy — cost vs quality vs speed.",
  "Dev Pipeline Research": "Automated development pipeline. Test the PM → Dev → QA code loop using Claude Code + API orchestration.",
  "Hosting Strategy": "Server infrastructure decision. Docker on DigitalOcean vs AWS ECS — pick the right architecture for our stack.",
  "Infra Setup": "Production environment deployment. VPS setup, OpenClaw install, model config, WhatsApp API connection.",
  "Property API": "Internal property data service. Single API that powers every tool — bot, website, calculator, content engine.",
  "CRM Integration": "Connect all pipelines to existing CRM. Lead responder, scoring, approvals, and analytics all read/write to one system.",
  "Approval Hub": "Content review dashboard. One screen to approve or edit all AI-generated newsletters, blogs, follow-ups, campaigns.",
  "KPI Dashboard": "Real-time business intelligence plus AI performance tracking. Response times, conversion rates, pipeline value, agent accuracy, translation quality, QA rejection rates.",
  "Translation Memory": "Centralized translation database. Ensures consistent terminology across all 8 languages in every tool.",
  "Multilingual Dirs": "Localized website sections. /ru /hi /tr /cn /fa /fr /de /kz — native content, local keywords, hreflang tags.",
  "Regional SEO": "Search engine optimization per market. binayah.ru for Yandex, binayah.kz, WeChat official account, Baidu indexing.",
  "Data Collection": "Visitor intelligence system. IP-based nationality detection with RERA-compliant data handling. AI weekly behavioral reports per segment.",
  "Dynamic Homepage": "Personalized landing experience. Russian visitor sees Marina in RUB with Golden Visa CTA. Indian sees JVC in INR with EMI calculator.",
  "Newsletters": "Automated regional email campaigns. AI drafts market-specific newsletters per nationality. Human approves, system sends.",
  "Geo Campaigns": "Traffic-triggered advertising. Surge from Turkey detected → auto-launch Turkish Google/Meta campaign within hours.",
  "Lead Responder": "Instant inquiry handler with confidence thresholds. <60s AI response, qualifies in client's language, escalates to human when confidence is low.",
  "Behavior Scoring": "Website visitor scoring engine. Real-time scoring based on pages viewed, time spent, return visits — surfaces hot leads.",
  "Lead Prediction": "Conversion probability model. Trained on CRM history to predict which leads will close, by source and nationality.",
  "Leak Detector": "Pipeline loss prevention system. Nightly scan for leads gone silent. Auto-drafts personalized follow-ups with new matches.",
  "Viewing Scheduler": "Automated property viewing coordinator. AI offers time slots, books viewings, sends reminders, triggers post-viewing follow-up.",
  "Deal Broadcaster": "Price drop alert system. Monitors listings for price reductions → instant broadcast to matching investor segments.",
  "Post-Sale Nurture": "Client retention engine. Anniversary appreciation reports, property value updates, referral detection and reward.",
  "WA Communities": "Curated investor groups on WhatsApp. Area-specific (Marina Watchers, JVC Investors) co-managed by AI with market updates.",
  "CRM Leaderboard": "Lightweight gamification on existing CRM. Leaderboard widget, streaks, daily challenges. Not a custom CRM build — a 10-15h layer on top.",
  "WA Translation": "Real-time WhatsApp translation layer. Client texts in Russian → agent sees English → agent replies → client receives Russian.",
  "AI Sales Agent": "Multilingual AI property consultant with confidence thresholds. Speaks 10+ languages, queries property DB, qualifies, escalates when uncertain.",
  "Timezone Drips": "Time-aware message sequencing. Sends WhatsApp follow-ups during each prospect's local business hours automatically.",
  "WA Compliance": "WhatsApp Business API compliance layer. Opt-in management, template approval, quality rating monitoring. Without this, API gets banned. Critical.",
  "Price Monitor": "Competitor listing tracker. Daily automated scan of Bayut, Property Finder, Dubizzle for price changes and new listings.",
  "Morning Brief": "Daily team intelligence briefing. 7AM WhatsApp: DLD transactions, hot leads, SEO stats, silent lead alerts, team wins.",
  "Market Reports": "Automated weekly market analysis. DLD transaction data compiled into downloadable reports — doubles as lead magnet.",
  "Dev Reports": "Developer reputation scoring. Per-developer report cards covering on-time delivery, price appreciation, build quality, resale speed.",
  "Off-Plan Eval": "AI-powered project assessment tool. Scores any off-plan project across developer trust, location, payment plan, ROI projection, risk.",
  "Anti-Pitch": "Trust-building content strategy. Articles like 'when NOT to invest in Dubai' and 'developers I'd avoid' → honest content drives qualified leads.",
  "Viral Agent": "Trend-reactive content engine. Detects trending topics → auto-generates blog, social posts, email campaign, WhatsApp broadcast in all languages.",
  "Video Agent": "AI video production pipeline. Auto-generated property walkthrough videos with AI voiceover in 6+ languages. Abdullah building.",
  "Signal Detection": "Global opportunity radar. Monitors events (new HQs, currency shifts, new flight routes) → auto-triggers targeted campaigns.",
  "ROI Calculator": "Historical return visualization tool. 'What if you bought in 2019?' — shows actual returns, then suggests similar current opportunities.",
  "LinkedIn Scrape": "Professional network prospecting. Apollo + PhantomBuster to find executives relocating to Dubai or posting about investment.",
  "Forum Listener": "Online community monitor. Scans r/dubai, r/expats, FB groups for high-intent posts about property, relocating, investing.",
  "Cold Outreach System": "End-to-end cold email pipeline. Email enrichment → domain warming → AI-personalized sequences → A/B testing → auto-pause on reply. One integrated system.",
  "Property Compare": "Interactive comparison tool. Side-by-side AI analysis of any two properties — PDF download captures the lead.",
  "Quiz": "Neighborhood matching quiz. 5 fun questions → 'You're a JVC person!' result with matching listings. Viral + lead capture.",
  "City Calculator": "Cross-city investment comparison. Moscow vs Dubai: yield, tax, visa, growth side-by-side — designed to be shared on social.",
  "PM Agent": "AI project manager. Reads TASKS.md, prioritizes backlog, assigns tickets to Dev Agent, tracks completion in LOG.md.",
  "Dev Agent": "Autonomous coding agent. Claude Code reads tasks, writes code, runs tests, commits to git. No human intervention needed.",
  "QA Agent": "Automated quality assurance. Reviews Dev Agent's code changes, runs test suite, sends back for fixes until everything passes.",
  "Content Factory": "Launch kit generator. New project detected → full marketing package (blog, social, email, WA broadcast, landing page, video) in 12 minutes.",
};

export const stageDefaults: Record<string, {status: string; points: number; desc: string}> = {};
pipelineData.forEach(p => {
  p.stages.forEach((s, i) => {
    stageDefaults[s] = {
      status: p.id === "dev" && i < 3 ? "active" : ["research"].includes(p.id) && i < 2 ? "in-progress" : i < Math.ceil(p.stages.length * 0.4) ? "planned" : "concept",
      points: Math.round(p.points / p.stages.length),
      desc: stageDescs[s] || "",
    };
  });
});
["Video Agent", "Multilingual Dirs"].forEach(s => { if (stageDefaults[s]) stageDefaults[s].status = "in-progress"; });

// === TYPES ===
export interface SubtaskItem { id: number; text: string; done: boolean; by: string; }
export interface CommentItem { id: number; text: string; by: string; time: string; }
export type ActivityItem = { type: string; user: string; target: string; detail: string; time: number };
export const STATUS_ORDER = ["concept", "planned", "in-progress", "active"];

export interface UserType {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  aiAvatar?: string; // base64 data URL when using AI-generated pfp
}
