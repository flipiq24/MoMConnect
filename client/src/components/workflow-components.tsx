import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";

// Checkbox with comment field
interface CheckboxWithCommentProps {
  id: string;
  label: string;
  checked: boolean;
  comment?: string;
  onCheckedChange: (checked: boolean) => void;
  onCommentChange: (comment: string) => void;
  disabled?: boolean;
  tooltip?: string;
}

export function CheckboxWithComment({
  id,
  label,
  checked,
  comment,
  onCheckedChange,
  onCommentChange,
  disabled = false,
  tooltip
}: CheckboxWithCommentProps) {
  const handleCheckboxChange = (value: boolean | "indeterminate") => {
    onCheckedChange(value === true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={handleCheckboxChange}
          disabled={disabled}
          data-testid={`checkbox-${id}`}
        />
        <Label htmlFor={id} className="text-sm font-normal cursor-pointer" title={tooltip}>
          {label}
        </Label>
      </div>
      <Textarea
        value={comment || ''}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Add comments..."
        className="text-sm"
        rows={2}
        disabled={disabled}
        data-testid={`textarea-${id}`}
      />
    </div>
  );
}

// Status badge for EMD/Approval status
interface StatusBadgeProps {
  status: 'Yes EMD' | 'TBD' | 'No EMD' | string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (variant) return variant;
    if (status === 'Yes EMD') return 'default';
    if (status === 'TBD') return 'secondary';
    if (status === 'No EMD') return 'destructive';
    return 'default';
  };

  const getIcon = () => {
    if (status === 'Yes EMD') return <CheckCircle2 className="w-3 h-3" />;
    if (status === 'TBD') return <AlertTriangle className="w-3 h-3" />;
    return <Info className="w-3 h-3" />;
  };

  return (
    <Badge variant={getVariant()} className="gap-1" data-testid={`badge-${status.toLowerCase().replace(/\s+/g, '-')}`}>
      {getIcon()}
      {status}
    </Badge>
  );
}

// Property summary card
interface PropertySummaryProps {
  address: string;
  arv: number;
  totalPoints: number;
  emdStatus: string;
}

export function PropertySummary({ address, arv, totalPoints, emdStatus }: PropertySummaryProps) {
  const pointsColor = totalPoints >= 0 ? 'text-green-600' : 'text-red-600';
  
  return (
    <Card data-testid="card-property-summary">
      <CardHeader>
        <CardTitle className="text-lg">Property Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Address:</p>
            <p className="font-medium" data-testid="text-address">{address}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ARV:</p>
            <p className="font-mono font-medium" data-testid="text-arv">${arv?.toLocaleString() || 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Points:</p>
            <p className={`font-bold ${pointsColor}`} data-testid="text-total-points">
              {totalPoints >= 0 ? '+' : ''}{totalPoints}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">EMD Status:</p>
            <StatusBadge status={emdStatus} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Caution zone for All-in Cost percentage
interface CautionZoneProps {
  percentage: number;
  threshold?: number;
  purchasePrice: number;
  arv: number;
  closingCosts?: number;
}

export function CautionZone({ percentage, threshold = 85, purchasePrice, arv, closingCosts = 0 }: CautionZoneProps) {
  const isWarning = percentage > threshold;
  const bgColor = isWarning ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-green-100 dark:bg-green-900/20';
  const textColor = isWarning ? 'text-yellow-900 dark:text-yellow-100' : 'text-green-900 dark:text-green-100';
  const borderColor = isWarning ? 'border-yellow-400 dark:border-yellow-600' : 'border-green-400 dark:border-green-600';
  
  const closingCostPercent = arv > 0 ? ((closingCosts / arv) * 100).toFixed(2) : '0.00';
  const purchasePricePercent = arv > 0 ? ((purchasePrice / arv) * 100).toFixed(2) : '0.00';

  return (
    <div 
      className={`${bgColor} ${borderColor} border-2 rounded-md p-4 space-y-2`}
      data-testid="card-caution-zone"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Total All-in Cost / ARV</p>
          <p className={`text-3xl font-bold ${textColor}`} data-testid="text-all-in-percent">
            {percentage.toFixed(1)}%
          </p>
        </div>
        {isWarning && (
          <div className="text-right">
            <p className="text-xs font-medium">Caution Zone</p>
            <p className="text-xs text-muted-foreground">
              ${purchasePrice.toLocaleString()} / ${arv.toLocaleString()}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span data-testid="text-purchase-percent">{purchasePricePercent}%</span>
        </div>
        {closingCosts > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span data-testid="text-closing-percent">{closingCostPercent}%</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span data-testid="text-threshold">{threshold}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Includes {closingCosts > 0 ? `${closingCostPercent}% closing cost` : '0% closing cost'}
      </p>
    </div>
  );
}

// Zillow data display box
interface ZillowDataBoxProps {
  data: {
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    yearBuilt: number;
  } | null;
}

export function ZillowDataBox({ data }: ZillowDataBoxProps) {
  if (!data) return null;

  return (
    <div 
      className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 rounded-md p-3"
      data-testid="card-zillow-data"
    >
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-900 dark:text-green-100">
          Zillow data loaded: {data.bedrooms}bed/{data.bathrooms}bath {data.sqft}sqft. Built {data.yearBuilt}
        </span>
      </div>
    </div>
  );
}
