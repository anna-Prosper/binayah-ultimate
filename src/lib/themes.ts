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
export type T = any;

export const THEME_OPTIONS = [
  {id:"warroom",name:"War Room",icon:"🏴‍☠️",desc:"Dark ops. Neon purple. Secret command center.",color:"#bf5af2",bg:"#08050f"},
  {id:"lab",name:"The Lab",icon:"🧪",desc:"Bio-tech greens. Clinical but alive.",color:"#00e5a0",bg:"#050a0a"},
  {id:"engine",name:"Engine Room",icon:"⚙️",desc:"Industrial heat. Orange sparks. Raw power.",color:"#ff6b35",bg:"#0a0808"},
  {id:"nerve",name:"Nerve Center",icon:"🧠",desc:"Deep navy. Neural calm. Everything connected.",color:"#5b8cf8",bg:"#06060c"},
];
