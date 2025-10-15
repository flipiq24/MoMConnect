import { EMDRecommendation, ScoringRules } from "./schema";

// EXACT scoring rules from the MoM system
export const scoringRules: ScoringRules = {
  'Days in the MLS from acceptance Date': {
    'Not In the MLS': 1,
    'Less than one week': 0,
    'PR/BM': 0,
    'More than a Week': -1
  },
  'Is purchase price over 1M': {
    '1M or under': 1,
    '1-1.5M': 0,
    '1.5M +': -1
  },
  'Is value subject to permits': {
    'No': 0,
    'Approved Permits': 0,
    'Yes': -2
  },
  'Is value subject to ADU?': {
    'No': 0,
    'Approved Permits': 0,
    'Yes': -3
  },
  'Is wholesale price higher than listing asking price?': {
    'Significantly lower (10%+ below asking)': 1,
    '5% below asking': 0,
    'Below 5% below asking': -2,
    'Over asking': -3
  },
  'ARV Confidence': {
    'Sold Comps': 1,
    'little to no Comps': 0,
    'Pushing Value': -1
  },
  'ROI for time/Effort': {
    'High': 1,
    'Standard': 0,
    'Low': -1
  },
  'Zoning': {
    'Residential': 0,
    'Commercial with 100% Burn Letter': -1,
    'Commercial (Legal Non Conforming)': -3
  },
  'Rehab Level': {
    'Light': 1,
    'Medium': 0,
    'Heavy': -1
  },
  'Area Desirability': {
    'High': 1,
    'Standard': 0,
    'Low': -1
  },
  'Obsolesces/Issues': {
    'No': 0,
    'Minor': -1,
    'Modest': -2,
    'Major': -3
  },
  'Occupancy': {
    'Vacant at COE': 1,
    'Seller/Tenant will hold back funds and keep occupancy': -1,
    'Seller Will stay for more than 3 months no hold back': -2,
    'Tenant occupied': -3
  }
};

// EXACT EMD Decision Matrix from user specifications
export function getEMDRecommendation(score: number): EMDRecommendation {
  const matrix: { [key: string]: EMDRecommendation } = {
    '5': { emd: 'Yes EMD', chance: 100 },
    '4': { emd: 'Yes EMD', chance: 90 },
    '3': { emd: 'Yes EMD', chance: 80 },
    '2': { emd: 'Yes EMD', chance: 70 },
    '1': { emd: 'Yes EMD', chance: 60 },
    '0': { emd: 'Yes EMD', chance: 50 },
    '-1': { emd: 'TBD', chance: 40 },
    '-2': { emd: 'No EMD', chance: 30 },
    '-3': { emd: 'No EMD', chance: 20 },
    '-4': { emd: 'No EMD', chance: 10 },
    '-5': { emd: 'No EMD', chance: 0 }
  };
  
  if (score > 5) return { emd: 'Yes EMD', chance: 100 };
  if (score < -5) return { emd: 'No EMD', chance: 0 };
  
  return matrix[score.toString()] || { emd: 'TBD', chance: 40 };
}

// Calculate total score from property data
export function calculateTotalScore(propertyData: any): number {
  let totalScore = 0;
  
  Object.keys(scoringRules).forEach(field => {
    const value = propertyData[field];
    if (value && scoringRules[field][value] !== undefined) {
      totalScore += scoringRules[field][value];
    }
  });
  
  return totalScore;
}

// Get color classes for point values
export function getPointColor(points: number): string {
  if (points > 0) return 'bg-green-50 text-green-700 border-green-300';
  if (points < 0) return 'bg-red-50 text-red-700 border-red-300';
  return 'bg-background text-foreground border-border';
}

// Get color classes for select options based on their point value
export function getSelectColor(field: string, value: string): string {
  if (!value || !scoringRules[field]) return '';
  const points = scoringRules[field][value];
  if (points > 0) return 'bg-green-50 border-green-500';
  if (points < 0) return 'bg-red-50 border-red-500';
  return '';
}

// Get color classes for EMD status badge
export function getEMDStatusColor(emdStatus?: string): string {
  if (emdStatus === 'Yes EMD') return 'bg-green-500 text-white';
  if (emdStatus === 'TBD') return 'bg-yellow-500 text-white';
  if (emdStatus === 'No EMD') return 'bg-red-500 text-white';
  return 'bg-muted text-muted-foreground';
}

// Get color classes for total score display
export function getTotalScoreColor(score: number): string {
  if (score >= 1) return 'bg-green-50 border-green-500';
  if (score === 0) return 'bg-blue-50 border-blue-500';
  if (score === -1) return 'bg-yellow-50 border-yellow-500';
  return 'bg-red-50 border-red-500';
}

// Get text color for score value
export function getScoreTextColor(score: number): string {
  if (score >= 1) return 'text-green-700';
  if (score === 0) return 'text-blue-700';
  if (score === -1) return 'text-yellow-700';
  return 'text-red-700';
}
