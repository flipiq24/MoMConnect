import { useState, useEffect } from 'react';
import { Save, Brain, Calculator, TrendingUp, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { scoringRules, calculateTotalScore, getEMDRecommendation, getSelectColor, getPointColor, getEMDStatusColor, getTotalScoreColor, getScoreTextColor } from '@shared/scoring';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Property } from '@shared/schema';

interface PropertyFormData {
  [key: string]: any;
}

export default function Acquisition() {
  const { toast } = useToast();
  const [propertyData, setPropertyData] = useState<PropertyFormData>({});
  const [totalScore, setTotalScore] = useState(0);
  const [emdRecommendation, setEmdRecommendation] = useState(getEMDRecommendation(0));
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);

  // Load most recent property data on mount
  const user = JSON.parse(localStorage.getItem('momUser') || '{}');
  const { data: existingProperty, isLoading: isLoadingProperty } = useQuery({
    queryKey: ['/api/users', user.email, 'recent-property'],
    queryFn: async () => {
      if (!user.email) return null;
      return await fetch(`/api/users/${user.email}/recent-property`).then(r => r.json());
    },
    enabled: !!user.email
  });

  // Hydrate form with existing property data
  useEffect(() => {
    if (existingProperty && existingProperty.id) {
      setCurrentPropertyId(existingProperty.id);
      setPropertyData({
        address: existingProperty.address || '',
        purchasePrice: existingProperty.purchasePrice || '',
        estimatedRehab: existingProperty.estimatedRehab || '',
        arv: existingProperty.arv || '',
        'Days in the MLS from acceptance Date': existingProperty.daysInMLS || '',
        'Is purchase price over 1M': existingProperty.purchasePriceRange || '',
        'Is value subject to permits': existingProperty.valueSubjectToPermits || '',
        'Is value subject to ADU?': existingProperty.valueSubjectToADU || '',
        'Is wholesale price higher than listing asking price?': existingProperty.wholesalePriceVsAsking || '',
        'ARV Confidence': existingProperty.arvConfidence || '',
        'ROI for time/Effort': existingProperty.roiForTimeEffort || '',
        'Zoning': existingProperty.zoning || '',
        'Rehab Level': existingProperty.rehabLevel || '',
        'Area Desirability': existingProperty.areaDesirability || '',
        'Obsolesces/Issues': existingProperty.obsolescencesIssues || '',
        'Occupancy': existingProperty.occupancy || ''
      });
      if (existingProperty.aiAnalysis) {
        setAiAnalysis(existingProperty.aiAnalysis);
      }
      setLastSaved(new Date(existingProperty.updatedAt));
    }
  }, [existingProperty]);

  // Calculate score whenever property data changes
  useEffect(() => {
    const score = calculateTotalScore(propertyData);
    setTotalScore(score);
    setEmdRecommendation(getEMDRecommendation(score));
  }, [propertyData]);

  // Create/update property mutation
  const savePropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const user = JSON.parse(localStorage.getItem('momUser') || '{}');
      const propertyPayload = {
        ...data,
        email: user.email
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
      // Invalidate recent property query to keep data fresh
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.email, 'recent-property'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save property data",
        variant: "destructive"
      });
    }
  });

  // Save to Google Sheets mutation
  const saveToSheetsMutation = useMutation({
    mutationFn: async () => {
      if (!currentPropertyId) {
        throw new Error('No property to save');
      }
      return await apiRequest('POST', `/api/properties/${currentPropertyId}/save-to-sheets`, {});
    },
    onSuccess: () => {
      toast({
        title: "Saved to Google Sheets",
        description: "Property data has been saved to Google Sheets successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Google Sheets Save Failed",
        description: error.message || "Failed to save to Google Sheets",
        variant: "destructive"
      });
    }
  });

  // AI Analysis mutation
  const analyzePropertyMutation = useMutation({
    mutationFn: async () => {
      let propertyId = currentPropertyId;
      
      if (!propertyId) {
        // Save property first and get the ID from the response
        const savedProperty = await savePropertyMutation.mutateAsync(propertyData);
        propertyId = savedProperty.id;
        setCurrentPropertyId(savedProperty.id);
      }
      
      if (!propertyId) {
        throw new Error('Failed to save property before analysis');
      }

      return await apiRequest('POST', `/api/properties/${propertyId}/analyze`, {});
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
      toast({
        title: "Analysis Complete",
        description: "AI property analysis has been generated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to generate AI analysis",
        variant: "destructive"
      });
    }
  });

  // Auto-save on data change
  useEffect(() => {
    if (propertyData.address && Object.keys(propertyData).length > 1) {
      const timer = setTimeout(() => {
        savePropertyMutation.mutate(propertyData);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [propertyData]);

  const updateField = (field: string, value: string | number) => {
    setPropertyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveToSheets = () => {
    if (!currentPropertyId) {
      toast({
        title: "No Property",
        description: "Please enter property information first.",
        variant: "destructive"
      });
      return;
    }
    saveToSheetsMutation.mutate();
  };

  const handleGenerateAnalysis = () => {
    if (!propertyData.address) {
      toast({
        title: "Missing Address",
        description: "Please enter a property address first.",
        variant: "destructive"
      });
      return;
    }
    analyzePropertyMutation.mutate();
  };

  if (isLoadingProperty) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading property data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Points Dashboard */}
      <Card className={`border-2 ${getTotalScoreColor(totalScore)}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                <p className={`text-4xl font-bold font-mono ${getScoreTextColor(totalScore)}`} data-testid="text-total-score">
                  {totalScore > 0 ? '+' : ''}{totalScore}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">EMD Decision</p>
                <Badge className={`${getEMDStatusColor(emdRecommendation.emd)} text-sm px-4 py-1`} data-testid="badge-emd-status">
                  {emdRecommendation.emd}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                <p className="text-2xl font-bold font-mono" data-testid="text-success-rate">{emdRecommendation.chance}%</p>
              </div>
              
              <div className="flex items-center gap-3">
                {savePropertyMutation.isPending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Save className="w-4 h-4 animate-pulse" />
                    <span>Saving...</span>
                  </div>
                ) : lastSaved ? (
                  <div className="text-sm text-green-600" data-testid="text-last-saved">
                    Saved {lastSaved.toLocaleTimeString()}
                  </div>
                ) : null}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSaveToSheets}
                  disabled={!currentPropertyId || saveToSheetsMutation.isPending}
                  data-testid="button-save-to-sheets"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveToSheetsMutation.isPending ? 'Saving...' : 'Save to Sheets'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="acquisition" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="acquisition" data-testid="tab-acquisition">
            <FileText className="w-4 h-4 mr-2" />
            Acquisition
          </TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            <Brain className="w-4 h-4 mr-2" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary">
            <TrendingUp className="w-4 h-4 mr-2" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acquisition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    value={propertyData.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main St, City, State ZIP"
                    data-testid="input-address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={propertyData.purchasePrice || ''}
                    onChange={(e) => updateField('purchasePrice', parseInt(e.target.value) || 0)}
                    placeholder="850000"
                    data-testid="input-purchase-price"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedRehab">Estimated Rehab</Label>
                  <Input
                    id="estimatedRehab"
                    type="number"
                    value={propertyData.estimatedRehab || ''}
                    onChange={(e) => updateField('estimatedRehab', parseInt(e.target.value) || 0)}
                    placeholder="75000"
                    data-testid="input-estimated-rehab"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arv">ARV (After Repair Value)</Label>
                  <Input
                    id="arv"
                    type="number"
                    value={propertyData.arv || ''}
                    onChange={(e) => updateField('arv', parseInt(e.target.value) || 0)}
                    placeholder="1200000"
                    data-testid="input-arv"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(scoringRules).map(([field, options]) => {
                const currentValue = propertyData[field];
                const points = currentValue ? options[currentValue] : 0;
                
                return (
                  <div key={field} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{field}</Label>
                      {currentValue && (
                        <Badge variant="outline" className={`${getPointColor(points)} border`}>
                          {points > 0 ? '+' : ''}{points} pts
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={currentValue || ''}
                      onValueChange={(value) => updateField(field, value)}
                    >
                      <SelectTrigger 
                        className={getSelectColor(field, currentValue)}
                        data-testid={`select-${field.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(options).map(option => (
                          <SelectItem key={option} value={option}>
                            {option} ({options[option] > 0 ? '+' : ''}{options[option]} pts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Property Analysis
                </CardTitle>
                <Button 
                  onClick={handleGenerateAnalysis} 
                  disabled={analyzePropertyMutation.isPending}
                  data-testid="button-generate-analysis"
                >
                  {analyzePropertyMutation.isPending ? 'Analyzing...' : 'Generate Analysis'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!aiAnalysis ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Click "Generate Analysis" to get AI-powered insights</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-muted-foreground" data-testid="text-analysis-summary">{aiAnalysis.summary}</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold mb-3 text-green-700">Strengths</h3>
                      <ul className="space-y-2">
                        {aiAnalysis.strengths?.map((strength: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                            <span className="text-sm">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 text-red-700">Concerns</h3>
                      <ul className="space-y-2">
                        {aiAnalysis.concerns?.map((concern: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                            <span className="text-sm">{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border-2 ${
                    emdRecommendation.emd === 'Yes EMD' ? 'bg-green-50 border-green-200' :
                    emdRecommendation.emd === 'TBD' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="font-semibold mb-2">Recommendation</h3>
                    <p className="font-medium" data-testid="text-recommendation">{aiAnalysis.recommendation}</p>
                  </div>

                  {aiAnalysis.marketInsights && (
                    <div>
                      <h3 className="font-semibold mb-2">Market Insights</h3>
                      <p className="text-muted-foreground">{aiAnalysis.marketInsights}</p>
                    </div>
                  )}

                  {aiAnalysis.dealStructure && (
                    <div>
                      <h3 className="font-semibold mb-2">Deal Structure</h3>
                      <p className="text-muted-foreground">{aiAnalysis.dealStructure}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Point Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(scoringRules).map(([field, options]) => {
                  const value = propertyData[field];
                  const points = value ? options[value] : 0;
                  
                  return (
                    <div key={field} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{field}</p>
                        <p className="text-xs text-muted-foreground">{value || 'Not set'}</p>
                      </div>
                      <Badge className={getPointColor(points)}>
                        {points > 0 ? '+' : ''}{points}
                      </Badge>
                    </div>
                  );
                })}
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border-2 border-primary">
                  <p className="font-bold">Total Score</p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    {totalScore > 0 ? '+' : ''}{totalScore}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
