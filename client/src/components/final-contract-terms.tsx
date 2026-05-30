import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}: Ctx & {
  label: string;
  field: keyof FinalContractTerms;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field as string}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={field as string}
        type={type}
        value={data[field as string] || ''}
        placeholder={placeholder}
        onChange={(e) => update({ [field]: e.target.value } as Partial<FinalContractTerms>)}
        data-testid={`input-${testId(field as string)}`}
      />
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
}: Ctx & {
  label: string;
  field: keyof FinalContractTerms;
  options: string[];
  required?: boolean;
  danger?: boolean;
}) {
  const value = data[field as string] || '';
  const isDanger = danger && value === DANGER_VALUE;
  return (
    <div className="space-y-2">
      <Label htmlFor={field as string} className={isDanger ? 'text-destructive' : undefined}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Select value={value} onValueChange={(v) => update({ [field]: v } as Partial<FinalContractTerms>)}>
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
            <SelectField label="Hard Approval to Start Wholesale Process" field="hardApprovalToStartWholesale" options={YES_NO} {...ctx} />
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
            <TextField label="Start Project Date" field="startProjectDate" type="date" required {...ctx} />
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
            <SelectField label="Contract Closing Costs" field="contractClosingCosts" options={CLOSING_COSTS} danger {...ctx} />
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
              <SelectField label="Escrow Cost" field="escrowCost" options={COST_RESPONSIBILITY} danger {...ctx} />
              <TextField label="Other Cost or Credits Outside of Escrow/Contract" field="otherCostOrCreditsOutside" {...ctx} />
              <TextField label="IDX Other Cost" field="idxOtherCost" type="number" required placeholder="$" {...ctx} />
              <TextField label="IDX Occupied Cost" field="idxOccupiedCost" type="number" required placeholder="$" {...ctx} />
              <TextField label="IDX Taxes" field="idxTaxes" type="number" required placeholder="$" {...ctx} />
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
    </div>
  );
}
