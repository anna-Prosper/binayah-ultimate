"use client";

import { useState, useEffect, useCallback } from "react";

// === LOCALSTORAGE HELPERS ===
const LS_PREFIX = "binayah_";
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch { /* quota */ }
}

// === THEMES ===
interface ThemeBase {
  bg: string; bgCard: string; bgHover: string; bgSoft: string;
  border: string; text: string; textSec: string; textMuted: string; textDim: string; surface: string;
  accent: string; accent2: string; green: string; amber: string; red: string; purple: string; cyan: string; orange: string;
  name: string; icon: string; sub: string;
}

const mkTheme = (id: string, isDark: boolean) => {
  const d = isDark;
  const bases: Record<string, ThemeBase> = {
    warroom: {
      bg: d?"#08050f":"#f8f6f2", bgCard: d?"#0d0a18":"#fff", bgHover: d?"#130f22":"#faf9f7", bgSoft: d?"#0a0814":"#f2f0ec",
      border: d?"#1a1530":"#e0dbd2", text: d?"#f0ecff":"#1a1510", textSec: d?"#a89ec8":"#4a4238", textMuted: d?"#5c5280":"#8a8070", textDim: d?"#3a3258":"#b8b0a4", surface: d?"#0f0c1a":"#edeae4",
      accent: d?"#bf5af2":"#7c3aed", accent2: d?"#ff2d78":"#d4235e", green: d?"#00ff88":"#0a9956", amber: d?"#ffcc00":"#a67c00", red: d?"#ff2d78":"#d4235e", purple: d?"#bf5af2":"#7c3aed", cyan: d?"#00d4ff":"#0088bb", orange: d?"#ff6b35":"#c44d1a",
      name: "War Room", icon: "🏴‍☠️", sub: "// where strategies are forged"
    },
    lab: {
      bg: d?"#050a0a":"#f4f8f6", bgCard: d?"#0a1414":"#fff", bgHover: d?"#0e1a1a":"#f6faf8", bgSoft: d?"#081010":"#edf4f0",
      border: d?"#122828":"#cdddd5", text: d?"#e8fff4":"#0c1a14", textSec: d?"#8ab8a4":"#3a5a48", textMuted: d?"#4a7a6a":"#6a9a82", textDim: d?"#2a5040":"#a0c4b0", surface: d?"#081010":"#e4ede8",
      accent: d?"#00e5a0":"#088a5a", accent2: d?"#00b4d8":"#0080a0", green: d?"#00ff88":"#0a9956", amber: d?"#00e5a0":"#088a5a", red: d?"#ff6b6b":"#cc4444", purple: d?"#00b4d8":"#0080a0", cyan: d?"#00d4ff":"#0088bb", orange: d?"#00e5a0":"#088a5a",
      name: "The Lab", icon: "🧪", sub: "// experimental builds in progress"
    },
    engine: {
      bg: d?"#0a0808":"#f8f4f0", bgCard: d?"#141010":"#fff", bgHover: d?"#1a1414":"#faf6f2", bgSoft: d?"#100c0c":"#f0ece6",
      border: d?"#2a1e1e":"#ddd0c4", text: d?"#fff0e8":"#1a1008", textSec: d?"#c8a898":"#5a4030", textMuted: d?"#7a5a4a":"#9a7a68", textDim: d?"#4a3028":"#baa898", surface: d?"#100c0c":"#e8e0d8",
      accent: d?"#ff6b35":"#c44d1a", accent2: d?"#ffcc00":"#a67c00", green: d?"#ff9f43":"#b06a20", amber: d?"#ffcc00":"#a67c00", red: d?"#ff4444":"#cc2222", purple: d?"#ff6b35":"#c44d1a", cyan: d?"#ffcc00":"#a67c00", orange: d?"#ff6b35":"#c44d1a",
      name: "Engine Room", icon: "⚙️", sub: "// we are the machine"
    },
    nerve: {
      bg: d?"#06060c":"#f4f6fa", bgCard: d?"#0c0c18":"#fff", bgHover: d?"#101020":"#f6f8fc", bgSoft: d?"#0a0a14":"#eef0f6",
      border: d?"#18182e":"#d4d8e8", text: d?"#e8ecff":"#0c1020", textSec: d?"#9aa8cc":"#3a4868", textMuted: d?"#506080":"#7080a0", textDim: d?"#303858":"#a8b0c8", surface: d?"#0a0a14":"#e6e8f0",
      accent: d?"#5b8cf8":"#2860d8", accent2: d?"#a78bfa":"#7050e0", green: d?"#4ade80":"#1a9050", amber: d?"#fbbf24":"#a07000", red: d?"#f87171":"#d03030", purple: d?"#a78bfa":"#7050e0", cyan: d?"#38bdf8":"#1888c0", orange: d?"#fb923c":"#c06020",
      name: "Nerve Center", icon: "🧠", sub: "// every signal passes through here"
    },
  };
  const b = bases[id] || bases.warroom;
  return {
    ...b,
    lime: d?"#88ff00":"#5a8a00",
    slate: d?"#7868a0":"#6a6278",
    pink: d?"#ff69b4":"#c44d8a",
    shadow: d?"0 2px 12px rgba(0,0,0,0.6)":"0 1px 6px rgba(90,70,50,0.08)",
    shadowLg: d?"0 8px 40px rgba(0,0,0,0.7)":"0 8px 24px rgba(90,70,50,0.1)",
    isDark: d,
    themeId: id,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T = any;

// === AVATARS ===
const AVATARS = [
  {id:"skull",emoji:"💀",name:"Skull"},{id:"ape",emoji:"🦧",name:"Ape"},{id:"frog",emoji:"🐸",name:"Pepe"},{id:"alien",emoji:"👾",name:"Alien"},
  {id:"ghost",emoji:"👻",name:"Ghost"},{id:"clown",emoji:"🤡",name:"Clown"},{id:"robot",emoji:"🤖",name:"Bot"},{id:"devil",emoji:"😈",name:"Devil"},
  {id:"moai",emoji:"🗿",name:"Moai"},{id:"brain",emoji:"🧠",name:"Brain"},{id:"pirate",emoji:"🏴‍☠️",name:"Pirate"},{id:"snake",emoji:"🐍",name:"Snake"},
  {id:"bat",emoji:"🦇",name:"Bat"},{id:"joker",emoji:"🃏",name:"Joker"},{id:"bomb",emoji:"💣",name:"Bomb"},{id:"moon",emoji:"🌚",name:"Moon"},
];

const USERS_DEFAULT = [
  {id:"anna",name:"Anna",role:"Growth Architect",avatar:"frog",color:"#ff6b35"},
  {id:"aakarshit",name:"Aakarshit",role:"Tech Wizard",avatar:"alien",color:"#00ff88"},
  {id:"ahsan",name:"Ahsan",role:"Build Engineer",avatar:"ape",color:"#00d4ff"},
  {id:"abdullah",name:"Abdullah",role:"Content Machine",avatar:"skull",color:"#ffcc00"},
  {id:"usama",name:"Usama",role:"The Visionary",avatar:"devil",color:"#bf5af2"},
];

const REACTIONS = ["🔥","💀","🚀","🧠","⚡","🫡"];

const ONBOARDING = [
  {title:"gm legend",desc:"welcome to the command center. every AI tool, every pipeline, every initiative — mapped and tracked.",icon:"🏴‍☠️",sub:"// the ecosystem starts here"},
  {title:"show your energy",desc:"smash reactions on stages you're excited about. the team sees your conviction in real-time.",icon:"🔥",sub:"// reactions = signal"},
  {title:"claim your territory",desc:"see something you want to own? claim it. your avatar shows up. you're accountable now.",icon:"💀",sub:"// ownership > opinions"},
  {title:"let's build",desc:"every pipeline feeds the next. every stage earns points. the one who ships the most, wins.",icon:"🚀",sub:"// talk is cheap. ship it."},
];

// === PIPELINE DATA ===
const pipelineData=[
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

const stageDescs: Record<string, string> = {
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
  "Timezone Drips": "Time-aware message sequencing. Sends WhatsApp follow-ups during each prospect's local business hours automatically.",
  "Voice Agent": "AI phone answering system. Detects caller language, qualifies in real-time, books callback with context sent to assigned agent.",
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
  "Email Enrich": "Contact verification pipeline. Validates prospect emails through Hunter.io/Apollo before any outreach to protect domain reputation.",
  "Email Warming": "Domain reputation builder. Warms dedicated outreach domains for 2-3 weeks before launching campaigns. Protects binayah.com.",
  "Outreach": "Automated cold email system. AI-personalized sequences with A/B testing per region, auto-pause on reply, meeting booking link.",
  "Social Engage": "LinkedIn engagement automation. Auto-comments and likes on target prospects' posts for 1-2 weeks before sending direct outreach.",
  "Property Compare": "Interactive comparison tool. Side-by-side AI analysis of any two properties — PDF download captures the lead.",
  "Quiz": "Neighborhood matching quiz. 5 fun questions → 'You're a JVC person!' result with matching listings. Viral + lead capture.",
  "City Calculator": "Cross-city investment comparison. Moscow vs Dubai: yield, tax, visa, growth side-by-side — designed to be shared on social.",
  "Portfolio Tracker": "Investor portfolio dashboard. Repeat investors track all properties, returns, rental yields, appreciation in one view.",
  "PM Agent": "AI project manager. Reads TASKS.md, prioritizes backlog, assigns tickets to Dev Agent, tracks completion in LOG.md.",
  "Dev Agent": "Autonomous coding agent. Claude Code reads tasks, writes code, runs tests, commits to git. No human intervention needed.",
  "QA Agent": "Automated quality assurance. Reviews Dev Agent's code changes, runs test suite, sends back for fixes until everything passes.",
  "Content Factory": "Launch kit generator. New project detected → full marketing package (blog, social, email, WA broadcast, landing page, video) in 12 minutes.",
};

const stageDefaults: Record<string, {status: string; points: number; desc: string}> = {};
pipelineData.forEach(p=>{p.stages.forEach((s,i)=>{stageDefaults[s]={status:p.id==="dev"&&i<3?"active":["research"].includes(p.id)&&i<2?"in-progress":i<Math.ceil(p.stages.length*0.4)?"planned":"concept",points:Math.round(p.points/p.stages.length),desc:stageDescs[s]||""};});});
["Video Agent","Multilingual Dirs"].forEach(s=>{if(stageDefaults[s])stageDefaults[s].status="in-progress";});

// === MOCKUP COMPONENTS ===
const Phone=({t,title,children}:{t:T;title:string;children:React.ReactNode})=>(<div style={{width:"100%",maxWidth:240,margin:"0 auto"}}><div style={{background:"#111",borderRadius:20,padding:"5px 4px",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}><div style={{background:"#0b141a",borderRadius:16,overflow:"hidden"}}><div style={{background:"#1f2c34",padding:"6px 8px",display:"flex",alignItems:"center",gap:6}}><div style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#00a884,#005c4b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>👤</div><div><div style={{fontSize:8.5,fontWeight:600,color:"#e9edef"}}>{title}</div><div style={{fontSize:6,color:"#8696a0"}}>online</div></div></div><div style={{minHeight:120,padding:5,display:"flex",flexDirection:"column",gap:3}}>{children}</div><div style={{background:"#1f2c34",padding:"4px 6px",display:"flex",alignItems:"center",gap:4}}><div style={{flex:1,background:"#0b141a",borderRadius:12,padding:"3px 7px",fontSize:6.5,color:"#8696a0"}}>Message</div></div></div></div></div>);
const WaM=({text,out,time,label}:{text:string;out?:boolean;time:string;label?:string})=>(<div style={{alignSelf:out?"flex-end":"flex-start",maxWidth:"84%"}}>{label&&<div style={{fontSize:5,color:"#eab038",marginBottom:0.5}}>{label}</div>}<div style={{background:out?"#005c4b":"#1f2c34",borderRadius:6,padding:"3px 5px"}}><div style={{fontSize:7,color:"#e9edef",lineHeight:1.3,whiteSpace:"pre-line"}}>{text}</div><div style={{textAlign:"right",fontSize:5,color:"#667781"}}>{time}{out&&" ✓✓"}</div></div></div>);
const WaSys=({text}:{text:string})=>(<div style={{textAlign:"center",margin:"1px 0"}}><span style={{fontSize:6,color:"#8696a0",background:"#182229",padding:"1px 5px",borderRadius:3}}>{text}</span></div>);
const Browser=({t,url,children}:{t:T;url:string;children:React.ReactNode})=>(<div style={{width:"100%",maxWidth:310,margin:"0 auto"}}><div style={{background:t.bgCard,borderRadius:10,overflow:"hidden",boxShadow:t.shadow,border:`1px solid ${t.border}`}}><div style={{background:t.surface,padding:"4px 8px",display:"flex",alignItems:"center",gap:5}}><div style={{display:"flex",gap:2}}>{["#ff5f57","#ffbd2e","#28c840"].map(c=><div key={c} style={{width:6,height:6,borderRadius:"50%",background:c}}/>)}</div><div style={{flex:1,background:t.bgSoft,borderRadius:4,padding:"2px 6px",fontSize:6,color:t.textMuted,textAlign:"center"}}>{url}</div></div><div style={{padding:8,minHeight:90}}>{children}</div></div></div>);
const Term=({t,children}:{t:T;children:React.ReactNode})=>(<div style={{width:"100%",maxWidth:280,margin:"0 auto"}}><div style={{background:"#0c0c0c",borderRadius:8,overflow:"hidden",boxShadow:t.shadow,border:"1px solid #222"}}><div style={{background:"#1a1a1a",padding:"3px 7px",display:"flex",alignItems:"center",gap:2}}>{["#ff5f57","#ffbd2e","#28c840"].map(c=><div key={c} style={{width:5,height:5,borderRadius:"50%",background:c}}/>)}<span style={{fontSize:6,color:"#777",marginLeft:3}}>terminal</span></div><div style={{padding:"6px 8px",fontFamily:"monospace"}}>{children}</div></div></div>);
const TL=({c,children}:{c?:string;children:React.ReactNode})=><div style={{fontSize:7,color:c||"#4afa83",lineHeight:1.5}}>{children}</div>;
const Notifs=({t,items}:{t:T;items:{t:string;body:string;time:string;c:string;action?:string}[]})=>(<div style={{width:"100%",maxWidth:270,margin:"0 auto",display:"flex",flexDirection:"column",gap:3}}>{items.map((x,i)=>(<div key={i} style={{background:t.bgCard,border:`1px solid ${x.c}22`,borderRadius:8,padding:"6px 8px",borderLeft:`3px solid ${x.c}`,boxShadow:t.shadow}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:7,fontWeight:700,color:t.text}}>{x.t}</span><span style={{fontSize:5.5,color:t.textDim}}>{x.time}</span></div><div style={{fontSize:6.5,color:t.textSec,marginTop:1.5,lineHeight:1.3}}>{x.body}</div>{x.action&&<div style={{fontSize:6,color:x.c,fontWeight:600,marginTop:2}}>{x.action}</div>}</div>))}</div>);
const Bar=({t,label,value,color}:{t:T;label:string;value:number;color?:string})=>(<div style={{display:"flex",alignItems:"center",gap:3,marginBottom:2}}><span style={{fontSize:6,color:t.textMuted,width:48,textAlign:"right"}}>{label}</span><div style={{flex:1,height:4,background:t.surface,borderRadius:2}}><div style={{width:`${value}%`,height:"100%",background:color||t.accent,borderRadius:2}}/></div><span style={{fontSize:6,color:t.textMuted,width:18}}>{value}%</span></div>);
const Stat=({t,label,value,color}:{t:T;label:string;value:string;color:string})=>(<div style={{textAlign:"center",background:t.surface,borderRadius:5,padding:"5px 3px",flex:"1 1 40px"}}><div style={{fontSize:10,fontWeight:800,color}}>{value}</div><div style={{fontSize:5,color:t.textDim,marginTop:1}}>{label}</div></div>);
const ScoreCircle=({value,color,size=40}:{value:number;color:string;size?:number})=>{const r=(size-8)/2,c=2*Math.PI*r,o=c-(value/100)*c;return(<svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color+"22"} strokeWidth={3.5}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3.5} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/><text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={10} fontWeight={800} fontFamily="monospace">{value}</text></svg>);};

// === MOCKUPS MAP ===
const mockups: Record<string, (t:T)=>React.ReactNode>={
"OpenClaw Research":(t)=>(<Browser t={t} url="docs.openclaw.ai/compare"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>{[{n:"Qwen 3.6+",cost:"FREE",s:92,q:78,c:t.green},{n:"Claude Proxy",cost:"$0*",s:71,q:95,c:t.accent},{n:"Ollama",cost:"FREE",s:45,q:62,c:t.amber},{n:"Claude API",cost:"$$/tok",s:88,q:97,c:t.purple}].map(m=>(<div key={m.n} style={{background:t.surface,borderRadius:5,padding:5}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:6.5,fontWeight:700,color:m.c}}>{m.n}</span><span style={{fontSize:5.5,color:t.textDim}}>{m.cost}</span></div><div style={{display:"flex",alignItems:"center",gap:2,marginTop:2}}><span style={{fontSize:5,color:t.textDim,width:20}}>Spd</span><div style={{flex:1,height:3,background:t.border,borderRadius:2}}><div style={{width:`${m.s}%`,height:"100%",background:m.c,borderRadius:2}}/></div></div><div style={{display:"flex",alignItems:"center",gap:2,marginTop:1}}><span style={{fontSize:5,color:t.textDim,width:20}}>Qual</span><div style={{flex:1,height:3,background:t.border,borderRadius:2}}><div style={{width:`${m.q}%`,height:"100%",background:m.c,borderRadius:2}}/></div></div></div>))}</div></Browser>),
"Dev Pipeline Research":(t)=>(<Browser t={t} url="admin/pipeline"><div style={{display:"flex",flexDirection:"column",gap:2}}>{[{n:"PM Reviews",icon:"📋",c:t.accent,done:true},{n:"Dev Codes",icon:"💻",c:t.green,done:true},{n:"QA Reviews",icon:"🔍",c:t.amber,done:false},{n:"Deploy",icon:"🚀",c:t.purple,done:false}].map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:5,background:t.surface,borderRadius:5,padding:"4px 6px"}}><div style={{width:16,height:16,borderRadius:"50%",background:s.done?s.c:"transparent",border:`2px solid ${s.c}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:s.done?"#fff":s.c,fontWeight:800,flexShrink:0}}>{s.done?"✓":i+1}</div><span style={{fontSize:8}}>{s.icon}</span><span style={{fontSize:7,fontWeight:600,color:t.text,flex:1}}>{s.n}</span></div>))}</div></Browser>),
"Hosting Strategy":(t)=>(<Browser t={t} url="digitalocean.com"><div style={{display:"flex",gap:4}}>{[{n:"DO Docker",p:"$12/mo",rec:true,c:t.green},{n:"AWS ECS",p:"$30/mo",rec:false,c:t.accent}].map(x=>(<div key={x.n} style={{flex:1,background:t.surface,borderRadius:6,padding:6,border:`1px solid ${x.rec?x.c+"44":t.border}`,textAlign:"center"}}><div style={{fontSize:7,fontWeight:700,color:x.c}}>{x.n}</div><div style={{fontSize:12,fontWeight:800,color:t.text,margin:"2px 0"}}>{x.p}</div>{x.rec&&<div style={{fontSize:5.5,color:x.c}}>RECOMMENDED</div>}</div>))}</div></Browser>),
"Infra Setup":(t)=>(<Term t={t}><TL c="#888">$ ssh root@binayah-vps</TL><TL>✓ Docker installed</TL><TL>✓ OpenClaw deployed</TL><TL>✓ WhatsApp API connected</TL><TL c="#fbbf24">○ First agent test...</TL></Term>),
"Property API":(t)=>(<Term t={t}><TL c="#5b9cf6">GET /api/properties?area=marina&max=2M</TL><TL c="#888">200 OK — 47 results</TL><TL>{`{ "name": "Marina T2", "roi": 7.2% }`}</TL><TL c="#fbbf24">Powers: Bot · Web · Calc</TL></Term>),
"Approval Hub":(t)=>(<Notifs t={t} items={[{t:"📧 RU Newsletter",body:"Ruble analysis + listings",time:"2m",c:t.accent,action:"✓ Approve  ✎ Edit"},{t:"💬 Follow-up",body:"Ahmed K. — 3 days silent",time:"5m",c:t.amber,action:"✓ Send"},{t:"📝 Blog",body:"'Hidden costs' published",time:"1h",c:t.green,action:"✓ Done"}]}/>),
"KPI Dashboard":(t)=>(<Browser t={t} url="crm.binayah.com/kpi"><div style={{display:"flex",gap:3,marginBottom:4}}><Stat t={t} label="Response" value="47s" color={t.green}/><Stat t={t} label="Conv" value="3.8%" color={t.accent}/><Stat t={t} label="Pipeline" value="$4.2M" color={t.purple}/></div><Bar t={t} label="🇷🇺 Russia" value={34} color={t.accent}/><Bar t={t} label="🇮🇳 India" value={28} color={t.green}/><Bar t={t} label="🇹🇷 Turkey" value={18} color={t.amber}/></Browser>),
"Translation Memory":(t)=>(<Browser t={t} url="admin/translations">{[{en:"Sea view apt",ru:"Квартира с видом",n:142},{en:"Payment plan",ru:"План оплаты",n:89}].map((x,i)=>(<div key={i} style={{background:t.surface,borderRadius:4,padding:4,marginBottom:2}}><div style={{fontSize:6.5,fontWeight:600,color:t.text}}>{x.en}</div><div style={{fontSize:6,color:t.accent}}>🇷🇺 {x.ru}</div><div style={{fontSize:5,color:t.textDim,textAlign:"right"}}>Used {x.n}×</div></div>))}</Browser>),
"Multilingual Dirs":(t)=>(<Browser t={t} url="binayah.com/tr"><div style={{background:t.surface,borderRadius:6,padding:6,marginBottom:4}}><div style={{fontSize:9,fontWeight:800,color:t.text}}>🏠 Binayah Dubai</div><div style={{fontSize:6.5,color:t.textMuted}}>Dubai&apos;da satılık gayrimenkuller</div></div><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{["🇷🇺/ru","🇮🇳/hi","🇹🇷/tr","🇨🇳/cn","🇮🇷/fa","🇫🇷/fr","🇩🇪/de","🇰🇿/kz"].map(x=>(<span key={x} style={{fontSize:6,background:x.includes("tr")?t.amber+"20":t.surface,padding:"1px 4px",borderRadius:3,color:x.includes("tr")?t.amber:t.textMuted}}>{x}</span>))}</div></Browser>),
"Regional SEO":(t)=>(<Browser t={t} url="yandex.ru">{[{d:"binayah.ru",r:"#4",c:t.accent},{d:"binayah.kz",r:"#7",c:t.green},{d:"WeChat",r:"142",c:t.amber}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}><span style={{fontSize:7,fontWeight:700,color:x.c}}>{x.d}</span><span style={{fontSize:7,color:t.textMuted}}>Rank {x.r}</span></div>))}</Browser>),
"Data Collection":(t)=>(<Notifs t={t} items={[{t:"🇷🇺 Russia",body:"Marina+Palm · $500K-1.5M · 80% invest",time:"Mon",c:t.accent},{t:"🇮🇳 India",body:"JVC+BizBay · $200-400K · relocation",time:"Mon",c:t.green}]}/>),
"Dynamic Homepage":(t)=>(<div style={{display:"flex",gap:4}}>{[{f:"🇷🇺",l:"Russian",a:"Marina · RUB",c:t.accent},{f:"🇮🇳",l:"Indian",a:"JVC · INR",c:t.green}].map(v=>(<div key={v.l} style={{flex:1}}><div style={{background:t.surface,borderRadius:6,padding:5,textAlign:"center"}}><span style={{fontSize:14}}>{v.f}</span><div style={{fontSize:7,fontWeight:700,color:v.c,marginTop:2}}>{v.l}</div><div style={{fontSize:6,color:t.textSec,marginTop:2}}>{v.a}</div></div></div>))}</div>),
"Newsletters":(t)=>(<Browser t={t} url="admin/newsletters">{[{f:"🇷🇺",s:"Ruble -4% hedge",o:"38%"},{f:"🇮🇳",s:"JVC under 400K",o:"42%"},{f:"🇹🇷",s:"0% ödeme planı",o:"31%"}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:`1px solid ${t.border}22`}}><span style={{fontSize:6.5,color:t.textSec}}>{x.f} {x.s}</span><span style={{fontSize:6.5,color:t.green}}>{x.o}</span></div>))}</Browser>),
"Geo Campaigns":(t)=>(<Notifs t={t} items={[{t:"⚡ Turkey +47%",body:"Auto campaign: Istanbul+Ankara · $200/d",time:"Now",c:t.red,action:"✓ Approve  ✎ Edit"}]}/>),
"Lead Responder":(t)=>(<Phone t={t} title="Bayut Lead"><WaSys text="New inquiry"/><WaM text="🔔 2BR Marina · Ahmed K. · 1.5M" time="10:23"/><WaM out text={"✓ 23s · Investment · 3mo\n📋 4 matches → Sarah"} time="10:24"/></Phone>),
"Behavior Scoring":(t)=>(<Browser t={t} url="crm/visitors">{[{id:"#4821",s:92,sig:"3rd visit · Marina 3BR",c:t.green},{id:"#4819",s:67,sig:"JVC · plans",c:t.amber},{id:"#4815",s:23,sig:"Bounced",c:t.red}].map((x,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}><div style={{width:24,height:24,borderRadius:"50%",background:x.c+"15",border:`2px solid ${x.c}`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:8,fontWeight:800,color:x.c}}>{x.s}</span></div><div style={{flex:1}}><div style={{fontSize:7,fontWeight:600,color:t.text}}>{x.id}</div><div style={{fontSize:5.5,color:t.textDim}}>{x.sig}</div></div></div>))}</Browser>),
"Lead Prediction":(t)=>(<Browser t={t} url="crm/predict"><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><ScoreCircle value={64} color={t.green}/><div><div style={{fontSize:7,fontWeight:700,color:t.text}}>Accuracy: 64%</div><div style={{fontSize:6,color:t.green}}>Improving weekly</div></div></div><Bar t={t} label="🇷🇺" value={72} color={t.green}/><Bar t={t} label="🇮🇳" value={58} color={t.amber}/><Bar t={t} label="🇬🇧" value={45} color={t.amber}/></Browser>),
"Leak Detector":(t)=>(<Notifs t={t} items={[{t:"⚠ Ahmed K.",body:"3 days · follow-up ready",time:"9PM",c:t.red,action:"→ Send"},{t:"⚠ Olga S.",body:"NEW MATCH: Palm 2BR",time:"9PM",c:t.amber,action:"→ Alert"},{t:"✓ Wei L.",body:"Viewing confirmed",time:"9PM",c:t.green}]}/>),
"Viewing Scheduler":(t)=>(<Phone t={t} title="Ahmed K."><WaM out text={"Slots:\n📅 Sun 2PM · Mon 10AM · Tue 4PM"} time="10:14"/><WaM text="Monday 10AM" time="10:16"/><WaM out text={"✓ Booked! Sarah confirmed 👋"} time="10:16"/></Phone>),
"Deal Broadcaster":(t)=>(<Phone t={t} title="Deals 📉"><WaM out text={"📉 Drops:\nMarina 1.3M→1.2M (-8%)\nJVC 680K→600K (-12%)"} time="6:00"/><WaSys text="→ 34 investors notified"/><WaM text="Interested in Marina!" time="6:12"/></Phone>),
"Post-Sale Nurture":(t)=>(<Phone t={t} title="Olga S. 🇷🇺"><WaM out text={"🎉 1-year!\n📈 +12.4%\n💰 2.02M AED\n🚇 Metro Q3"} time="9:00"/><WaM text="My friend is looking..." time="9:14"/><WaSys text="🎯 Referral → team"/></Phone>),
"WA Communities":(t)=>(<Phone t={t} title="🏗 Marina (38)"><WaM out label="🤖" text="📊 12 txns · 1,840/sqft (+2.1%)" time="7:05"/><WaM text="Buy or wait?" time="7:22"/><WaM out label="🤖" text={"6mo: +14%. Report 📋"} time="7:30"/></Phone>),
"CRM + Gamification":(t)=>(<Browser t={t} url="crm/leaderboard"><div style={{fontSize:8,fontWeight:800,color:t.text,marginBottom:4}}>🏆 Leaderboard</div>{[{n:"Sarah M.",xp:2840,s:12,c:t.amber},{n:"Omar K.",xp:2310,s:8,c:t.textSec},{n:"Ali R.",xp:1890,s:3,c:t.orange}].map((x,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}><span style={{fontSize:7,fontWeight:800,color:x.c}}>{i+1}.</span><span style={{fontSize:7,fontWeight:700,color:t.text,flex:1}}>{x.n}</span><span style={{fontSize:6.5,color:t.purple}}>{x.xp}XP</span><span style={{fontSize:6.5}}>🔥{x.s}</span></div>))}<div style={{background:t.surface,borderRadius:5,padding:4,marginTop:4}}><div style={{fontSize:6,color:t.amber,fontWeight:600}}>📌 Follow up 5 leads → +200 XP</div><div style={{display:"flex",alignItems:"center",gap:2,marginTop:2}}><div style={{flex:1,height:3,background:t.border,borderRadius:2}}><div style={{width:"60%",height:"100%",background:t.amber,borderRadius:2}}/></div><span style={{fontSize:5.5,color:t.amber}}>3/5</span></div></div></Browser>),
"WA Translation":(t)=>(<Phone t={t} title="Alexei 🇷🇺"><WaM text="Ищу квартиру, бюджет 2М" time="10:23"/><WaSys text="🔄 RU→EN"/><WaM out label="Agent sees" text="Looking for apt, 2M AED" time="10:23"/><WaM out label="Agent types" text="3 great options!" time="10:24"/><WaSys text="🔄 EN→RU"/><WaM out label="Client gets" text="3 варианта!" time="10:24"/></Phone>),
"AI Sales Agent":(t)=>(<Phone t={t} title="AI 🤖"><WaM text="预算300万，高回报" time="14:02"/><WaM out text={"最佳：BizBay 7.2%\nJVC 7.8% · 12套匹配 📋"} time="14:02"/><WaM text="发给我" time="14:03"/><WaSys text="→ Escalated (EN)"/></Phone>),
"Timezone Drips":(t)=>(<Browser t={t} url="admin/drips">{[{tz:"🇷🇺 Moscow 9AM",s:"✓ Sent",c:t.green},{tz:"🇮🇳 Mumbai 10:30",s:"Queued",c:t.amber},{tz:"🇨🇳 Beijing 8AM",s:"3h",c:t.accent}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}><span style={{fontSize:7,color:t.text}}>{x.tz}</span><span style={{fontSize:6.5,color:x.c,fontWeight:600}}>{x.s}</span></div>))}</Browser>),
"Voice Agent":(t)=>(<Phone t={t} title="📞 Incoming"><div style={{textAlign:"center",padding:"8px 6px"}}><div style={{fontSize:8,color:t.green,fontWeight:700}}>🟢 AI — Russian</div><div style={{fontSize:6.5,color:t.textSec,marginTop:4,textAlign:"left",lineHeight:1.5}}>✓ 2BR Marina, 1.5M{"\n"}✓ Callback: 10AM{"\n"}✓ Context → Sarah</div></div></Phone>),
"Price Monitor":(t)=>(<Browser t={t} url="admin/monitor">{[{s:"Bayut",n:"12 drops",c:t.accent},{s:"PF",n:"5 new",c:t.green},{s:"Dubizzle",n:"3 under",c:t.amber}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}><span style={{fontSize:7,fontWeight:700,color:x.c}}>{x.s}</span><span style={{fontSize:6.5,color:t.textSec}}>{x.n}</span></div>))}</Browser>),
"Morning Brief":(t)=>(<Phone t={t} title="AI ☀️"><WaM out text={"☀️ Apr 15\n📊 47 txns, Marina +3%\n📬 12 hot, 5 due\n⚠ 3 silent 48h+"} time="7:00"/></Phone>),
"Market Reports":(t)=>(<Browser t={t} url="reports/weekly"><div style={{display:"flex",gap:3,marginBottom:4}}><Stat t={t} label="Txns" value="847" color={t.accent}/><Stat t={t} label="Price" value="+2.8%" color={t.green}/></div><Bar t={t} label="Marina" value={82} color={t.accent}/><Bar t={t} label="JVC" value={94} color={t.green}/></Browser>),
"Dev Reports":(t)=>(<Browser t={t} url="reports/emaar"><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><ScoreCircle value={82} color={t.green}/><div><div style={{fontSize:8,fontWeight:800,color:t.text}}>Emaar</div><div style={{fontSize:6,color:t.green}}>Premium</div></div></div><Bar t={t} label="On-time" value={87} color={t.green}/><Bar t={t} label="Growth" value={72} color={t.accent}/></Browser>),
"Off-Plan Eval":(t)=>(<Browser t={t} url="evaluate/creek"><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><ScoreCircle value={82} color={t.green} size={42}/><div><div style={{fontSize:8,fontWeight:800,color:t.text}}>Creek T2</div><div style={{fontSize:7,color:t.green,fontWeight:700}}>STRONG BUY</div></div></div><Bar t={t} label="Dev" value={87} color={t.green}/><Bar t={t} label="ROI" value={71} color={t.amber}/><Bar t={t} label="Risk" value={18} color={t.green}/></Browser>),
"Anti-Pitch":(t)=>(<Browser t={t} url="blog">{[{t:"Hidden costs nobody tells",v:"12.4K",l:89},{t:"When NOT to invest",v:"8.7K",l:62}].map((x,i)=>(<div key={i} style={{background:t.surface,borderRadius:4,padding:4,marginBottom:2}}><div style={{fontSize:6.5,fontWeight:600,color:t.text}}>{x.t}</div><div style={{display:"flex",gap:6}}><span style={{fontSize:5.5,color:t.accent}}>👁 {x.v}</span><span style={{fontSize:5.5,color:t.green}}>🎯 {x.l}</span></div></div>))}</Browser>),
"Viral Agent":(t)=>(<Browser t={t} url="admin/viral"><div style={{background:t.amber+"12",borderRadius:5,padding:5,marginBottom:4}}><div style={{fontSize:7,fontWeight:700,color:t.amber}}>🔥 Trending: Golden visa 2026</div></div>{["✓ Blog (3 langs)","✓ LinkedIn","✓ IG reel","✓ WA draft"].map((x,i)=>(<div key={i} style={{fontSize:6,color:t.green,padding:"0.5px 0"}}>{x}</div>))}<div style={{fontSize:6,color:t.green,marginTop:3,fontWeight:600}}>Pending approval</div></Browser>),
"Video Agent":(t)=>(<Browser t={t} url="video/creek"><div style={{background:t.surface,borderRadius:6,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:14}}>▶</div><div style={{fontSize:7,fontWeight:700,color:t.text,marginTop:2}}>Creek T2 Walkthrough</div><div style={{fontSize:5.5,color:t.textDim}}>AI voiceover · 90s</div></div><div style={{display:"flex",gap:2,justifyContent:"center",marginTop:4}}>{["🇬🇧","🇷🇺","🇨🇳","🇹🇷"].map(x=>(<span key={x} style={{fontSize:6,background:t.surface,padding:"1px 4px",borderRadius:3,color:t.cyan}}>{x}</span>))}</div></Browser>),
"Signal Detection":(t)=>(<Notifs t={t} items={[{t:"🚨 Microsoft → Dubai",body:"Target execs 48h",time:"2h",c:t.red},{t:"📉 Ruble -6%",body:"Shift CIS spend",time:"Now",c:t.amber}]}/>),
"ROI Calculator":(t)=>(<Browser t={t} url="calculator"><div style={{background:t.surface,borderRadius:6,padding:6}}><div style={{fontSize:6.5,color:t.textDim}}>Marina 2BR · 2019</div><div style={{fontSize:13,fontWeight:800,color:t.green,margin:"2px 0"}}>1.95M (+62%)</div><div style={{fontSize:6,color:t.accent}}>+380K rental</div></div><div style={{background:t.accent+"10",borderRadius:4,padding:4,marginTop:4}}><div style={{fontSize:6,fontWeight:600,color:t.accent}}>📌 Similar: Creek 1.3M</div></div></Browser>),
"LinkedIn Scrape":(t)=>(<Browser t={t} url="apollo.io">{[{n:"James T.",r:"CFO → Dubai",s:92,c:t.red},{n:"Anna V.",r:"'Moving to UAE'",s:71,c:t.amber}].map((x,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}><span style={{fontSize:7,fontWeight:700,color:t.text,flex:1}}>{x.n}</span><span style={{fontSize:6,color:t.textDim}}>{x.r}</span><div style={{width:18,height:18,borderRadius:"50%",background:x.c+"15",border:`1.5px solid ${x.c}`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:6,fontWeight:800,color:x.c}}>{x.s}</span></div></div>))}</Browser>),
"Forum Listener":(t)=>(<Browser t={t} url="admin/forums">{[{s:"r/dubai",p:"'buying property'",c:t.orange},{s:"r/expats",p:"'relocating to Dubai'",c:t.accent}].map((x,i)=>(<div key={i} style={{background:t.surface,borderRadius:4,padding:4,marginBottom:2}}><span style={{fontSize:6,fontWeight:700,color:x.c}}>{x.s}</span><div style={{fontSize:6,color:t.textSec}}>{x.p}</div></div>))}</Browser>),
"Email Enrich":(t)=>(<Browser t={t} url="hunter.io">{[{n:"James T.",s:"✓",c:t.green},{n:"Anna V.",s:"✓",c:t.green},{n:"Chen W.",s:"✗",c:t.red}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span style={{fontSize:6.5,color:t.text}}>{x.n}</span><span style={{fontSize:6.5,color:x.c,fontWeight:700}}>{x.s}</span></div>))}</Browser>),
"Email Warming":(t)=>(<Browser t={t} url="instantly.ai">{[{d:"outreach1",p:78,c:t.green},{d:"outreach2",p:45,c:t.amber}].map((x,i)=>(<div key={i} style={{marginBottom:3}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:6.5,color:t.text}}>{x.d}</span><span style={{fontSize:6,color:x.c}}>{x.p}%</span></div><div style={{height:4,background:t.surface,borderRadius:2}}><div style={{width:`${x.p}%`,height:"100%",background:x.c,borderRadius:2}}/></div></div>))}</Browser>),
"Outreach":(t)=>(<Browser t={t} url="instantly.ai/seq"><div style={{display:"flex",gap:3,marginBottom:3}}><Stat t={t} label="Sent" value="643" color={t.accent}/><Stat t={t} label="Mtgs" value="7" color={t.green}/></div>{["E1: Intro → 38%","E2: Case → 29%","E3: Ask → 22%"].map((x,i)=>(<div key={i} style={{fontSize:6,color:t.textSec,padding:"1px 0"}}>{x}</div>))}</Browser>),
"Social Engage":(t)=>(<Browser t={t} url="linkedin.com">{["💬 James T.'s post","👍 Anna V.'s article","🔄 3 prospects"].map((x,i)=>(<div key={i} style={{fontSize:6.5,color:t.textSec,padding:"2px 0"}}>{x}</div>))}<div style={{fontSize:6,color:t.accent,marginTop:3}}>Warm → then outreach</div></Browser>),
"Property Compare":(t)=>(<Browser t={t} url="compare">{[["","Marina","Creek"],["Price","1.8M","1.3M"],["ROI","6.5%","7.8%"],["Score","82","76"]].map((r,i)=>(<div key={i} style={{display:"flex",gap:3}}>{r.map((c,j)=>(<span key={j} style={{flex:j===0?1.2:1,fontSize:i===0?6:6.5,fontWeight:i===0||j===0?700:400,color:i===0||j===0?t.textMuted:t.textSec,textAlign:j>0?"center":"left" as const,padding:"1.5px 0"}}>{c}</span>))}</div>))}</Browser>),
"Quiz":(t)=>(<Browser t={t} url="binayah.com/quiz"><div style={{textAlign:"center",marginBottom:4}}><span style={{fontSize:14}}>🏠</span><div style={{fontSize:8,fontWeight:800,color:t.text}}>Your Community</div><div style={{height:2.5,background:t.surface,borderRadius:2,marginTop:3}}><div style={{width:"60%",height:"100%",background:t.accent,borderRadius:2}}/></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>{["🏖 Beach","🌃 Night","👨‍👩‍👧 Family","📈 ROI"].map(x=>(<div key={x} style={{background:t.surface,borderRadius:5,padding:"5px 3px",textAlign:"center",fontSize:7,color:t.textSec}}>{x}</div>))}</div></Browser>),
"City Calculator":(t)=>(<Browser t={t} url="vs">{[["","Moscow","Dubai"],["Yield","3.2%","7.1%"],["Tax","13%","0%"],["Visa","—","Golden ✓"]].map((r,i)=>(<div key={i} style={{display:"flex",gap:3}}>{r.map((c,j)=>(<span key={j} style={{flex:j===0?1:1,fontSize:i===0?6:6.5,fontWeight:i===0||j===0?700:(j===2&&i>0)?700:400,color:i===0||j===0?t.textMuted:(j===2&&i>0)?t.green:t.textSec,textAlign:j>0?"center":"left" as const,padding:"1.5px 0"}}>{c}</span>))}</div>))}</Browser>),
"Portfolio Tracker":(t)=>(<Browser t={t} url="portfolio"><div style={{display:"flex",gap:3,marginBottom:3}}><Stat t={t} label="Return" value="+18%" color={t.green}/><Stat t={t} label="Yield" value="6.8%" color={t.accent}/></div>{[{p:"Marina 2BR",d:"+12%"},{p:"JVC Studio",d:"+24%"}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",background:t.surface,borderRadius:4,padding:4,marginBottom:2}}><span style={{fontSize:6.5,fontWeight:700,color:t.text}}>{x.p}</span><span style={{fontSize:6.5,color:t.green,fontWeight:700}}>{x.d}</span></div>))}</Browser>),
"PM Agent":(t)=>(<Browser t={t} url="admin/pm">{[{task:"Fix webhook",p:"P1",c:t.red},{task:"/hi pages",p:"P2",c:t.amber},{task:"API update",p:"P3",c:t.accent}].map((x,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:3,padding:"2px 0",borderBottom:`1px solid ${t.border}22`}}><span style={{fontSize:5.5,fontWeight:800,color:x.c,background:x.c+"18",padding:"1px 3px",borderRadius:3}}>{x.p}</span><span style={{fontSize:6.5,color:t.text,flex:1}}>{x.task}</span></div>))}</Browser>),
"Dev Agent":(t)=>(<Term t={t}><TL c="#888">$ claude --code</TL><TL c="#5b9cf6">Reading webhook.py</TL><TL>Fix → L47</TL><TL>Tests ✓ 14/14</TL><TL c="#4afa83">git push</TL></Term>),
"QA Agent":(t)=>(<Browser t={t} url="admin/qa">{[{c:"Code ✓",p:true},{c:"Tests ✓",p:true},{c:"Error handling",p:false}].map((x,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:3,padding:"1.5px 0"}}><span style={{fontSize:6.5,color:x.p?t.green:t.red}}>{x.p?"✓":"✗"}</span><span style={{fontSize:6.5,color:x.p?t.textSec:t.red}}>{x.c}</span></div>))}<div style={{background:t.red+"12",borderRadius:4,padding:3,marginTop:3}}><div style={{fontSize:6,color:t.red}}>⚠ Fix L52 → Dev</div></div></Browser>),
"Content Factory":(t)=>(<Browser t={t} url="admin/launch"><div style={{fontSize:7,fontWeight:800,color:t.text,marginBottom:3}}>🚀 Creek Vista T3</div>{["📝 Blog 8 langs","📱 Social LI+IG","📧 Email 4 segs","💬 WA broadcast","🌐 Landing page","🎬 Video (Abdullah)"].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"1px 0"}}><span style={{fontSize:6,color:t.textSec}}>{x}</span><span style={{fontSize:6,color:t.green}}>✓</span></div>))}<div style={{fontSize:6,color:t.green,fontWeight:600,marginTop:3}}>12 min. Pending OK.</div></Browser>),
};

// === TYPES ===
interface SubtaskItem { id: number; text: string; done: boolean; by: string; }
interface CommentItem { id: number; text: string; by: string; time: string; }

// === MAIN DASHBOARD ===
export default function Dashboard(){
  const [isDark,setIsDark]=useState(()=>lsGet("isDark",true));
  const [themeId,setThemeId]=useState(()=>lsGet("themeId","warroom"));
  const [currentUser,setCurrentUser]=useState<string|null>(()=>lsGet("currentUser",null));
  const [users,setUsers]=useState(()=>lsGet("users",USERS_DEFAULT));
  const [onboardStep,setOnboardStep]=useState(()=>lsGet("onboardStep",0));
  const [selUser,setSelUser]=useState<string|null>(null);
  const [selAvatar,setSelAvatar]=useState<string|null>(null);
  const [exp,setExp]=useState<string|null>("research");
  const [expS,setExpS]=useState<string|null>(null);
  const [reactions,setReactions]=useState<Record<string, Record<string, string[]>>>(()=>lsGet("reactions",{}));
  const [claims,setClaims]=useState<Record<string, string[]>>(()=>lsGet("claims",{}));
  const [subtasks,setSubtasks]=useState<Record<string, SubtaskItem[]>>(()=>lsGet("subtasks",{}));
  const [comments,setComments]=useState<Record<string, CommentItem[]>>(()=>lsGet("comments",{}));
  const [commentInput,setCommentInput]=useState<Record<string, string>>({});
  const [subtaskInput,setSubtaskInput]=useState<Record<string, string>>({});
  const [showMockup,setShowMockup]=useState<Record<string, boolean>>({});
  const [copied,setCopied]=useState<string|null>(null);
  const [claimAnim,setClaimAnim]=useState<{stage:string;pts:number}|null>(null);
  const [toast,setToast]=useState<{text:string;pts:string;color:string}|null>(null);
  const [reactOpen,setReactOpen]=useState<string|null>(null);
  const [searchQ,setSearchQ]=useState("");
  const [statusFilter,setStatusFilter]=useState<string|null>(null);
  const [stageStatusOverrides,setStageStatusOverrides]=useState<Record<string,string>>(()=>lsGet("stageStatusOverrides",{}));
  const [activityLog,setActivityLog]=useState<{type:string;user:string;target:string;detail:string;time:number}[]>(()=>lsGet("activityLog",[]));
  const [showActivity,setShowActivity]=useState(false);
  const [lastSeenActivity,setLastSeenActivity]=useState(()=>lsGet("lastSeenActivity",0));

  // Persist to localStorage
  useEffect(()=>{lsSet("isDark",isDark)},[isDark]);
  useEffect(()=>{lsSet("themeId",themeId)},[themeId]);
  useEffect(()=>{lsSet("currentUser",currentUser)},[currentUser]);
  useEffect(()=>{lsSet("users",users)},[users]);
  useEffect(()=>{lsSet("onboardStep",onboardStep)},[onboardStep]);
  useEffect(()=>{lsSet("reactions",reactions)},[reactions]);
  useEffect(()=>{lsSet("claims",claims)},[claims]);
  useEffect(()=>{lsSet("subtasks",subtasks)},[subtasks]);
  useEffect(()=>{lsSet("comments",comments)},[comments]);
  useEffect(()=>{lsSet("stageStatusOverrides",stageStatusOverrides)},[stageStatusOverrides]);
  useEffect(()=>{lsSet("activityLog",activityLog)},[activityLog]);
  useEffect(()=>{lsSet("lastSeenActivity",lastSeenActivity)},[lastSeenActivity]);

  const getStatus = useCallback((name: string) => stageStatusOverrides[name] || stageDefaults[name]?.status || "concept", [stageStatusOverrides]);
  const logActivity = useCallback((type: string, target: string, detail: string) => {
    if (!currentUser) return;
    setActivityLog(prev => [{type, user: currentUser, target, detail, time: Date.now()}, ...prev.slice(0, 99)]);
  }, [currentUser]);

  const t=mkTheme(themeId,isDark);
  const sc: Record<string, {l:string;c:string}> = {active:{l:"live",c:t.green},"in-progress":{l:"building",c:t.amber},planned:{l:"planned",c:t.cyan||t.accent},concept:{l:"concept",c:t.purple}};
  const pr: Record<string, {c:string}> = {NOW:{c:t.red},HIGH:{c:t.amber},MEDIUM:{c:t.accent}};
  const ck: Record<string, string> = {blue:t.accent,purple:t.purple,green:t.green,amber:t.amber,cyan:t.cyan||t.accent,red:t.red,orange:t.orange,lime:t.lime,slate:t.slate};

  const allStages=pipelineData.flatMap(p=>p.stages);
  const total=allStages.length;
  const bySt=(s: string)=>allStages.filter(n=>getStatus(n)===s).length;
  const getPoints=(uid: string)=>{let p=0;Object.entries(claims).forEach(([s,c])=>{if(c.includes(uid))p+=stageDefaults[s]?.points||10;});Object.values(reactions).forEach(e=>{Object.values(e).forEach(r=>{if(r.includes(uid))p+=2;});});return p;};

  const handleClaim=(sid: string)=>{if(!currentUser)return;const alreadyClaimed=(claims[sid]||[]).includes(currentUser);setClaims(prev=>{const c=prev[sid]||[];if(c.includes(currentUser))return{...prev,[sid]:c.filter(u=>u!==currentUser)};return{...prev,[sid]:[...c,currentUser]};});if(!alreadyClaimed){const pts=stageDefaults[sid]?.points||10;const me2=users.find(u=>u.id===currentUser);setClaimAnim({stage:sid,pts});setToast({text:`${me2?.name} claimed ${sid}`,pts:`+${pts}pts`,color:me2?.color||t.accent});logActivity("claim",sid,`+${pts}pts`);setTimeout(()=>setClaimAnim(null),1200);setTimeout(()=>setToast(null),2500);}};
  const handleReact=(sid: string,emoji: string)=>{if(!currentUser)return;setReactions(prev=>{const s={...(prev[sid]||{})};const u=[...(s[emoji]||[])];const i=u.indexOf(currentUser);if(i>=0)u.splice(i,1);else u.push(currentUser);s[emoji]=u;return{...prev,[sid]:s};});};

  const addSubtask=(sid: string)=>{const val=subtaskInput[sid]?.trim();if(!val||!currentUser)return;setSubtasks(prev=>({...prev,[sid]:[...(prev[sid]||[]),{id:Date.now(),text:val,done:false,by:currentUser}]}));setSubtaskInput(prev=>({...prev,[sid]:""}));};
  const toggleSubtask=(sid: string,taskId: number)=>{setSubtasks(prev=>({...prev,[sid]:(prev[sid]||[]).map(t=>t.id===taskId?{...t,done:!t.done}:t)}));};
  const addComment=(sid: string)=>{const val=commentInput[sid]?.trim();if(!val||!currentUser)return;setComments(prev=>({...prev,[sid]:[...(prev[sid]||[]),{id:Date.now(),text:val,by:currentUser,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]}));logActivity("comment",sid,val);setCommentInput(prev=>({...prev,[sid]:""}));};
  const STATUS_ORDER = ["concept","planned","in-progress","active"];
  const cycleStatus=(name: string)=>{const cur=getStatus(name);const idx=STATUS_ORDER.indexOf(cur);const next=STATUS_ORDER[(idx+1)%STATUS_ORDER.length];setStageStatusOverrides(prev=>({...prev,[name]:next}));logActivity("status",name,`→ ${next}`);};
  const shareStage=(name: string)=>{navigator.clipboard?.writeText(`Binayah AI — ${name}`).then(()=>{setCopied(name);setTimeout(()=>setCopied(null),2000);}).catch(()=>{});setCopied(name);setTimeout(()=>setCopied(null),2000);};

  const AvatarC=({user,size=28}:{user:typeof USERS_DEFAULT[0];size?:number})=>{const av=AVATARS.find(a=>a.id===user.avatar)||AVATARS[0];return(<div title={user.name} style={{width:size,height:size,borderRadius:"50%",background:`radial-gradient(circle at 30% 30%,${user.color}44,${user.color}11)`,border:`2px solid ${user.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.5,boxShadow:`0 0 10px ${user.color}22`}}>{av.emoji}</div>);};

  const Chev=({open,color}:{open:boolean;color?:string})=>(<svg width={12} height={12} viewBox="0 0 12 12" style={{transition:"transform 0.25s",transform:open?"rotate(90deg)":"rotate(0)",flexShrink:0}}><path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke={color||t.textMuted} strokeWidth={1.6} fill="none" strokeLinecap="round"/></svg>);

  const NB=({color,children,style:s={}}:{color:string;children:React.ReactNode;style?:React.CSSProperties})=>(<div style={{border:`1px solid ${color}30`,boxShadow:`0 0 12px ${color}08`,borderRadius:14,...s}}>{children}</div>);

  // === ONBOARDING ===
  if(onboardStep<7){
    const css=`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes drift{0%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.1)}50%{transform:translate(-10px,30px) scale(0.95)}75%{transform:translate(-30px,-10px) scale(1.05)}100%{transform:translate(0,0) scale(1)}}@keyframes orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes pulse{0%,100%{opacity:0.15}50%{opacity:0.4}}@keyframes scanline{0%{top:-10%}100%{top:110%}}`;

    const FloatingBg=({colors,themeStyle}:{colors:string[];themeStyle:string})=>{
      const shapesMap: Record<string, T> = {
        warroom: {grid:true,scanline:true,rings:true,particles:"dots",cornerGlow:["#bf5af2","#ff2d78"]},
        lab: {grid:false,scanline:false,rings:false,particles:"hexagons",cornerGlow:["#00e5a0","#00b4d8"],dna:true},
        engine: {grid:true,scanline:true,rings:false,particles:"sparks",cornerGlow:["#ff6b35","#ffcc00"],gears:true},
        nerve: {grid:false,scanline:false,rings:true,particles:"neurons",cornerGlow:["#5b8cf8","#a78bfa"],waves:true},
      };
      const shapes = shapesMap[themeStyle||"warroom"]||{grid:true,rings:true,particles:"dots",cornerGlow:["#888","#666"]};
      const cs = colors||["#bf5af2","#00e5a0","#ff6b35","#5b8cf8"];

      return (<div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        {shapes.grid&&<svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.03}}><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>}
        {shapes.scanline&&<div style={{position:"absolute",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,#ffffff08,transparent)",animation:"scanline 8s linear infinite"}}/>}
        {shapes.rings&&cs.map((c: string,i: number)=>(<div key={`ring-${i}`} style={{position:"absolute",left:"50%",top:"50%",width:300+i*120,height:300+i*120,marginLeft:-(150+i*60),marginTop:-(150+i*60),borderRadius:"50%",border:`1px solid ${c}08`,animation:`orbit ${30+i*15}s linear infinite ${i%2===0?"":"reverse"}`}}><div style={{position:"absolute",top:-2,left:"50%",width:4,height:4,borderRadius:"50%",background:c,boxShadow:`0 0 8px ${c}66`,opacity:0.5}}/></div>))}
        {shapes.dna&&[...Array(10)].map((_: unknown,i: number)=>(<div key={`dna-${i}`} style={{position:"absolute",width:6,height:6,borderRadius:"50%",border:`1px solid ${cs[i%2===0?0:1]}22`,left:`${45+Math.sin(i*0.6)*8}%`,top:`${5+i*9}%`,animation:`float ${2+i*0.3}s ease-in-out infinite`,animationDelay:`${i*-0.2}s`,opacity:0.3}}/>))}
        {shapes.gears&&[...Array(3)].map((_: unknown,i: number)=>(<svg key={`gear-${i}`} style={{position:"absolute",left:`${10+i*35}%`,top:`${15+i*25}%`,width:60+i*20,height:60+i*20,opacity:0.04,animation:`orbit ${20+i*10}s linear infinite ${i%2===0?"":"reverse"}`}} viewBox="0 0 100 100"><path d="M50 10 L55 25 L65 15 L60 30 L75 25 L65 35 L80 40 L65 45 L75 55 L60 50 L65 65 L55 55 L50 70 L45 55 L35 65 L40 50 L25 55 L35 45 L20 40 L35 35 L25 25 L40 30 L35 15 L45 25 Z" fill="#fff"/><circle cx="50" cy="40" r="12" fill="none" stroke="#fff" strokeWidth="3"/></svg>))}
        {shapes.waves&&[...Array(3)].map((_: unknown,i: number)=>(<div key={`wave-${i}`} style={{position:"absolute",left:"-10%",right:"-10%",top:`${30+i*20}%`,height:1,background:`linear-gradient(90deg,transparent,${cs[i%cs.length]}06,transparent)`,animation:`float ${4+i}s ease-in-out infinite`,animationDelay:`${i*-0.8}s`}}/>))}
        {[...Array(12)].map((_: unknown,i: number)=>(<div key={`p-${i}`} style={{position:"absolute",width:shapes.particles==="sparks"?1:shapes.particles==="hexagons"?4:2,height:shapes.particles==="sparks"?8+i%5:shapes.particles==="hexagons"?4:2,borderRadius:shapes.particles==="hexagons"?"1px":"50%",background:cs[i%cs.length],opacity:0.12+((i%5)*0.04),left:`${8+i*7.5}%`,top:`${10+(i*17)%80}%`,animation:`float ${3+i*0.7}s ease-in-out infinite`,animationDelay:`${i*-0.4}s`,transform:shapes.particles==="sparks"?`rotate(${i*30}deg)`:shapes.particles==="hexagons"?`rotate(${i*15}deg)`:"none"}}/>))}
        <div style={{position:"absolute",top:-100,right:-100,width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${shapes.cornerGlow[0]}06,transparent 70%)`}}/>
        <div style={{position:"absolute",bottom:-80,left:-80,width:250,height:250,borderRadius:"50%",background:`radial-gradient(circle,${shapes.cornerGlow[1]}06,transparent 70%)`}}/>
        <div style={{position:"absolute",top:"25%",left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent 0%,${cs[0]}06 30%,${cs[0]}06 70%,transparent 100%)`}}/>
        <div style={{position:"absolute",top:"75%",left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent 0%,${cs[1]}04 40%,${cs[1]}04 60%,transparent 100%)`}}/>
      </div>);
    };

    const AnimBg=()=>(<FloatingBg colors={[t.accent,t.purple||t.accent,t.green,t.amber]} themeStyle={themeId}/>);

    if(onboardStep===0){
      const themeOptions=[
        {id:"warroom",name:"War Room",icon:"🏴‍☠️",desc:"Dark ops. Neon purple. Secret command center.",color:"#bf5af2",bg:"#08050f"},
        {id:"lab",name:"The Lab",icon:"🧪",desc:"Bio-tech greens. Clinical but alive.",color:"#00e5a0",bg:"#050a0a"},
        {id:"engine",name:"Engine Room",icon:"⚙️",desc:"Industrial heat. Orange sparks. Raw power.",color:"#ff6b35",bg:"#0a0808"},
        {id:"nerve",name:"Nerve Center",icon:"🧠",desc:"Deep navy. Neural calm. Everything connected.",color:"#5b8cf8",bg:"#06060c"},
      ];
      return(<div style={{position:"fixed",inset:0,background:"#050508",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,fontFamily:"var(--font-dm-sans), sans-serif"}}><style>{css}</style><FloatingBg colors={["#bf5af2","#00e5a0","#ff6b35","#5b8cf8"]} themeStyle={themeId}/><div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:480,width:"90%",animation:"slideUp 0.5s ease"}}><div style={{fontSize:42,marginBottom:12}}>⚡</div><div style={{fontSize:28,fontWeight:900,color:"#f0f0f0",letterSpacing:-1}}>pick the vibe</div><p style={{fontSize:12,color:"#666",margin:"6px 0 28px",fontFamily:"var(--font-dm-mono), monospace"}}>// this sets the entire mood</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{themeOptions.map(th=>(<button key={th.id} onClick={()=>setThemeId(th.id)} style={{background:themeId===th.id?th.bg:th.bg+"88",border:`2px solid ${themeId===th.id?th.color:th.color+"22"}`,borderRadius:16,padding:"20px 14px",cursor:"pointer",textAlign:"center",transition:"all 0.25s",boxShadow:themeId===th.id?`0 0 30px ${th.color}22, inset 0 0 30px ${th.color}08`:"none",fontFamily:"inherit",position:"relative",overflow:"hidden"}}>{themeId===th.id&&<div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 120%,${th.color}15,transparent 70%)`}}/>}<div style={{position:"relative",zIndex:1}}><div style={{fontSize:36,marginBottom:8}}>{th.icon}</div><div style={{fontSize:14,fontWeight:900,color:themeId===th.id?th.color:"#888",transition:"color 0.2s"}}>{th.name}</div><div style={{fontSize:9,color:"#555",marginTop:4,lineHeight:1.4}}>{th.desc}</div></div></button>))}</div><button onClick={()=>setOnboardStep(1)} style={{marginTop:24,background:`linear-gradient(135deg,${themeOptions.find(x=>x.id===themeId)?.color||"#bf5af2"},${themeOptions.find(x=>x.id===themeId)?.color||"#bf5af2"}cc)`,border:"none",borderRadius:14,padding:"14px 44px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"var(--font-dm-sans), sans-serif",boxShadow:`0 0 28px ${themeOptions.find(x=>x.id===themeId)?.color||"#bf5af2"}44`,letterSpacing:0.5,textTransform:"lowercase"}}>enter →</button></div></div>);
    }

    if(onboardStep>=1&&onboardStep<=4){
      const card=ONBOARDING[onboardStep-1];
      return(<div style={{position:"fixed",inset:0,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,fontFamily:"var(--font-dm-sans), sans-serif"}}><style>{css}</style><AnimBg/><NB color={t.accent} style={{background:t.bgCard,padding:"36px 32px",maxWidth:420,width:"90%",textAlign:"center",animation:"slideUp 0.4s ease",position:"relative",zIndex:1}}><div style={{fontSize:56,marginBottom:16}}>{card.icon}</div><div style={{fontSize:22,fontWeight:900,color:t.text,textShadow:`0 0 8px ${t.accent}33`}}>{card.title}</div><p style={{fontSize:13,color:t.textSec,lineHeight:1.6,margin:"12px 0 4px"}}>{card.desc}</p><p style={{fontSize:10,color:t.accent+"88",fontFamily:"var(--font-dm-mono), monospace",margin:"0 0 24px"}}>{card.sub}</p><div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>{ONBOARDING.map((_,i)=>(<div key={i} style={{width:i===(onboardStep-1)?24:8,height:8,borderRadius:4,background:i===(onboardStep-1)?t.accent:t.surface,boxShadow:i===(onboardStep-1)?`0 0 8px ${t.accent}66`:"none",transition:"all 0.3s"}}/>))}</div><button onClick={()=>setOnboardStep(onboardStep+1)} style={{background:`linear-gradient(135deg,${t.accent},${t.purple})`,border:"none",borderRadius:12,padding:"12px 36px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"var(--font-dm-sans), sans-serif",boxShadow:`0 0 24px ${t.accent}44`,textTransform:"lowercase"}}>{onboardStep<4?"next →":"select profile →"}</button></NB></div>);
    }

    if(onboardStep===5){
      return(<div style={{position:"fixed",inset:0,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,fontFamily:"var(--font-dm-sans), sans-serif"}}><style>{css}</style><AnimBg/><NB color={t.cyan||t.accent} style={{background:t.bgCard,padding:"28px 24px",maxWidth:440,width:"90%",animation:"slideUp 0.4s ease",position:"relative",zIndex:1}}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:20,fontWeight:900,color:t.text}}>who dis?</div><div style={{fontSize:10,color:t.textMuted,fontFamily:"var(--font-dm-mono), monospace"}}>// select your identity</div></div><div style={{display:"flex",flexDirection:"column",gap:6}}>{users.map(u=>(<button key={u.id} onClick={()=>{setSelUser(u.id);setSelAvatar(u.avatar);setOnboardStep(6);}} style={{display:"flex",alignItems:"center",gap:10,background:"transparent",border:`1px solid ${t.border}`,borderRadius:12,padding:"12px 16px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.2s"}}><AvatarC user={u} size={36}/><div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:t.text}}>{u.name}</div><div style={{fontSize:10,color:u.color,fontFamily:"var(--font-dm-mono), monospace"}}>{u.role}</div></div><span style={{fontSize:18,color:t.textDim}}>→</span></button>))}</div></NB></div>);
    }

    if(onboardStep===6){
      const user=users.find(u=>u.id===selUser);
      if(!user) return null;
      return(<div style={{position:"fixed",inset:0,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,fontFamily:"var(--font-dm-sans), sans-serif"}}><style>{css}</style><AnimBg/><NB color={user.color} style={{background:t.bgCard,padding:"28px 24px",maxWidth:400,width:"90%",textAlign:"center",animation:"slideUp 0.4s ease",position:"relative",zIndex:1}}><div style={{fontSize:18,fontWeight:900,color:user.color}}>choose your pfp</div><p style={{fontSize:10,color:t.textMuted,margin:"6px 0 20px",fontFamily:"var(--font-dm-mono), monospace"}}>// {user.name.toLowerCase()}, pick your persona</p><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24,maxWidth:280,margin:"0 auto 24px"}}>{AVATARS.map(av=>(<button key={av.id} onClick={()=>setSelAvatar(av.id)} style={{width:52,height:52,borderRadius:14,background:selAvatar===av.id?`radial-gradient(circle,${user.color}33,${user.color}11)`:"transparent",border:`2px solid ${selAvatar===av.id?user.color:t.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",transition:"all 0.2s",boxShadow:selAvatar===av.id?`0 0 16px ${user.color}44`:"none"}}>{av.emoji}<span style={{fontSize:5,color:selAvatar===av.id?user.color:t.textDim}}>{av.name}</span></button>))}</div><div style={{marginBottom:20}}><AvatarC user={{...user,avatar:selAvatar||user.avatar}} size={56}/><div style={{fontSize:14,fontWeight:900,color:user.color,marginTop:8}}>{user.name}</div></div><button onClick={()=>{const updated=users.map(u=>u.id===selUser?{...u,avatar:selAvatar||u.avatar}:u);setUsers(updated);setCurrentUser(selUser);setTimeout(()=>setOnboardStep(7),50);}} style={{background:`linear-gradient(135deg,${user.color},${user.color}cc)`,border:"none",borderRadius:12,padding:"12px 36px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"var(--font-dm-sans), sans-serif",boxShadow:`0 0 24px ${user.color}44`,textTransform:"lowercase"}}>let&apos;s build →</button></NB></div>);
    }
  }

  // === DASHBOARD ===
  const me=users.find(u=>u.id===currentUser);
  if(!me)return(<div style={{background:t.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-dm-sans), sans-serif"}}><button onClick={()=>setOnboardStep(0)} style={{background:t.accent,border:"none",borderRadius:12,padding:"12px 24px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>Start Over</button></div>);

  const Stage=({name,idx,tot,pC,pId}:{name:string;idx:number;tot:number;pC:string;pId:string})=>{
    const k=`${pId}-${idx}`;const isE=expS===k;
    const s=stageDefaults[name];if(!s)return null;
    const effectiveStatus=getStatus(name);
    const st=sc[effectiveStatus];const claimedBy=claims[name]||[];
    const mock=mockups[name] as ((t:T)=>React.ReactNode)|undefined;
    const tasks=subtasks[name]||[];const cmts=comments[name]||[];
    const tasksDone=tasks.filter(x=>x.done).length;
    const isMockOpen=showMockup[name];

    return(
      <div style={{display:"flex"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:26,flexShrink:0,paddingTop:3}}>
          <div style={{width:10,height:10,borderRadius:"50%",border:`2px solid ${st.c}`,background:effectiveStatus==="active"?st.c:"transparent",boxShadow:effectiveStatus==="active"?`0 0 8px ${st.c}44`:"none",zIndex:1}}/>
          {idx<tot-1&&<div style={{width:1.5,flex:1,background:`${st.c}22`,marginTop:1}}/>}
        </div>
        <div onClick={e=>{e.stopPropagation();setExpS(isE?null:k);}} style={{flex:1,background:isE?t.bgHover:t.bgSoft,border:`1px solid ${isE?pC+"33":t.border}`,borderRadius:12,marginBottom:idx<tot-1?4:0,cursor:"pointer",transition:"all 0.2s",overflow:"hidden"}}>
          <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={()=>setReactOpen(name)} onMouseLeave={()=>setReactOpen(null)}>
            <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0,flexShrink:1}}>
              <Chev open={isE} color={pC}/>
              <span style={{fontSize:11,fontWeight:700,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</span>
              <span onClick={e=>{e.stopPropagation();cycleStatus(name);}} style={{fontSize:6,fontWeight:700,color:st.c,background:st.c+"12",padding:"1.5px 6px",borderRadius:6,flexShrink:0,cursor:"pointer",transition:"all 0.15s"}} title="Click to change status">{st.l}</span>
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:3}} onClick={e=>e.stopPropagation()}>
              {(()=>{
                const sr=reactions[name]||{};
                const existing=Object.entries(sr).filter(([,v])=>v.length>0);
                const isHover=reactOpen===name;
                if(isHover){
                  return REACTIONS.map(r=>{const us=sr[r]||[];const mine=us.includes(currentUser!);const has=us.length>0;return(
                    <button key={r} onClick={()=>handleReact(name,r)} style={{background:mine?t.accent+"22":has?t.surface:"transparent",border:"none",borderRadius:10,padding:"2px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:1,fontFamily:"inherit",transition:"all 0.12s",opacity:has?1:0.35,transform:mine?"scale(1.15)":"scale(1)"}}>
                      <span style={{fontSize:has?12:10}}>{r}</span>
                      {has&&<span style={{fontSize:6,color:mine?t.accent:t.textMuted,fontWeight:700}}>{us.length}</span>}
                    </button>);});
                }
                return existing.map(([emoji,arr])=>{const mine=arr.includes(currentUser!);return(
                  <button key={emoji} onClick={()=>handleReact(name,emoji)} style={{background:mine?t.accent+"18":t.surface,border:"none",borderRadius:10,padding:"2px 5px",cursor:"pointer",display:"flex",alignItems:"center",gap:1,fontFamily:"inherit",transition:"all 0.1s"}}>
                    <span style={{fontSize:11}}>{emoji}</span>
                    <span style={{fontSize:6,color:mine?t.accent:t.textMuted,fontWeight:700}}>{arr.length}</span>
                  </button>);});
              })()}
              {claimedBy.length>0&&<div style={{display:"flex",marginLeft:2}}>{claimedBy.slice(0,3).map(uid=>{const u=users.find(u=>u.id===uid);return u?<div key={uid} style={{marginLeft:-4}}><AvatarC user={u} size={16}/></div>:null;})}</div>}
              {tasks.length>0&&<span style={{fontSize:7,color:tasksDone===tasks.length?t.green:t.textMuted,fontFamily:"var(--font-dm-mono), monospace"}}>{tasksDone}/{tasks.length}</span>}
              {cmts.length>0&&<span style={{fontSize:7,color:t.textMuted}}>💬{cmts.length}</span>}
              <span style={{fontSize:6.5,color:t.amber,fontFamily:"var(--font-dm-mono), monospace",fontWeight:600}}>+{s.points}</span>
            </div>
          </div>

          {isE&&(
            <div style={{borderTop:`1px solid ${t.border}`,animation:"fadeIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
              <div style={{padding:"8px 12px",borderBottom:`1px solid ${t.border}`,position:"relative",overflow:"hidden"}}>
                {claimAnim?.stage===name&&[...Array(16)].map((_,i)=>(<div key={`conf-${i}`} style={{position:"absolute",width:4+i%3,height:4+i%3,borderRadius:i%2===0?"50%":"1px",background:[me?.color||t.accent,t.green,t.amber,t.purple,t.cyan,"#ff69b4"][i%6],left:"60px",top:"16px",animation:`confetti${i%4} 0.8s ease-out forwards`,opacity:0}}/>))}
                {claimAnim?.stage===name&&<div style={{position:"absolute",left:70,top:0,color:t.green,fontSize:12,fontWeight:900,fontFamily:"var(--font-dm-mono), monospace",animation:"flyup 1s ease-out forwards",opacity:0,zIndex:5}}>+{claimAnim.pts}pts</div>}

                <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                  {!claimedBy.includes(currentUser!) ? (
                    <button onClick={()=>handleClaim(name)} style={{background:`linear-gradient(135deg,${me?.color||t.accent},${me?.color||t.accent}aa)`,border:"none",borderRadius:10,padding:"7px 18px",cursor:"pointer",fontSize:10,color:"#fff",fontWeight:800,fontFamily:"var(--font-dm-mono), monospace",textTransform:"lowercase",boxShadow:`0 0 20px ${me?.color||t.accent}44, 0 2px 8px rgba(0,0,0,0.4)`,display:"flex",alignItems:"center",gap:6,animation:"claimPulse 2s ease-in-out infinite",position:"relative",overflow:"hidden",letterSpacing:0.3}}>
                      <span style={{fontSize:14}}>💀</span>
                      <span style={{color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>claim this</span>
                      <span style={{background:"rgba(255,255,255,0.2)",borderRadius:6,padding:"1px 6px",fontSize:8,color:"#fff"}}>+{s.points}pts</span>
                      <div style={{position:"absolute",top:0,left:"-100%",width:"50%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",animation:"shimmer 2.5s ease-in-out infinite"}}/>
                    </button>
                  ) : (
                    <button onClick={()=>handleClaim(name)} style={{background:t.green+"20",border:`1px solid ${t.green}55`,borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:10,color:t.green,fontWeight:800,fontFamily:"var(--font-dm-mono), monospace",textTransform:"lowercase",display:"flex",alignItems:"center",gap:5,boxShadow:`0 0 12px ${t.green}18`}}>
                      <AvatarC user={me} size={18}/>
                      <span style={{color:t.green}}>✓ claimed</span>
                    </button>
                  )}

                  {claimedBy.filter(uid=>uid!==currentUser).length>0&&(
                    <div style={{display:"flex",alignItems:"center",gap:2}}>
                      {claimedBy.filter(uid=>uid!==currentUser).map(uid=>{const u=users.find(u=>u.id===uid);return u?<div key={uid}><AvatarC user={u} size={16}/></div>:null;})}
                    </div>
                  )}

                  <button onClick={()=>shareStage(name)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:8,color:copied===name?t.green:t.textMuted,fontWeight:600,fontFamily:"var(--font-dm-mono), monospace",transition:"all 0.15s"}}>
                    {copied===name?"✓ copied":"📋 share"}
                  </button>
                  {mock&&<button onClick={()=>setShowMockup(prev=>({...prev,[name]:!prev[name]}))} style={{background:isMockOpen?pC+"20":pC+"0a",border:`1px solid ${isMockOpen?pC+"55":pC+"25"}`,borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:8.5,color:isMockOpen?pC:pC+"cc",fontWeight:700,fontFamily:"var(--font-dm-mono), monospace",transition:"all 0.15s",boxShadow:isMockOpen?`0 0 8px ${pC}15`:"none"}}>
                    {isMockOpen?"▾ hide details":"📋 details"}
                  </button>}
                </div>
              </div>

              <div style={{display:"flex",gap:0,minHeight:60}}>
                <div style={{flex:1,padding:"8px 12px",borderRight:`1px solid ${t.border}`}}>
                  <div style={{fontSize:7,color:t.textDim,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>subtasks {tasks.length>0&&`(${tasksDone}/${tasks.length})`}</div>
                  {tasks.map(task=>(
                    <div key={task.id} onClick={()=>toggleSubtask(name,task.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",cursor:"pointer"}}>
                      <div style={{width:12,height:12,borderRadius:3,border:`1.5px solid ${task.done?t.green:t.border}`,background:task.done?t.green+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {task.done&&<span style={{fontSize:7,color:t.green}}>✓</span>}
                      </div>
                      <span style={{fontSize:8,color:task.done?t.textDim:t.textSec,textDecoration:task.done?"line-through":"none",flex:1}}>{task.text}</span>
                      <span style={{fontSize:6,color:t.textDim}}>{users.find(u=>u.id===task.by)?.name?.charAt(0)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",gap:3,marginTop:4}}>
                    <input value={subtaskInput[name]||""} onChange={e=>setSubtaskInput(prev=>({...prev,[name]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")addSubtask(name);}} placeholder="+ add subtask..." style={{flex:1,background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,padding:"3px 6px",fontSize:7.5,color:t.text,fontFamily:"inherit",outline:"none"}}/>
                    <button onClick={()=>addSubtask(name)} style={{background:t.accent+"18",border:`1px solid ${t.accent}33`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:7,color:t.accent,fontWeight:700,fontFamily:"inherit"}}>+</button>
                  </div>
                </div>

                <div style={{flex:1,padding:"8px 12px"}}>
                  <div style={{fontSize:7,color:t.textDim,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>comments {cmts.length>0&&`(${cmts.length})`}</div>
                  <div style={{maxHeight:100,overflowY:"auto"}}>
                    {cmts.map(c=>{const u=users.find(x=>x.id===c.by);return(
                      <div key={c.id} style={{display:"flex",gap:4,marginBottom:4}}>
                        {u&&<AvatarC user={u} size={14}/>}
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:4,alignItems:"baseline"}}>
                            <span style={{fontSize:7,fontWeight:700,color:u?.color||t.text}}>{u?.name}</span>
                            <span style={{fontSize:6,color:t.textDim}}>{c.time}</span>
                          </div>
                          <div style={{fontSize:8,color:t.textSec,lineHeight:1.35}}>{c.text}</div>
                        </div>
                      </div>
                    );})}
                  </div>
                  <div style={{display:"flex",gap:3,marginTop:4}}>
                    <input value={commentInput[name]||""} onChange={e=>setCommentInput(prev=>({...prev,[name]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")addComment(name);}} placeholder="comment..." style={{flex:1,background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,padding:"3px 6px",fontSize:7.5,color:t.text,fontFamily:"inherit",outline:"none"}}/>
                    <button onClick={()=>addComment(name)} style={{background:t.accent+"18",border:`1px solid ${t.accent}33`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:7,color:t.accent,fontWeight:700,fontFamily:"inherit"}}>↵</button>
                  </div>
                </div>
              </div>

              {mock&&isMockOpen&&(
                <div style={{borderTop:`1px solid ${t.border}`,padding:"12px 12px",animation:"fadeIn 0.2s ease"}}>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:7,color:t.textDim,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>about</div>
                    <div style={{fontSize:9.5,color:t.textSec,lineHeight:1.5}}>{s.desc}</div>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <div style={{background:t.surface,borderRadius:8,padding:"5px 10px",flex:"1 1 80px"}}><div style={{fontSize:6,color:t.textDim,letterSpacing:1,textTransform:"uppercase"}}>points</div><div style={{fontSize:11,fontWeight:800,color:t.amber}}>{s.points}</div></div>
                    <div style={{background:t.surface,borderRadius:8,padding:"5px 10px",flex:"1 1 80px"}}><div style={{fontSize:6,color:t.textDim,letterSpacing:1,textTransform:"uppercase"}}>status</div><div style={{fontSize:11,fontWeight:800,color:st.c}}>{st.l}</div></div>
                    <div style={{background:t.surface,borderRadius:8,padding:"5px 10px",flex:"1 1 80px"}}><div style={{fontSize:6,color:t.textDim,letterSpacing:1,textTransform:"uppercase"}}>owners</div><div style={{display:"flex",gap:2,marginTop:2}}>{claimedBy.length>0?claimedBy.map(uid=>{const u=users.find(u=>u.id===uid);return u?<AvatarC key={uid} user={u} size={16}/>:null;}):(<span style={{fontSize:9,color:t.textDim}}>unclaimed</span>)}</div></div>
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:7,color:t.textDim,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>preview</div>
                    <div style={{maxWidth:360,margin:"0 auto"}}>{mock(t)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return(<div style={{background:t.bg,minHeight:"100vh",color:t.text,fontFamily:"var(--font-dm-sans), sans-serif"}}><style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes claimPulse{0%,100%{box-shadow:0 0 16px var(--c,#bf5af2)33,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 24px var(--c,#bf5af2)55,0 2px 12px rgba(0,0,0,0.4)}}@keyframes shimmer{0%{left:-100%}100%{left:200%}}@keyframes flyup{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-30px)}}@keyframes confetti0{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(40px,-50px) rotate(180deg)}}@keyframes confetti1{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-30px,-60px) rotate(-120deg)}}@keyframes confetti2{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(60px,-30px) rotate(90deg)}}@keyframes confetti3{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-50px,-40px) rotate(-200deg)}}*{box-sizing:border-box;}@media(max-width:640px){.bu-stats{grid-template-columns:repeat(3,1fr)!important}.bu-team-row{flex-wrap:wrap;gap:6px!important}.bu-header{flex-direction:column;gap:10px!important}.bu-search-row{flex-direction:column}.bu-pipe-hours{display:none!important}}`}</style><div style={{maxWidth:1100,margin:"0 auto",padding:"20px 18px"}}>
    {/* HEADER */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
      <div><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}><div style={{width:7,height:7,borderRadius:"50%",background:t.green,boxShadow:`0 0 8px ${t.green}66`}}/><span style={{fontSize:8,letterSpacing:3,color:t.textMuted,textTransform:"uppercase",fontFamily:"var(--font-dm-mono), monospace"}}>{pipelineData.length} pipelines · {total} stages</span></div><div style={{fontSize:24,fontWeight:900,color:t.text,textShadow:`0 0 8px ${t.accent}33`}}>{t.icon} {t.name}</div><div style={{fontSize:10,color:t.textMuted,fontFamily:"var(--font-dm-mono), monospace"}}>{t.sub}</div></div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {me&&<NB color={me.color} style={{background:t.bgCard,padding:"6px 12px",display:"flex",alignItems:"center",gap:8,borderRadius:12}}><AvatarC user={me} size={24}/><div><div style={{fontSize:10,fontWeight:800,color:t.text}}>{me.name}</div><div style={{fontSize:8,color:t.amber,fontWeight:700,fontFamily:"var(--font-dm-mono), monospace"}}>{getPoints(currentUser!)}pts</div></div></NB>}
        <button onClick={()=>{setShowActivity(!showActivity);setLastSeenActivity(activityLog.length);}} style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:10,padding:"6px 10px",color:t.textMuted,fontSize:12,cursor:"pointer",position:"relative"}}>🔔{activityLog.length>lastSeenActivity&&<div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:t.red,border:`1.5px solid ${t.bgCard}`}}/>}</button>
        <button onClick={()=>setIsDark(!isDark)} style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:10,padding:"6px 10px",color:t.textMuted,fontSize:12,cursor:"pointer"}}>{isDark?"☀️":"🌚"}</button>
        <button onClick={()=>{setOnboardStep(5);setCurrentUser(null);}} style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:10,padding:"6px 10px",color:t.textMuted,fontSize:8,cursor:"pointer",fontFamily:"var(--font-dm-mono), monospace"}}>switch</button>
      </div>
    </div>

    {/* TEAM */}
    <NB color={t.accent} style={{background:t.bgCard,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",gap:12}}>{users.map(u=>(<div key={u.id} style={{display:"flex",alignItems:"center",gap:5,opacity:u.id===currentUser?1:0.5}}><AvatarC user={u} size={24}/><div><div style={{fontSize:8,fontWeight:800,color:t.text}}>{u.name}</div><div style={{fontSize:7,color:t.amber,fontFamily:"var(--font-dm-mono), monospace"}}>{getPoints(u.id)}pts</div></div></div>))}</div><div style={{fontSize:7,color:t.textDim,fontFamily:"var(--font-dm-mono), monospace"}}>{Object.keys(claims).filter(k=>(claims[k]||[]).length>0).length}/{total} claimed</div></NB>

    {/* CLAIMED OVERVIEW */}
    {(()=>{const claimedStages=Object.entries(claims).filter(([,v])=>v.length>0);if(claimedStages.length===0)return null;const byUser: Record<string, string[]>={};claimedStages.forEach(([stage,claimers])=>{claimers.forEach(uid=>{if(!byUser[uid])byUser[uid]=[];byUser[uid].push(stage);});});return(
      <NB color={t.accent} style={{background:t.bgCard,padding:"10px 14px",marginBottom:8,borderRadius:14}}>
        <div style={{fontSize:7,color:t.textDim,letterSpacing:2,textTransform:"uppercase",marginBottom:6,fontFamily:"var(--font-dm-mono), monospace"}}>claimed territories</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {Object.entries(byUser).map(([uid,stages])=>{const u=users.find(u=>u.id===uid);if(!u)return null;return(
            <div key={uid} style={{display:"flex",alignItems:"flex-start",gap:5,minWidth:0}}>
              <AvatarC user={u} size={20}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:8,fontWeight:700,color:u.color}}>{u.name}</div>
                <div style={{display:"flex",gap:2,flexWrap:"wrap",marginTop:2}}>
                  {stages.slice(0,4).map(s=>(<span key={s} style={{fontSize:6.5,color:t.textMuted,background:t.surface,padding:"1px 4px",borderRadius:3,whiteSpace:"nowrap"}}>{s}</span>))}
                  {stages.length>4&&<span style={{fontSize:6.5,color:t.textDim}}>+{stages.length-4}</span>}
                </div>
              </div>
            </div>
          );})}
        </div>
      </NB>
    );})()}

    {/* ACTIVITY PANEL */}
    {showActivity&&<NB color={t.accent} style={{background:t.bgCard,padding:"12px 14px",marginBottom:8,borderRadius:14,maxHeight:240,overflow:"auto"}}>
      <div style={{fontSize:7,color:t.textDim,letterSpacing:2,textTransform:"uppercase",marginBottom:6,fontFamily:"var(--font-dm-mono), monospace"}}>activity feed</div>
      {activityLog.length===0?<div style={{fontSize:9,color:t.textDim,padding:8}}>No activity yet</div>:activityLog.slice(0,20).map((a,i)=>{const u=users.find(x=>x.id===a.user);const ago=Math.round((Date.now()-a.time)/60000);const timeStr=ago<1?"now":ago<60?`${ago}m`:ago<1440?`${Math.round(ago/60)}h`:`${Math.round(ago/1440)}d`;return(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:i<19?`1px solid ${t.border}`:"none"}}>
          {u&&<AvatarC user={u} size={16}/>}
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontSize:8,fontWeight:700,color:u?.color||t.text}}>{u?.name}</span>
            <span style={{fontSize:8,color:t.textMuted}}> {a.type==="claim"?"claimed":a.type==="comment"?"commented on":a.type==="status"?"updated":a.type} </span>
            <span style={{fontSize:8,fontWeight:600,color:t.text}}>{a.target}</span>
            {a.detail&&<span style={{fontSize:7,color:t.accent,marginLeft:4}}>{a.detail}</span>}
          </div>
          <span style={{fontSize:7,color:t.textDim,flexShrink:0}}>{timeStr}</span>
        </div>
      );})}
    </NB>}

    {/* SEARCH & FILTER */}
    <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:"1 1 200px",position:"relative"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search stages..." style={{width:"100%",background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:10,padding:"7px 12px 7px 28px",fontSize:10,color:t.text,fontFamily:"var(--font-dm-sans), sans-serif",outline:"none"}}/>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:11,color:t.textDim}}>🔍</span>
      </div>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
        {[{l:"all",v:null},{l:"live",v:"active"},{l:"building",v:"in-progress"},{l:"planned",v:"planned"},{l:"concept",v:"concept"},{l:"my claims",v:"claimed"}].map(f=>(<button key={f.l} onClick={()=>setStatusFilter(statusFilter===f.v?null:f.v)} style={{background:statusFilter===f.v?t.accent+"20":t.bgCard,border:`1px solid ${statusFilter===f.v?t.accent+"55":t.border}`,borderRadius:8,padding:"3px 10px",fontSize:8,color:statusFilter===f.v?t.accent:t.textMuted,fontWeight:statusFilter===f.v?700:500,cursor:"pointer",fontFamily:"var(--font-dm-mono), monospace",transition:"all 0.15s"}}>{f.l}</button>))}
      </div>
    </div>

    {/* STATS */}
    <div className="bu-stats" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:12}}>{[{l:"total",v:total,c:t.text},{l:"live",v:bySt("active"),c:t.green},{l:"building",v:bySt("in-progress"),c:t.amber},{l:"planned",v:bySt("planned"),c:t.cyan||t.accent},{l:"concept",v:bySt("concept"),c:t.purple}].map(s=>(<NB key={s.l} color={s.c} style={{background:t.bgCard,padding:"8px 4px",textAlign:"center",borderRadius:10}}><div style={{fontSize:18,fontWeight:900,color:s.c,textShadow:`0 0 8px ${s.c}33`}}>{s.v}</div><div style={{fontSize:6.5,color:t.textMuted,letterSpacing:1.5,fontFamily:"var(--font-dm-mono), monospace"}}>{s.l}</div></NB>))}</div>

    {/* PIPELINES */}
    <div style={{display:"flex",flexDirection:"column",gap:7}}>{pipelineData.filter(p=>{
      const q=searchQ.toLowerCase();
      const matchesSearch=!q||p.name.toLowerCase().includes(q)||p.stages.some(s=>s.toLowerCase().includes(q));
      const matchesFilter=!statusFilter||(statusFilter==="claimed"?p.stages.some(s=>(claims[s]||[]).includes(currentUser!)):p.stages.some(s=>getStatus(s)===statusFilter));
      return matchesSearch&&matchesFilter;
    }).map(p=>{
      const isO=exp===p.id||!!searchQ;const pC=ck[p.colorKey];const prC=pr[p.priority];
      const statusWeight: Record<string,number>={concept:0,planned:25,"in-progress":60,active:100};
      const pct=Math.round(p.stages.reduce((sum,s)=>sum+(statusWeight[getStatus(s)]||0),0)/p.stages.length);
      const uClaim=[...new Set(p.stages.flatMap(s=>claims[s]||[]))];
      const allPipelineClaimed=p.stages.every(s=>(claims[s]||[]).includes(currentUser!));
      const pipeReactions=reactions[`_pipe_${p.id}`]||{};
      const pipeReactExist=Object.entries(pipeReactions).filter(([,v])=>v.length>0);
      return(<NB key={p.id} color={isO?pC:t.border} style={{background:t.bgCard,overflow:"hidden",boxShadow:isO?t.shadowLg:t.shadow,transition:"all 0.25s"}}><div style={{height:2,background:t.surface}}><div style={{width:`${Math.max(pct,2)}%`,height:"100%",background:pC,boxShadow:`0 0 6px ${pC}33`,transition:"width 0.5s"}}/></div><div onClick={()=>setExp(isO?null:p.id)} style={{padding:"12px 14px",cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"flex-start",gap:6,flex:1}}><Chev open={isO} color={pC}/><div><div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:2}}><span style={{fontSize:14}}>{p.icon}</span><span style={{fontSize:13,fontWeight:900,color:t.text,textShadow:`0 0 6px ${pC}22`}}>{p.name}</span><span style={{fontSize:6.5,color:pC,background:pC+"10",padding:"1.5px 6px",borderRadius:7,fontWeight:600}}>{p.stages.length}</span><span style={{fontSize:6,color:prC.c,background:prC.c+"15",padding:"1.5px 6px",borderRadius:7,fontWeight:800}}>{p.priority}</span><span style={{fontSize:6.5,color:t.amber,fontFamily:"var(--font-dm-mono), monospace"}}>{p.points}pts</span></div><p style={{fontSize:9.5,color:t.textSec,margin:0}}>{p.desc}</p>
        {/* Pipeline action row */}
        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:6,flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>
          {!allPipelineClaimed?(
            <button onClick={()=>{p.stages.forEach(s=>{if(!(claims[s]||[]).includes(currentUser!))handleClaim(s);});}} style={{background:`linear-gradient(135deg,${pC},${pC}aa)`,border:"none",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:8,color:"#fff",fontWeight:700,fontFamily:"var(--font-dm-mono), monospace",textTransform:"lowercase",boxShadow:`0 0 12px ${pC}33`,display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10}}>💀</span> claim all
            </button>
          ):(
            <span style={{fontSize:8,color:t.green,fontWeight:700,fontFamily:"var(--font-dm-mono), monospace"}}>✓ all claimed</span>
          )}
          <div style={{display:"flex",gap:2}} onMouseEnter={()=>setReactOpen(`_pipe_${p.id}`)} onMouseLeave={()=>setReactOpen(null)}>
            {reactOpen===`_pipe_${p.id}`?REACTIONS.map(r=>{const us=pipeReactions[r]||[];const mine=us.includes(currentUser!);return(
              <button key={r} onClick={()=>handleReact(`_pipe_${p.id}`,r)} style={{background:mine?pC+"22":us.length>0?t.surface:"transparent",border:"none",borderRadius:8,padding:"1px 3px",cursor:"pointer",display:"flex",alignItems:"center",gap:1,fontFamily:"inherit",opacity:us.length>0?1:0.35,transform:mine?"scale(1.1)":"scale(1)",transition:"all 0.1s"}}>
                <span style={{fontSize:us.length>0?11:9}}>{r}</span>
                {us.length>0&&<span style={{fontSize:6,color:mine?pC:t.textMuted,fontWeight:700}}>{us.length}</span>}
              </button>);})
            :pipeReactExist.map(([emoji,arr])=>{const mine=arr.includes(currentUser!);return(
              <button key={emoji} onClick={()=>handleReact(`_pipe_${p.id}`,emoji)} style={{background:mine?pC+"18":t.surface,border:"none",borderRadius:8,padding:"1px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:1,fontFamily:"inherit"}}>
                <span style={{fontSize:10}}>{emoji}</span>
                <span style={{fontSize:6,color:mine?pC:t.textMuted,fontWeight:700}}>{arr.length}</span>
              </button>);})}
          </div>
          {uClaim.length>0&&<div style={{display:"flex",marginLeft:2}}>{uClaim.slice(0,5).map(uid=>{const u=users.find(u=>u.id===uid);return u?<div key={uid} style={{marginLeft:-3}}><AvatarC user={u} size={17}/></div>:null;})}</div>}
        </div></div></div><div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{fontSize:11,fontWeight:900,color:pC,fontFamily:"var(--font-dm-mono), monospace",textShadow:`0 0 6px ${pC}22`}}>{p.totalHours}</div><div style={{display:"flex",gap:1.5,marginTop:3,justifyContent:"flex-end"}}>{p.stages.map((s,i)=>{const stC=sc[getStatus(s)]||{c:t.textDim};return<div key={i} style={{width:5,height:5,borderRadius:1.5,background:stC.c+"33",border:`1px solid ${stC.c}`}}/>;})}</div></div></div>{!isO&&<div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:6,paddingLeft:18}}>{p.stages.map((s,i)=>{const stC=sc[getStatus(s)]||{c:t.textDim};return(<div key={i} style={{display:"flex",alignItems:"center",gap:1.5}}><span style={{fontSize:6.5,color:stC.c,background:stC.c+"0a",padding:"1px 4px",borderRadius:4,fontFamily:"var(--font-dm-mono), monospace"}}>{s}</span>{i<p.stages.length-1&&<span style={{color:t.textDim,fontSize:7}}>→</span>}</div>);})}</div>}</div>{isO&&<div style={{padding:"0 14px 14px",animation:"fadeIn 0.2s ease"}}><div style={{borderTop:`1px solid ${t.border}`,paddingTop:10}}>{p.stages.map((s,i)=><Stage key={i} name={s} idx={i} tot={p.stages.length} pC={pC} pId={p.id}/>)}</div></div>}</NB>);
    })}</div>

    {/* Toast notification */}
    {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:t.bgCard,border:`1px solid ${toast.color}44`,borderRadius:14,padding:"10px 20px",display:"flex",alignItems:"center",gap:8,boxShadow:`0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${toast.color}22`,animation:"slideUp 0.3s ease",zIndex:100,fontFamily:"var(--font-dm-mono), monospace"}}><span style={{fontSize:11}}>🔥</span><span style={{fontSize:10,color:t.text,fontWeight:600}}>{toast.text}</span><span style={{fontSize:10,color:t.green,fontWeight:800}}>{toast.pts}</span></div>}
    <div style={{textAlign:"center",marginTop:20,paddingTop:8,borderTop:`1px solid ${t.border}`}}><p style={{fontSize:7,color:t.textDim,letterSpacing:2,fontFamily:"var(--font-dm-mono), monospace"}}>BINAYAH.AI · {total} STAGES · SHIP IT · 2026</p></div>
  </div></div>);
}
