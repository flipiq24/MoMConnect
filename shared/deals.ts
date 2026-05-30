import type { Property } from "./schema";
import { PIPELINE_REQUIRED_FIELDS } from "./pipelineOptions";

export type DealPriority = "LOW" | "MID" | "HIGH";
export type DealGroup = "active" | "pending";
export type PainLevel = "Low" | "Mid" | "High";

export interface DealBadge {
  label: string;
  tone: "critical" | "reminder" | "info";
}

export interface DealMeta {
  priority: DealPriority;
  painLevel: PainLevel;
  keywordLevel: PainLevel;
  stageLabel: string;
  stagePercent: number;
  nextAction: string;
  badges: DealBadge[];
  mlsStatus: string;
  arvPercent: number | null;
  price: number | null;
  group: DealGroup;
  isOpen: boolean;
  isFocus: boolean;
  isOverdue: boolean;
  openedDate: string;
  calledDate: string;
  amDate: string;
  isc: number;
  stat: { s: number; p: number; b: number; a: number };
  visits: number;
  agentResponsive: boolean;
}

const CLOSED_STATUSES = new Set<string>([
  "Acquired",
  "Cancelled FEC",
  "DO NOT USE",
  "Pass",
  "Sold Others/Closed",
]);

const PENDING_STATUSES = new Set<string>([
  "Back Up",
  "Working / Nurture",
  "None",
  "Initial Contact Started",
]);

const STAGE_MAP: Record<string, number> = {
  "Initial Contact Started": 5,
  "Working / Nurture": 10,
  "Back Up": 15,
  "Offer Sent": 20,
  "Offer Terms Sent": 35,
  "Contract Submitted": 50,
  "In Negotiation": 60,
  "In Negotiations": 60,
  "Under Contract": 75,
  "Contract Assigned": 85,
  "Offer Accepted": 90,
  "Acquired": 100,
};

const NEXT_ACTION_BY_STAGE: { max: number; action: string }[] = [
  { max: 15, action: "Send offer" },
  { max: 25, action: "Follow up on offer" },
  { max: 45, action: "Confirm receipt of terms" },
  { max: 55, action: "Submit RPA to lender" },
  { max: 70, action: "Counter terms" },
  { max: 80, action: "Update closing info" },
  { max: 90, action: "Prepare backup offer" },
  { max: 1000, action: "Open escrow" },
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function formatMonthDay(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function levelFromDesirability(value?: string | null): PainLevel {
  if (value === "High") return "High";
  if (value === "Low") return "Low";
  return "Mid";
}

/**
 * Derive the full at-a-glance metadata for a single deal row.
 * Real-data-driven where the field exists (status, score, EMD, dates, notes);
 * the FlipiQ-specific engagement flourishes (ISC, S/P/B/A counts, visit count,
 * agent responsiveness) are derived deterministically from the property id so
 * each row is stable and unique without inventing backend fields.
 */
export function deriveDealMeta(property: Property, now: Date = new Date()): DealMeta {
  const offerStatus = property.offerStatus ?? "";
  const isClosed = CLOSED_STATUSES.has(offerStatus);
  const isOpen = !isClosed;

  // Stage label + percent
  let stagePercent = STAGE_MAP[offerStatus] ?? 0;
  let stageLabel = offerStatus || "Outreach Sent";
  if (!offerStatus) {
    const rec = property.emdRecommendation ?? "";
    stagePercent = rec === "Yes EMD" ? 20 : rec === "TBD" ? 10 : 5;
    stageLabel = "Outreach Sent";
  }

  // Priority from success chance
  const chance = property.successChance ?? 50;
  const priority: DealPriority = chance >= 70 ? "HIGH" : chance >= 40 ? "MID" : "LOW";

  // Pain inversely tracks the risk score (higher score = lower pain)
  const score = property.totalScore ?? 0;
  const painLevel: PainLevel = score >= 1 ? "Low" : score <= -3 ? "High" : "Mid";

  const keywordLevel = levelFromDesirability(property.areaDesirability);

  // Group bucket
  const group: DealGroup = PENDING_STATUSES.has(offerStatus) ? "pending" : "active";

  // Next action
  const nextAction =
    NEXT_ACTION_BY_STAGE.find((s) => stagePercent <= s.max)?.action ?? "Review deal";

  // Dates
  const createdAt = property.createdAt ? new Date(property.createdAt) : now;
  const updatedAt = property.updatedAt ? new Date(property.updatedAt) : createdAt;
  const staleDays = daysBetween(now, updatedAt);
  const isOverdue = isOpen && staleDays >= 14;
  const isFocus = isOpen && stagePercent >= 50;

  const badges: DealBadge[] = [];
  if (isOverdue) badges.push({ label: "Critical", tone: "critical" });
  if (isFocus) badges.push({ label: "Reminder", tone: "reminder" });

  // Price + ARV%
  const price = property.purchasePrice ?? property.listPrice ?? null;
  const arvPercent =
    property.arv && property.arv > 0 && price
      ? Math.round((price / property.arv) * 100)
      : null;

  // MLS status label
  const mlsStatus = group === "pending" ? "MLS - Pending - REO" : "MLS - Active - STD";

  // Deterministic engagement flourishes from id hash
  const h = hashString(property.id);
  const isc = h % 30;
  const stat = {
    s: 20 + (h % 80),
    p: (h >>> 3) % 9,
    b: (h >>> 6) % 4,
    a: 1 + ((h >>> 9) % 14),
  };
  const visits = 1 + ((h >>> 4) % 6);
  const agentResponsive = (h & 1) === 1;

  return {
    priority,
    painLevel,
    keywordLevel,
    stageLabel,
    stagePercent,
    nextAction,
    badges,
    mlsStatus,
    arvPercent,
    price,
    group,
    isOpen,
    isFocus,
    isOverdue,
    openedDate: formatMonthDay(createdAt),
    calledDate: formatMonthDay(updatedAt),
    amDate: formatMonthDay(updatedAt),
    isc,
    stat,
    visits,
    agentResponsive,
  };
}

export interface KpiSummary {
  working: number;
  focus: number;
  fix: number;
}

export function computeKpis(properties: Property[], now: Date = new Date()): KpiSummary {
  let working = 0;
  let focus = 0;
  let fix = 0;
  for (const p of properties) {
    const meta = deriveDealMeta(p, now);
    if (!meta.isOpen) continue;
    working += 1;
    if (meta.isFocus) focus += 1;
    if (meta.isOverdue) fix += 1;
  }
  return { working, focus, fix };
}

export interface InfoTiles {
  effortLogged: number;
  effortTotal: number;
  outreachPercent: number;
  infractions: number;
  slipping: number;
  notes: number;
}

export function computeInfoTiles(properties: Property[], now: Date = new Date()): InfoTiles {
  const open = properties.filter((p) => deriveDealMeta(p, now).isOpen);
  const effortTotal = open.length;
  const effortLogged = open.filter((p) => {
    const updatedAt = p.updatedAt ? new Date(p.updatedAt) : null;
    return updatedAt ? daysBetween(now, updatedAt) <= 7 : false;
  }).length;
  const outreachPercent =
    open.length === 0 ? 0 : Math.round((effortLogged / open.length) * 100);

  const infractions = open.filter((p) =>
    PIPELINE_REQUIRED_FIELDS.some((f) => {
      const v = (p as any)[f];
      return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
    }),
  ).length;

  const slipping = open.filter((p) => deriveDealMeta(p, now).isOverdue).length;
  const notes = properties.filter(
    (p) => typeof p.notes === "string" && p.notes.trim() !== "",
  ).length;

  return {
    effortLogged,
    effortTotal,
    outreachPercent,
    infractions,
    slipping,
    notes,
  };
}
