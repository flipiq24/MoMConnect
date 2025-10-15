import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Save, Brain, Calculator, FileText, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { scoringRules, calculateTotalScore, getEMDRecommendation, getSelectColor } from '@shared/scoring';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Property } from '@shared/schema';
import { 
  CheckboxWithComment, 
  StatusBadge, 
  PropertySummary, 
  CautionZone,
  ZillowDataBox 
} from '@/components/workflow-components';

interface AcquisitionProps {
  userEmail: string;
}

export default function Acquisition({ userEmail }: AcquisitionProps) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [propertyData, setPropertyData] = useState<any>({});
  const [totalScore, setTotalScore] = useState(0);
  const [emdRecommendation, setEmdRecommendation] = useState(getEMDRecommendation(0));
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [zillowData, setZillowData] = useState<any>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  
  // Route-aware tab state
  const getTabFromUrl = () => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    return params.get('tab') || 'acquisition';
  };
  const [activeTab, setActiveTab] = useState(getTabFromUrl());

  // Load most recent property data
  const { data: existingProperty, isLoading: isLoadingProperty } = useQuery({
    queryKey: ['/api/users', userEmail, 'recent-property'],
    queryFn: async () => {
      if (!userEmail) return null;
      return await fetch(`/api/users/${userEmail}/recent-property`).then(r => r.json());
    },
    enabled: !!userEmail,
    staleTime: 30000, // 30 seconds - cache stays fresh via manual updates
    refetchOnWindowFocus: false, // Don't refetch on window focus during active editing
    refetchOnMount: false // Don't refetch on mount - rely on cache kept fresh via setQueryData
  });

  // Hydrate form with existing property data
  useEffect(() => {
    console.log('[HYDRATION] useEffect triggered, existingProperty:', existingProperty);
    console.log('[HYDRATION] softAMChecklist in existingProperty:', existingProperty?.softAMChecklist);
    if (existingProperty && existingProperty.id) {
      setCurrentPropertyId(existingProperty.id);
      setPropertyData({
        ...existingProperty,
        // Map database fields to form fields
        daysInMLS: existingProperty.daysInMLS || '',
        purchasePriceRange: existingProperty.purchasePriceRange || '',
        valueSubjectToPermits: existingProperty.valueSubjectToPermits || '',
        valueSubjectToADU: existingProperty.valueSubjectToADU || '',
        wholesalePriceVsAsking: existingProperty.wholesalePriceVsAsking || '',
        arvConfidence: existingProperty.arvConfidence || '',
        roiForTimeEffort: existingProperty.roiForTimeEffort || '',
        zoning: existingProperty.zoning || '',
        rehabLevel: existingProperty.rehabLevel || '',
        areaDesirability: existingProperty.areaDesirability || '',
        obsolescencesIssues: existingProperty.obsolescencesIssues || '',
        occupancy: existingProperty.occupancy || ''
      });
      console.log('[HYDRATION] setPropertyData called with softAMChecklist:', existingProperty.softAMChecklist);
      
      if (existingProperty.zillowData) {
        setZillowData(existingProperty.zillowData);
      }
      setLastSaved(new Date(existingProperty.updatedAt));
    }
  }, [existingProperty]);

  // Calculate score whenever property data changes
  useEffect(() => {
    const formDataForScoring = {
      'Days in the MLS from acceptance Date': propertyData.daysInMLS,
      'Is purchase price over 1M': propertyData.purchasePriceRange,
      'Is value subject to permits': propertyData.valueSubjectToPermits,
      'Is value subject to ADU?': propertyData.valueSubjectToADU,
      'Is wholesale price higher than listing asking price?': propertyData.wholesalePriceVsAsking,
      'ARV Confidence': propertyData.arvConfidence,
      'ROI for time/Effort': propertyData.roiForTimeEffort,
      'Zoning': propertyData.zoning,
      'Rehab Level': propertyData.rehabLevel,
      'Area Desirability': propertyData.areaDesirability,
      'Obsolesces/Issues': propertyData.obsolescencesIssues,
      'Occupancy': propertyData.occupancy
    };
    const score = calculateTotalScore(formDataForScoring);
    setTotalScore(score);
    setEmdRecommendation(getEMDRecommendation(score));
  }, [propertyData]);

  // Auto-save property mutation
  const savePropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('[MUTATION] Input data.softAMChecklist:', data.softAMChecklist);
      
      const propertyPayload = {
        ...data,
        email: userEmail,
        totalScore,
        emdRecommendation: emdRecommendation.emd,
        successChance: emdRecommendation.chance
      };

      console.log('[MUTATION] propertyPayload.softAMChecklist:', propertyPayload.softAMChecklist);
      console.log('[MUTATION] Full propertyPayload:', propertyPayload);

      if (currentPropertyId) {
        return await apiRequest('PATCH', `/api/properties/${currentPropertyId}`, propertyPayload);
      } else {
        return await apiRequest('POST', '/api/properties', propertyPayload);
      }
    },
    onSuccess: (savedProperty) => {
      console.log('[MUTATION-SUCCESS] Received savedProperty:', savedProperty);
      console.log('[MUTATION-SUCCESS] softAMChecklist in response:', savedProperty?.softAMChecklist);
      
      // Set property ID if this was a new property
      if (savedProperty?.id && !currentPropertyId) {
        setCurrentPropertyId(savedProperty.id);
      }
      
      setLastSaved(new Date());
      // Update query cache directly to keep it fresh without triggering refetch
      const queryKey = ['/api/users', userEmail, 'recent-property'];
      console.log('[MUTATION-SUCCESS] Setting query cache with key:', queryKey);
      queryClient.setQueryData(queryKey, savedProperty);
      console.log('[MUTATION-SUCCESS] Cache updated, verifying...');
      const cached = queryClient.getQueryData(queryKey);
      console.log('[MUTATION-SUCCESS] Cached value after update:', cached);
    }
  });

  // Fetch Zillow data mutation
  const fetchZillowMutation = useMutation({
    mutationFn: async (address: string) => {
      return await apiRequest('POST', '/api/properties/zillow', { address });
    },
    onSuccess: (data) => {
      setZillowData(data);
      setPropertyData((prev: any) => ({ ...prev, zillowData: data }));
      toast({
        title: "Zillow Data Loaded",
        description: "Property data fetched successfully."
      });
    }
  });

  const updateField = (field: string, value: any) => {
    setPropertyData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = getTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location]);

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const currentPath = location.split('?')[0];
    setLocation(`${currentPath}?tab=${newTab}`);
  };

  // Auto-save on data change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (propertyData.address) {
        savePropertyMutation.mutate(propertyData);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [propertyData]);

  // Calculate metrics
  const salePrice = (parseInt(propertyData.purchasePrice) || 0) + (parseInt(propertyData.forecastedWholesaleFee) || 0);
  const closingCosts = parseInt(propertyData.closingCosts) || 0;
  const arv = parseInt(propertyData.arv) || 0;
  const purchasePrice = parseInt(propertyData.purchasePrice) || 0;
  const allInCost = purchasePrice + closingCosts;
  const allInPercent = arv > 0 ? (allInCost / arv) * 100 : 0;

  if (isLoadingProperty) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card border rounded-md">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Points:</p>
            <p className={`text-2xl font-bold ${totalScore >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-header-total-points">
              {totalScore >= 0 ? '+' : ''}{totalScore}
            </p>
          </div>
          <StatusBadge status={emdRecommendation.emd} />
        </div>
        {lastSaved && (
          <p className="text-sm text-muted-foreground" data-testid="text-saved-time">
            Saved {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Multi-tab Workflow */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="acquisition" data-testid="tab-acquisition-associate">
            <FileText className="w-4 h-4 mr-2" />
            Acquisition Associate
          </TabsTrigger>
          <TabsTrigger value="mom" data-testid="tab-mom-meeting">
            <TrendingUp className="w-4 h-4 mr-2" />
            MOM Meeting
          </TabsTrigger>
          <TabsTrigger value="am-approval" data-testid="tab-am-approval">
            <Calculator className="w-4 h-4 mr-2" />
            AM Hard Approval
          </TabsTrigger>
          <TabsTrigger value="ai-report" data-testid="tab-ai-report">
            <Brain className="w-4 h-4 mr-2" />
            AI Report
          </TabsTrigger>
        </TabsList>

        {/* Acquisition Associate Tab */}
        <TabsContent value="acquisition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Property Address with Fetch Zillow Button */}
              <div className="space-y-2">
                <Label htmlFor="address">Property Address *</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    value={propertyData.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main St Anytown USA"
                    className="flex-1"
                    data-testid="input-address"
                  />
                  <Button
                    onClick={() => fetchZillowMutation.mutate(propertyData.address)}
                    disabled={!propertyData.address || fetchZillowMutation.isPending}
                    data-testid="button-fetch-zillow"
                  >
                    {fetchZillowMutation.isPending ? 'Fetching...' : 'Fetch Zillow Data'}
                  </Button>
                </div>
              </div>

              {/* Zillow Data Display */}
              {zillowData && (
                <ZillowDataBox data={zillowData} />
              )}

              {/* Financial Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="arv">ARV (After Repair Value)</Label>
                  <Input
                    id="arv"
                    type="number"
                    value={propertyData.arv || ''}
                    onChange={(e) => updateField('arv', e.target.value)}
                    placeholder="1000000"
                    data-testid="input-arv"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedRehab">Estimated Rehab</Label>
                  <Input
                    id="estimatedRehab"
                    type="number"
                    value={propertyData.estimatedRehab || ''}
                    onChange={(e) => updateField('estimatedRehab', e.target.value)}
                    placeholder="100000"
                    data-testid="input-estimated-rehab"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Acquisition Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={propertyData.purchasePrice || ''}
                    onChange={(e) => updateField('purchasePrice', e.target.value)}
                    placeholder="700000"
                    data-testid="input-purchase-price"
                  />
                  <p className="text-xs text-muted-foreground">Est. Closing Cost (0.65%): ${(purchasePrice * 0.0065).toFixed(0)}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salePrice">Sale Price to Wholesale Buyer (Calculated)</Label>
                  <Input
                    id="salePrice"
                    value={`$${salePrice.toLocaleString()}`}
                    disabled
                    className="bg-muted"
                    data-testid="input-sale-price"
                  />
                  <p className="text-xs text-muted-foreground">Acquisition + Wholesale Fee</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="forecastedWholesaleFee">Forecasted Wholesale Fee</Label>
                  <Input
                    id="forecastedWholesaleFee"
                    type="number"
                    value={propertyData.forecastedWholesaleFee || ''}
                    onChange={(e) => updateField('forecastedWholesaleFee', e.target.value)}
                    placeholder="30000"
                    data-testid="input-forecasted-fee"
                  />
                </div>

                <div className="space-y-2">
                  <CautionZone 
                    percentage={allInPercent}
                    threshold={85}
                    purchasePrice={purchasePrice}
                    arv={arv}
                    closingCosts={closingCosts}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment Factors - keeping existing structure */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Factors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(scoringRules).map(([field, options]) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{field}</Label>
                    <Select
                      value={propertyData[field === 'Days in the MLS from acceptance Date' ? 'daysInMLS' : 
                             field === 'Is purchase price over 1M' ? 'purchasePriceRange' :
                             field === 'Is value subject to permits' ? 'valueSubjectToPermits' :
                             field === 'Is value subject to ADU?' ? 'valueSubjectToADU' :
                             field === 'Is wholesale price higher than listing asking price?' ? 'wholesalePriceVsAsking' :
                             field === 'ARV Confidence' ? 'arvConfidence' :
                             field === 'ROI for time/Effort' ? 'roiForTimeEffort' :
                             field === 'Zoning' ? 'zoning' :
                             field === 'Rehab Level' ? 'rehabLevel' :
                             field === 'Area Desirability' ? 'areaDesirability' :
                             field === 'Obsolesces/Issues' ? 'obsolescencesIssues' :
                             field === 'Occupancy' ? 'occupancy' : field] || ''}
                      onValueChange={(value) => {
                        const dbField = field === 'Days in the MLS from acceptance Date' ? 'daysInMLS' : 
                                       field === 'Is purchase price over 1M' ? 'purchasePriceRange' :
                                       field === 'Is value subject to permits' ? 'valueSubjectToPermits' :
                                       field === 'Is value subject to ADU?' ? 'valueSubjectToADU' :
                                       field === 'Is wholesale price higher than listing asking price?' ? 'wholesalePriceVsAsking' :
                                       field === 'ARV Confidence' ? 'arvConfidence' :
                                       field === 'ROI for time/Effort' ? 'roiForTimeEffort' :
                                       field === 'Zoning' ? 'zoning' :
                                       field === 'Rehab Level' ? 'rehabLevel' :
                                       field === 'Area Desirability' ? 'areaDesirability' :
                                       field === 'Obsolesces/Issues' ? 'obsolescencesIssues' :
                                       field === 'Occupancy' ? 'occupancy' : field;
                        updateField(dbField, value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(options).map(([option, points]) => (
                          <SelectItem key={option} value={option}>
                            {option} ({points > 0 ? '+' : ''}{points} pts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Risk Score */}
          <Card className={`border-2 ${totalScore >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${totalScore >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Calculator className={`w-6 h-6 ${totalScore >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Risk Score: {totalScore >= 0 ? '+' : ''}{totalScore} points ({totalScore >= 0 ? 'Positive' : 'Negative'})</p>
                  <p className="font-medium">
                    EMD Recommendation: <span className={totalScore >= 0 ? 'text-green-600' : 'text-red-600'}>{emdRecommendation.emd}</span> ({emdRecommendation.chance}% success rate)
                  </p>
                </div>
                <Button variant="outline" className="ml-auto" data-testid="button-setup-instructions">
                  Setup Instructions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOM Meeting Tab */}
        <TabsContent value="mom" className="space-y-6">
          <PropertySummary 
            address={propertyData.address || 'No address'} 
            arv={arv}
            totalPoints={totalScore}
            emdStatus={emdRecommendation.emd}
          />

          <Card>
            <CardHeader>
              <CardTitle>MOM Meeting Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Disposition Manager Approval Status</Label>
                <Select
                  value={propertyData.dmApprovalStatus || ''}
                  onValueChange={(value) => updateField('dmApprovalStatus', value)}
                >
                  <SelectTrigger data-testid="select-dm-approval-status">
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
                <Label htmlFor="dmConfidencePercent">DM's Confidence of Assignment by %</Label>
                <Input
                  id="dmConfidencePercent"
                  type="number"
                  value={propertyData.dmConfidencePercent || ''}
                  onChange={(e) => updateField('dmConfidencePercent', e.target.value)}
                  placeholder="80"
                  data-testid="input-dm-confidence"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dmConfidenceExplanation">DM Confidence Explanation</Label>
                <Textarea
                  id="dmConfidenceExplanation"
                  value={propertyData.dmConfidenceExplanation || ''}
                  onChange={(e) => updateField('dmConfidenceExplanation', e.target.value)}
                  placeholder="Explanation..."
                  rows={4}
                  data-testid="textarea-dm-explanation"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Who drove the comps?</Label>
                  <Select
                    value={propertyData.compsDriver || ''}
                    onValueChange={(value) => updateField('compsDriver', value)}
                  >
                    <SelectTrigger data-testid="select-comps-driver">
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
                  <Label>Who Inspected Property?</Label>
                  <Select
                    value={propertyData.propertyInspector || ''}
                    onValueChange={(value) => updateField('propertyInspector', value)}
                  >
                    <SelectTrigger data-testid="select-property-inspector">
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
                <Label htmlFor="wholesalingDetail">Detail description for wholesaling</Label>
                <Textarea
                  id="wholesalingDetail"
                  value={propertyData.wholesalingDetailDescription || ''}
                  onChange={(e) => updateField('wholesalingDetailDescription', e.target.value)}
                  rows={6}
                  data-testid="textarea-wholesaling-detail"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wholesalingShort">Short description for wholesaling</Label>
                <Textarea
                  id="wholesalingShort"
                  value={propertyData.wholesalingShortDescription || ''}
                  onChange={(e) => updateField('wholesalingShortDescription', e.target.value)}
                  rows={4}
                  data-testid="textarea-wholesaling-short"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AM Hard Approval Tab */}
        <TabsContent value="am-approval" className="space-y-6">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-md p-4" data-testid="alert-final-review">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              ⚠️ Final Review Required
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Acquisition Manager must validate all information before final approval. Current Score: {totalScore} points ({emdRecommendation.emd})
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AM Hard Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Physical Inspection Contingency Removal</Label>
                <Select
                  value={propertyData.physicalInspectionContingency || ''}
                  onValueChange={(value) => updateField('physicalInspectionContingency', value)}
                >
                  <SelectTrigger data-testid="select-physical-inspection">
                    <SelectValue placeholder="Approved" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contingencyRemovalDate">Removal of Contingencies Hard Approval Date</Label>
                <Input
                  id="contingencyRemovalDate"
                  type="date"
                  value={propertyData.contingencyRemovalDate || ''}
                  onChange={(e) => updateField('contingencyRemovalDate', e.target.value || null)}
                  data-testid="input-contingency-date"
                />
              </div>

              <div className="space-y-2">
                <Label>Wholesale Status</Label>
                <Select
                  value={propertyData.wholesaleStatus || ''}
                  onValueChange={(value) => updateField('wholesaleStatus', value)}
                >
                  <SelectTrigger data-testid="select-wholesale-status">
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
            </CardContent>
          </Card>

          {/* Soft AM Approval Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Soft AM Approval Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CheckboxWithComment
                id="read-agent-comments"
                label="Read Agent Comments"
                checked={propertyData.softAMChecklist?.readAgentComments?.checked || false}
                comment={propertyData.softAMChecklist?.readAgentComments?.comment}
                onCheckedChange={(checked) => {
                  console.log('[CHECKBOX-HANDLER] Read Agent Comments onCheckedChange called with:', checked);
                  updateField('softAMChecklist', {
                    ...(propertyData.softAMChecklist ?? {}),
                    readAgentComments: { checked, comment: propertyData.softAMChecklist?.readAgentComments?.comment || '' }
                  });
                }}
                onCommentChange={(comment) => {
                  console.log('[CHECKBOX-HANDLER] Read Agent Comments onCommentChange called with:', comment);
                  updateField('softAMChecklist', {
                    ...(propertyData.softAMChecklist ?? {}),
                    readAgentComments: { checked: propertyData.softAMChecklist?.readAgentComments?.checked || false, comment }
                  });
                }}
              />

              <CheckboxWithComment
                id="review-google-maps"
                label="Review Google Maps"
                checked={propertyData.softAMChecklist?.reviewGoogleMaps?.checked || false}
                comment={propertyData.softAMChecklist?.reviewGoogleMaps?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  reviewGoogleMaps: { checked, comment: propertyData.softAMChecklist?.reviewGoogleMaps?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  reviewGoogleMaps: { checked: propertyData.softAMChecklist?.reviewGoogleMaps?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="review-inspections"
                label="Review Required Inspections ***Utilities On ***Access"
                checked={propertyData.softAMChecklist?.reviewRequiredInspections?.checked || false}
                comment={propertyData.softAMChecklist?.reviewRequiredInspections?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  reviewRequiredInspections: { checked, comment: propertyData.softAMChecklist?.reviewRequiredInspections?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  reviewRequiredInspections: { checked: propertyData.softAMChecklist?.reviewRequiredInspections?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="usability-of-lot"
                label="Usability of Lot"
                checked={propertyData.softAMChecklist?.usabilityOfLot?.checked || false}
                comment={propertyData.softAMChecklist?.usabilityOfLot?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  usabilityOfLot: { checked, comment: propertyData.softAMChecklist?.usabilityOfLot?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  usabilityOfLot: { checked: propertyData.softAMChecklist?.usabilityOfLot?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="possible-zoning"
                label="Possible Zoning"
                checked={propertyData.softAMChecklist?.possibleZoning?.checked || false}
                comment={propertyData.softAMChecklist?.possibleZoning?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  possibleZoning: { checked, comment: propertyData.softAMChecklist?.possibleZoning?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  possibleZoning: { checked: propertyData.softAMChecklist?.possibleZoning?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="review-pictures"
                label="Review Pictures"
                checked={propertyData.softAMChecklist?.reviewPictures?.checked || false}
                comment={propertyData.softAMChecklist?.reviewPictures?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  reviewPictures: { checked, comment: propertyData.softAMChecklist?.reviewPictures?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  reviewPictures: { checked: propertyData.softAMChecklist?.reviewPictures?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="look-out-for-additions"
                label="Look out for Additions"
                checked={propertyData.softAMChecklist?.lookOutForAdditions?.checked || false}
                comment={propertyData.softAMChecklist?.lookOutForAdditions?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  lookOutForAdditions: { checked, comment: propertyData.softAMChecklist?.lookOutForAdditions?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  lookOutForAdditions: { checked: propertyData.softAMChecklist?.lookOutForAdditions?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="read-system-notes"
                label="Read system Notes"
                checked={propertyData.softAMChecklist?.readSystemNotes?.checked || false}
                comment={propertyData.softAMChecklist?.readSystemNotes?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  readSystemNotes: { checked, comment: propertyData.softAMChecklist?.readSystemNotes?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  readSystemNotes: { checked: propertyData.softAMChecklist?.readSystemNotes?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="agent-calls-backup"
                label="Agent Calls Backup/Pending/Smoking guns"
                checked={propertyData.softAMChecklist?.agentCallsBackup?.checked || false}
                comment={propertyData.softAMChecklist?.agentCallsBackup?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  agentCallsBackup: { checked, comment: propertyData.softAMChecklist?.agentCallsBackup?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  agentCallsBackup: { checked: propertyData.softAMChecklist?.agentCallsBackup?.checked || false, comment }
                })}
              />

              <div className="space-y-2">
                <Label>Busy Streets</Label>
                <Select
                  value={propertyData.busyStreets || ''}
                  onValueChange={(value) => updateField('busyStreets', value)}
                >
                  <SelectTrigger data-testid="select-busy-streets">
                    <SelectValue placeholder="No traffic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No traffic">No traffic</SelectItem>
                    <SelectItem value="Light traffic">Light traffic</SelectItem>
                    <SelectItem value="Moderate traffic">Moderate traffic</SelectItem>
                    <SelectItem value="Heavy traffic">Heavy traffic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Obsolescence</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="obsolescence"
                      value="No"
                      checked={propertyData.obsolescence === 'No'}
                      onChange={(e) => updateField('obsolescence', e.target.value)}
                      data-testid="radio-obsolescence-no"
                    />
                    <span>No</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="obsolescence"
                      value="Yes"
                      checked={propertyData.obsolescence === 'Yes'}
                      onChange={(e) => updateField('obsolescence', e.target.value)}
                      data-testid="radio-obsolescence-yes"
                    />
                    <span>Yes - Explain below</span>
                  </label>
                </div>
                {propertyData.obsolescence === 'Yes' && (
                  <Textarea
                    value={propertyData.obsolescenceNotes || ''}
                    onChange={(e) => updateField('obsolescenceNotes', e.target.value)}
                    placeholder="Explain obsolescence..."
                    rows={3}
                    data-testid="textarea-obsolescence-notes"
                  />
                )}
              </div>

              <CheckboxWithComment
                id="additional-verification"
                label='Run own comps and then compare to Proposed "ARV"'
                checked={propertyData.softAMChecklist?.additionalVerification?.checked || false}
                comment={propertyData.softAMChecklist?.additionalVerification?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  additionalVerification: { checked, comment: propertyData.softAMChecklist?.additionalVerification?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  additionalVerification: { checked: propertyData.softAMChecklist?.additionalVerification?.checked || false, comment }
                })}
              />

              <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <Label htmlFor="arvConfidencePercent">ARV confidence by %</Label>
                <Input
                  id="arvConfidencePercent"
                  type="number"
                  value={propertyData.arvConfidencePercent || ''}
                  onChange={(e) => updateField('arvConfidencePercent', e.target.value)}
                  placeholder="80"
                  data-testid="input-arv-confidence-percent"
                />
              </div>

              <CheckboxWithComment
                id="confirm-offer-status"
                label='Confirm "Offer Status" is correct'
                checked={propertyData.softAMChecklist?.confirmOfferStatus?.checked || false}
                comment={propertyData.softAMChecklist?.confirmOfferStatus?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmOfferStatus: { checked, comment: propertyData.softAMChecklist?.confirmOfferStatus?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmOfferStatus: { checked: propertyData.softAMChecklist?.confirmOfferStatus?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="verify-offer-terms"
                label="Verify Offer terms and that proper Due-Diligence time frames have been requested"
                checked={propertyData.softAMChecklist?.verifyOfferTerms?.checked || false}
                comment={propertyData.softAMChecklist?.verifyOfferTerms?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  verifyOfferTerms: { checked, comment: propertyData.softAMChecklist?.verifyOfferTerms?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  verifyOfferTerms: { checked: propertyData.softAMChecklist?.verifyOfferTerms?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="investment-analysis-confirmed"
                label="Investment Analysis confirmed"
                checked={propertyData.softAMChecklist?.investmentAnalysisConfirmed?.checked || false}
                comment={propertyData.softAMChecklist?.investmentAnalysisConfirmed?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  investmentAnalysisConfirmed: { checked, comment: propertyData.softAMChecklist?.investmentAnalysisConfirmed?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  investmentAnalysisConfirmed: { checked: propertyData.softAMChecklist?.investmentAnalysisConfirmed?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="confirm-roi"
                label="Confirm ROI calculations are correct"
                checked={propertyData.softAMChecklist?.confirmROICalculations?.checked || false}
                comment={propertyData.softAMChecklist?.confirmROICalculations?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmROICalculations: { checked, comment: propertyData.softAMChecklist?.confirmROICalculations?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmROICalculations: { checked: propertyData.softAMChecklist?.confirmROICalculations?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="confirm-repair-cost"
                label='Confirm "Repair Cost"'
                checked={propertyData.softAMChecklist?.confirmRepairCost?.checked || false}
                comment={propertyData.softAMChecklist?.confirmRepairCost?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmRepairCost: { checked, comment: propertyData.softAMChecklist?.confirmRepairCost?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmRepairCost: { checked: propertyData.softAMChecklist?.confirmRepairCost?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="confirm-offer-terms-match"
                label="Confirm offer terms match contract"
                checked={propertyData.softAMChecklist?.confirmOfferTermsMatchContract?.checked || false}
                comment={propertyData.softAMChecklist?.confirmOfferTermsMatchContract?.comment}
                onCheckedChange={(checked) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmOfferTermsMatchContract: { checked, comment: propertyData.softAMChecklist?.confirmOfferTermsMatchContract?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('softAMChecklist', {
                  ...(propertyData.softAMChecklist ?? {}),
                  confirmOfferTermsMatchContract: { checked: propertyData.softAMChecklist?.confirmOfferTermsMatchContract?.checked || false, comment }
                })}
              />

              <div className="space-y-2">
                <Label className="font-semibold">Approved Inspections (each a check box)</Label>
                <div className="space-y-2 pl-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={propertyData.approvedInspections?.physicalInspection || false}
                      onChange={(e) => updateField('approvedInspections', {
                        ...(propertyData.approvedInspections ?? {}),
                        physicalInspection: e.target.checked
                      })}
                      data-testid="checkbox-physical-inspection"
                    />
                    <span>Physical inspection</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={propertyData.approvedInspections?.driveComps || false}
                      onChange={(e) => updateField('approvedInspections', {
                        ...(propertyData.approvedInspections ?? {}),
                        driveComps: e.target.checked
                      })}
                      data-testid="checkbox-drive-comps"
                    />
                    <span>Drive Comps</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={propertyData.approvedInspections?.cityPermitVerification || false}
                      onChange={(e) => updateField('approvedInspections', {
                        ...(propertyData.approvedInspections ?? {}),
                        cityPermitVerification: e.target.checked
                      })}
                      data-testid="checkbox-city-permit"
                    />
                    <span>City permit verification</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hard AM Approval Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Hard AM Approval</CardTitle>
              <p className="text-sm text-muted-foreground">Items review by C: Acquisition Manager</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <CheckboxWithComment
                id="review-discrepancies"
                label="Review any Data Discrepancies"
                checked={propertyData.hardAMChecklist?.reviewDataDiscrepancies?.checked || false}
                comment={propertyData.hardAMChecklist?.reviewDataDiscrepancies?.comment}
                onCheckedChange={(checked) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  reviewDataDiscrepancies: { checked, comment: propertyData.hardAMChecklist?.reviewDataDiscrepancies?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  reviewDataDiscrepancies: { checked: propertyData.hardAMChecklist?.reviewDataDiscrepancies?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="order-termite"
                label="Order Termite"
                checked={propertyData.hardAMChecklist?.orderTermite?.checked || false}
                comment={propertyData.hardAMChecklist?.orderTermite?.comment}
                onCheckedChange={(checked) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  orderTermite: { checked, comment: propertyData.hardAMChecklist?.orderTermite?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  orderTermite: { checked: propertyData.hardAMChecklist?.orderTermite?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="confirm-issues-addressed"
                label="Confirm all issues were addressed in Due-Diligence"
                checked={propertyData.hardAMChecklist?.confirmIssuesAddressed?.checked || false}
                comment={propertyData.hardAMChecklist?.confirmIssuesAddressed?.comment}
                onCheckedChange={(checked) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  confirmIssuesAddressed: { checked, comment: propertyData.hardAMChecklist?.confirmIssuesAddressed?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  confirmIssuesAddressed: { checked: propertyData.hardAMChecklist?.confirmIssuesAddressed?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="check-user-activity"
                label='Check "User Activity"'
                checked={propertyData.hardAMChecklist?.checkUserActivity?.checked || false}
                comment={propertyData.hardAMChecklist?.checkUserActivity?.comment}
                onCheckedChange={(checked) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  checkUserActivity: { checked, comment: propertyData.hardAMChecklist?.checkUserActivity?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  checkUserActivity: { checked: propertyData.hardAMChecklist?.checkUserActivity?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="confirm-offer-status-hard"
                label='Confirm "Offer Status" is correct'
                checked={propertyData.hardAMChecklist?.confirmOfferStatus?.checked || false}
                comment={propertyData.hardAMChecklist?.confirmOfferStatus?.comment}
                onCheckedChange={(checked) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  confirmOfferStatus: { checked, comment: propertyData.hardAMChecklist?.confirmOfferStatus?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  confirmOfferStatus: { checked: propertyData.hardAMChecklist?.confirmOfferStatus?.checked || false, comment }
                })}
              />

              <CheckboxWithComment
                id="confirm-physical-inspections-completed"
                label="Confirm Physical Inspections were completed"
                checked={propertyData.hardAMChecklist?.confirmPhysicalInspections?.checked || false}
                comment={propertyData.hardAMChecklist?.confirmPhysicalInspections?.comment}
                onCheckedChange={(checked) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  confirmPhysicalInspections: { checked, comment: propertyData.hardAMChecklist?.confirmPhysicalInspections?.comment || '' }
                })}
                onCommentChange={(comment) => updateField('hardAMChecklist', {
                  ...(propertyData.hardAMChecklist ?? {}),
                  confirmPhysicalInspections: { checked: propertyData.hardAMChecklist?.confirmPhysicalInspections?.checked || false, comment }
                })}
              />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="zoning-check"
                    checked={propertyData.hardAMChecklist?.zoningCheck?.checked || false}
                    onChange={(e) => updateField('hardAMChecklist', {
                      ...(propertyData.hardAMChecklist ?? {}),
                      zoningCheck: { checked: e.target.checked, comment: propertyData.hardAMChecklist?.zoningCheck?.comment || '' }
                    })}
                    data-testid="checkbox-zoning"
                  />
                  <Label htmlFor="zoning-check">Zoning (Enter Zoning)</Label>
                </div>
                <Input
                  value={propertyData.zoningDetails || ''}
                  onChange={(e) => updateField('zoningDetails', e.target.value)}
                  placeholder="Enter zoning details..."
                  data-testid="input-zoning-details"
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-4">ARV & Inspection Confirmation</h4>
                <CheckboxWithComment
                  id="confirm-value-inspection"
                  label="Confirm value Based on inspection and Comp drive by"
                  checked={propertyData.hardAMChecklist?.confirmValueBasedOnInspection?.checked || false}
                  comment={propertyData.hardAMChecklist?.confirmValueBasedOnInspection?.comment}
                  onCheckedChange={(checked) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmValueBasedOnInspection: { checked, comment: propertyData.hardAMChecklist?.confirmValueBasedOnInspection?.comment || '' }
                  })}
                  onCommentChange={(comment) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmValueBasedOnInspection: { checked: propertyData.hardAMChecklist?.confirmValueBasedOnInspection?.checked || false, comment }
                  })}
                />

                <CheckboxWithComment
                  id="called-pending-backup-comps"
                  label="Called pending and back up comps for price"
                  checked={propertyData.hardAMChecklist?.calledPendingBackupComps?.checked || false}
                  comment={propertyData.hardAMChecklist?.calledPendingBackupComps?.comment}
                  onCheckedChange={(checked) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    calledPendingBackupComps: { checked, comment: propertyData.hardAMChecklist?.calledPendingBackupComps?.comment || '' }
                  })}
                  onCommentChange={(comment) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    calledPendingBackupComps: { checked: propertyData.hardAMChecklist?.calledPendingBackupComps?.checked || false, comment }
                  })}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-4">Financial Analysis</h4>
                <CheckboxWithComment
                  id="re-estimated-analysis"
                  label="Re estimated Investment Analysis based on actual numbers"
                  checked={propertyData.hardAMChecklist?.reEstimatedInvestmentAnalysis?.checked || false}
                  comment={propertyData.hardAMChecklist?.reEstimatedInvestmentAnalysis?.comment}
                  onCheckedChange={(checked) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    reEstimatedInvestmentAnalysis: { checked, comment: propertyData.hardAMChecklist?.reEstimatedInvestmentAnalysis?.comment || '' }
                  })}
                  onCommentChange={(comment) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    reEstimatedInvestmentAnalysis: { checked: propertyData.hardAMChecklist?.reEstimatedInvestmentAnalysis?.checked || false, comment }
                  })}
                />

                <CheckboxWithComment
                  id="confirm-roi-hard"
                  label="Confirm ROI calculations are correct"
                  checked={propertyData.hardAMChecklist?.confirmROICalculations?.checked || false}
                  comment={propertyData.hardAMChecklist?.confirmROICalculations?.comment}
                  onCheckedChange={(checked) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmROICalculations: { checked, comment: propertyData.hardAMChecklist?.confirmROICalculations?.comment || '' }
                  })}
                  onCommentChange={(comment) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmROICalculations: { checked: propertyData.hardAMChecklist?.confirmROICalculations?.checked || false, comment }
                  })}
                />

                <CheckboxWithComment
                  id="confirm-repair-cost-hard"
                  label='Confirm "Repair Cost" based on inspection'
                  checked={propertyData.hardAMChecklist?.confirmRepairCost?.checked || false}
                  comment={propertyData.hardAMChecklist?.confirmRepairCost?.comment}
                  onCheckedChange={(checked) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmRepairCost: { checked, comment: propertyData.hardAMChecklist?.confirmRepairCost?.comment || '' }
                  })}
                  onCommentChange={(comment) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmRepairCost: { checked: propertyData.hardAMChecklist?.confirmRepairCost?.checked || false, comment }
                  })}
                />

                <CheckboxWithComment
                  id="confirm-terms-match-rpa"
                  label='Confirm "Investment Analysis" and "Offer Terms" match RPA'
                  checked={propertyData.hardAMChecklist?.confirmInvestmentAnalysisMatchesRPA?.checked || false}
                  comment={propertyData.hardAMChecklist?.confirmInvestmentAnalysisMatchesRPA?.comment}
                  onCheckedChange={(checked) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmInvestmentAnalysisMatchesRPA: { checked, comment: propertyData.hardAMChecklist?.confirmInvestmentAnalysisMatchesRPA?.comment || '' }
                  })}
                  onCommentChange={(comment) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    confirmInvestmentAnalysisMatchesRPA: { checked: propertyData.hardAMChecklist?.confirmInvestmentAnalysisMatchesRPA?.checked || false, comment }
                  })}
                />

                <CheckboxWithComment
                  id="floor-plan-modifications"
                  label="Floor Plan Modifications required"
                  checked={propertyData.hardAMChecklist?.floorPlanModifications?.checked || false}
                  comment={propertyData.hardAMChecklist?.floorPlanModifications?.comment}
                  onCheckedChange={(checked) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    floorPlanModifications: { checked, comment: propertyData.hardAMChecklist?.floorPlanModifications?.comment || '' }
                  })}
                  onCommentChange={(comment) => updateField('hardAMChecklist', {
                    ...(propertyData.hardAMChecklist ?? {}),
                    floorPlanModifications: { checked: propertyData.hardAMChecklist?.floorPlanModifications?.checked || false, comment }
                  })}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-4">City Check List</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={propertyData.cityChecklist?.permits || false}
                      onChange={(e) => updateField('cityChecklist', {
                        ...(propertyData.cityChecklist ?? {}),
                        permits: e.target.checked
                      })}
                      data-testid="checkbox-permits"
                    />
                    <span>Permits</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={propertyData.cityChecklist?.codeEnforcement || false}
                      onChange={(e) => updateField('cityChecklist', {
                        ...(propertyData.cityChecklist ?? {}),
                        codeEnforcement: e.target.checked
                      })}
                      data-testid="checkbox-code-enforcement"
                    />
                    <span>Code Enforcement</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={propertyData.cityChecklist?.zoning || false}
                      onChange={(e) => updateField('cityChecklist', {
                        ...(propertyData.cityChecklist ?? {}),
                        zoning: e.target.checked
                      })}
                      data-testid="checkbox-city-zoning"
                    />
                    <span>Zoning</span>
                  </label>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  size="lg"
                  onClick={() => {
                    updateField('finalApprovalGrantedBy', userEmail);
                    updateField('finalApprovalDate', new Date().toISOString());
                    toast({
                      title: "Final Approval Granted",
                      description: "Property has been approved for wholesale."
                    });
                  }}
                  data-testid="button-grant-approval"
                >
                  Grant Final AM Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Report Tab */}
        <TabsContent value="ai-report" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>AI Analysis Report</CardTitle>
              <Button
                onClick={async () => {
                  if (!propertyData.id) return;
                  
                  setIsGeneratingAnalysis(true);
                  try {
                    const response = await apiRequest('POST', `/api/properties/${propertyData.id}/analyze`);
                    
                    updateField('aiAnalysis', response);
                    toast({
                      title: "AI Analysis Generated",
                      description: "Analysis complete. Review the recommendations below."
                    });
                  } catch (error: any) {
                    toast({
                      title: "Analysis Failed",
                      description: error.message || "Failed to generate AI analysis.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsGeneratingAnalysis(false);
                  }
                }}
                disabled={isGeneratingAnalysis || !propertyData.id}
                data-testid="button-generate-analysis"
              >
                {isGeneratingAnalysis ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Generating...
                  </>
                ) : (
                  'Generate AI Analysis'
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {propertyData.aiAnalysis ? (
                <div className="space-y-6">
                  {/* Summary Section */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md" data-testid="section-ai-summary">
                    <h3 className="font-semibold text-lg mb-2">Executive Summary</h3>
                    <p className="text-sm">{propertyData.aiAnalysis.summary}</p>
                  </div>

                  {/* Strengths Section */}
                  <div data-testid="section-ai-strengths">
                    <h3 className="font-semibold text-lg mb-3 text-green-600 dark:text-green-400">✓ Key Strengths</h3>
                    <ul className="space-y-2">
                      {propertyData.aiAnalysis.strengths?.map((strength: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Concerns Section */}
                  <div data-testid="section-ai-concerns">
                    <h3 className="font-semibold text-lg mb-3 text-yellow-600 dark:text-yellow-400">⚠ Key Concerns</h3>
                    <ul className="space-y-2">
                      {propertyData.aiAnalysis.concerns?.map((concern: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                          <span className="text-sm">{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendation Section */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md border-l-4 border-indigo-500" data-testid="section-ai-recommendation">
                    <h3 className="font-semibold text-lg mb-2">Final Recommendation</h3>
                    <p className="text-sm">{propertyData.aiAnalysis.recommendation}</p>
                  </div>

                  {/* Regenerate Notice */}
                  <p className="text-xs text-muted-foreground text-center">
                    Analysis generated using GPT-5. Click "Generate AI Analysis" to refresh.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12" data-testid="prompt-generate-analysis">
                  <p className="text-muted-foreground mb-4">No AI analysis available yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Generate AI Analysis" above to get AI-powered insights and recommendations for this property.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
