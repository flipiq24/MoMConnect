import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Property } from '@shared/schema';
import {
  OFFER_STATUS_OPTIONS,
  EMD_STATUS_OPTIONS,
  DD_STATUS_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  CONFIDENCE_TO_ASSIGN_OPTIONS,
  ACQ_ASSOCIATE_OPTIONS,
  ESCROW_OFFER_STATUSES,
  PIPELINE_REQUIRED_FIELDS,
  type PipelineRequiredField,
} from '@shared/pipelineOptions';

interface PipelineProps {
  userEmail: string;
}

type FilterMode = 'escrow' | 'allEscrow' | 'all';

const ALL_ESCROW_STATUSES = new Set<string>([
  'Offer Accepted',
  'Contract Assigned',
  'Under Contract',
  'In Negotiation',
  'In Negotiations',
  'Contract Submitted',
  'Offer Terms Sent',
  'Offer Sent',
  'Acquired',
]);

function isRequiredEmpty(row: Property, field: PipelineRequiredField): boolean {
  const v = (row as any)[field];
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function formatMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || v === ('' as any)) return '';
  const n = typeof v === 'string' ? parseInt(v) : v;
  if (Number.isNaN(n)) return '';
  return n.toLocaleString();
}

function RequiredDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Circle
      className="inline-block w-2 h-2 ml-1 text-yellow-500 fill-yellow-400 align-middle"
      data-testid="indicator-required-empty"
    />
  );
}

export default function Pipeline({ userEmail }: PipelineProps) {
  const [, setLocation] = useLocation();
  const [filterMode, setFilterMode] = useState<FilterMode>('escrow');

  const propertiesQueryKey = ['/api/users', userEmail, 'properties'];

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: propertiesQueryKey,
    queryFn: async () =>
      fetch(`/api/users/${userEmail}/properties`).then((r) => r.json()),
    enabled: !!userEmail,
  });

  const filtered = useMemo(() => {
    if (filterMode === 'all') return properties;
    if (filterMode === 'allEscrow') {
      return properties.filter((p) =>
        p.offerStatus ? ALL_ESCROW_STATUSES.has(p.offerStatus) : false,
      );
    }
    return properties.filter((p) =>
      p.offerStatus
        ? (ESCROW_OFFER_STATUSES as readonly string[]).includes(p.offerStatus)
        : false,
    );
  }, [properties, filterMode]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      return await apiRequest('PATCH', `/api/properties/${id}`, {
        ...patch,
        email: userEmail,
      });
    },
    onSuccess: (updated: Property) => {
      queryClient.setQueryData<Property[]>(propertiesQueryKey, (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
      });
      queryClient.invalidateQueries({ queryKey: propertiesQueryKey });
    },
  });

  // Debounce buffer for text inputs
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});

  const commit = useCallback(
    (id: string, field: string, value: any) => {
      updateMutation.mutate({ id, patch: { [field]: value } });
      setDrafts((prev) => {
        const next = { ...prev };
        if (next[id]) {
          const { [field]: _omit, ...rest } = next[id];
          if (Object.keys(rest).length === 0) {
            delete next[id];
          } else {
            next[id] = rest;
          }
        }
        return next;
      });
    },
    [updateMutation],
  );

  const handleTextChange = (id: string, field: string, value: any) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
    const key = `${id}:${field}`;
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => {
      commit(id, field, value === '' ? null : value);
    }, 500);
  };

  const handleSelectChange = (id: string, field: string, value: any) => {
    commit(id, field, value);
  };

  const getValue = (row: Property, field: string) => {
    const draft = drafts[row.id]?.[field];
    if (draft !== undefined) return draft;
    const v = (row as any)[field];
    return v ?? '';
  };

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const openProperty = (id: string) => {
    setLocation(`/acquisition?propertyId=${id}`);
  };

  // Column group definitions for super-header
  const groups: { label: string; span: number; tone: string }[] = [
    { label: 'PROPERTY', span: 5, tone: 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' },
    { label: 'DEAL INFO', span: 4, tone: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100' },
    { label: 'TEAM / AGENT', span: 4, tone: 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100' },
    { label: 'DUE DILIGENCE', span: 4, tone: 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100' },
    { label: 'EMD', span: 3, tone: 'bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-100' },
    { label: 'ASSIGNMENT', span: 2, tone: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100' },
    { label: 'NOTES', span: 1, tone: 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' },
  ];

  const columnHeaders = [
    '#',
    'Property Address',
    'City',
    'Risk Score',
    'EMD Rec',
    'Offer Status',
    'List Price',
    'Acq. Purchase Price',
    'Est. COE',
    'Acq. Associate',
    'Listing Agent',
    'Agent Phone',
    'Agent Email',
    'DD Deadline',
    'DD Status',
    'DD Approved By',
    'DD Approval Date',
    'EMD Amount',
    'EMD Due Date',
    'EMD Status',
    'Assignment Status',
    'Confidence to Assign',
    'Notes',
  ];

  const activeEscrowCount = useMemo(
    () =>
      properties.filter((p) =>
        p.offerStatus
          ? (ESCROW_OFFER_STATUSES as readonly string[]).includes(p.offerStatus)
          : false,
      ).length,
    [properties],
  );

  const extractCity = (address: string | null | undefined): string => {
    if (!address) return '';
    const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[1];
    return '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-pipeline-title">
          Acquisition Pipeline — Active Deals in Escrow
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span data-testid="text-pipeline-date">{today}</span>
          <span>•</span>
          <span data-testid="text-pipeline-filter">
            Filter: {filterMode === 'escrow'
              ? 'Offer Accepted & Contract Assigned'
              : filterMode === 'allEscrow'
              ? 'All escrow deals'
              : 'All properties'}
          </span>
          <span>•</span>
          <span data-testid="text-pipeline-count">
            {activeEscrowCount} active deal{activeEscrowCount === 1 ? '' : 's'}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Circle className="w-2 h-2 text-yellow-500 fill-yellow-400" /> = Required field not yet filled
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">View:</span>
        <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
          <SelectTrigger className="w-72" data-testid="select-filter-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="escrow">Offer Accepted &amp; Contract Assigned</SelectItem>
            <SelectItem value="allEscrow">All escrow deals</SelectItem>
            <SelectItem value="all">All properties</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="p-10 text-center text-muted-foreground"
              data-testid="text-empty-state"
            >
              No deals to display for this filter.
            </div>
          ) : (
            <Table className="min-w-[2200px] text-xs">
              <TableHeader>
                <TableRow>
                  {groups.map((g) => (
                    <TableHead
                      key={g.label}
                      colSpan={g.span}
                      className={cn(
                        'text-center font-semibold border-r last:border-r-0 h-9',
                        g.tone,
                      )}
                    >
                      {g.label}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  {columnHeaders.map((h) => (
                    <TableHead
                      key={h}
                      className="whitespace-nowrap text-xs font-medium border-r last:border-r-0"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, idx) => (
                  <TableRow key={row.id} data-testid={`row-property-${row.id}`}>
                    {/* PROPERTY */}
                    <TableCell className="border-r p-2 align-top">{idx + 1}</TableCell>
                    <TableCell className="border-r p-2 align-top min-w-[220px]">
                      <button
                        className="text-left text-primary underline-offset-2 hover:underline"
                        onClick={() => openProperty(row.id)}
                        data-testid={`link-address-${row.id}`}
                      >
                        {row.address || '(no address)'}
                      </button>
                    </TableCell>
                    <TableCell className="border-r p-2 align-top min-w-[120px]">
                      {extractCity(row.address)}
                    </TableCell>
                    <TableCell
                      className="border-r p-2 align-top text-center font-mono"
                      data-testid={`text-score-${row.id}`}
                    >
                      {row.totalScore ?? 0}
                    </TableCell>
                    <TableCell
                      className="border-r p-2 align-top text-center"
                      data-testid={`text-emd-rec-${row.id}`}
                    >
                      {row.emdRecommendation ?? '—'}
                    </TableCell>

                    {/* DEAL INFO */}
                    <TableCell className="border-r p-1 align-top min-w-[180px]">
                      <Select
                        value={getValue(row, 'offerStatus') as string}
                        onValueChange={(v) => handleSelectChange(row.id, 'offerStatus', v)}
                      >
                        <SelectTrigger
                          className="h-8 text-xs"
                          data-testid={`select-offer-status-${row.id}`}
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OFFER_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[120px]">
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={getValue(row, 'listPrice') as any}
                        onChange={(e) =>
                          handleTextChange(
                            row.id,
                            'listPrice',
                            e.target.value === '' ? '' : parseInt(e.target.value),
                          )
                        }
                        data-testid={`input-list-price-${row.id}`}
                      />
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={getValue(row, 'purchasePrice') as any}
                          onChange={(e) =>
                            handleTextChange(
                              row.id,
                              'purchasePrice',
                              e.target.value === '' ? '' : parseInt(e.target.value),
                            )
                          }
                          data-testid={`input-purchase-price-${row.id}`}
                        />
                        <RequiredDot show={isRequiredEmpty(row, 'purchasePrice')} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={getValue(row, 'estCOE') as string}
                        onChange={(e) => handleTextChange(row.id, 'estCOE', e.target.value)}
                        data-testid={`input-est-coe-${row.id}`}
                      />
                    </TableCell>

                    {/* TEAM / AGENT */}
                    <TableCell className="border-r p-1 align-top min-w-[170px]">
                      <div className="flex items-center gap-1">
                        <Select
                          value={getValue(row, 'acqAssociate') as string}
                          onValueChange={(v) =>
                            handleSelectChange(row.id, 'acqAssociate', v)
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            data-testid={`select-acq-associate-${row.id}`}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ACQ_ASSOCIATE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <RequiredDot show={isRequiredEmpty(row, 'acqAssociate')} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[150px]">
                      <Input
                        className="h-8 text-xs"
                        value={getValue(row, 'listingAgent') as string}
                        onChange={(e) =>
                          handleTextChange(row.id, 'listingAgent', e.target.value)
                        }
                        data-testid={`input-listing-agent-${row.id}`}
                      />
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <Input
                        className="h-8 text-xs"
                        value={getValue(row, 'agentPhone') as string}
                        onChange={(e) =>
                          handleTextChange(row.id, 'agentPhone', e.target.value)
                        }
                        data-testid={`input-agent-phone-${row.id}`}
                      />
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[180px]">
                      <Input
                        className="h-8 text-xs"
                        value={getValue(row, 'agentEmail') as string}
                        onChange={(e) =>
                          handleTextChange(row.id, 'agentEmail', e.target.value)
                        }
                        data-testid={`input-agent-email-${row.id}`}
                      />
                    </TableCell>

                    {/* DUE DILIGENCE */}
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={getValue(row, 'ddDeadline') as string}
                          onChange={(e) =>
                            handleTextChange(row.id, 'ddDeadline', e.target.value)
                          }
                          data-testid={`input-dd-deadline-${row.id}`}
                        />
                        <RequiredDot show={isRequiredEmpty(row, 'ddDeadline')} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[180px]">
                      <div className="flex items-center gap-1">
                        <Select
                          value={getValue(row, 'ddStatus') as string}
                          onValueChange={(v) => handleSelectChange(row.id, 'ddStatus', v)}
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            data-testid={`select-dd-status-${row.id}`}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DD_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <RequiredDot show={isRequiredEmpty(row, 'ddStatus')} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <Input
                        className="h-8 text-xs"
                        value={getValue(row, 'ddApprovedBy') as string}
                        onChange={(e) =>
                          handleTextChange(row.id, 'ddApprovedBy', e.target.value)
                        }
                        data-testid={`input-dd-approved-by-${row.id}`}
                      />
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={getValue(row, 'ddApprovalDate') as string}
                        onChange={(e) =>
                          handleTextChange(row.id, 'ddApprovalDate', e.target.value)
                        }
                        data-testid={`input-dd-approval-date-${row.id}`}
                      />
                    </TableCell>

                    {/* EMD */}
                    <TableCell className="border-r p-1 align-top min-w-[120px]">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={getValue(row, 'emdAmount') as any}
                          onChange={(e) =>
                            handleTextChange(
                              row.id,
                              'emdAmount',
                              e.target.value === '' ? '' : parseInt(e.target.value),
                            )
                          }
                          data-testid={`input-emd-amount-${row.id}`}
                        />
                        <RequiredDot show={isRequiredEmpty(row, 'emdAmount')} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={getValue(row, 'emdDueDate') as string}
                          onChange={(e) =>
                            handleTextChange(row.id, 'emdDueDate', e.target.value)
                          }
                          data-testid={`input-emd-due-date-${row.id}`}
                        />
                        <RequiredDot show={isRequiredEmpty(row, 'emdDueDate')} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[200px]">
                      <div className="flex items-center gap-1">
                        <Select
                          value={getValue(row, 'emdStatus') as string}
                          onValueChange={(v) => handleSelectChange(row.id, 'emdStatus', v)}
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            data-testid={`select-emd-status-${row.id}`}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {EMD_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <RequiredDot show={isRequiredEmpty(row, 'emdStatus')} />
                      </div>
                    </TableCell>

                    {/* ASSIGNMENT */}
                    <TableCell className="border-r p-1 align-top min-w-[220px]">
                      <div className="flex items-center gap-1">
                        <Select
                          value={getValue(row, 'assignmentStatus') as string}
                          onValueChange={(v) =>
                            handleSelectChange(row.id, 'assignmentStatus', v)
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            data-testid={`select-assignment-status-${row.id}`}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNMENT_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <RequiredDot show={isRequiredEmpty(row, 'assignmentStatus')} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r p-1 align-top min-w-[140px]">
                      <div className="flex items-center gap-1">
                        <Select
                          value={getValue(row, 'confidenceToAssign') as string}
                          onValueChange={(v) =>
                            handleSelectChange(row.id, 'confidenceToAssign', v)
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            data-testid={`select-confidence-${row.id}`}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CONFIDENCE_TO_ASSIGN_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <RequiredDot show={isRequiredEmpty(row, 'confidenceToAssign')} />
                      </div>
                    </TableCell>

                    {/* NOTES — synced with Acquisition "Short description for wholesaling" */}
                    <TableCell className="p-1 align-top min-w-[240px]">
                      <Input
                        className="h-8 text-xs"
                        value={getValue(row, 'wholesalingShortDescription') as string}
                        onChange={(e) =>
                          handleTextChange(row.id, 'wholesalingShortDescription', e.target.value)
                        }
                        data-testid={`input-notes-${row.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
