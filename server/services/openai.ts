import OpenAI from "openai";
import { OnboardingContext, IndustryDetails } from "@shared/schema";
import { enumLabels } from "@shared/industryConfig";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.KPIFLOWKEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface KPISuggestion {
  name: string;
  displayName: string;
  description: string;
  category: string;
  unit: string;
  iconClass: string;
  colorClass: string;
  dataSource: string;
  priority: number;
}

class OpenAIService {
  // Enhanced KPI generation with rich business context
  async generateKPIsFromContext(context: OnboardingContext): Promise<KPISuggestion[]> {
    try {
      const { companyBasic, industryDetails } = context;

      // Build context description for AI
      const contextDescription = this.buildContextDescription(companyBasic, industryDetails);

      const prompt = `Generate 15-20 highly targeted KPI recommendations for this business:

${contextDescription}

Based on this business context, recommend KPIs that are:
1. Highly relevant to their specific business model and goals
2. Actionable and measurable weekly 
3. Aligned with their stated priorities and challenges
4. Appropriate for their company size and industry
5. Can provide meaningful insights for executive decision-making

For each KPI, provide:
- name: snake_case identifier 
- displayName: Human readable name (keep concise)
- description: Brief explanation focusing on business value
- category: One of: financial, operational, customer, marketing, hr, growth
- unit: Display unit (%, $, #, ratio, etc.)
- iconClass: FontAwesome class name (e.g., "fas fa-dollar-sign")
- colorClass: Tailwind color class (e.g., "text-green-600") 
- dataSource: "manual" for now (can be "api" later)
- priority: 1-20 ranking by importance for THIS specific business

Prioritize KPIs that directly relate to their top goals: ${industryDetails?.topGoals?.join(", ") || "business growth"}.

Respond with JSON in this format: { "kpis": [array of KPI objects] }`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content:
              "You are a senior business intelligence consultant specializing in KPI strategy for different business models. Focus on metrics that provide actionable insights for weekly executive summaries. Avoid vanity metrics - prioritize KPIs that directly impact business decisions.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        // Note: removed temperature parameter as gpt-5 only supports default value
      });

      const result = JSON.parse(response.choices[0].message.content || '{"kpis": []}');
      return result.kpis || [];
    } catch (error) {
      console.error("Error generating KPIs with enhanced context:", error);
      // Fallback to basic generation if enhanced fails
      return this.generateKPIsForIndustry(
        context.companyBasic.industry,
        context.companyBasic.naicsCode,
        context.companyBasic.name
      );
    }
  }

  // Legacy method maintained for backward compatibility
  async generateKPIsForIndustry(
    industry: string,
    naicsCode: string,
    companyName: string
  ): Promise<KPISuggestion[]> {
    try {
      const prompt = `Generate 15-20 industry-specific KPI recommendations for a ${industry} company (NAICS: ${naicsCode}) named "${companyName}". 

      For each KPI, provide:
      - name: snake_case identifier 
      - displayName: Human readable name
      - description: Brief explanation of what it measures
      - category: One of: financial, operational, customer, marketing, hr, growth
      - unit: Display unit (%, $, #, etc.)
      - iconClass: FontAwesome class name (e.g., "fas fa-dollar-sign")
      - colorClass: Tailwind color class (e.g., "text-green-600")
      - dataSource: "manual" for now (can be "api" later)
      - priority: 1-20 ranking by importance for this industry

      Focus on KPIs that are most relevant and actionable for ${industry} businesses. Include both financial and operational metrics.

      Respond with JSON in this format: { "kpis": [array of KPI objects] }`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are a business intelligence expert specializing in KPI selection for different industries. Generate practical, measurable KPIs that executives would find valuable for weekly SMS summaries.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        // Note: removed temperature parameter as gpt-5 only supports default value
      });

      const result = JSON.parse(response.choices[0].message.content || '{"kpis": []}');
      return result.kpis || [];
    } catch (error) {
      console.error("Error generating KPIs with OpenAI:", error);
      // Fallback to default KPIs if OpenAI fails
      return this.getDefaultKPIs();
    }
  }

  private getDefaultKPIs(): KPISuggestion[] {
    return [
      {
        name: "revenue",
        displayName: "Revenue",
        description: "Total revenue for the week",
        category: "financial",
        unit: "$",
        iconClass: "fas fa-dollar-sign",
        colorClass: "text-green-600",
        dataSource: "manual",
        priority: 1,
      },
      {
        name: "customer_acquisition_cost",
        displayName: "Customer Acquisition Cost",
        description: "Cost to acquire each new customer",
        category: "marketing",
        unit: "$",
        iconClass: "fas fa-user-plus",
        colorClass: "text-blue-600",
        dataSource: "manual",
        priority: 2,
      },
      {
        name: "churn_rate",
        displayName: "Churn Rate",
        description: "Percentage of customers lost",
        category: "customer",
        unit: "%",
        iconClass: "fas fa-user-minus",
        colorClass: "text-red-600",
        dataSource: "manual",
        priority: 3,
      },
      {
        name: "net_promoter_score",
        displayName: "NPS Score",
        description: "Customer satisfaction metric",
        category: "customer",
        unit: "",
        iconClass: "fas fa-thumbs-up",
        colorClass: "text-purple-600",
        dataSource: "manual",
        priority: 4,
      },
      {
        name: "cash_flow",
        displayName: "Cash Flow",
        description: "Current cash position",
        category: "financial",
        unit: "$",
        iconClass: "fas fa-university",
        colorClass: "text-indigo-600",
        dataSource: "manual",
        priority: 5,
      },
      {
        name: "gross_margin",
        displayName: "Gross Margin",
        description: "Profit margin percentage",
        category: "financial",
        unit: "%",
        iconClass: "fas fa-percentage",
        colorClass: "text-orange-600",
        dataSource: "manual",
        priority: 6,
      },
      {
        name: "sales_pipeline",
        displayName: "Sales Pipeline",
        description: "Total value of sales opportunities",
        category: "operational",
        unit: "$",
        iconClass: "fas fa-funnel-dollar",
        colorClass: "text-teal-600",
        dataSource: "manual",
        priority: 7,
      },
    ];
  }

  async analyzeKPIPerformance(
    kpiData: Array<{ name: string; value: string | number; changePercent?: number }>
  ): Promise<{ insights: string; recommendations: string[] }> {
    try {
      const prompt = `Analyze this KPI performance data and provide insights and recommendations:

      ${JSON.stringify(kpiData, null, 2)}

      Provide:
      1. insights: Brief analysis of trends and performance
      2. recommendations: Array of 3-5 actionable recommendations

      Respond with JSON in this format: { "insights": "...", "recommendations": ["...", "..."] }`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are a business analyst providing executive-level insights on KPI performance.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(
        response.choices[0].message.content || '{"insights": "", "recommendations": []}'
      );
      return result;
    } catch (error) {
      console.error("Error analyzing KPI performance:", error);
      return {
        insights: "Unable to analyze performance at this time.",
        recommendations: ["Continue monitoring key metrics", "Review data collection processes"],
      };
    }
  }

  // Helper method to build context description from business details
  private buildContextDescription(
    companyBasic: OnboardingContext["companyBasic"],
    industryDetails?: IndustryDetails
  ): string {
    let description = `Company: ${companyBasic.name}
Industry: ${companyBasic.industry} (NAICS: ${companyBasic.naicsCode})`;

    if (companyBasic.description) {
      description += `\nDescription: ${companyBasic.description}`;
    }

    if (industryDetails) {
      if (industryDetails.businessModel) {
        description += `\nBusiness Model: ${enumLabels.businessModel[industryDetails.businessModel] || industryDetails.businessModel}`;
      }

      if (industryDetails.companySize) {
        description += `\nCompany Size: ${enumLabels.companySize[industryDetails.companySize] || industryDetails.companySize}`;
      }

      if (industryDetails.revenueModel) {
        description += `\nRevenue Model: ${enumLabels.revenueModel[industryDetails.revenueModel] || industryDetails.revenueModel}`;
      }

      if (industryDetails.customerSegments?.length) {
        description += `\nCustomer Segments: ${industryDetails.customerSegments.join(", ")}`;
      }

      if (industryDetails.salesChannels?.length) {
        description += `\nSales Channels: ${industryDetails.salesChannels.join(", ")}`;
      }

      if (industryDetails.geography) {
        description += `\nGeographic Reach: ${enumLabels.geography[industryDetails.geography] || industryDetails.geography}`;
      }

      if (industryDetails.topGoals?.length) {
        description += `\nTop Business Goals: ${industryDetails.topGoals.join(", ")}`;
      }

      if (industryDetails.averageOrderValue) {
        description += `\nAverage Order Value: $${industryDetails.averageOrderValue}`;
      }

      if (industryDetails.grossMarginPct) {
        description += `\nGross Margin: ${industryDetails.grossMarginPct}%`;
      }

      if (industryDetails.salesCycleDays) {
        description += `\nSales Cycle: ${industryDetails.salesCycleDays} days`;
      }

      if (industryDetails.dataAvailability?.length) {
        description += `\nAvailable Data Sources: ${industryDetails.dataAvailability.join(", ")}`;
      }
    }

    return description;
  }

  // AI Setup Agent conversation handler
  async handleSetupConversation(
    userMessage: string,
    conversationState: {
      step: string;
      collectedData: Record<string, unknown>;
    },
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<{
    message: string;
    suggestions?: string[];
    actions?: Array<{
      type: string;
      label: string;
      data?: Record<string, unknown>;
      completed?: boolean;
    }>;
    newState: { step: string; collectedData: Record<string, unknown> };
    setupComplete?: boolean;
    configData?: Record<string, unknown>;
  }> {
    try {
      const systemPrompt = `You are a friendly and helpful KPIFlow setup assistant. Your job is to guide users through setting up their business KPI tracking system through natural conversation.

Current setup step: ${conversationState.step}
Data collected so far: ${JSON.stringify(conversationState.collectedData)}

CONVERSATION FLOW:
1. business_info: Get company name, then ask about their industry/business type
2. industry_details: Understand their business model (B2B/B2C, team size, main goals)
3. goals: Ask about their top 2-3 business priorities they want to track
4. kpi_generation: Generate and present KPI recommendations based on collected info
5. kpi_selection: Let them confirm which KPIs to track (suggest 5-7 most relevant)
6. recipients: Ask who should receive weekly SMS summaries (name and phone)
7. schedule: Confirm SMS delivery day/time (default Friday 9am)
8. complete: Summarize setup and congratulate them

RULES:
- Be conversational and friendly, not robotic
- Ask ONE question at a time
- Keep responses concise (2-3 sentences max)
- Extract information from natural responses (e.g., "I run a pizza restaurant" → industry: Food Service)
- Provide helpful suggestions as clickable options when appropriate
- When generating KPIs, recommend 5-7 most relevant ones with brief descriptions
- Always respond in JSON format

RESPONSE FORMAT:
{
  "message": "Your conversational response",
  "suggestions": ["Option 1", "Option 2"] (optional clickable suggestions),
  "extractedData": { key-value pairs of info extracted from user message },
  "nextStep": "next step name or same step if more info needed",
  "readyToComplete": true/false (only true at the very end),
  "recommendedKpis": [{"name": "...", "description": "..."}] (only in kpi_generation step)
}`;

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: userMessage },
      ];

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-5",
        messages,
        response_format: { type: "json_object" },
      });

      let result;
      try {
        result = JSON.parse(response.choices[0].message.content || "{}");
      } catch {
        // If JSON parsing fails, extract message and continue
        result = {
          message:
            response.choices[0].message.content || "I'm processing that. Could you tell me more?",
          nextStep: conversationState.step,
        };
      }

      // Validate and provide safe defaults for required fields
      const safeMessage =
        typeof result.message === "string" ? result.message : "Could you tell me more about that?";
      const safeNextStep =
        typeof result.nextStep === "string" ? result.nextStep : conversationState.step;
      const safeSuggestions = Array.isArray(result.suggestions) ? result.suggestions : undefined;
      const safeExtractedData =
        result.extractedData && typeof result.extractedData === "object"
          ? result.extractedData
          : {};

      // Update collected data with extracted info
      const newCollectedData = {
        ...conversationState.collectedData,
        ...safeExtractedData,
      };

      // If KPIs were recommended, store them and surface as clickable suggestions
      let finalSuggestions = safeSuggestions;
      if (Array.isArray(result.recommendedKpis) && result.recommendedKpis.length > 0) {
        newCollectedData.recommendedKpis = result.recommendedKpis;
        // Show each KPI name as a clickable button, then "Select all" / "I'll choose manually"
        const kpiNames = result.recommendedKpis
          .filter((k: Record<string, unknown>) => typeof k.name === "string" && k.name)
          .map((k: Record<string, unknown>) => k.name as string);
        finalSuggestions = [...kpiNames, "Select all", "I'll choose manually"];
      }

      const newState = {
        step: safeNextStep,
        collectedData: newCollectedData,
      };

      // Build actions list for visual feedback
      const actions: Array<{ type: string; label: string; completed?: boolean }> = [];
      if (newCollectedData.companyName) {
        actions.push({
          type: "create_company",
          label: `Company: ${newCollectedData.companyName}`,
          completed: true,
        });
      }
      if (newCollectedData.industry) {
        actions.push({
          type: "set_industry",
          label: `Industry: ${newCollectedData.industry}`,
          completed: true,
        });
      }
      if (
        Array.isArray(newCollectedData.selectedKpis) &&
        newCollectedData.selectedKpis.length > 0
      ) {
        actions.push({
          type: "create_kpis",
          label: `${newCollectedData.selectedKpis.length} KPIs configured`,
          completed: true,
        });
      }

      return {
        message: safeMessage,
        suggestions: finalSuggestions,
        actions: actions.length > 0 ? actions : undefined,
        newState,
        setupComplete: result.readyToComplete === true,
        configData: result.readyToComplete ? newCollectedData : undefined,
      };
    } catch (error) {
      console.error("Error in setup conversation:", error);
      return {
        message: "I had a small hiccup. Could you repeat that?",
        newState: conversationState,
      };
    }
  }
}

export const openaiService = new OpenAIService();
