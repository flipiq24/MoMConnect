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
    enabled: !!userEmail
  });

  // Hydrate form with existing property data
  useEffect(() => {
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
      const propertyPayload = {
        ...data,
        email: userEmail,
        totalScore,
        emdRecommendation: emdRecommendation.emd,
        successChance: emdRecommendation.chance
      };

      if (currentPropertyId) {
        return await apiRequest('PATCH', `/api/properties/${currentPropertyId}`, propertyPayload);
      } else {
        const result = await apiRequest('POST', '/api/properties', propertyPayload);
        setCurrentPropertyId(result.id);
        return result;
      }
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/users', userEmail, 'recent-property'] });
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
                  onChange={(e) => updateField('contingencyRemovalDate', e.target.value)}
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
            <CardHeader>
              <CardTitle>AI Analysis Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">AI analysis feature coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
