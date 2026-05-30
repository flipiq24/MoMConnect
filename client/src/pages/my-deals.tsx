import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  GripVertical,
  Activity,
  ClipboardCheck,
  GraduationCap,
  Briefcase,
  Target,
  AlertTriangle,
  Circle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Property } from "@shared/schema";
import {
  deriveDealMeta,
  computeKpis,
  computeInfoTiles,
  type DealMeta,
  type DealPriority,
} from "@shared/deals";

interface MyDealsProps {
  userEmail: string;
}

type DealWithMeta = { property: Property; meta: DealMeta };

const priorityClasses: Record<DealPriority, string> = {
  HIGH: "text-red-600 dark:text-red-400",
  MID: "text-amber-600 dark:text-amber-400",
  LOW: "text-muted-foreground",
};

function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  testId,
}: {
  label: string;
  value: number;
  sub: string;
  icon: typeof Briefcase;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold font-mono text-foreground" data-testid={testId}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function InfoTile({
  label,
  primary,
  sub,
  icon: Icon,
}: {
  label: string;
  primary: string;
  sub: string;
  icon: typeof Activity;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 bg-muted rounded-md">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-medium text-foreground">{primary}</p>
          <p className="text-xs text-muted-foreground truncate">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(2, Math.min(100, percent));
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" data-testid="bar-progress">
      <div
        className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function DealRow({
  deal,
  detail,
  onOpen,
}: {
  deal: DealWithMeta;
  detail: boolean;
  onOpen: () => void;
}) {
  const { property, meta } = deal;
  return (
    <div
      className="px-4 py-3 border-b last:border-b-0 hover-elevate cursor-pointer"
      onClick={onOpen}
      data-testid={`row-deal-${property.id}`}
    >
      {/* Line 1: priority + action + contact icons + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Checkbox
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-deal-${property.id}`}
        />
        <Circle className="w-3.5 h-3.5 text-primary fill-primary/20" />
        <span
          className={`text-xs font-bold uppercase ${priorityClasses[meta.priority]}`}
          data-testid={`text-priority-${property.id}`}
        >
          {meta.priority}
        </span>
        <span className="text-sm font-semibold text-foreground">{meta.nextAction}</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="w-3.5 h-3.5" />
          <Mail className="w-3.5 h-3.5" />
          <MessageSquare className="w-3.5 h-3.5" />
          <Globe className="w-3.5 h-3.5" />
        </div>
        {meta.badges.map((b) => (
          <Badge
            key={b.label}
            variant={b.tone === "critical" ? "destructive" : "secondary"}
            data-testid={`badge-${b.tone}-${property.id}`}
          >
            {b.label}
          </Badge>
        ))}
      </div>

      <div className="mt-2 flex items-start justify-between gap-4">
        {/* Left column */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate" data-testid={`text-address-${property.id}`}>
              {property.address}
            </span>
            <span className="text-sm font-semibold text-foreground">{meta.mlsStatus}</span>
            <span className="text-xs text-muted-foreground">• Keywords: {meta.keywordLevel}</span>
          </div>

          {detail && (
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="font-mono text-foreground">
                {meta.price ? `${Math.round(meta.price / 1000)}k` : "—"}
                {meta.arvPercent !== null && (
                  <span className="text-muted-foreground"> {meta.arvPercent}% ARV</span>
                )}
              </span>
              <span>• Pain: {meta.painLevel}</span>
              <span>
                Agent:{" "}
                <span className={meta.agentResponsive ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                  {meta.agentResponsive ? "Responsive" : "Not Responsive"}
                </span>
              </span>
              <span>
                ISC: <span className="font-mono text-foreground">{meta.isc}</span>
              </span>
              <span className="font-mono">
                {meta.stat.s}S / {meta.stat.p}P / {meta.stat.b}B / {meta.stat.a}A
              </span>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="w-56 shrink-0 space-y-1.5">
          <button
            className="flex items-center gap-1 text-sm font-medium text-foreground ml-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid={`text-stage-${property.id}`}
          >
            <span className="font-mono">{meta.stagePercent}%</span>
            <span>{meta.stageLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Opened {meta.openedDate}</span>
            <span>Called {meta.calledDate}</span>
          </div>
          <ProgressBar percent={meta.stagePercent} />
          <p className="text-xs text-muted-foreground text-right">
            AM {meta.amDate} · {meta.visits}x visits
          </p>
        </div>
      </div>
    </div>
  );
}

function DealGroupSection({
  title,
  tone,
  deals,
  detail,
  onOpenDeal,
}: {
  title: string;
  tone: "active" | "pending";
  deals: DealWithMeta[];
  detail: boolean;
  onOpenDeal: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const dotClass = tone === "active" ? "text-green-500" : "text-amber-500";
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 w-full px-1 py-2 text-left"
        data-testid={`group-toggle-${tone}`}
      >
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <Circle className={`w-2.5 h-2.5 fill-current ${dotClass}`} />
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">
          {deals.length} {title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-1 overflow-hidden">
          <CardContent className="p-0">
            {deals.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No deals in this group.
              </p>
            ) : (
              deals.map((deal) => (
                <DealRow
                  key={deal.property.id}
                  deal={deal}
                  detail={detail}
                  onOpen={() => onOpenDeal(deal.property.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function MyDeals({ userEmail }: MyDealsProps) {
  const [, setLocation] = useLocation();
  const [detail, setDetail] = useState(true);

  const { data, isLoading, isError } = useQuery<Property[]>({
    queryKey: ["/api/users", userEmail, "properties"],
    enabled: !!userEmail,
  });
  const properties = Array.isArray(data) ? data : undefined;

  const { kpis, info, activeDeals, pendingDeals } = useMemo(() => {
    const list = properties ?? [];
    const withMeta: DealWithMeta[] = list.map((p) => ({
      property: p,
      meta: deriveDealMeta(p),
    }));
    const open = withMeta.filter((d) => d.meta.isOpen);
    return {
      kpis: computeKpis(list),
      info: computeInfoTiles(list),
      activeDeals: open.filter((d) => d.meta.group === "active"),
      pendingDeals: open.filter((d) => d.meta.group === "pending"),
    };
  }, [properties]);

  const openDeal = (id: string) => setLocation(`/acquisition?propertyId=${id}`);

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground" data-testid="text-error-state">
              Could not load your deals. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasDeals = (properties ?? []).length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">
          My Deals <span className="text-sm font-normal text-muted-foreground">· {today}</span>
        </h1>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiTile
          label="Working"
          value={kpis.working}
          sub="All open deals"
          icon={Briefcase}
          testId="kpi-working"
        />
        <KpiTile
          label="Focus Here"
          value={kpis.focus}
          sub="Best chance to close"
          icon={Target}
          testId="kpi-focus"
        />
        <KpiTile
          label="Fix Today"
          value={kpis.fix}
          sub="Overdue or just resurfaced"
          icon={AlertTriangle}
          testId="kpi-fix"
        />
      </div>

      {/* Info tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoTile
          label="Effort"
          primary={`${info.effortLogged}/${info.effortTotal} deals active`}
          sub={`Outreach: ${info.outreachPercent}%`}
          icon={Activity}
        />
        <InfoTile
          label="Process"
          primary={`${info.infractions} infractions`}
          sub={`${info.slipping} high-prop slipping`}
          icon={ClipboardCheck}
        />
        <InfoTile
          label="Coaching"
          primary={`${info.notes} notes on file`}
          sub="Review coaching notes"
          icon={GraduationCap}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-property-sort">
            Property
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" data-testid="button-segments">
            Segments
          </Button>
        </div>
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            variant={detail ? "ghost" : "secondary"}
            size="sm"
            onClick={() => setDetail(false)}
            data-testid="button-view-simple"
          >
            Simple
          </Button>
          <Button
            variant={detail ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setDetail(true)}
            data-testid="button-view-detail"
          >
            Detail
          </Button>
        </div>
      </div>

      {/* Grouped deals */}
      {!hasDeals ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground" data-testid="text-empty-state">
              No deals yet. Use "Add a Property" to start your first deal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <DealGroupSection
            title="Active & Off Market"
            tone="active"
            deals={activeDeals}
            detail={detail}
            onOpenDeal={openDeal}
          />
          <DealGroupSection
            title="Pending / Backup / Hold"
            tone="pending"
            deals={pendingDeals}
            detail={detail}
            onOpenDeal={openDeal}
          />
        </div>
      )}
    </div>
  );
}
