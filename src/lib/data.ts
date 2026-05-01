// === AVATARS ===
export const AVATARS: Array<{ id: string; img: string; name: string; zoom?: number }> = [
  { id: "av_hacker_girl",    img: "/avatars/av_hacker_girl.jpg",    name: "Ghost" },
  { id: "av_hacker_glasses", img: "/avatars/av_hacker_glasses.jpg", name: "Coder" },
  { id: "av_hacker_blue",    img: "/avatars/av_hacker_blue.jpg",    name: "Cyber", zoom: 1.6 },
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
  { id: "av_hacker_hoodie",  img: "/avatars/av_hacker_hoodie.jpg",  name: "Hood" },
  { id: "av_trenchcoat_guy", img: "/avatars/av_trenchcoat_guy.jpg", name: "Neo" },
  { id: "av_abdullah",      img: "/avatars/av_abdullah.jpg",      name: "Backbone" },
  { id: "av_cyber_woman",   img: "/avatars/av_cyber_woman.jpg",   name: "Viper" },
  { id: "av_tech_founder",  img: "/avatars/av_tech_founder.jpg",  name: "Founder" },
  { id: "av_exec_woman",    img: "/avatars/av_exec_woman.jpg",    name: "Sharp" },
  { id: "av_furry_fox",     img: "/avatars/av_furry_fox.jpg",     name: "Blaze" },
];

// Color picks tested for AA-large readability on BOTH dark theme bgCard (#0d0a18 etc)
// AND light theme bgCard (#fff). Brightened originals (#00ff88, #ffcc00) had contrast
// ~1.1 on white — invisible. Replacements stay vibrant on dark while dropping into
// readable territory on light.
export const USERS_DEFAULT = [
  {id:"usama",name:"Usama",role:"The Visionary",avatar:"",color:"#a855f2"},     // purple — kept vivid, slightly muted
  {id:"anna",name:"Anna",role:"The Architect",avatar:"",color:"#ff6b35"},       // orange — already readable on white
  {id:"aakarshit",name:"Aakarshit",role:"Tech Wizard",avatar:"",color:"#00b370"}, // forest green — was #00ff88 (invisible on white)
  {id:"ahsan",name:"Ahsan",role:"Build Engineer",avatar:"",color:"#0099cc"},    // sea cyan — was #00d4ff
  {id:"abdallah",name:"Abdallah",role:"The Backbone",avatar:"",color:"#d4a000"}, // mustard — was #ffcc00 (invisible on white)
  {id:"prajeesh",name:"Prajeesh",role:"The PM",avatar:"",color:"#0891b2"},      // teal — was #22d3ee
  // TEMP users — remove when no longer needed
  {id:"guest1",name:"Guest 1",role:"Observer",avatar:"",color:"#6366f1"},
  {id:"guest2",name:"Guest 2",role:"Executive",avatar:"",color:"#ec4899"},
];

export const REACTIONS = ["🔥","💀","🚀","🧠","⚡","🫡"];
export const ADMIN_IDS = ["anna"]; // root (super-admin) — auto-operator of every workspace, only role allowed to create/delete workspaces
export const EXEC_IDS = ["usama", "abdallah", "guest2"]; // guest2 is TEMP exec // founder/exec view — broad read-only visibility + proposal requests

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  colorKey: string;
  members: string[];    // user IDs who belong here (includes operators)
  captains: string[];   // operators — approve, manage members, change ranks (legacy field name kept for state compat)
  pipelineIds: string[]; // which pipelines live in this workspace
}

export const DEFAULT_WORKSPACE_ID = "war-room";

export const ONBOARDING = [
  {title:"gm legend",desc:"welcome to the command center. every AI tool, every pipeline, every initiative — mapped and tracked.",icon:"🏴‍☠️",sub:""},
  {title:"show your energy",desc:"smash reactions on stages you're excited about. the team sees your conviction in real-time.",icon:"🔥",sub:"// reactions = signal"},
  {title:"claim your territory",desc:"see something you want to own? claim it. your avatar shows up. you're accountable now.",icon:"💀",sub:"// ownership > opinions"},
  {title:"let's build",desc:"every pipeline feeds the next. every stage earns points. the one who ships the most, wins.",icon:"🚀",sub:"// talk is cheap. ship it."},
];

// === PIPELINE DATA ===
export const pipelineData = [
  {
    id:"research",name:"Research & Foundation",icon:"🔬",colorKey:"red",totalHours:"20-30h",priority:"NOW",
    desc:"Framework, models, infra. Every other pipeline depends on these decisions.",
    stages:["OpenClaw Research","Dev Pipeline Research","Qdrant Research","Hosting Strategy","Infra Setup"],
    points:100,
  },
  {
    id:"dev",name:"Dev Agent Pipeline",icon:"⚡",colorKey:"cyan",totalHours:"25-35h",priority:"NOW",
    desc:"The pipeline that builds all other pipelines. 5-person team ships like 20.",
    stages:["PM Agent","Dev Agent","QA Agent","Code Review","Content Factory"],
    points:150,
  },
  {
    id:"core",name:"Core Platform",icon:"🏗️",colorKey:"slate",totalHours:"70-100h",priority:"HIGH",
    desc:"The foundation every other pipeline plugs into. One API, one CRM, one brain.",
    stages:["Property API","CRM Integration","Approval Hub","Knowledge Base","KPI Dashboard","Translation Memory"],
    points:250,
  },
  {
    id:"comms",name:"Comms Hub",icon:"💬",colorKey:"green",totalHours:"85-120h",priority:"HIGH",
    desc:"AI translation + multilingual sales agent. Kills the 30-40% language barrier.",
    stages:["WA Translation","AI Sales Agent","Timezone Drips","WA Compliance"],
    points:250,
  },
  {
    id:"multi",name:"Multilingual Engine",icon:"🌍",colorKey:"cyan",totalHours:"145-210h",priority:"HIGH",
    desc:"8 languages, regional SEO, behavior tracking, dynamic personalization.",
    stages:["Multilingual Dirs","Regional SEO","Data Collection","Dynamic Homepage","Newsletters","Geo Campaigns"],
    points:350,
  },
  {
    id:"leads",name:"Lead Lifecycle",icon:"🎯",colorKey:"purple",totalHours:"145-205h",priority:"HIGH",
    desc:"Capture → score → predict → recover → schedule → nurture → retain. Zero leads lost.",
    stages:["Lead Responder","Behavior Scoring","Lead Prediction","Leak Detector","Viewing Scheduler","Deal Broadcaster","Post-Sale Nurture","WA Communities","CRM Leaderboard","Investor Portal"],
    points:440,
  },
  {
    id:"content",name:"Content & Intel",icon:"📊",colorKey:"amber",totalHours:"195-265h",priority:"MEDIUM",
    desc:"Market intelligence, AI content, anti-pitch trust plays, viral lead tools.",
    stages:["Price Monitor","Morning Brief","Market Reports","Dev Reports","Off-Plan Eval","Viral Agent","Video Agent","Signal Detection","ROI Calculator","Crypto Buyer Page","Area Guides","Market Dashboard","Social Agent","Newsletter"],
    points:400,
  },
  {
    id:"tools",name:"Web Tools",icon:"🛠",colorKey:"lime",totalHours:"40-60h",priority:"MEDIUM",
    desc:"Interactive tools people actually share. Every result requires contact info.",
    stages:["Login & My List","Property Map","Property Compare","Neighbourhood Quiz","City Calculator","Scam Checker","Area Future Map"],
    points:180,
  },
  {
    id:"outbound",name:"Outbound",icon:"🚀",colorKey:"orange",totalHours:"30-45h",priority:"LOW",
    desc:"LinkedIn + Reddit → cold email system. Q4 2026 — inbound ROI is higher right now.",
    stages:["LinkedIn Scrape","Forum Listener","Cold Outreach System"],
    points:120,
  },
];

export const stageDescs: Record<string, string> = {
  // RESEARCH
  "OpenClaw Research": "Compare Qwen 3.6+, Ollama, Claude proxy, and Claude API. This decision sets the cost structure for every agent.",
  "Dev Pipeline Research": "Test the PM → Dev → QA loop using Claude Code + API. Does it actually ship without humans?",
  "Qdrant Research": "Pick our vector DB. Qdrant local vs cloud, chunking strategy, doc indexing approach. Feeds directly into Knowledge Base.",
  "Hosting Strategy": "Docker on DigitalOcean vs AWS ECS. One decision affects deployment speed for every agent we build.",
  "Infra Setup": "VPS live, Docker running, OpenClaw deployed, WhatsApp Business API connected. The ground floor.",

  // DEV PIPELINE
  "PM Agent": "Reads TASKS.md, prioritizes backlog, assigns to Dev Agent, tracks in LOG.md. Humans set strategy — PM Agent handles coordination.",
  "Dev Agent": "Reads tickets, analyzes codebase, writes code, runs tests, fixes failures, commits to git. No human needed.",
  "QA Agent": "Reviews every change: correctness, tests, error handling, docs. Fails → sends back to Dev Agent with fix instructions and line refs.",
  "Code Review": "Human does a 5-min sanity check on QA-passed code, plans next targets, hands back to PM Agent.",
  "Content Factory": "New project detected → blog in 8 langs, social posts, email campaign, WA draft, landing page. 12 minutes.",

  // CORE PLATFORM
  "Property API": "Single API powering the bot, website, calculator, and content engine. Queryable by area, price, beds, ROI, developer.",
  "CRM Integration": "Connect every pipeline to the existing CRM so nothing lives in a silo.",
  "Approval Hub": "One screen: approve, edit, or reject all AI-generated content before it reaches clients.",
  "Knowledge Base": "Shared vector memory for all agents. Codebase, docs, and business knowledge indexed in Qdrant. Dev-first, then expands.",
  "KPI Dashboard": "Real-time: response time, conversion by nationality, pipeline value, AI accuracy, QA rejection rate.",
  "Translation Memory": "Translate 'sea view apartment' in Russian once — every tool uses it forever. 800+ terms across 8 languages.",

  // COMMS HUB
  "WA Translation": "Client texts in Russian → agent sees English → agent replies → client gets Russian. Auto-detected. All languages. Fractions of a cent.",
  "AI Sales Agent": "Multilingual property consultant. Queries the DB, qualifies in real-time, escalates when confidence is low.",
  "Timezone Drips": "Follow-ups in each prospect's local business hours. Moscow 9AM, Mumbai 10:30, Beijing 8AM. No Friday prayer pings.",
  "WA Compliance": "Opt-in management, template approval, quality rating monitoring. Without this, the API gets banned. Critical.",

  // MULTILINGUAL ENGINE
  "Multilingual Dirs": "/ru /hi /tr /cn /fa /fr /de /kz — not just translated, but localized. Turkish page leads with payment plans and direct flights from Istanbul.",
  "Regional SEO": "binayah.ru for Yandex, binayah.kz, binayah.cn for Baidu (needs ICP licence). WeChat Official Account, Weibo, Hongshu.",
  "Data Collection": "IP geolocation + behavior tracking → weekly AI report: 'Russian visitors, avg budget $500K-1.5M, 80% investment.'",
  "Dynamic Homepage": "Russian visitor sees Marina in RUB with Golden Visa CTA. Indian sees JVC in INR with EMI calculator. Same URL.",
  "Newsletters": "Russian list: ruble hedging. Indian: off-plan + NRI tax. Turkish: payment plans. AI drafts, human approves.",
  "Geo Campaigns": "Turkish traffic spikes in Dubai? Turkish campaign ready for approval within hours. Data Collection triggers it.",

  // LEAD LIFECYCLE
  "Lead Responder": "< 60s AI response. Qualifies in client's language. Confident: sends matches + briefs agent. Uncertain: escalates with context.",
  "Behavior Scoring": "3rd visit, 12min on Marina 3BR, viewed payment plan = score 92, alert Sarah. Surfaces hot leads before they fill a form.",
  "Lead Prediction": "Trained on 2,400+ CRM records: Russian from Bayut = 72% close rate. Improves weekly. Tells agents where to spend time.",
  "Leak Detector": "Every 9PM: flag leads silent 3+ days, auto-draft follow-up with new matching listings. Zero leads forgotten.",
  "Viewing Scheduler": "AI offers slots via WhatsApp, confirms, notifies agent, sends reminder, triggers post-viewing follow-up.",
  "Deal Broadcaster": "Marina drops 1.3M → 1.2M → 34 matching investors get instant WA alert. First-mover advantage.",
  "Post-Sale Nurture": "1st anniversary: appreciation report + quarterly updates. Turns one-time buyers into referral machines.",
  "WA Communities": "'Marina Watchers', 'CIS Investor Circle.' AI posts DLD data and market commentary. We host the conversation.",
  "CRM Leaderboard": "Leaderboard widget, streaks, and daily challenges layered on the existing CRM. Not a rebuild — a 10-15h layer on top.",
  "Investor Portal": "Live dashboard for landlord clients — occupancy, rent, costs, market value vs purchase price. AI flags vacancies and drafts renewal messages. Multilingual.",

  // CONTENT & INTEL
  "Price Monitor": "Daily scan of Bayut, PF, Dubizzle for price drops, new listings, and underpriced properties.",
  "Morning Brief": "7AM WhatsApp: DLD summary, hot leads, SEO stats, silent alerts, team wins.",
  "Market Reports": "Weekly DLD transactions → branded PDF. Free download = lead captured. Shares pipeline with Market Dashboard.",
  "Dev Reports": "Per-developer report cards: on-time %, appreciation, resale speed, build quality. From DLD data.",
  "Off-Plan Eval": "AI scores any off-plan project: developer trust, location, payment plan, ROI, risk. Data-backed.",
  "Viral Agent": "Detects trending topic → blog, social posts, email campaign, and WA broadcast. Anna reviews by 9AM. We publish first.",
  "Video Agent": "Property walkthroughs with AI voiceover in 6+ languages. Abdullah builds the pipeline, AI does the rest.",
  "Signal Detection": "Microsoft opens Dubai HQ → target execs. Ruble drops → shift CIS spend. New flight → create landing page.",
  "ROI Calculator": "'What if you bought in 2019?' Shows real returns. Then suggests similar current opportunities.",
  "Crypto Buyer Page": "How to buy Dubai property with crypto. 'Pay with crypto' badge on listings. SEO for BTC/USDT/ETH buyers.",
  "Area Guides": "Deep guide per area: Downtown, Marina, JVC, Palm, etc. Lifestyle, ROI, schools, honest downsides. Primary SEO driver.",
  "Market Dashboard": "Live public intelligence: transactions, price/sqft, trends by area and developer. AI projects 12-month trajectory.",
  "Social Agent": "Branded accounts on Reddit, LinkedIn, X. AI replies helpfully to property questions citing real DLD data. Profile does the selling.",
  "Newsletter": "Weekly opt-in read. One insight, one data point, one honest take. Good enough to forward.",

  // OUTBOUND
  "LinkedIn Scrape": "Apollo + PhantomBuster. Track CFOs moving to Dubai, 'just moved to UAE' posts, company expansion announcements.",
  "Forum Listener": "Monitors r/dubai, r/expats, FB groups for high-intent posts. Flags for outreach. Shares infra with Social Agent.",
  "Cold Outreach System": "Email enrichment → domain warming → AI-personalized sequences → A/B testing → auto-pause on reply.",

  // WEB TOOLS
  "Login & My List": "User accounts, saved properties, and property submission form. Submission → agent CRM alert within 24h.",
  "Property Map": "Airbnb-style map with zone overlays: off-plan rate, service charge, construction risk, noise. AI chat panel.",
  "Property Compare": "Side-by-side AI analysis of any two properties. PDF download requires contact info.",
  "Neighbourhood Quiz": "5 questions → 'You're a JVC person!' with matching listings. Viral + lead capture.",
  "City Calculator": "Moscow vs Dubai, London vs Dubai. Yield, tax, visa, growth side-by-side. Designed to be shared.",
  "Scam Checker": "Paste any property ad. RERA check, DLD price comps, scam language detection. Verdict in 15 seconds.",
  "Area Future Map": "Type any Dubai address → satellite map showing approved construction, zoning, noise risk, 10-year outlook.",
};

// === FULL DESCRIPTIONS (shown in expanded ABOUT section) ===
export const stageLongDescs: Record<string, string> = {
  // RESEARCH
  "OpenClaw Research": "We need to pick the AI agent framework before committing to infrastructure — this decision sets the cost and capability ceiling for everything else. Evaluating Qwen 3.6+ (free, fast, good quality), Claude proxy (near-free via our API usage), Ollama (fully local), and Claude API direct ($$/token, highest quality). We're measuring inference speed, output quality, cost per query, and integration complexity with our stack. Output: a written decision doc and a working test agent before we touch any production infra.",
  "Dev Pipeline Research": "Testing whether the full PM → Dev → QA loop can actually ship production code without humans in the loop. PM Agent reads TASKS.md, breaks it into tickets, assigns one. Dev Agent analyzes the codebase, writes the code, runs tests, commits. QA Agent reviews, finds failures, sends back with fix instructions. Loop repeats until QA passes. If this works, a 5-person team can build at 20× speed. Output: a working end-to-end loop on a real task, with time benchmarks and documented failure modes.",
  "Qdrant Research": "Picking our vector database — the shared memory layer that all agents will use to understand context. Comparing Qdrant local (free, NDA-compliant, we own the data), Qdrant Cloud ($25+/mo, easier ops), and Pinecone ($70+/mo, more managed). Key decisions: chunking strategy for code vs business docs, which embedding model to use, and whether local deployment is required for NDA compliance. This feeds directly into the Knowledge Base build.",
  "Hosting Strategy": "Before deploying anything, we need to commit to a server architecture. Option A: Docker on DigitalOcean ($12/mo, fast to deploy, simple to manage). Option B: AWS ECS ($30/mo, auto-scales, more complex). Starting with DigitalOcean is the right call — deploy faster, learn what we actually need, migrate later when we're running 10+ agents simultaneously. This decision affects how fast we can ship every single agent that follows.",
  "Infra Setup": "Getting the production environment fully live and connected: VPS provisioned, Docker installed, OpenClaw deployed and running, first model loaded (Qwen 3.6+), WhatsApp Business API connected and tested. First test agent responding to a real query. This is the ground floor — nothing else ships until this is done. Once it's live, every other pipeline has a foundation to deploy onto.",

  // DEV PIPELINE
  "PM Agent": "AI project manager already running in our dev pipeline. Reads TASKS.md, understands task dependencies, prioritizes the backlog, assigns the highest-priority ticket to Dev Agent, and logs progress in LOG.md. Humans set the strategic priorities — PM Agent handles all the coordination and sequencing. When Dev Agent finishes a task, PM Agent verifies completion and immediately assigns the next one. No standups needed.",
  "Dev Agent": "Autonomous coding agent built on Claude Code — already live in our pipeline. Given a ticket, it reads the codebase to understand context, writes the required code, runs the full test suite, fixes any failures, and commits to git. Handles webhook integrations, API endpoints, frontend components, and data processing scripts. No human intervention needed during execution. Humans only review after QA has already validated it.",
  "QA Agent": "Automated quality gate already running between Dev Agent and human review. Reviews every code change: correctness check, full test suite execution, error handling verification, and documentation check. If anything fails, it sends the code back to Dev Agent with specific fix instructions including file names and line references. Loops until everything passes. Only clean, reviewed code enters the human review queue.",
  "Code Review": "The human checkpoint before anything hits production. After QA passes and all deliverables are present, the PR enters the review queue. A team member does a 5-minute sanity check — does this work end-to-end, are there obvious edge cases, is there anything QA might have missed? Then approves the merge and hands new targets back to PM Agent for the next cycle. Not a code audit — a final common-sense check.",
  "Content Factory": "When a new project is detected (e.g. Creek Vista T3 launches), the system generates a complete marketing kit in under 12 minutes: blog article in 8 languages (SEO optimized), social posts for LinkedIn, IG, and X, email campaign copy for 4 nationality segments, WhatsApp broadcast draft, landing page copy, and a video walkthrough script for Abdullah. Everything lands in Approval Hub — nothing reaches clients unreviewed. One input, a full campaign output.",

  // CORE PLATFORM
  "Property API": "Single source of truth for all property data across the entire ecosystem. One API powers the AI sales agent, website search, property comparison tool, ROI calculator, and content engine — all reading from the same source. Queryable by area, price range, beds, ROI, developer, and listing status. Pulls live data from Bayut, Property Finder, and our CRM. Without this, every tool builds its own data layer and they all diverge. With it, a price update in one place reflects everywhere instantly.",
  "CRM Integration": "Connecting every pipeline to the existing CRM so nothing runs in a silo. Lead Responder logs new leads and their qualification data. Behavior Scoring writes real-time scores back to lead records. Approval Hub tracks content review status. KPI Dashboard pulls everything together for reporting. Without this integration, we have 8 pipelines writing to 8 different places. With it, everything feeds one system — and the data is actually actionable.",
  "Approval Hub": "Content review dashboard that sits between AI output and client delivery. Every newsletter, blog post, follow-up message, and campaign draft lands here first. One screen per item: see the content, the target audience, and the AI's reasoning — then approve, edit, or reject. Zero unreviewed AI content reaches clients. But because everything arrives pre-formatted and context-aware, the review takes minutes not hours. The human remains in control; AI handles the drafting.",
  "Knowledge Base": "Shared vector memory layer that all agents query to understand context and history. Indexes the codebase, past PRs, internal docs, business knowledge, and property data into Qdrant. Built dev-first: Dev Agent and QA Agent use it to understand the existing architecture before writing or reviewing code. Then expands: Sales Agent queries it for property knowledge, Content Factory uses it for market context, Morning Brief uses it for historical data. One brain, all agents.",
  "KPI Dashboard": "Real-time view of both business performance and AI pipeline health in one screen. Business metrics: response time per agent (target <60s), conversion rate by nationality, pipeline value, agent close rates. AI metrics: lead qualification accuracy, translation correction rate, QA rejection rate, content approval rate. The goal is to know exactly where AI is helping, where humans are still needed, and where to invest next. All decisions driven by this dashboard.",
  "Translation Memory": "Central database that stores every translation made across all tools — so 'sea view apartment' is translated into Russian, Arabic, Mandarin, and Turkish exactly once, and every tool uses that same translation forever. 800+ real estate terms across 8 languages. Prevents the embarrassing situation where different tools call the same development by different names. Saves translation costs. Ensures brand consistency across every market.",

  // COMMS HUB
  "WA Translation": "Real-time bidirectional translation layer for all WhatsApp conversations. Client texts in any language — the agent sees English. Agent replies in English — the client receives their language. Auto-detected. Works for all 10+ languages simultaneously. Costs fractions of a cent per message. The client never knows the agent doesn't speak their language. This one feature can eliminate the 30-40% of leads we currently lose due to language barriers.",
  "AI Sales Agent": "Multilingual AI property consultant that handles first contact on the website and WhatsApp. Speaks every language natively, queries the Property API in real-time, qualifies leads on budget, timeline, and intent, and sends matching property options. When its confidence drops below a threshold, it escalates to a human agent — with a full briefing card including lead profile, conversation history, and recommended properties — so the agent picks up without repeating questions.",
  "Timezone Drips": "Message sequences that send during each prospect's local business hours, not ours. Moscow prospect gets their follow-up at 9AM MSK. Mumbai at 10:30AM IST. Beijing at 8AM CST. Istanbul at 12PM local time. Also respects cultural patterns: no messages during Friday prayers, no pings during Chinese New Year week. This makes automated follow-ups feel human and context-aware, which dramatically improves open and response rates.",
  "WA Compliance": "Ongoing WhatsApp Business API health management. Meta's compliance requirements are strict and actively enforced: opt-in records for every contact, all message templates pre-approved, quality rating monitored continuously. If quality drops to Medium, broadcast capability gets restricted. If it hits Low, the API gets banned. One bad broadcast campaign can take out our entire WhatsApp infrastructure. This stage protects every other pipeline that relies on WhatsApp. Non-negotiable.",

  // MULTILINGUAL ENGINE
  "Multilingual Dirs": "8 language versions of the website built as proper localized experiences — not Google-translated pages. /ru targets Yandex with Russian real estate search terms. /tr leads with payment plans and Istanbul direct flight info. /hi focuses on family communities and NRI investment angles. /cn integrates WeChat sharing. Each directory has native content, local keywords, and correct hreflang tags for regional search engine ranking. The goal: be found by buyers searching in their own language on their own search engine.",
  "Regional SEO": "Dedicated domains and profiles for regional search engines where our competitors are invisible. binayah.ru for Yandex, which heavily favors .ru domains in Russian results — a generic .com ranks poorly. binayah.kz for Kazakhstan, where Yandex dominates. binayah.cn for Baidu — requires a .cn domain and a Chinese ICP licence to rank at all; without it the site doesn't exist in China. WeChat Official Account, Weibo, and Hongshu for the Chinese social search ecosystem, which is where Chinese buyers actually discover properties.",
  "Data Collection": "Visitor intelligence system that turns anonymous traffic into actionable nationality segments. IP geolocation identifies where visitors are from. Behavioral tracking records pages viewed, time spent, price filters used, return visits, and scroll depth. Weekly AI report delivered every Monday: 'Russian visitors spend 3× more time on Marina pages, average session budget filter $500K-1.5M, 80% investment purpose.' This data feeds Dynamic Homepage personalization and triggers Geo Campaigns when traffic from a nationality spikes.",
  "Dynamic Homepage": "The same binayah.com URL renders a completely different experience depending on visitor nationality. Russian visitor sees Marina and Palm listings in RUB with a Golden Visa eligibility CTA. Indian visitor sees JVC and Business Bay in INR with an EMI calculator. Turkish visitor sees Business Bay in TRY with payment plan comparisons and Istanbul flight info. Personalization data comes from Data Collection — the same infrastructure. Increases time-on-site and lead quality by showing people exactly what's relevant to them.",
  "Newsletters": "Automated region-specific email campaigns that speak to each nationality's specific motivations. Russian segment gets ruble-hedging and safe-haven investment angles. Indian segment gets affordable off-plan options, NRI tax guides, and family community highlights. Turkish segment gets payment plan comparisons and DABA-level deals. AI drafts each version from that week's DLD data and market context. A human reviews and approves in Approval Hub before sending. Not a generic blast — a targeted message to each group in their language and frame.",
  "Geo Campaigns": "Traffic-triggered advertising that deploys campaigns in response to nationality spikes — automatically. If Turkish visitor traffic increases 40%+ week-over-week, the system auto-generates a Turkish Google and Meta campaign brief and puts it in Approval Hub for human review and launch — within hours, not days after the signal. Uses Data Collection as the trigger and Multilingual Dirs as the creative source. First-mover advantage: we respond to demand signals faster than any team that has to notice them manually.",

  // LEAD LIFECYCLE
  "Lead Responder": "Sub-60-second AI response to every new lead, at any hour, in their language. Qualifies the lead by asking about budget, timeline, property type, and intent. When confident (>80% threshold): sends 3 matching property options and creates a full briefing card for the agent (lead profile, conversation, recommended listings). When uncertain: escalates immediately with full context so the agent picks up without repeating questions. Industry data: leads contacted in <5 minutes are 21× more likely to convert. We respond in 23 seconds.",
  "Behavior Scoring": "Real-time scoring engine that surfaces high-intent visitors before they submit a form. Every action generates a score update: 3rd visit to Marina 3BR page + viewed payment plan section + 12 minutes on site = score 92, trigger alert to Sarah to call now. First-time visitor who bounced in 8 seconds = score 23, ignore. Agents stop working every lead equally and focus their time on the ones most likely to convert — with data to back up why.",
  "Lead Prediction": "Conversion probability model trained on 2,400+ historical CRM records that predicts which leads will close based on source and nationality. Russian lead from Bayut: 72% close rate. British lead from Property Finder: 45%. Cold outreach: 22%. Model retrains weekly as new conversions and losses are added to the dataset. Tells agents exactly where to spend time — and equally importantly, where to stop spending it. Changes from gut feel to data-driven prioritization.",
  "Leak Detector": "Nightly scan that finds every lead that's gone quiet and auto-drafts a personalized follow-up. Every night at 9PM: identify leads silent for 3+ days, search for new listings matching their stated criteria, generate a personalized follow-up message referencing the new matches, and queue it in Approval Hub for one-click send. Agents review in the morning and send with one click. Zero leads are forgotten. The system catches what humans miss and makes re-engagement effortless.",
  "Viewing Scheduler": "AI-managed viewing coordinator that handles all the logistics so agents just show up. Offers available time slots via WhatsApp in the lead's language. Confirms when they pick one. Sends agent a notification with property details and lead profile. Sends the lead a reminder the day before. Triggers a post-viewing follow-up sequence automatically if no booking update is received within 48 hours. Removes all the back-and-forth from the agent's plate — and means viewings never fall through cracks.",
  "Deal Broadcaster": "Price drop alert system that sends matching investors the right opportunity at the right moment. When a listing price drops, the system queries the database for all investors whose criteria match (area, bedroom count, budget range, intent) and sends an instant personalized WhatsApp alert. Marina Heights drops 100K — 34 matching investors get the alert within minutes. First-mover advantage: motivated investors act on price drops fast, and we're always first to tell them.",
  "Post-Sale Nurture": "Client retention and referral engine that keeps past buyers engaged and turns them into an active referral network. Sequence: 30-day welcome, 6-month market update for their area, 1-year anniversary report showing exact appreciation and current value, quarterly updates with nearby development news and yield data. Referral detection: if a client messages about a friend looking to buy, the system flags it immediately. One re-engagement cost to acquire a referral vs full CAC for a new lead.",
  "WA Communities": "Curated WhatsApp investor groups co-managed by AI and a team member. 'Marina Watchers' for Marina investors. 'CIS Investor Circle' for Russian-speaking buyers. 'Business Bay Investors' for the commercial segment. AI posts weekly DLD transaction data, new listing alerts, price movement commentary, and market news. The team member adds a human voice and answers direct questions. These communities keep Binayah top-of-mind between transactions and create a trusted network effect — members invite other investors.",
  "CRM Leaderboard": "Lightweight gamification layer on top of the existing CRM — not a rebuild. A leaderboard widget that tracks response times, leads contacted, viewings booked, and follow-up streaks. Daily challenges: follow up with 5 leads for +200XP. Weekly reset keeps it fresh. The goal is making agents actually want to open the CRM — and compete on the metrics that move the business, not vanity numbers. Estimated 10-15h to build as a layer on the existing system. Not a custom CRM.",
  "Investor Portal": "Private dashboard giving Binayah's landlord clients full real-time visibility into their asset from anywhere in the world — without giving them the ability to act without Binayah. Live occupancy status, rent received to date, maintenance costs logged, service charge schedule, vacancy days counter, and market value vs purchase price with a live appreciation curve. All leads and transactions flow through Binayah — the portal shows data, never replaces the relationship. AI layer: vacant unit triggers a suggested price adjustment and a pre-drafted landlord message. Lease renewal 90 days out triggers a market update with comparable rents. Significant appreciation (>15%) triggers a portfolio review prompt and a referral ask. Available in Arabic, Russian, Chinese, and English with region-appropriate payment method display.",

  // CONTENT & INTEL
  "Price Monitor": "Daily automated scan of Bayut, Property Finder, and Dubizzle for price changes and new listings across every Dubai area. Tracks: price drops by percentage and absolute value, new listings below market rate, developer promotions, and listings that have been sitting >60 days. Output surfaces in the Morning Brief every day. Agents can act on opportunities — price reductions, motivated sellers, off-market deals — before competitors know they exist.",
  "Morning Brief": "7AM WhatsApp intelligence digest to the full team every day — replaces an hour of manual data gathering with 30 seconds of reading. Covers: DLD transactions from the previous day with area breakdowns, hot leads who need a call today, leads gone silent (Leak Detector output), price drops from Price Monitor, SEO traffic stats, team leaderboard movement, and any market-moving news. The team starts every day fully informed, not scrambling.",
  "Market Reports": "Weekly DLD transaction data compiled into a branded PDF market report covering transaction volumes by area, average prices, price trends, developer activity, and a 30-day forecast. Distributed as a free download requiring name and email — the highest-converting lead magnet because people who download market reports are actively researching an investment. Shares the DLD data pipeline with the Public Market Dashboard to minimize duplicate engineering work.",
  "Dev Reports": "AI-generated per-developer report cards built from DLD transaction history. For each developer: on-time delivery rate, price appreciation across their portfolio since completion, average resale speed, buyer nationality breakdown, and build quality signals from reviews and complaints. Updated quarterly. Dual use: helps our team give better investment advice, and serves as the content source for Developer Intelligence blog posts that rank organically and build trust.",
  "Off-Plan Eval": "AI-powered project evaluation tool that scores any off-plan development across 5 dimensions: developer trust score (from Dev Reports), location fundamentals (transport links, supply pipeline, area trajectory), payment plan flexibility (post-handover terms, deposit percentage), projected ROI (based on comparable completed projects), and risk rating (construction delays, developer track record). Output: STRONG BUY / HOLD / AVOID verdict with the specific factors. Gives investors data-backed confidence instead of a sales pitch.",
  "Viral Agent": "Trend-reactive content engine that monitors what's going viral on LinkedIn, Google Trends, and Reddit — and generates a complete multi-format kit in minutes. Trending: 'Golden Visa 2026 changes' → blog in 3 languages, LinkedIn carousel, IG reel script, WhatsApp broadcast draft. Anna reviews the full kit in Approval Hub by 9AM. We publish before competitors have even scheduled a meeting to discuss the topic. The goal: Binayah is the first voice every time something property-related trends.",
  "Video Agent": "AI video production pipeline for property walkthrough content, being built by Abdullah. He provides the visual assets (raw footage, renders, or developer materials). The pipeline writes the script, generates professional voiceover in 6+ languages using AI voice synthesis, and produces a finished walkthrough video per language. Target: full walkthrough for any project in 🇬🇧🇷🇺🇨🇳🇹🇷🇮🇳🇩🇪 in under 2 hours from source material. Multilingual video at a fraction of traditional production cost.",
  "Signal Detection": "Global opportunity radar that monitors external signals and auto-triggers targeted campaigns in response. When Microsoft announces a Dubai HQ (10K+ employees relocating) → alert team to target CFOs and senior execs. When the ruble drops 6% → shift CIS campaign angles to AED stability and safe-haven messaging. When a new Flydubai route launches from Istanbul → prepare Turkish landing page and campaign brief. Connects to Content Factory and Geo Campaigns for execution. The goal: respond to demand signals before competitors have noticed them.",
  "ROI Calculator": "Historical return visualization tool that makes Dubai's investment case undeniable with real data. 'What if you bought this Marina 2BR in 2019?' Shows actual sale prices, rental income, appreciation, and net yield over the period — real DLD numbers, not projections. Then suggests a current opportunity with comparable fundamentals. Viral because people screenshot and share the returns. Lead capture because the full PDF report requires contact info. Converts skeptics better than any brochure.",
  "Crypto Buyer Page": "Dedicated landing page and SEO content targeting buyers who want to purchase Dubai property with cryptocurrency. Content covers: how it works legally in the UAE, which currencies are accepted (BTC, ETH, USDT, USDC), the exact process step-by-step (RERA verification → escrow → transfer → title deed), and which developers allow it. 'Pay with crypto' badge added to qualifying listings across the site. SEO targets 'buy Dubai property with Bitcoin', 'crypto real estate UAE', 'USDT property Dubai' — a segment with high purchase intent and zero competition.",
  "Area Guides": "Deep authoritative guides to every major Dubai area — the content Google ranks for high-intent queries and serious buyers bookmark before making a decision. One guide per area: Downtown, Marina, JVC, Business Bay, Palm, JBR, Dubai Hills, Creek Harbour, DIFC, Deira. Each covers: lifestyle and community feel, schools and nurseries nearby, transport links and commute times, supermarkets and dining options, typical price range and rental yield, who buys here and why, and honest downsides that other agents won't mention. AI drafts from DLD data and curated inputs. Human reviews. Primary organic SEO driver for the site.",
  "Market Dashboard": "Live public intelligence dashboard showing Dubai property data that most agents keep proprietary. Transaction volume, price per sqft, and price trends — filterable by area, developer, and emirate (Dubai, Abu Dhabi, Ajman, Sharjah). Toggle between volume, value, transaction count, off-plan vs ready split, and dominant buyer nationality by area. Predictive layer: 5 years of DLD data feeding a model that projects 12-month price trajectory per area. Designed to be the most useful free real estate data tool in the UAE — which makes Binayah the most trusted source before any conversation starts.",
  "Social Agent": "Branded accounts on Reddit, LinkedIn, and X that build genuine trust by being actually, specifically useful — not salesy. AI monitors relevant conversations: r/dubai, r/expats, r/DubaiRealEstate, LinkedIn posts about relocating to UAE, X threads on UAE property. When it finds a relevant question, it replies with a helpful, specific, non-promotional answer citing real DLD data and giving honest takes on things other agents avoid. People find the reply useful, click the profile, see Binayah, and come inbound. The account builds its own reputation and follower base over time. Shares monitoring infrastructure with Forum Listener.",
  "Newsletter": "A weekly email that people actively sign up for and forward to friends — completely distinct from the nationality-targeted Segmented Newsletters. One market insight, one data point most people missed, one honest take per issue. Examples: 'The one thing nobody tells you about off-plan ROI', 'The 3 developers I'd avoid right now and why', 'Dubai vs London: what the numbers actually say'. AI drafts from DLD data and Morning Brief output. A human edits the voice and sends. Subscribers self-select as high-intent — they signed up for property intel, which means they're actively thinking about buying or investing.",

  // OUTBOUND
  "LinkedIn Scrape": "Professional network prospecting to find high-budget, high-intent targets before they come to us. Using Apollo and PhantomBuster to track: CFOs and senior executives posting about relocating to Dubai, companies announcing UAE office expansions, 'just moved to Dubai' posts from senior professionals, and HR announcements about new regional hubs. These are people with real budget who are actively making a move — the highest-quality outbound prospects available. Output goes directly to Cold Outreach System for enrichment and personalized sequencing.",
  "Forum Listener": "Monitors Reddit, Facebook groups, and forums for posts showing high purchase intent in real time. Specifically tracking r/dubai, r/expats, and r/DubaiRealEstate for 'buying property', 'property agent recommendations', and 'relocating to Dubai' posts. Also monitoring Dubai Expats Facebook group and expat forums. These posts appear before people have contacted any agent — we reach them first. High-intent signals go to Cold Outreach for direct response. Lower-intent conversations go to Social Agent for a helpful in-thread reply that builds awareness. Shares monitoring infrastructure to avoid duplicate work.",
  "Cold Outreach System": "End-to-end cold email pipeline that replaces 4 separate tools with one integrated system. Email enrichment via Hunter.io (verify and find emails for flagged prospects). Dedicated outreach domains with 2-3 week warming periods before sending. AI-personalized email sequences that reference the specific trigger event (their LinkedIn post, their company's announcement, their forum post). A/B testing across subject lines and opening hooks, running continuously. Auto-pause the moment a reply is detected to prevent over-sending. Deprioritized until Q4 2026 — inbound delivers higher ROI at our current stage.",

  // WEB TOOLS
  "Login & My List": "User identity layer that the rest of the website's features plug into. Visitors register or log in (email or Google). They can save favourite properties to a personal list and receive price change alerts. They can also submit their own property via a simple form — basic details, photos, asking price, current situation. Status shows 'Under Review' immediately. The agent gets a CRM alert and calls the owner within 24 hours to gather proper details and list it correctly. Without this login layer, we can't build saved searches, price alerts, personalisation, or the property map wishlists that keep users coming back.",
  "Property Map": "The most immersive property search experience in Dubai. Properties pinned on a live interactive map, searchable by zone. Each zone has a data overlay: off-plan completion rate for that area, average service charge, approved construction permits nearby, noise and air quality risk score, historical price trend, and dominant buyer nationality. Hidden risks surfaced visually — a zone with 12 towers under construction shows a warning flag before you even click. Click any pin: property card with real DLD price history. AI chat panel runs simultaneously — ask 'which zone has the best ROI under 1.5M?' and get an answer referencing what's visible on screen. Built in phases: basic map first, zone intelligence second, AI chat third.",
  "Property Compare": "Side-by-side AI analysis of any two properties that makes the decision obvious. Compares: price, ROI, location score, developer trust rating (from Dev Reports), readiness date, service charge estimate, and historical DLD transaction data for the building. AI summary: which property is better for investment vs end-use, what the key trade-offs are, and what similar properties have returned historically. Full PDF comparison report requires name and WhatsApp — captures the lead at the moment of highest intent, when they're actively deciding.",
  "Neighbourhood Quiz": "5-question quiz that matches any visitor to their ideal Dubai community. Questions cover lifestyle priorities (beach vs city, nightlife vs family), commute tolerance, budget range, and social preferences. Result: 'You're a JVC person!' — with 3 matching listings, an explanation of why JVC fits, and an honest note on downsides. Designed to be screenshot and shared (people tag friends: 'you need to take this'). Lead capture at the results page. Viral mechanism + education + lead generation in one lightweight tool.",
  "City Calculator": "Cross-city investment comparison that makes Dubai's advantages undeniable through side-by-side data. Moscow vs Dubai: rental yield (3.2% vs 7.1%), tax (13%+CGT vs 0%), residency path (none vs Golden Visa), 1-year price growth (+1.8% vs +14%), currency stability (RUB vs USD-pegged AED). Also covers London, Mumbai, Frankfurt, and Singapore comparisons. Built to be screenshot and shared on social — the numbers make the argument better than any sales pitch. Each shared screenshot reaches 500+ people in the exact demographic we're targeting.",
  "Scam Checker": "Paste any WhatsApp or Instagram property ad and get a scam verdict in 15 seconds. 5-step automated check: (1) RERA developer and agent registration verification, (2) price vs real DLD transaction comps for that specific area and building, (3) scam language pattern detection — 'guaranteed ROI', 'WhatsApp only', 'limited time offer' each flagged with explanation, (4) reverse image search to detect stolen listing photos, (5) plain-English verdict scored 0-100 with the specific red flags listed. The result is a shareable card. Strategic trust play: we're the brand that helps people avoid getting scammed, which makes us the first call when they're ready to buy for real.",
  "Area Future Map": "Environmental and planning due diligence tool — the risk assessment that almost nobody does before buying. Type any Dubai address. Within 10 seconds: satellite map with color-coded overlays showing approved construction permits within 1km, industrial and commercial zoning designations, waste facility proximity, green space pipeline, and Metro and road expansion plans. Five instant verdict cards: view corridor survival probability, noise risk score, air quality trajectory, incoming population density, and 10-year value trajectory based on infrastructure investment patterns. Shows risks that developers won't mention and that standard property listings never include.",
};

// === STAGE STATUSES ===
const stageStatusMap: Record<string, string> = {
  // Research
  "OpenClaw Research": "in-progress",
  "Dev Pipeline Research": "in-progress",
  // Dev Pipeline
  "PM Agent": "active",
  "Dev Agent": "active",
  "QA Agent": "active",
  "Code Review": "planned",
  "Content Factory": "planned",
  // Core Platform
  "Property API": "planned",
  "CRM Integration": "planned",
  "Approval Hub": "planned",
  // Comms
  "WA Translation": "planned",
  "AI Sales Agent": "planned",
  "WA Compliance": "planned",
  // Multilingual
  "Multilingual Dirs": "in-progress",
  "Regional SEO": "planned",
  "Data Collection": "planned",
  // Leads
  "Lead Responder": "planned",
  "Behavior Scoring": "planned",
  "Lead Prediction": "planned",
  "Leak Detector": "planned",
  "Investor Portal": "concept",
  // Content
  "Price Monitor": "planned",
  "Morning Brief": "planned",
  "Market Reports": "planned",
  "Dev Reports": "planned",
  "Video Agent": "in-progress",
  "Crypto Buyer Page": "planned",
  "Area Guides": "planned",
  // Website
  "Login & My List": "planned",
};

export const stageDefaults: Record<string, {status: string; points: number; desc: string}> = {};
pipelineData.forEach(p => {
  p.stages.forEach(s => {
    stageDefaults[s] = {
      status: stageStatusMap[s] || "concept",
      points: Math.round(p.points / p.stages.length),
      desc: stageDescs[s] || "",
    };
  });
});

// === TYPES ===
export interface SubtaskItem { id: number; text: string; done: boolean; by: string; locked?: boolean; points?: number; }
export interface CommentItem { id: number; text: string; by: string; time: string; }
export type ActivityItem = { type: string; user: string; target: string; detail: string; time: number; workspaceId?: string };
export interface ExecProposal {
  id: number;
  title: string;
  body: string;
  by: string;
  status: "pending" | "reviewed" | "rejected";
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}
export const STATUS_ORDER = ["concept", "planned", "in-progress", "active", "blocked"];

export interface UserType {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  aiAvatar?: string; // base64 data URL when using AI-generated pfp
}
