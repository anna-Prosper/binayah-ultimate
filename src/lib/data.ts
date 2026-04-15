// === AVATARS ===
export const AVATARS = [
  {id:"skull",emoji:"💀",name:"Skull"},{id:"ape",emoji:"🦧",name:"Ape"},{id:"frog",emoji:"🐸",name:"Pepe"},{id:"alien",emoji:"👾",name:"Alien"},
  {id:"ghost",emoji:"👻",name:"Ghost"},{id:"clown",emoji:"🤡",name:"Clown"},{id:"robot",emoji:"🤖",name:"Bot"},{id:"devil",emoji:"😈",name:"Devil"},
  {id:"moai",emoji:"🗿",name:"Moai"},{id:"brain",emoji:"🧠",name:"Brain"},{id:"pirate",emoji:"🏴‍☠️",name:"Pirate"},{id:"snake",emoji:"🐍",name:"Snake"},
  {id:"bat",emoji:"🦇",name:"Bat"},{id:"joker",emoji:"🃏",name:"Joker"},{id:"bomb",emoji:"💣",name:"Bomb"},{id:"moon",emoji:"🌚",name:"Moon"},
];

export const USERS_DEFAULT = [
  {id:"anna",name:"Anna",role:"Growth Architect",avatar:"frog",color:"#ff6b35"},
  {id:"aakarshit",name:"Aakarshit",role:"Tech Wizard",avatar:"alien",color:"#00ff88"},
  {id:"ahsan",name:"Ahsan",role:"Build Engineer",avatar:"ape",color:"#00d4ff"},
  {id:"abdullah",name:"Abdullah",role:"Content Machine",avatar:"skull",color:"#ffcc00"},
  {id:"usama",name:"Usama",role:"The Visionary",avatar:"devil",color:"#bf5af2"},
];

export const REACTIONS = ["🔥","💀","🚀","🧠","⚡","🫡"];

export const ONBOARDING = [
  {title:"gm legend",desc:"welcome to the command center. every AI tool, every pipeline, every initiative — mapped and tracked.",icon:"🏴‍☠️",sub:"// the ecosystem starts here"},
  {title:"show your energy",desc:"smash reactions on stages you’re excited about. the team sees your conviction in real-time.",icon:"🔥",sub:"// reactions = signal"},
  {title:"claim your territory",desc:"see something you want to own? claim it. your avatar shows up. you’re accountable now.",icon:"💀",sub:"// ownership > opinions"},
  {title:"let’s build",desc:"every pipeline feeds the next. every stage earns points. the one who ships the most, wins.",icon:"🚀",sub:"// talk is cheap. ship it."},
];

// === PIPELINE DATA ===
export const pipelineData = [
  {id:"research",name:"Research & Foundation",icon:"🔬",colorKey:"red",totalHours:"20-30h",priority:"NOW",desc:"Research OpenClaw, dev pipeline, hosting",stages:["OpenClaw Research","Dev Pipeline Research","Hosting Strategy","Infra Setup"],points:100},
  {id:"core",name:"Core Platform",icon:"🏗️",colorKey:"slate",totalHours:"55-80h",priority:"HIGH",desc:"Property API, approvals, analytics, translations",stages:["Property API","Approval Hub","KPI Dashboard","Translation Memory"],points:200},
  {id:"multi",name:"Multilingual Engine",icon:"🌍",colorKey:"cyan",totalHours:"145-210h",priority:"HIGH",desc:"Content → SEO → personalization → campaigns",stages:["Multilingual Dirs","Regional SEO","Data Collection","Dynamic Homepage","Newsletters","Geo Campaigns"],points:350},
  {id:"leads",name:"Lead Lifecycle",icon:"🎯",colorKey:"purple",totalHours:"195-285h",priority:"HIGH",desc:"Capture → score → manage → nurture → CRM",stages:["Lead Responder","Behavior Scoring","Lead Prediction","Leak Detector","Viewing Scheduler","Deal Broadcaster","Post-Sale Nurture","WA Communities","CRM + Gamification"],points:500},
  {id:"comms",name:"Comms Hub",icon:"💬",colorKey:"green",totalHours:"110-155h",priority:"HIGH",desc:"Translation → AI agent → drips → voice",stages:["WA Translation","AI Sales Agent","Timezone Drips","Voice Agent"],points:300},
  {id:"content",name:"Content & Intel",icon:"📊",colorKey:"amber",totalHours:"195-265h",priority:"MEDIUM",desc:"Data → reports → viral → video → signals",stages:["Price Monitor","Morning Brief","Market Reports","Dev Reports","Off-Plan Eval","Anti-Pitch","Viral Agent","Video Agent","Signal Detection","ROI Calculator"],points:400},
  {id:"outbound",name:"Outbound",icon:"🚀",colorKey:"orange",totalHours:"50-75h",priority:"MEDIUM",desc:"LinkedIn + Reddit → enrich → outreach",stages:["LinkedIn Scrape","Forum Listener","Email Enrich","Email Warming","Outreach","Social Engage"],points:200},
  {id:"tools",name:"Web Tools",icon:"🛠",colorKey:"lime",totalHours:"55-80h",priority:"MEDIUM",desc:"Interactive tools that capture leads",stages:["Property Compare","Quiz","City Calculator","Portfolio Tracker"],points:250},
  {id:"dev",name:"Dev Pipeline",icon:"⚡",colorKey:"cyan",totalHours:"25-35h",priority:"NOW",desc:"PM → Dev → QA → Content Factory",stages:["PM Agent","Dev Agent","QA Agent","Content Factory"],points:150},
];

export const stageDescs: Record<string, string> = {
  "OpenClaw Research": "Open-source AI agent framework evaluation. Compare Qwen, Ollama, Claude proxy — cost vs quality vs speed.",
  "Dev Pipeline Research": "Automated development pipeline. Test the PM → Dev → QA code loop using Claude Code + API orchestration.",
  "Hosting Strategy": "Server infrastructure decision. Docker on DigitalOcean vs AWS ECS — pick the right architecture for our stack.",
  "Infra Setup": "Production environment deployment. VPS setup, OpenClaw install, model config, WhatsApp API connection.",
  "Property API": "Internal property data service. Single API that powers every tool — bot, website, calculator, content engine.",
  "Approval Hub": "Content review dashboard. One screen to approve or edit all AI-generated newsletters, blogs, follow-ups, campaigns.",
  "KPI Dashboard": "Real-time business intelligence. Response times, conversion rates, pipeline value, lead sources by nationality.",
  "Translation Memory": "Centralized translation database. Ensures consistent terminology across all 8 languages in every tool.",
  "Multilingual Dirs": "Localized website sections. /ru /hi /tr /cn /fa /fr /de /kz — native content, local keywords, hreflang tags.",
  "Regional SEO": "Search engine optimization per market. binayah.ru for Yandex, binayah.kz, WeChat official account, Baidu indexing.",
  "Data Collection": "Visitor intelligence system. IP-based nationality detection → AI-generated weekly behavioral reports per segment.",
  "Dynamic Homepage": "Personalized landing experience. Russian visitor sees Marina in RUB with Golden Visa CTA. Indian sees JVC in INR with EMI calculator.",
  "Newsletters": "Automated regional email campaigns. AI drafts market-specific newsletters per nationality. Human approves, system sends.",
  "Geo Campaigns": "Traffic-triggered advertising. Surge from Turkey detected → auto-launch Turkish Google/Meta campaign within hours.",
  "Lead Responder": "Instant inquiry handler. New Bayut or Property Finder lead → qualified AI response in under 60 seconds with matching properties.",
  "Behavior Scoring": "Website visitor scoring engine. Real-time scoring based on pages viewed, time spent, return visits — surfaces hot leads.",
  "Lead Prediction": "Conversion probability model. Trained on CRM history to predict which leads will close, by source and nationality.",
  "Leak Detector": "Pipeline loss prevention system. Nightly scan for leads gone silent. Auto-drafts personalized follow-ups with new matches.",
  "Viewing Scheduler": "Automated property viewing coordinator. AI offers time slots, books viewings, sends reminders, triggers post-viewing follow-up.",
  "Deal Broadcaster": "Price drop alert system. Monitors listings for price reductions → instant broadcast to matching investor segments.",
  "Post-Sale Nurture": "Client retention engine. Anniversary appreciation reports, property value updates, referral detection and reward.",
  "WA Communities": "Curated investor groups on WhatsApp. Area-specific (Marina Watchers, JVC Investors) co-managed by AI with market updates.",
  "CRM + Gamification": "Sales team engagement platform. Leaderboards, XP points, streaks, badges, daily challenges to drive agent performance.",
  "WA Translation": "Real-time WhatsApp translation layer. Client texts in Russian → agent sees English → agent replies → client receives Russian.",
  "AI Sales Agent": "Multilingual AI property consultant. Speaks 10+ languages, queries property database, qualifies leads, escalates to human agents.",
  "Timezone Drips": "Time-aware message sequencing. Sends WhatsApp follow-ups during each prospect’s local business hours automatically.",
  "Voice Agent": "AI phone answering system. Detects caller language, qualifies in real-time, books callback with context sent to assigned agent.",
  "Price Monitor": "Competitor listing tracker. Daily automated scan of Bayut, Property Finder, Dubizzle for price changes and new listings.",
  "Morning Brief": "Daily team intelligence briefing. 7AM WhatsApp: DLD transactions, hot leads, SEO stats, silent lead alerts, team wins.",
  "Market Reports": "Automated weekly market analysis. DLD transaction data compiled into downloadable reports — doubles as lead magnet.",
  "Dev Reports": "Developer reputation scoring. Per-developer report cards covering on-time delivery, price appreciation, build quality, resale speed.",
  "Off-Plan Eval": "AI-powered project assessment tool. Scores any off-plan project across developer trust, location, payment plan, ROI projection, risk.",
  "Anti-Pitch": "Trust-building content strategy. Articles like ‘when NOT to invest in Dubai’ and ‘developers I’d avoid’ → honest content drives qualified leads.",
  "Viral Agent": "Trend-reactive content engine. Detects trending topics → auto-generates blog, social posts, email campaign, WhatsApp broadcast in all languages.",
  "Video Agent": "AI video production pipeline. Auto-generated property walkthrough videos with AI voiceover in 6+ languages. Abdullah building.",
  "Signal Detection": "Global opportunity radar. Monitors events (new HQs, currency shifts, new flight routes) → auto-triggers targeted campaigns.",
  "ROI Calculator": "Historical return visualization tool. ‘What if you bought in 2019?’ — shows actual returns, then suggests similar current opportunities.",
  "LinkedIn Scrape": "Professional network prospecting. Apollo + PhantomBuster to find executives relocating to Dubai or posting about investment.",
  "Forum Listener": "Online community monitor. Scans r/dubai, r/expats, FB groups for high-intent posts about property, relocating, investing.",
  "Email Enrich": "Contact verification pipeline. Validates prospect emails through Hunter.io/Apollo before any outreach to protect domain reputation.",
  "Email Warming": "Domain reputation builder. Warms dedicated outreach domains for 2-3 weeks before launching campaigns. Protects binayah.com.",
  "Outreach": "Automated cold email system. AI-personalized sequences with A/B testing per region, auto-pause on reply, meeting booking link.",
  "Social Engage": "LinkedIn engagement automation. Auto-comments and likes on target prospects’ posts for 1-2 weeks before sending direct outreach.",
  "Property Compare": "Interactive comparison tool. Side-by-side AI analysis of any two properties — PDF download captures the lead.",
  "Quiz": "Neighborhood matching quiz. 5 fun questions → ‘You’re a JVC person!’ result with matching listings. Viral + lead capture.",
  "City Calculator": "Cross-city investment comparison. Moscow vs Dubai: yield, tax, visa, growth side-by-side — designed to be shared on social.",
  "Portfolio Tracker": "Investor portfolio dashboard. Repeat investors track all properties, returns, rental yields, appreciation in one view.",
  "PM Agent": "AI project manager. Reads TASKS.md, prioritizes backlog, assigns tickets to Dev Agent, tracks completion in LOG.md.",
  "Dev Agent": "Autonomous coding agent. Claude Code reads tasks, writes code, runs tests, commits to git. No human intervention needed.",
  "QA Agent": "Automated quality assurance. Reviews Dev Agent’s code changes, runs test suite, sends back for fixes until everything passes.",
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

export type UserType = typeof USERS_DEFAULT[number];
