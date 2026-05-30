export const OFFER_STATUS_OPTIONS = [
  "Initial Contact Started",
  "Offer Terms Sent",
  "Contract Submitted",
  "Offer Accepted",
  "In Negotiations",
  "Continue to Follow",
  "Back Up",
  "Pass",
  "Acquired",
  "None",
] as const;

export const EMD_STATUS_OPTIONS = [
  "Pending Approval",
  "Approved to Send by AM",
  "Scheduled",
  "Sent to Escrow",
  "EMD Sent by Buyer",
  "Request EMD Refund",
  "Refunded",
  "Cancel - Buyer Did Not Send",
] as const;

export const DD_STATUS_OPTIONS = [
  "Not Started",
  "In Progress",
  "Completed - Pending Approval",
  "Approved",
  "Failed - Issues Found",
] as const;

export const ASSIGNMENT_STATUS_OPTIONS = [
  "Not Started",
  "Initiated",
  "Agent Informed - Waiting Approval",
  "Approved",
  "Not Approved - Escalated",
] as const;

export const CONFIDENCE_TO_ASSIGN_OPTIONS = [
  "High",
  "Standard",
  "Low",
] as const;

export const ACQ_ASSOCIATE_OPTIONS = [
  "Daniel Worby",
  "Gabriela Valle",
  "Juan Torres",
  "Mark Hollander",
  "Matt Carmean",
  "Victor Ortega",
] as const;

export const ESCROW_OFFER_STATUSES = ["Offer Accepted", "Contract Assigned"] as const;

export const PIPELINE_REQUIRED_FIELDS = [
  "purchasePrice",
  "acqAssociate",
  "ddDeadline",
  "ddStatus",
  "emdAmount",
  "emdDueDate",
  "emdStatus",
  "assignmentStatus",
  "confidenceToAssign",
] as const;

export type PipelineRequiredField = (typeof PIPELINE_REQUIRED_FIELDS)[number];
