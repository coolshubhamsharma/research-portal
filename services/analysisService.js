const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "X-Title": "Research Tool"
  }
});

async function analyzeTranscriptText(text) {
  try {
    const trimmedText = text.substring(0, 15000);

    const response = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `
You are a financial research extraction engine.

Analyze this earnings call transcript and return ONLY valid JSON.

Rules:
- Use only information present.
- Do NOT hallucinate.
- If not mentioned → "Not mentioned".
- Include supporting quotes.
- Return ONLY valid JSON.

Return:

{
  "management_tone": "",
  "confidence_level": "",
  "key_positives": [],
  "key_concerns": [],
  "forward_guidance": {
    "revenue_outlook": "",
    "margin_outlook": "",
    "capex_outlook": ""
  },
  "capacity_utilization_trend": "",
  "growth_initiatives": [],
  "supporting_quotes": [],
  "analysis_confidence_percent": 0
}

Transcript:
${trimmedText}
`
        }
      ]
    });

    const rawOutput = response.choices?.[0]?.message?.content;

    if (!rawOutput) {
      throw new Error("Invalid LLM response structure");
    }

    const cleanedOutput = rawOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleanedOutput);

  } catch (error) {
    console.error("LLM Error:", error);
    return { error: "LLM processing failed" };
  }
}

module.exports = { analyzeTranscriptText };
