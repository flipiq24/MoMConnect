import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { FinalContractTerms } from '@shared/schema';

interface FinalContractTermsTabProps {
  data: FinalContractTerms;
  onChange: (next: FinalContractTerms) => void;
}

// --- date helpers ---------------------------------------------------------
function toDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function format(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addBusinessDays(start?: string, days?: string): string {
  const d = toDate(start);
  const n = parseInt(days || '', 10);
  if (!d || isNaN(n) || n <= 0) return '';
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return format(d);
}

function addCalendarDays(start?: string, days?: string): string {
  const d = toDate(start);
  const n = parseInt(days || '', 10);
  if (!d || isNaN(n) || n <= 0) return '';
  d.setDate(d.getDate() + n);
  return format(d);
}

function testId(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// --- option sets ----------------------------------------------------------
const YES_NO = ['Yes', 'No'];
const LEAD_SOURCE = ['MLS', 'Seller', 'Direct', 'Wholesaler', 'Agent', 'Other'];
const SALE_TYPE = ['Standard', 'Short Sale', 'Probate', 'REO', 'Auction', 'Trust', 'FSBO'];
const OCCUPANT_TYPE = ['Owner Occupied', 'Tenant Occupied', 'Vacant'];
const SOLAR = ['None', 'Owned', 'Leased', 'PPA', 'Financed'];
const LOCKBOX = ['Supra', 'Combo', 'None', 'Other'];
const POSSESSION = ['Seller', 'Buyer', 'Tenant', 'COE', 'COE + Days'];
const INTENT = ['Wholesale', 'Fix & Flip', 'Buy & Hold', 'Development'];
const EMD_TYPE = ['Cash', 'Wire', 'Check', 'Other'];
const EMD_STATUS = ['Assigned', 'Sent to Escrow', 'Received', 'Refunded', 'Released'];
const TERMITE = ['Buyer', 'Seller', 'Split', 'Waived', 'N/A'];
const CLOSING_COSTS = ['Each pays own', "Buyer pays seller's", 'Seller pays all', 'Buyer pays all'];
const COST_RESPONSIBILITY = ['Each pays own', "Buyer pays seller's"];

const DANGER_VALUE = "Buyer pays seller's";

// --- field context shared by every field ----------------------------------
type Ctx = {
  data: Record<string, any>;
  update: (patch: Partial<FinalContractTerms>) => void;
};

// --- module-level field renderers (defined outside the component so inputs
//     are not remounted / do not lose focus on each re-render) --------------
function TextField({
  label,
  field,
  data,
  update,
  type = 'text',
  required = false,
  placeholder,
  danger = false,
  dangerMessage,
}: Ctx & {
  label: string;
  field: keyof FinalContractTerms;
  type?: string;
  required?: boolean;
  placeholder?: string;
  danger?: boolean;
  dangerMessage?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field as string} className={danger ? 'text-destructive' : undefined}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={field as string}
        type={type}
        value={data[field as string] || ''}
        placeholder={placeholder}
        className={danger ? 'border-destructive text-destructive' : undefined}
        onChange={(e) => update({ [field]: e.target.value } as Partial<FinalContractTerms>)}
        data-testid={`input-${testId(field as string)}`}
      />
      {danger && dangerMessage && (
        <p className="text-xs text-destructive" data-testid={`warning-${testId(field as string)}`}>
          {dangerMessage}
        </p>
      )}
    </div>
  );
}

function AreaField({
  label,
  field,
  data,
  update,
}: Ctx & { label: string; field: keyof FinalContractTerms }) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={field as string}>{label}</Label>
      <Textarea
        id={field as string}
        value={data[field as string] || ''}
        onChange={(e) => update({ [field]: e.target.value } as Partial<FinalContractTerms>)}
        data-testid={`textarea-${testId(field as string)}`}
      />
    </div>
  );
}

function SelectField({
  label,
  field,
  options,
  data,
  update,
  required = false,
  danger = false,
  onDangerSelected,
}: Ctx & {
  label: string;
  field: keyof FinalContractTerms;
  options: string[];
  required?: boolean;
  danger?: boolean;
  onDangerSelected?: () => void;
}) {
  const value = data[field as string] || '';
  const isDanger = danger && value === DANGER_VALUE;
  return (
    <div className="space-y-2">
      <Label htmlFor={field as string} className={isDanger ? 'text-destructive' : undefined}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Select
        value={value}
        onValueChange={(v) => {
          update({ [field]: v } as Partial<FinalContractTerms>);
          if (v === DANGER_VALUE) onDangerSelected?.();
        }}
      >
        <SelectTrigger
          id={field as string}
          className={isDanger ? 'border-destructive text-destructive' : undefined}
          data-testid={`select-${testId(field as string)}`}
        >
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isDanger && (
        <p className="text-xs text-destructive" data-testid={`warning-${testId(field as string)}`}>
          Warning: buyer is paying the seller's cost.
        </p>
      )}
    </div>
  );
}

function DerivedDateField({
  label,
  field,
  hint,
  data,
}: Pick<Ctx, 'data'> & { label: string; field: keyof FinalContractTerms; hint: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field as string}>
        {label} <span className="text-muted-foreground">(auto)</span>
      </Label>
      <Input
        id={field as string}
        type="date"
        value={data[field as string] || ''}
        disabled
        data-testid={`input-${testId(field as string)}`}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// --- shared Wholesale EMD section (used in both Final Contract Terms and AM
//     Hard Approval) so the data stays in sync across tabs -------------------
export function EmdSection({
  data,
  onChange,
}: {
  data: Record<string, any>;
  onChange: (next: FinalContractTerms) => void;
}) {
  const update = (patch: Partial<FinalContractTerms>) =>
    onChange({ ...(data as FinalContractTerms), ...patch });
  const ctx: Ctx = { data, update };
  const isRefunded = (data.emdStatus || '') === 'Refunded';
  return (
    <Card>
      <CardHeader>
        <CardTitle>EMD</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emdContractAmount">
              EMD Contract Amount <span className="text-muted-foreground">(auto)</span>
            </Label>
            <Input
              id="emdContractAmount"
              type="number"
              value={data.contractEmdAmount || ''}
              disabled
              data-testid="input-emdContractAmount"
            />
            <p className="text-xs text-muted-foreground">Duplicated from Contract EMD Amount.</p>
          </div>
          <TextField label="Wire Instructions" field="wireInstructions" type="url" placeholder="https://..." {...ctx} />
          <TextField label="EMD Approved By" field="emdApprovedBy" placeholder="Enter name..." {...ctx} />
          <TextField label="EMD Sent By" field="emdSentBy" placeholder="Enter name..." {...ctx} />
          <SelectField label="EMD Status" field="emdStatus" options={EMD_STATUS} {...ctx} />
          <TextField label="EMD Status Date" field="emdStatusDate" type="date" {...ctx} />
          <TextField label="EMD Amount Sent" field="emdAmountSent" type="number" placeholder="$" {...ctx} />
          <TextField label="EMD Sent Date" field="emdSentDate" type="date" {...ctx} />
          {isRefunded && (
            <>
              <TextField label="EMD Amount Refunded" field="emdAmountRefunded" type="number" placeholder="$" {...ctx} />
              <TextField label="EMD Amount Refunded Date" field="emdAmountRefundedDate" type="date" {...ctx} />
            </>
          )}
          <AreaField label="EMD Notes" field="emdNotes" {...ctx} />
        </div>
      </CardContent>
    </Card>
  );
}

interface WholesaleDetailsSectionProps {
  data: Record<string, any>;
  update: (field: string, value: any) => void;
}

export function WholesaleDetailsSection({ data, update }: WholesaleDetailsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wholesale Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Wholesale Status</Label>
          <Select
            value={data.wholesaleStatus || ''}
            onValueChange={(value) => update('wholesaleStatus', value)}
          >
            <SelectTrigger data-testid="select-wd-wholesale-status">
              <SelectValue placeholder="Assigned/wholesale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Assigned/wholesale">Assigned/wholesale</SelectItem>
              <SelectItem value="Pending Assignment">Pending Assignment</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Disposition Manager Approval Status</Label>
          <Select
            value={data.dmApprovalStatus || ''}
            onValueChange={(value) => update('dmApprovalStatus', value)}
          >
            <SelectTrigger data-testid="select-wd-dm-approval-status">
              <SelectValue placeholder="Approved Ready to send" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Approved Ready to send">Approved Ready to send</SelectItem>
              <SelectItem value="Needs Review">Needs Review</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wd-dmConfidencePercent" title="Your confidence level (0-100%) that you will successfully assign this wholesale contract to a buyer">DM's Confidence of Assignment by %</Label>
          <Input
            id="wd-dmConfidencePercent"
            type="number"
            value={data.dmConfidencePercent ?? ''}
            onChange={(e) => update('dmConfidencePercent', e.target.value)}
            placeholder="80"
            data-testid="input-wd-dm-confidence"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wd-dmConfidenceExplanation" title="Explain the rationale behind your confidence percentage">DM Confidence Explanation</Label>
          <Textarea
            id="wd-dmConfidenceExplanation"
            value={data.dmConfidenceExplanation || ''}
            onChange={(e) => update('dmConfidenceExplanation', e.target.value)}
            placeholder="Explanation..."
            rows={4}
            data-testid="textarea-wd-dm-explanation"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label title="Identify who conducted the comparable sales analysis. CRITICAL: If 'No one, we are flying blind' - DO NOT PROCEED without proper comps analysis">Who drove the comps?</Label>
            <Select
              value={data.compsDriver || ''}
              onValueChange={(value) => update('compsDriver', value)}
            >
              <SelectTrigger data-testid="select-wd-comps-driver">
                <SelectValue placeholder="Field Analyst" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Field Analyst">Field Analyst</SelectItem>
                <SelectItem value="Acquisition Manager">Acquisition Manager</SelectItem>
                <SelectItem value="External Appraiser">External Appraiser</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label title="Identify who conducted the physical property inspection. CRITICAL: If 'No one, we are flying blind' - DO NOT PROCEED without proper inspection">Who Inspected Property?</Label>
            <Select
              value={data.propertyInspector || ''}
              onValueChange={(value) => update('propertyInspector', value)}
            >
              <SelectTrigger data-testid="select-wd-property-inspector">
                <SelectValue placeholder="Field Analyst" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Field Analyst">Field Analyst</SelectItem>
                <SelectItem value="Acquisition Manager">Acquisition Manager</SelectItem>
                <SelectItem value="Third Party Inspector">Third Party Inspector</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wd-wholesalingDetail">Detail description for wholesaling</Label>
          <Textarea
            id="wd-wholesalingDetail"
            value={data.wholesalingDetailDescription || ''}
            onChange={(e) => update('wholesalingDetailDescription', e.target.value)}
            rows={6}
            data-testid="textarea-wd-wholesaling-detail"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wd-wholesalingShort">Short description for wholesaling</Label>
          <Textarea
            id="wd-wholesalingShort"
            value={data.wholesalingShortDescription || ''}
            onChange={(e) => update('wholesalingShortDescription', e.target.value)}
            rows={4}
            data-testid="textarea-wd-wholesaling-short"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Investor / Buyer Information ----------------------------------------
const EMD_STATUS_BUYER = ['Assigned', 'Sent to Escrow', 'Received', 'Refunded', 'Released'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const AOAA_STATUS = ['Pending', 'Submitted', 'Approved', 'Rejected', 'Not Required'];
const BUYER_LOAN_STATUS = ['Cash', 'Pre-Approved', 'Approved', 'Pending', 'Denied'];
const WHOLESALE_STATUS_OPTIONS = ['Assigned/wholesale', 'Pending Assignment', 'On Hold', 'Cancelled'];

type IbCtx = {
  data: Record<string, any>;
  set: (field: string, value: any) => void;
};

function IbText({
  label,
  field,
  data,
  set,
  type = 'text',
  placeholder,
}: IbCtx & { label: string; field: string; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`ib-${field}`}>{label}</Label>
      <Input
        id={`ib-${field}`}
        type={type}
        value={data[field] || ''}
        placeholder={placeholder}
        onChange={(e) => set(field, e.target.value)}
        data-testid={`input-ib-${testId(field)}`}
      />
    </div>
  );
}

function IbArea({ label, field, data, set }: IbCtx & { label: string; field: string }) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={`ib-${field}`}>{label}</Label>
      <Textarea
        id={`ib-${field}`}
        value={data[field] || ''}
        onChange={(e) => set(field, e.target.value)}
        data-testid={`textarea-ib-${testId(field)}`}
      />
    </div>
  );
}

function IbSelect({
  label,
  field,
  options,
  value,
  onSelect,
}: {
  label: string;
  field: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`ib-${field}`}>{label}</Label>
      <Select value={value} onValueChange={onSelect}>
        <SelectTrigger id={`ib-${field}`} data-testid={`select-ib-${testId(field)}`}>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface InvestorBuyerSectionProps {
  data: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  wholesaleStatus: string;
  onWholesaleStatusChange: (value: string) => void;
}

export function InvestorBuyerSection({
  data,
  onChange,
  wholesaleStatus,
  onWholesaleStatusChange,
}: InvestorBuyerSectionProps) {
  const set = (field: string, value: any) => onChange({ ...data, [field]: value });
  const ctx: IbCtx = { data, set };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor / Buyer Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Buyer / Investor */}
        <div className="grid gap-4 md:grid-cols-2">
          <IbText label="Buying Entity or Name" field="buyingEntityName" {...ctx} />
          <IbText label="Buyers First and Last" field="buyerFirstLast" {...ctx} />
          <IbText label="Investors Buyers Cell" field="investorBuyerCell" type="tel" {...ctx} />
          <IbText label="Investor Email Address" field="investorEmail" type="email" {...ctx} />
          <IbText label="Primary Signer First and Last" field="primarySigner" {...ctx} />
          <IbText label="Secondary Signer First and Last" field="secondarySigner" {...ctx} />
          <IbText label="Buyer Corporate Documents" field="buyerCorporateDocs" placeholder="Link..." {...ctx} />
          <IbText label="LOC Documents" field="locDocuments" placeholder="Link..." {...ctx} />
          <IbText label="POF" field="pof" placeholder="Link..." {...ctx} />
        </div>

        {/* Offer / EMD / TC */}
        <div className="grid gap-4 md:grid-cols-2">
          <IbText label="Investors Estimated COE" field="investorEstimatedCoe" type="date" {...ctx} />
          <IbText label="Investors Offer Price" field="investorOfferPrice" type="number" placeholder="$" {...ctx} />
          <IbText label="Buyers EMD Amount" field="buyersEmdAmount" type="number" placeholder="$" {...ctx} />
          <IbSelect
            label="Buyers EMD Status"
            field="buyersEmdStatus"
            options={EMD_STATUS_BUYER}
            value={data.buyersEmdStatus || ''}
            onSelect={(v) => set('buyersEmdStatus', v)}
          />
          <IbText label="Buyers EMD Status Date" field="buyersEmdStatusDate" type="date" {...ctx} />
          <IbText label="Investor TC" field="investorTc" {...ctx} />
          <IbText label="Investor TC Email" field="investorTcEmail" type="email" {...ctx} />
          <IbText label="Investor TC Phone" field="investorTcPhone" type="tel" {...ctx} />
        </div>

        {/* Lender / Assignment */}
        <div className="grid gap-4 md:grid-cols-2">
          <IbText label="Investor Lenders First and Last Name" field="lenderFirstLast" {...ctx} />
          <IbText label="Investors Lender Name" field="lenderName" {...ctx} />
          <IbText label="Investors Lender Email" field="lenderEmail" type="email" {...ctx} />
          <IbText label="Investors Lender Phone" field="lenderPhone" type="tel" {...ctx} />
          <IbSelect
            label="Does Lender Do Double Escrows?"
            field="lenderDoubleEscrow"
            options={YES_NO_OPTIONS}
            value={data.lenderDoubleEscrow || ''}
            onSelect={(v) => set('lenderDoubleEscrow', v)}
          />
          <IbSelect
            label="Required Double Escrow"
            field="requiredDoubleEscrow"
            options={YES_NO_OPTIONS}
            value={data.requiredDoubleEscrow || ''}
            onSelect={(v) => set('requiredDoubleEscrow', v)}
          />
          <IbSelect
            label="Investors Assignment Fully Executed Contract"
            field="assignmentFullyExecutedContract"
            options={YES_NO_OPTIONS}
            value={data.assignmentFullyExecutedContract || ''}
            onSelect={(v) => set('assignmentFullyExecutedContract', v)}
          />
          <IbText label="Verification of Wholesale Fee in Escrow" field="verificationWholesaleFeeEscrow" type="date" {...ctx} />
          <IbText label="AOAA/Vesting Amendment FEC" field="aoaaVestingAmendmentFec" placeholder="Link..." {...ctx} />
          <IbSelect
            label="AOAA/Vesting Amendment Status"
            field="aoaaVestingAmendmentStatus"
            options={AOAA_STATUS}
            value={data.aoaaVestingAmendmentStatus || ''}
            onSelect={(v) => set('aoaaVestingAmendmentStatus', v)}
          />
          <IbSelect
            label="Buyers Loan Status"
            field="buyersLoanStatus"
            options={BUYER_LOAN_STATUS}
            value={data.buyersLoanStatus || ''}
            onSelect={(v) => set('buyersLoanStatus', v)}
          />
          <IbSelect
            label="Wholesale Status"
            field="wholesaleStatus"
            options={WHOLESALE_STATUS_OPTIONS}
            value={wholesaleStatus || ''}
            onSelect={onWholesaleStatusChange}
          />
          <IbText label="Assignment Fee Received Date" field="assignmentFeeReceivedDate" type="date" {...ctx} />
          <IbArea label="Assignment Conversation with Representing Agent" field="assignmentConversationWithAgent" {...ctx} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinalContractTermsTab({ data, onChange }: FinalContractTermsTabProps) {
  // Any change recomputes the auto-derived deadline dates so they stay in sync.
  const update = (patch: Partial<FinalContractTerms>) => {
    const merged: Record<string, any> = { ...data, ...patch };
    const accepted = merged.offerAcceptedDate as string | undefined;
    merged.emdDeadline = addBusinessDays(accepted, merged.contractEmdDays);
    merged.estimatedCoe = addCalendarDays(accepted, merged.contractCloseOfEscrowDays);
    merged.ddDeadline = addCalendarDays(
      accepted,
      merged.ddDays || merged.contractPhysicalInspectionContingency,
    );
    onChange(merged as FinalContractTerms);
  };

  const ctx: Ctx = { data: data as Record<string, any>, update };

  // Conditional-section flags
  const saleType = ctx.data.saleType || '';
  const isShortSale = saleType === 'Short Sale';
  const isShortSaleOrProbate = saleType === 'Short Sale' || saleType === 'Probate';
  const leadSource = ctx.data.leadSource || '';
  const showSellerContact = leadSource === 'Seller' || leadSource === 'Direct';
  const showSellingAgent = (ctx.data.listingAgentRepresentsBoth || '') === 'No';

  // When the buyer is paying the seller's closing costs, the Escrow Cost must be
  // entered as a dollar amount and a confirmation dialog is shown.
  const buyerPaysSellersClosing = (ctx.data.contractClosingCosts || '') === DANGER_VALUE;
  const [showClosingCostWarning, setShowClosingCostWarning] = useState(false);

  return (
    <div className="space-y-6">
      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Buyer Owner of Record" field="buyerOwnerOfRecord" {...ctx} />
            <TextField label="Offer Negotiator" field="offerNegotiator" {...ctx} />
            <SelectField label="Lead Source" field="leadSource" options={LEAD_SOURCE} {...ctx} />
            <TextField label="Transaction Coordinator" field="transactionCoordinator" {...ctx} />
            <SelectField label="Sale Type" field="saleType" options={SALE_TYPE} required {...ctx} />
            {isShortSaleOrProbate && (
              <TextField label="Short Sale or Probate Status" field="shortSaleOrProbateStatus" {...ctx} />
            )}
            <SelectField label="Intent For Property" field="intentForProperty" options={INTENT} {...ctx} />
            <SelectField label="Occupant Type" field="occupantType" options={OCCUPANT_TYPE} {...ctx} />
            <TextField label="Seller of Record" field="sellerOfRecord" {...ctx} />
            <SelectField label="Possession at COE" field="possessionAtCoe" options={POSSESSION} {...ctx} />
            <SelectField label="Solar Panels" field="solarPanels" options={SOLAR} {...ctx} />
            <SelectField label="Access / LA Lock Box Type" field="lockBoxType" options={LOCKBOX} required {...ctx} />
            <TextField label="Lockbox Location" field="lockboxLocation" required {...ctx} />
            <TextField label="Access Combo" field="accessCombo" {...ctx} />
            <SelectField label="Fully Executed Acquisition RPA" field="fullyExecutedRpa" options={YES_NO} {...ctx} />
            <AreaField label="Access Comments" field="accessComments" {...ctx} />
            <AreaField label="Acquisition Information Comments" field="acquisitionInfoComments" {...ctx} />
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Contract Written Date" field="contractWrittenDate" type="date" {...ctx} />
            <TextField label="Offer Accepted Date" field="offerAcceptedDate" type="date" {...ctx} />
            <DerivedDateField label="EMD Deadline" field="emdDeadline" hint="Offer Accepted Date + EMD Days (business days)" data={ctx.data} />
            <DerivedDateField label="DD Deadline" field="ddDeadline" hint="Offer Accepted Date + DD Days (calendar days)" data={ctx.data} />
            <DerivedDateField label="Contract Estimated COE" field="estimatedCoe" hint="Offer Accepted Date + Close of Escrow Days (calendar days)" data={ctx.data} />
            <TextField label="Seller to Deliver Report(s)/Disc Deadline" field="sellerToDeliverDeadline" type="date" {...ctx} />
            {isShortSaleOrProbate && (
              <TextField label="Short Sale / Probate Acceptance Date" field="shortSaleProbateAcceptanceDate" type="date" {...ctx} />
            )}
            {isShortSale && (
              <TextField label="Short Sale Expiration Date" field="shortSaleExpirationDate" type="date" {...ctx} />
            )}
            <TextField label="Termite Inspection Requested Date" field="termiteInspectionRequestedDate" type="date" {...ctx} />
          </div>
        </CardContent>
      </Card>

      {/* Wholesale EMD */}
      <EmdSection data={data as Record<string, any>} onChange={onChange} />

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Property File Link" field="propertyFileLink" type="url" placeholder="https://..." {...ctx} />
          </div>
        </CardContent>
      </Card>

      {/* Final Acquisition Contract Terms + Other Cost or Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Final Acquisition Contract Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Contract Purchase Price" field="contractPurchasePrice" type="number" placeholder="$" {...ctx} />
            <TextField label="Contract EMD Days" field="contractEmdDays" type="number" placeholder="days" {...ctx} />
            <TextField label="Contract EMD Amount" field="contractEmdAmount" type="number" placeholder="$" {...ctx} />
            <SelectField label="Contract EMD Type" field="contractEmdType" options={EMD_TYPE} {...ctx} />
            <TextField label="Contract EMD To Be" field="contractEmdToBe" {...ctx} />
            <TextField label="Contract Offer Type" field="contractOfferType" {...ctx} />
            <TextField label="Contract Close of Escrow Days" field="contractCloseOfEscrowDays" type="number" placeholder="days" {...ctx} />
            <TextField label="Contract Appraisal Contingency Days" field="contractAppraisalContingencyDays" type="number" placeholder="days" {...ctx} />
            <TextField label="Contract Physical Inspection Contingency (Days)" field="contractPhysicalInspectionContingency" type="number" placeholder="days" {...ctx} />
            <SelectField label="Contract Termite" field="contractTermite" options={TERMITE} {...ctx} />
            <TextField label="Contract Disclosures & Reports" field="contractDisclosuresReports" {...ctx} />
            <SelectField label="Contract Closing Costs" field="contractClosingCosts" options={CLOSING_COSTS} danger onDangerSelected={() => setShowClosingCostWarning(true)} {...ctx} />
            <TextField label="Contract Possession" field="contractPossession" {...ctx} />
            <TextField label="Amended Contract Purchase Price" field="amendedContractPurchasePrice" type="number" placeholder="$" {...ctx} />
            <AreaField label="Contract Remarks" field="contractRemarks" {...ctx} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Other Cost or Credits</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="DD Days (drives DD Deadline)" field="ddDays" type="number" placeholder="days" {...ctx} />
              <TextField label="TC Fee" field="tcFee" type="number" placeholder="$" {...ctx} />
              <SelectField label="Title Cost" field="titleCost" options={COST_RESPONSIBILITY} danger {...ctx} />
              <TextField
                label="Escrow Cost"
                field="escrowCost"
                type="number"
                placeholder="$"
                required={buyerPaysSellersClosing}
                danger={buyerPaysSellersClosing}
                dangerMessage={
                  buyerPaysSellersClosing
                    ? "Warning: buyer is paying the seller's cost. Enter the escrow cost amount and make sure it reflects in the Investment Analysis."
                    : undefined
                }
                {...ctx}
              />
              <TextField label="Other Cost or Credits Outside of Escrow/Contract" field="otherCostOrCreditsOutside" {...ctx} />
              <AreaField label="Explanation of Other Costs and Credits" field="explanationOtherCostsCredits" {...ctx} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listing Agent Information */}
      <Card>
        <CardHeader>
          <CardTitle>Listing Agent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="First Name" field="listingAgentFirstName" required {...ctx} />
            <TextField label="Last Name" field="listingAgentLastName" required {...ctx} />
            <TextField label="Cell Phone" field="listingAgentCellPhone" type="tel" required {...ctx} />
            <TextField label="Email Address" field="listingAgentEmail" type="email" required {...ctx} />
            <TextField label="Office" field="listingAgentOffice" required {...ctx} />
            <TextField label="Direct Office Phone" field="listingAgentDirectPhone" type="tel" required {...ctx} />
            <TextField label="Office Mailing Address" field="listingAgentOfficeAddress" {...ctx} />
            <SelectField label="Is there an additional acquisition fee?" field="additionalAcquisitionFee" options={YES_NO} {...ctx} />
            <SelectField label="Is Acquisition Listing Agent re-listing property?" field="isRelistingProperty" options={YES_NO} {...ctx} />
            <TextField label="Commission offer to re-list property?" field="relistCommission" {...ctx} />
            <SelectField label="Is Listing Agent representing buyer and seller?" field="listingAgentRepresentsBoth" options={YES_NO} {...ctx} />
            <AreaField label="Listing Agent Comments" field="listingAgentComments" {...ctx} />
          </div>
        </CardContent>
      </Card>

      {/* Selling Agent Information — only when the listing agent is NOT representing both sides */}
      {showSellingAgent && (
        <Card>
          <CardHeader>
            <CardTitle>Selling Agent Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="First Name" field="sellingAgentFirstName" required {...ctx} />
              <TextField label="Last Name" field="sellingAgentLastName" {...ctx} />
              <TextField label="Cell Phone" field="sellingAgentCellPhone" type="tel" {...ctx} />
              <TextField label="Email Address" field="sellingAgentEmail" type="email" {...ctx} />
              <TextField label="Office" field="sellingAgentOffice" {...ctx} />
              <TextField label="Direct Office Phone" field="sellingAgentDirectPhone" type="tel" {...ctx} />
              <TextField label="Office Mailing Address" field="sellingAgentOfficeAddress" {...ctx} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seller Contact (FSBO) — only when the lead source is Seller or Direct */}
      {showSellerContact && (
        <Card>
          <CardHeader>
            <CardTitle>Seller Contact (FSBO)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="First Name" field="sellerFirstName" {...ctx} />
              <TextField label="Last Name" field="sellerLastName" {...ctx} />
              <TextField label="Phone Number" field="sellerPhone" type="tel" {...ctx} />
              <TextField label="Email Address" field="sellerEmail" type="email" {...ctx} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Escrow Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Escrow Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Escrow Company" field="escrowCompany" {...ctx} />
            <TextField label="Escrow Officer" field="escrowOfficer" {...ctx} />
            <TextField label="Escrow #" field="escrowNumber" {...ctx} />
            <TextField label="Escrow Officer's Direct Phone #" field="escrowOfficerDirectPhone" type="tel" {...ctx} />
            <TextField label="Escrow Officer's Email" field="escrowOfficerEmail" type="email" {...ctx} />
            <TextField label="Escrow Company Phone #" field="escrowCompanyPhone" type="tel" {...ctx} />
            <TextField label="Escrow Company Mailing Address" field="escrowCompanyAddress" {...ctx} />
          </div>
        </CardContent>
      </Card>

      {/* Title Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Title Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Title Company" field="titleCompany" {...ctx} />
            <TextField label="Title Officer" field="titleOfficer" {...ctx} />
            <TextField label="Title Order #" field="titleOrderNumber" {...ctx} />
            <TextField label="Title Officer Direct #" field="titleOfficerDirectPhone" type="tel" {...ctx} />
            <TextField label="Title Company Phone #" field="titleCompanyPhone" type="tel" {...ctx} />
            <TextField label="Title Officer Email" field="titleOfficerEmail" type="email" {...ctx} />
            <TextField label="Title Company Mailing Address" field="titleCompanyAddress" {...ctx} />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showClosingCostWarning} onOpenChange={setShowClosingCostWarning}>
        <AlertDialogContent data-testid="dialog-closing-cost-warning">
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: buyer is paying the seller's cost</AlertDialogTitle>
            <AlertDialogDescription>
              Make sure this reflects in the Investment Analysis. Enter the Escrow Cost dollar
              amount in "Other Cost or Credits" below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-testid="button-acknowledge-closing-cost">
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
