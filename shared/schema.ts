import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for login
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property schema for wholesale analysis
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  address: text("address").notNull(),
  
  // Risk assessment fields
  source: text("source"),
  daysInMLS: text("days_in_mls"),
  purchasePriceRange: text("purchase_price_range"),
  valueSubjectToPermits: text("value_subject_to_permits"),
  valueSubjectToADU: text("value_subject_to_adu"),
  wholesalePriceVsAsking: text("wholesale_price_vs_asking"),
  arvConfidence: text("arv_confidence"),
  roiForTimeEffort: text("roi_for_time_effort"),
  zoning: text("zoning"),
  rehabLevel: text("rehab_level"),
  areaDesirability: text("area_desirability"),
  obsolescencesIssues: text("obsolescences_issues"),
  occupancy: text("occupancy"),
  
  // Financial data
  purchasePrice: integer("purchase_price"),
  estimatedRehab: integer("estimated_rehab"),
  arv: integer("arv"),
  
  // Calculated fields
  totalScore: integer("total_score").default(0),
  emdRecommendation: text("emd_recommendation"),
  successChance: integer("success_chance"),
  
  // Acquisition Metrics (Image 1)
  forecastedWholesaleFee: integer("forecasted_wholesale_fee"),
  closingCosts: integer("closing_costs"),
  salePriceWholesaleBuyer: integer("sale_price_wholesale_buyer"),
  totalAllInPercent: text("total_all_in_percent"),
  
  // MOM Meeting Review (Image 2)
  dmApprovalStatus: text("dm_approval_status"),
  dmConfidencePercent: integer("dm_confidence_percent"),
  dmConfidenceExplanation: text("dm_confidence_explanation"),
  compsDriver: text("comps_driver"),
  propertyInspector: text("property_inspector"),
  wholesalingDetailDescription: text("wholesaling_detail_description"),
  wholesalingShortDescription: text("wholesaling_short_description"),
  
  // Soft AM Approval (Images 3-4)
  softAMChecklist: jsonb("soft_am_checklist"),
  busyStreets: text("busy_streets"),
  obsolescence: text("obsolescence"),
  obsolescenceNotes: text("obsolescence_notes"),
  arvConfidencePercent: integer("arv_confidence_percent"),
  approvedInspections: jsonb("approved_inspections"),
  
  // Hard AM Approval (Images 5-6)
  physicalInspectionContingency: text("physical_inspection_contingency"),
  contingencyRemovalDate: timestamp("contingency_removal_date"),
  contingencyRemovalApprovedBy: text("contingency_removal_approved_by"),
  wholesaleStatus: text("wholesale_status"),
  hardAMChecklist: jsonb("hard_am_checklist"),
  zoningDetails: text("zoning_details"),
  propertyConditions: jsonb("property_conditions"),
  financialAnalysis: jsonb("financial_analysis"),
  cityChecklist: jsonb("city_checklist"),
  finalApprovalGrantedBy: text("final_approval_granted_by"),
  finalApprovalDate: timestamp("final_approval_date"),
  
  // Acquisition Pipeline (spreadsheet) fields
  offerStatus: text("offer_status"),
  listPrice: integer("list_price"),
  finalAcceptedPrice: integer("final_accepted_price"),
  estCOE: text("est_coe"),
  acqAssociate: text("acq_associate"),
  listingAgent: text("listing_agent"),
  agentPhone: text("agent_phone"),
  agentEmail: text("agent_email"),
  ddDeadline: text("dd_deadline"),
  ddStatus: text("dd_status"),
  ddApprovedBy: text("dd_approved_by"),
  ddApprovalDate: text("dd_approval_date"),
  emdAmount: integer("emd_amount"),
  emdDueDate: text("emd_due_date"),
  emdStatus: text("emd_status"),
  assignmentStatus: text("assignment_status"),
  confidenceToAssign: text("confidence_to_assign"),
  notes: text("notes"),

  // Final Contract Terms (Acquisition Information tab) - stored as a single JSONB blob
  finalContractTerms: jsonb("final_contract_terms"),

  // Investor / Buyer Information (shown when wholesale status is Assigned/wholesale) - JSONB blob
  investorBuyerInfo: jsonb("investor_buyer_info"),

  // Zillow/property data
  zillowData: jsonb("zillow_data"),
  
  // AI Analysis
  aiAnalysis: jsonb("ai_analysis"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
});

// Timestamp columns are written from the client as date/ISO strings. Coerce
// them to Date objects (and treat empty string as null) so saves don't 400.
const optionalTimestamp = z.preprocess(
  (v) => (v === '' ? null : v),
  z.coerce.date().nullable().optional(),
);

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalScore: true,
  emdRecommendation: true,
  successChance: true,
}).extend({
  contingencyRemovalDate: optionalTimestamp,
  finalApprovalDate: optionalTimestamp,
});

export const updatePropertySchema = insertPropertySchema.partial().extend({
  id: z.string(),
});

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type UpdateProperty = z.infer<typeof updatePropertySchema>;
export type Property = typeof properties.$inferSelect;

// Scoring rules type
export interface ScoringRules {
  [key: string]: {
    [option: string]: number;
  };
}

// AI Analysis type
export interface AIAnalysis {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  breakdown: {
    field: string;
    value: string;
    points: number;
  }[];
}

// Zillow data type
export interface ZillowData {
  address: string;
  zpid: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize: number;
  yearBuilt: number;
  zestimate: number;
}

// EMD Recommendation type
export interface EMDRecommendation {
  emd: 'Yes EMD' | 'TBD' | 'No EMD';
  chance: number;
}

// Checklist item with comment
export interface ChecklistItem {
  checked: boolean;
  comment?: string;
}

// Soft AM Checklist structure
export interface SoftAMChecklist {
  readAgentComments?: ChecklistItem;
  reviewGoogleMaps?: ChecklistItem;
  reviewRequiredInspections?: ChecklistItem;
  usabilityOfLot?: ChecklistItem;
  possibleZoning?: ChecklistItem;
  reviewPictures?: ChecklistItem;
  lookOutForAdditions?: ChecklistItem;
  readSystemNotes?: ChecklistItem;
  agentCallsBackup?: ChecklistItem;
  confirmOfferStatus?: ChecklistItem;
  verifyOfferTerms?: ChecklistItem;
  investmentAnalysisConfirmed?: ChecklistItem;
  confirmROICalculations?: ChecklistItem;
  confirmRepairCost?: ChecklistItem;
  confirmOfferTermsMatchContract?: ChecklistItem;
}

// Approved Inspections
export interface ApprovedInspections {
  physicalInspection?: boolean;
  driveComps?: boolean;
  cityPermitVerification?: boolean;
}

// Hard AM Checklist structure
export interface HardAMChecklist {
  reviewDataDiscrepancies?: ChecklistItem;
  orderTermite?: ChecklistItem;
  confirmIssuesAddressed?: ChecklistItem;
  checkUserActivity?: ChecklistItem;
  confirmOfferStatus?: ChecklistItem;
  confirmPhysicalInspections?: ChecklistItem;
  zoningCheck?: ChecklistItem;
  confirmValueBasedOnInspection?: ChecklistItem;
  calledPendingBackupComps?: ChecklistItem;
  reEstimatedInvestmentAnalysis?: ChecklistItem;
  confirmROICalculations?: ChecklistItem;
  confirmRepairCost?: ChecklistItem;
  confirmInvestmentAnalysisMatchesRPA?: ChecklistItem;
  floorPlanModifications?: ChecklistItem;
}

// Property Conditions
export interface PropertyConditions {
  busyStreets?: string;
  additionsLegalStatus?: string;
  obsolescenceFlag?: boolean;
  obsolescenceNotes?: string;
}

// Financial Analysis
export interface FinancialAnalysis {
  investmentAnalysisReEstimated?: boolean;
  roiConfirmed?: boolean;
  repairCostConfirmed?: boolean;
  termsMatchRPA?: boolean;
}

// City Checklist
export interface CityChecklist {
  permits?: boolean;
  codeEnforcement?: boolean;
  zoning?: boolean;
}

// Final Contract Terms (Acquisition Information tab)
// All fields optional; stored together in the finalContractTerms JSONB column.
export interface FinalContractTerms {
  // General
  buyerOwnerOfRecord?: string;
  offerNegotiator?: string;
  leadSource?: string;
  transactionCoordinator?: string;
  saleType?: string;
  shortSaleOrProbateStatus?: string;
  intentForProperty?: string;
  occupantType?: string;
  sellerOfRecord?: string;
  possessionAtCoe?: string;
  solarPanels?: string;
  lockBoxType?: string;
  lockboxLocation?: string;
  accessCombo?: string;
  accessComments?: string;
  fullyExecutedRpa?: string;
  acquisitionInfoComments?: string;
  // Milestones
  contractWrittenDate?: string;
  offerAcceptedDate?: string;
  estimatedCoe?: string; // auto-calculated
  ddDeadline?: string; // auto-calculated
  emdDeadline?: string; // auto-calculated
  sellerToDeliverDeadline?: string;
  shortSaleProbateAcceptanceDate?: string;
  shortSaleExpirationDate?: string;
  termiteInspectionRequestedDate?: string;
  // Documents
  propertyFileLink?: string;
  // Listing Agent Information
  listingAgentFirstName?: string;
  listingAgentLastName?: string;
  listingAgentCellPhone?: string;
  listingAgentEmail?: string;
  listingAgentOffice?: string;
  listingAgentOfficeAddress?: string;
  listingAgentDirectPhone?: string;
  additionalAcquisitionFee?: string;
  isRelistingProperty?: string;
  relistCommission?: string;
  listingAgentComments?: string;
  listingAgentRepresentsBoth?: string;
  // Selling Agent Information
  sellingAgentFirstName?: string;
  sellingAgentLastName?: string;
  sellingAgentCellPhone?: string;
  sellingAgentEmail?: string;
  sellingAgentOffice?: string;
  sellingAgentOfficeAddress?: string;
  sellingAgentDirectPhone?: string;
  // Seller Contact (FSBO)
  sellerFirstName?: string;
  sellerLastName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  // Escrow Company Information
  escrowCompany?: string;
  escrowOfficer?: string;
  escrowNumber?: string;
  escrowOfficerDirectPhone?: string;
  escrowOfficerEmail?: string;
  escrowCompanyPhone?: string;
  escrowCompanyAddress?: string;
  // Title Company Information
  titleCompany?: string;
  titleOfficer?: string;
  titleOrderNumber?: string;
  titleOfficerDirectPhone?: string;
  titleCompanyPhone?: string;
  titleOfficerEmail?: string;
  titleCompanyAddress?: string;
  // Final Acquisition Contract Terms
  contractPurchasePrice?: string;
  contractEmdDays?: string;
  contractEmdAmount?: string;
  contractEmdType?: string;
  contractEmdToBe?: string;
  contractOfferType?: string;
  contractCloseOfEscrowDays?: string;
  contractAppraisalContingencyDays?: string;
  contractPhysicalInspectionContingency?: string;
  contractTermite?: string;
  contractDisclosuresReports?: string;
  contractClosingCosts?: string;
  contractPossession?: string;
  amendedContractPurchasePrice?: string;
  contractRemarks?: string;
  // Other Cost or Credits
  ddDays?: string; // used to auto-calc the DD Deadline
  tcFee?: string;
  titleCost?: string;
  escrowCost?: string;
  otherCostOrCreditsOutside?: string;
  explanationOtherCostsCredits?: string;
  // Wholesale EMD
  emdContractAmount?: string; // duplicated from Contract EMD Amount
  wireInstructions?: string;
  emdApprovedBy?: string;
  emdSentBy?: string;
  emdStatus?: string;
  emdStatusDate?: string;
  emdAmountSent?: string;
  emdSentDate?: string;
  emdAmountRefunded?: string;
  emdAmountRefundedDate?: string;
  emdNotes?: string;
}

// Investor / Buyer Information (shown when wholesale status is Assigned/wholesale)
// All fields optional; stored together in the investorBuyerInfo JSONB column.
export interface InvestorBuyerInfo {
  // Buyer / Investor
  buyerFirstLast?: string;
  investorBuyerCell?: string;
  investorEmail?: string;
  buyingEntityName?: string;
  primarySigner?: string;
  secondarySigner?: string;
  buyerCorporateDocs?: string;
  locDocuments?: string;
  pof?: string;
  link365Report?: string;
  investorsOpenClosedReport?: string;
  linkCorporateProfile?: string;
  // Offer / EMD / TC
  investorEstimatedCoe?: string;
  investorOfferPrice?: string;
  buyersEmdAmount?: string;
  buyersEmdStatus?: string;
  buyersEmdStatusDate?: string;
  investorTc?: string;
  investorTcEmail?: string;
  investorTcPhone?: string;
  // Lender / Assignment
  lenderFirstLast?: string;
  lenderName?: string;
  lenderEmail?: string;
  lenderPhone?: string;
  lenderDoubleEscrow?: string;
  requiredDoubleEscrow?: string;
  assignmentFullyExecutedContract?: string;
  assignmentConversationWithAgent?: string;
  verificationWholesaleFeeEscrow?: string;
  aoaaVestingAmendmentFec?: string;
  aoaaVestingAmendmentStatus?: string;
  buyersLoanStatus?: string;
  assignmentFeeReceivedDate?: string;
}
