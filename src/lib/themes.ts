interface ThemeBase {
  bg: string; bgCard: string; bgHover: string; bgSoft: string;
  border: string; text: string; textSec: string; textMuted: string; textDim: string; surface: string;
  accent: string; accent2: string; green: string; amber: string; red: string; purple: string; cyan: string; orange: string;
  name: string; icon: string; sub: string;
}

export const mkTheme = (id: string, isDark: boolean) => {
  const d = isDark;
  const bases: Record<string, ThemeBase> = {
    warroom: {
      bg: d?"#08050f":"#f8f6f2", bgCard: d?"#0d0a18":"#fff", bgHover: d?"#130f22":"#faf9f7", bgSoft: d?"#0a0814":"#f2f0ec",
      border: d?"#251e40":"#ccc4b8", text: d?"#f0ecff":"#1a1510", textSec: d?"#c8bef0":"#3a3028", textMuted: d?"#7a6ea0":"#5a5048", textDim: d?"#6858a8":"#8a8070", surface: d?"#0f0c1a":"#edeae4",
      accent: d?"#bf5af2":"#7c3aed", accent2: d?"#ff2d78":"#d4235e", green: d?"#00ff88":"#0a9956", amber: d?"#ffcc00":"#a67c00", red: d?"#ff2d78":"#d4235e", purple: d?"#bf5af2":"#7c3aed", cyan: d?"#00d4ff":"#0088bb", orange: d?"#ff6b35":"#c44d1a",
      name: "Binayah AI", icon: "🤖", sub: "// command center"
    },
    lab: {
      bg: d?"#050a0a":"#f4f8f6", bgCard: d?"#0a1414":"#fff", bgHover: d?"#0e1a1a":"#f6faf8", bgSoft: d?"#081010":"#edf4f0",
      border: d?"#1a3830":"#b0ccc0", text: d?"#e8fff4":"#0c1a14", textSec: d?"#a8d8c0":"#1e4a34", textMuted: d?"#6a9a86":"#2e6a4c", textDim: d?"#4a8870":"#5a8068", surface: d?"#081010":"#e4ede8",
      accent: d?"#00e5a0":"#088a5a", accent2: d?"#00b4d8":"#0080a0", green: d?"#00ff88":"#0a9956", amber: d?"#d4c44a":"#8a7800", red: d?"#ff6b6b":"#cc4444", purple: d?"#00b4d8":"#0080a0", cyan: d?"#00d4ff":"#0088bb", orange: d?"#e0a050":"#a05a10",
      name: "The Lab", icon: "🧪", sub: "// experimental builds in progress"
    },
    phosphor: {
      bg: d?"#0a0700":"#fdf6e3", bgCard: d?"#14100a":"#fffaee", bgHover: d?"#1a1408":"#f6efd2", bgSoft: d?"#100b04":"#f0e8cc",
      border: d?"#3a2a08":"#d4c088", text: d?"#ffcc60":"#2a2008", textSec: d?"#ffb840":"#3e2f00", textMuted: d?"#aa8030":"#6a5018", textDim: d?"#806020":"#8a6a30", surface: d?"#100b04":"#e8dfc0",
      accent: d?"#ffb000":"#a07800", accent2: d?"#ff8800":"#a05a10", green: d?"#aaff40":"#5a8a00", amber: d?"#ffcc00":"#a07800", red: d?"#ff5050":"#cc2222", purple: d?"#cc88ff":"#7c3aed", cyan: d?"#88ddff":"#0888bb", orange: d?"#ff8800":"#c44d1a",
      name: "Phosphor", icon: "📟", sub: "// burn the shell"
    },
    nerve: {
      bg: d?"#06060c":"#f4f6fa", bgCard: d?"#0c0c18":"#fff", bgHover: d?"#101020":"#f6f8fc", bgSoft: d?"#0a0a14":"#eef0f6",
      border: d?"#222440":"#b8c0d8", text: d?"#e8ecff":"#0c1020", textSec: d?"#bcc8ee":"#1e2e50", textMuted: d?"#7090b8":"#3a5080", textDim: d?"#5070a8":"#6070a0", surface: d?"#0a0a14":"#e6e8f0",
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
    shadow: d?"0 1px 6px rgba(0,0,0,0.3)":"0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
    shadowLg: d?"0 8px 40px rgba(0,0,0,0.7)":"0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    isDark: d,
    themeId: id,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type T = any;

export const THEME_OPTIONS = [
  {id:"warroom",name:"War Room",icon:"🎯",desc:"Dark ops. Neon purple. Command center.",color:"#bf5af2",bg:"#08050f"},
  {id:"lab",name:"The Lab",icon:"🧪",desc:"Bio-tech greens. Clinical but alive.",color:"#00e5a0",bg:"#050a0a"},
  {id:"phosphor",name:"Phosphor",icon:"📟",desc:"CRT amber. Burn-in glow. Mainframe ghosts.",color:"#ffb000",bg:"#0a0700"},
  {id:"nerve",name:"Nerve Center",icon:"🧠",desc:"Deep navy. Neural calm. Everything connected.",color:"#5b8cf8",bg:"#06060c"},
];

// === DESIGN TOKENS — see .claude/DESIGN_AUDIT.md ===
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;
export const radii = { sm: 8, md: 12, lg: 16 } as const;
export const type = { micro: 10, label: 11, body: 13, heading: 15, display: 28 } as const;
// Text tier rules:
//   t.text     — primary content (stage names, message body)
//   t.textSec  — secondary content (descriptions, claimer names)
//   t.textMuted — labels & meta ("3 stages", "+10pts", section headers)
//   t.textDim  — dividers, ghost placeholders, micro-counts
