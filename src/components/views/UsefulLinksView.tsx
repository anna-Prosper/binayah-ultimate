"use client";

import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bot,
  Calculator,
  Clapperboard,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  LayoutTemplate,
  Link2,
  MessageCircle,
  Newspaper,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useModel } from "@/lib/contexts/ModelContext";
import type { UsefulLinkIcon, UsefulLinkItem } from "@/lib/data";

type LinkFormState = {
  group: string;
  eyebrow: string;
  title: string;
  label: string;
  href: string;
  icon: UsefulLinkIcon;
  badge: string;
  description: string;
  username: string;
  email: string;
  password: string;
};

const ICONS: Record<UsefulLinkIcon, typeof Newspaper> = {
  newspaper: Newspaper,
  search: Search,
  calculator: Calculator,
  message: MessageCircle,
  code: Code2,
  clapperboard: Clapperboard,
  globe: Globe2,
  shield: ShieldCheck,
  wrench: Wrench,
  file: FileText,
  layout: LayoutTemplate,
  sparkles: Sparkles,
  bot: Bot,
  link: Link2,
};

const ICON_LABELS: Array<{ id: UsefulLinkIcon; label: string }> = [
  { id: "newspaper", label: "News" },
  { id: "search", label: "Search" },
  { id: "calculator", label: "Calculator" },
  { id: "message", label: "Message" },
  { id: "code", label: "Code" },
  { id: "clapperboard", label: "Video" },
  { id: "globe", label: "Website" },
  { id: "shield", label: "Secure" },
  { id: "wrench", label: "Tool" },
  { id: "file", label: "File" },
  { id: "layout", label: "Template" },
  { id: "sparkles", label: "Magic" },
  { id: "bot", label: "AI" },
  { id: "link", label: "Link" },
];

const blankForm: LinkFormState = {
  group: "Tools",
  eyebrow: "Internal operations",
  title: "",
  label: "",
  href: "",
  icon: "link",
  badge: "",
  description: "",
  username: "",
  email: "",
  password: "",
};

const CREATE_SECTION_VALUE = "__create_section__";

function formFromItem(item: UsefulLinkItem): LinkFormState {
  return {
    group: item.group,
    eyebrow: item.eyebrow,
    title: item.title,
    label: item.label || "",
    href: item.href,
    icon: item.icon,
    badge: item.badge || "",
    description: item.description || "",
    username: item.credentials?.username || "",
    email: item.credentials?.email || "",
    password: item.credentials?.password || "",
  };
}

export default function UsefulLinksView() {
  const { t, usefulLinks, addUsefulLink, updateUsefulLink, deleteUsefulLink } = useModel();
  const [editing, setEditing] = useState<UsefulLinkItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; eyebrow: string; items: UsefulLinkItem[] }>();
    for (const item of usefulLinks) {
      const key = `${item.group}::${item.eyebrow}`;
      if (!map.has(key)) map.set(key, { title: item.group, eyebrow: item.eyebrow, items: [] });
      map.get(key)?.items.push(item);
    }
    return Array.from(map.values()).map(group => ({
      ...group,
      items: [...group.items].sort((a, b) => a.id - b.id),
    }));
  }, [usefulLinks]);

  const totalLinks = usefulLinks.length;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item: UsefulLinkItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <main style={{ padding: "22px 28px 34px", color: t.text, maxWidth: 1220, margin: "0 auto", width: "100%" }}>
      <header style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "end", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>
            Binayah Hub
          </div>
          <h1 style={{ margin: "5px 0 5px", fontSize: 28, lineHeight: 1.1, letterSpacing: 0, color: t.text }}>
            Internal Tools & Automation
          </h1>
          <p style={{ margin: 0, color: t.textMuted, fontSize: 14, lineHeight: 1.45, maxWidth: 620 }}>
            Streamline operations with purpose-built tools for the Binayah team.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontSize: 12 }}>
            <ExternalLink size={15} />
            {totalLinks} links
          </span>
          <button
            type="button"
            onClick={openAdd}
            style={{ border: `1px solid ${t.accent}55`, background: t.accent, color: "#fff", borderRadius: 8, padding: "9px 12px", display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace", fontSize: 12, fontWeight: 900 }}
          >
            <Plus size={15} /> add item
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {groups.map(group => (
          <section key={`${group.title}-${group.eyebrow}`}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18, letterSpacing: 0, color: t.text }}>{group.title}</h2>
              <span style={{ color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {group.eyebrow}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))", gap: 12 }}>
              {group.items.map(item => (
                <UsefulLinkCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => deleteUsefulLink(item.id)} />
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <div style={{ border: `1px dashed ${t.border}`, borderRadius: 8, padding: 28, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>
            // no useful links yet
          </div>
        )}
      </div>

      {formOpen && (
        <UsefulLinkForm
          item={editing}
          onClose={() => setFormOpen(false)}
          onSubmit={form => {
            const credentials = form.username || form.email || form.password
              ? { username: form.username || undefined, email: form.email || undefined, password: form.password || undefined }
              : undefined;
            const payload = {
              group: form.group,
              eyebrow: form.eyebrow,
              title: form.title,
              label: form.label || undefined,
              href: form.href,
              icon: form.icon,
              badge: form.badge || undefined,
              description: form.description || undefined,
              credentials,
            };
            if (editing) updateUsefulLink(editing.id, payload);
            else addUsefulLink(payload);
            setFormOpen(false);
          }}
        />
      )}
    </main>
  );
}

function UsefulLinkCard({ item, onEdit, onDelete }: { item: UsefulLinkItem; onEdit: () => void; onDelete: () => void }) {
  const { t } = useModel();
  const [showSecret, setShowSecret] = useState(false);
  const Icon = ICONS[item.icon] || Link2;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 10,
        minHeight: 178,
        height: "100%",
        padding: 14,
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        color: t.text,
        boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
      }}
    >
      <span style={{ display: "grid", gridTemplateColumns: "38px minmax(0, 1fr) auto", gap: 10, alignItems: "start" }}>
        <span style={{ width: 38, height: 38, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0, background: t.accent + "12", color: t.accent, border: `1px solid ${t.accent}33` }}>
          <Icon size={19} strokeWidth={1.9} />
        </span>
        <span style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 15, lineHeight: 1.22, color: t.text, minHeight: 36 }}>{item.title}</strong>
          {item.badge && (
            <span style={{ display: "inline-flex", marginTop: 5, color: t.green, background: t.green + "12", border: `1px solid ${t.green}33`, borderRadius: 999, padding: "2px 7px", fontSize: 10, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 900, textTransform: "uppercase" }}>
              {item.badge}
            </span>
          )}
        </span>
        <span style={{ display: "flex", gap: 5 }}>
          <button type="button" onClick={onEdit} aria-label={`Edit ${item.title}`} style={iconButton(t)}>
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${item.title}"?`)) onDelete();
            }}
            aria-label={`Delete ${item.title}`}
            style={{ ...iconButton(t), color: t.red, borderColor: t.red + "44" }}
          >
            <Trash2 size={13} />
          </button>
        </span>
      </span>
      <span style={{ minWidth: 0 }}>
        {item.description ? (
          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: t.textMuted, fontSize: 12, lineHeight: 1.35 }}>
            {item.description}
          </span>
        ) : (
          <span style={{ display: "block", color: t.textDim, fontSize: 12, lineHeight: 1.35 }}>
            Open the linked resource.
          </span>
        )}
        {item.label && (
          <span style={{ display: "block", marginTop: 4, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontSize: 12 }}>
            {item.label}
          </span>
        )}
        {item.credentials && (
          <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap", color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11 }}>
            <span>{item.credentials.email || item.credentials.username}</span>
            {item.credentials.password && <span>{showSecret ? item.credentials.password : "••••••"}</span>}
            {item.credentials.password && (
              <button type="button" onClick={() => setShowSecret(v => !v)} style={{ border: `1px solid ${t.border}`, background: t.bgSoft, color: t.textMuted, borderRadius: 999, padding: "2px 7px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, font: "inherit" }}>
                {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                {showSecret ? "hide pass" : "show pass"}
              </button>
            )}
          </span>
        )}
      </span>
      <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: t.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 34, borderRadius: 8, border: `1px solid ${t.border}`, padding: "0 10px", fontFamily: "var(--font-dm-mono), monospace", fontSize: 12, fontWeight: 900 }} aria-label={`Open ${item.title}`}>
        open
        <ArrowUpRight size={16} strokeWidth={1.9} />
      </a>
    </div>
  );
}

function UsefulLinkForm({ item, onClose, onSubmit }: { item: UsefulLinkItem | null; onClose: () => void; onSubmit: (form: LinkFormState) => void }) {
  const { t, usefulLinks } = useModel();
  const [form, setForm] = useState<LinkFormState>(() => item ? formFromItem(item) : blankForm);
  const [showPassword, setShowPassword] = useState(false);
  const sections = useMemo(() => {
    const map = new Map<string, { key: string; group: string; eyebrow: string; label: string }>();
    for (const link of usefulLinks) {
      const group = link.group.trim() || "Tools";
      const eyebrow = link.eyebrow.trim() || "Internal operations";
      const key = `${group}::${eyebrow}`;
      if (!map.has(key)) map.set(key, { key, group, eyebrow, label: `${group} / ${eyebrow}` });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [usefulLinks]);
  const selectedSectionKey = `${form.group.trim() || "Tools"}::${form.eyebrow.trim() || "Internal operations"}`;
  const hasSelectedSection = sections.some(section => section.key === selectedSectionKey);
  const [creatingSection, setCreatingSection] = useState(() => !item && sections.length === 0);
  const update = <K extends keyof LinkFormState>(key: K, value: LinkFormState[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const inputStyle = { width: "100%", border: `1px solid ${t.border}`, background: t.bgCard, color: t.text, borderRadius: 8, padding: "9px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 0.7 };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(12, 8, 18, 0.45)", display: "grid", placeItems: "center", padding: 16 }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ width: "min(720px, 100%)", maxHeight: "min(820px, calc(100vh - 32px))", overflow: "auto", background: t.bgCard, color: t.text, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,0.28)", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={labelStyle}>{item ? "edit useful link" : "new useful link"}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 20, lineHeight: 1.2 }}>{item ? item.title : "Add item"}</h2>
          </div>
          <button type="button" onClick={onClose} style={iconButton(t)} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label="title" labelStyle={labelStyle}>
            <input required value={form.title} onChange={e => update("title", e.target.value)} style={inputStyle} placeholder="Tool name" />
          </Field>
          <Field label="url" labelStyle={labelStyle}>
            <input required type="url" value={form.href} onChange={e => update("href", e.target.value)} style={inputStyle} placeholder="https://..." />
          </Field>
          <Field label="section" labelStyle={labelStyle} full>
            <select
              value={creatingSection || !hasSelectedSection ? CREATE_SECTION_VALUE : selectedSectionKey}
              onChange={e => {
                if (e.target.value === CREATE_SECTION_VALUE) {
                  setCreatingSection(true);
                  return;
                }
                const section = sections.find(entry => entry.key === e.target.value);
                if (!section) return;
                setCreatingSection(false);
                setForm(prev => ({ ...prev, group: section.group, eyebrow: section.eyebrow }));
              }}
              style={inputStyle}
            >
              {!hasSelectedSection && !creatingSection && (
                <option value={selectedSectionKey}>{form.group || "Tools"} / {form.eyebrow || "Internal operations"}</option>
              )}
              {sections.map(section => <option key={section.key} value={section.key}>{section.label}</option>)}
              <option value={CREATE_SECTION_VALUE}>+ create new section</option>
            </select>
          </Field>
          {creatingSection && (
            <>
              <Field label="group" labelStyle={labelStyle}>
                <input value={form.group} onChange={e => update("group", e.target.value)} style={inputStyle} placeholder="Tools" />
              </Field>
              <Field label="section label" labelStyle={labelStyle}>
                <input value={form.eyebrow} onChange={e => update("eyebrow", e.target.value)} style={inputStyle} placeholder="Internal operations" />
              </Field>
            </>
          )}
          <Field label="small label" labelStyle={labelStyle}>
            <input value={form.label} onChange={e => update("label", e.target.value)} style={inputStyle} placeholder="Production, Test, WhatsApp..." />
          </Field>
          <Field label="badge" labelStyle={labelStyle}>
            <input value={form.badge} onChange={e => update("badge", e.target.value)} style={inputStyle} placeholder="launch, login, staging..." />
          </Field>
          <Field label="icon" labelStyle={labelStyle}>
            <select value={form.icon} onChange={e => update("icon", e.target.value as UsefulLinkIcon)} style={inputStyle}>
              {ICON_LABELS.map(icon => <option key={icon.id} value={icon.id}>{icon.label}</option>)}
            </select>
          </Field>
          <Field label="login / username" labelStyle={labelStyle}>
            <input value={form.username} onChange={e => update("username", e.target.value)} style={inputStyle} placeholder="admin" />
          </Field>
          <Field label="email" labelStyle={labelStyle}>
            <input value={form.email} onChange={e => update("email", e.target.value)} style={inputStyle} placeholder="admin@example.com" />
          </Field>
          <Field label="password" labelStyle={labelStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 6 }}>
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} style={inputStyle} placeholder="optional" />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ ...iconButton(t), minWidth: 42 }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <Field label="description" labelStyle={labelStyle} full>
            <textarea value={form.description} onChange={e => update("description", e.target.value)} style={{ ...inputStyle, minHeight: 86, resize: "vertical" }} placeholder="What is this used for?" />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${t.border}`, background: "transparent", color: t.textMuted, borderRadius: 8, padding: "9px 13px", cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 800 }}>
            cancel
          </button>
          <button type="submit" style={{ border: `1px solid ${t.accent}55`, background: t.accent, color: "#fff", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 900 }}>
            {item ? "save changes" : "add item"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, labelStyle, full, children }: { label: string; labelStyle: CSSProperties; full?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function iconButton(t: { border: string; bgSoft: string; textMuted: string }): CSSProperties {
  return {
    width: 34,
    height: 34,
    border: `1px solid ${t.border}`,
    background: t.bgSoft,
    color: t.textMuted,
    borderRadius: 8,
    display: "inline-grid",
    placeItems: "center",
    cursor: "pointer",
    flexShrink: 0,
  };
}
