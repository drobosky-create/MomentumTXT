// Dynamic industry details configuration for Step 2 form fields
import { IndustryDetails } from "./schema";

export interface IndustryField {
  key: keyof IndustryDetails;
  label: string;
  type: "select" | "multiselect" | "number" | "text";
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  visibleFor?: string[]; // NAICS codes this field applies to
}

// Field configuration - dynamic based on industry selection
export const industryFieldsConfig: IndustryField[] = [
  // Core business model questions (visible for all)
  {
    key: "businessModel",
    label: "Business Model",
    type: "select",
    required: true,
    placeholder: "Select your business model",
    helpText: "How does your business primarily operate?",
    options: [
      { value: "b2b", label: "B2B - Sell to other businesses" },
      { value: "b2c", label: "B2C - Sell directly to consumers" },
      { value: "marketplace", label: "Marketplace - Connect buyers & sellers" },
      { value: "saas", label: "SaaS - Software as a Service" },
      { value: "services", label: "Professional Services" },
      { value: "ecommerce", label: "E-commerce/Retail" },
      { value: "offline", label: "Traditional Brick & Mortar" },
    ],
  },
  {
    key: "companySize",
    label: "Company Size",
    type: "select",
    required: true,
    placeholder: "Select company size",
    helpText: "Number of employees in your organization",
    options: [
      { value: "solo", label: "Solo (Just me)" },
      { value: "2-10", label: "Small team (2-10 people)" },
      { value: "11-50", label: "Growing company (11-50 people)" },
      { value: "51-200", label: "Medium business (51-200 people)" },
      { value: "200+", label: "Large business (200+ people)" },
    ],
  },
  {
    key: "topGoals",
    label: "Top Business Goals",
    type: "multiselect",
    required: true,
    placeholder: "Select your top 2-3 goals",
    helpText: "What are you most focused on improving?",
    options: [
      { value: "growRevenue", label: "Grow Revenue" },
      { value: "reduceChurn", label: "Reduce Customer Churn" },
      { value: "increaseLTV", label: "Increase Customer Lifetime Value" },
      { value: "improveOps", label: "Improve Operational Efficiency" },
      { value: "increaseLeads", label: "Generate More Leads" },
    ],
  },

  // Revenue model (visible for most)
  {
    key: "revenueModel",
    label: "Revenue Model",
    type: "select",
    placeholder: "How do you generate revenue?",
    helpText: "Your primary revenue generation method",
    options: [
      { value: "subscription", label: "Subscription/Recurring" },
      { value: "transactional", label: "Transaction-based" },
      { value: "hybrid", label: "Mix of Both" },
    ],
  },

  // Sales channels
  {
    key: "salesChannels",
    label: "Sales Channels",
    type: "multiselect",
    placeholder: "How do you acquire customers?",
    helpText: "Select all channels you use to reach customers",
    options: [
      { value: "direct", label: "Direct Sales Team" },
      { value: "partner", label: "Channel Partners/Resellers" },
      { value: "ecommerce", label: "Online/E-commerce" },
      { value: "retail", label: "Retail Stores" },
      { value: "insideSales", label: "Inside Sales/Phone" },
    ],
  },

  // Customer segments
  {
    key: "customerSegments",
    label: "Customer Segments",
    type: "multiselect",
    placeholder: "Who are your primary customers?",
    helpText: "Select your main customer types",
    options: [
      { value: "smb", label: "Small & Medium Business" },
      { value: "midmarket", label: "Mid-market Companies" },
      { value: "enterprise", label: "Enterprise/Large Companies" },
      { value: "consumer", label: "Individual Consumers" },
    ],
  },

  // Geographic reach
  {
    key: "geography",
    label: "Geographic Reach",
    type: "select",
    placeholder: "What's your market reach?",
    helpText: "Geographic scope of your business",
    options: [
      { value: "local", label: "Local/City" },
      { value: "regional", label: "Regional/State" },
      { value: "national", label: "National" },
      { value: "international", label: "International" },
    ],
  },

  // Financial metrics (for more mature businesses)
  {
    key: "averageOrderValue",
    label: "Average Order Value",
    type: "number",
    placeholder: "Average transaction amount ($)",
    helpText: "Typical dollar amount per customer transaction",
  },
  {
    key: "grossMarginPct",
    label: "Gross Margin %",
    type: "number",
    placeholder: "Gross margin percentage",
    helpText: "Your gross profit margin as a percentage",
  },
  {
    key: "salesCycleDays",
    label: "Sales Cycle (Days)",
    type: "number",
    placeholder: "Days from lead to customer",
    helpText: "Average time to convert a lead into a paying customer",
  },

  // Data availability
  {
    key: "dataAvailability",
    label: "Available Data Sources",
    type: "multiselect",
    placeholder: "What systems do you currently use?",
    helpText: "We can potentially integrate with these for automated KPI tracking",
    options: [
      { value: "crm", label: "CRM (Salesforce, HubSpot, etc.)" },
      { value: "accounting", label: "Accounting (QuickBooks, Xero, etc.)" },
      { value: "ecommerce", label: "E-commerce (Shopify, WooCommerce, etc.)" },
      { value: "payment", label: "Payment Processors (Stripe, PayPal, etc.)" },
      { value: "support", label: "Support Tools (Zendesk, Intercom, etc.)" },
    ],
  },

  // Locations count
  {
    key: "locationsCount",
    label: "Number of Locations",
    type: "number",
    placeholder: "Number of physical locations",
    helpText: "How many physical locations does your business operate from?",
  },
];

// Industry-specific field visibility rules
export const industryFieldRules: Record<string, string[]> = {
  // SaaS-specific fields
  "54151": ["revenueModel", "customerSegments", "salesCycleDays", "dataAvailability"], // Software Publishers

  // E-commerce specific
  "45411": ["averageOrderValue", "grossMarginPct", "dataAvailability"], // Electronic Shopping

  // Manufacturing specific
  "31": ["grossMarginPct", "salesCycleDays", "locationsCount"], // Manufacturing prefix
  "32": ["grossMarginPct", "salesCycleDays", "locationsCount"],
  "33": ["grossMarginPct", "salesCycleDays", "locationsCount"],

  // Professional services
  "54": ["salesCycleDays", "customerSegments"], // Professional Services prefix

  // Healthcare
  "62": ["locationsCount", "geography"], // Health Care prefix

  // Retail
  "44": ["averageOrderValue", "grossMarginPct", "locationsCount"], // Retail Trade prefix
  "45": ["averageOrderValue", "grossMarginPct", "locationsCount"],
};

// Get visible fields for a specific NAICS code
export function getVisibleFieldsForIndustry(naicsCode: string): IndustryField[] {
  const baseFields = industryFieldsConfig.filter(
    (field) =>
      field.key === "businessModel" || field.key === "companySize" || field.key === "topGoals"
  );

  const industrySpecificKeys = industryFieldRules[naicsCode] || [];
  const industryFields = industryFieldsConfig.filter((field) =>
    industrySpecificKeys.includes(field.key as string)
  );

  // Always include core fields + revenue model + sales channels + customer segments
  const alwaysInclude = industryFieldsConfig.filter(
    (field) =>
      field.key === "revenueModel" ||
      field.key === "salesChannels" ||
      field.key === "customerSegments" ||
      field.key === "geography"
  );

  // Deduplicate fields by key to avoid duplicate entries
  const allFields = [...baseFields, ...alwaysInclude, ...industryFields];
  const seenKeys = new Set<string>();
  return allFields.filter((field) => {
    if (seenKeys.has(field.key)) {
      return false;
    }
    seenKeys.add(field.key);
    return true;
  });
}

// Human-readable labels for enum values
export const enumLabels = {
  businessModel: {
    b2b: "B2B",
    b2c: "B2C",
    marketplace: "Marketplace",
    saas: "SaaS",
    services: "Services",
    ecommerce: "E-commerce",
    offline: "Offline",
  },
  revenueModel: {
    subscription: "Subscription",
    transactional: "Transactional",
    hybrid: "Hybrid",
  },
  companySize: {
    solo: "Solo",
    "2-10": "2-10 employees",
    "11-50": "11-50 employees",
    "51-200": "51-200 employees",
    "200+": "200+ employees",
  },
  geography: {
    local: "Local",
    regional: "Regional",
    national: "National",
    international: "International",
  },
} as const;
