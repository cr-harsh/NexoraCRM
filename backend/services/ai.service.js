import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../utils/ApiError.js";

let client = null;

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      503,
      "Gemini API key is not configured. Add GEMINI_API_KEY to the backend .env file."
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
};

const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const isAIConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const generateJSON = async (prompt, schema) => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: MODEL(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.6,
      },
    });
    return JSON.parse(response.text);
  } catch (err) {
    console.error("Gemini JSON error:", err?.message || err);
    throw new ApiError(502, "AI request failed. Please try again in a moment.");
  }
};

const generateText = async (prompt, temperature = 0.7) => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: MODEL(),
      contents: prompt,
      config: { temperature },
    });
    return response.text.trim();
  } catch (err) {
    console.error("Gemini text error:", err?.message || err);
    throw new ApiError(502, "AI request failed. Please try again in a moment.");
  }
};

export const generateLeadSummary = async (lead) => {
  const prompt = `You are an expert B2B sales analyst for a CRM called TTP CRM. Analyse the following sales lead and produce a concise assessment.

Lead details:
- Name: ${lead.name || "N/A"}
- Company: ${lead.company || "N/A"}
- Email: ${lead.email || "N/A"}
- Current pipeline stage: ${lead.status || "New"}
- Potential deal value: $${lead.value || 0}
- Source: ${lead.source || "Unknown"}
- Notes: ${lead.notes || "None"}

Return JSON only.`;

  const schema = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "2-3 sentence executive summary of the lead",
      },
      riskScore: {
        type: "integer",
        description: "Risk of losing this deal, 0 (safe) to 100 (high risk)",
      },
      suggestedPriority: {
        type: "string",
        enum: ["Low", "Medium", "High"],
      },
      nextBestAction: {
        type: "string",
        description: "One concrete recommended next step",
      },
    },
    required: ["summary", "riskScore", "suggestedPriority", "nextBestAction"],
  };

  return generateJSON(prompt, schema);
};

export const generateEmail = async ({ lead, purpose, tone }) => {
  const prompt = `You are a professional B2B sales development representative.
Draft a personalized email to the following lead.

Lead details:
- Name: ${lead?.name || "N/A"}
- Company: ${lead?.company || "N/A"}
- Email: ${lead?.email || "N/A"}
- Pipeline Stage: ${lead?.status || "New"}
- Deal Value: $${lead?.value || 0}
- Notes: ${lead?.notes || "None"}

Email parameters:
- Purpose: ${purpose || "Follow-up"}
- Tone: ${tone || "Friendly & professional"}

Return JSON only with:
- subject: A clear, engaging subject line
- body: Well-structured email body with greeting, tailored message, value proposition, call to action, and sign-off placeholder.`;

  const schema = {
    type: "object",
    properties: {
      subject: {
        type: "string",
        description: "Email subject line",
      },
      body: {
        type: "string",
        description: "Full body text of the email",
      },
    },
    required: ["subject", "body"],
  };

  return generateJSON(prompt, schema);
};


export const generateSalesInsights = async (pipelineStats) => {
  const prompt = `You are a revenue-operations advisor. Given this snapshot of a sales pipeline, identify what is working, what is at risk, and concrete actions to improve conversion.

Pipeline snapshot (JSON):
${JSON.stringify(pipelineStats, null, 2)}

Return JSON only.`;

  const schema = {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "One-sentence summary of pipeline health",
      },
      insights: {
        type: "array",
        description: "3-5 specific, data-driven observations",
        items: { type: "string" },
      },
      recommendations: {
        type: "array",
        description: "3-5 prioritized, actionable recommendations",
        items: { type: "string" },
      },
      healthScore: {
        type: "integer",
        description: "Overall pipeline health, 0-100",
      },
    },
    required: ["headline", "insights", "recommendations", "healthScore"],
  };

  return generateJSON(prompt, schema);
};

export {generateText};