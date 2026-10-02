const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const generateMeetingInsights = async (transcript) => {
  if (!transcript || !transcript.trim()) {
    throw new Error("Transcript is empty");
  }

  const prompt = `
You are an AI meeting assistant for IntellMeet.

Analyze the following meeting transcript.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{
  "summary": "A concise summary of the meeting",
  "keyPoints": [],
  "decisions": [],
  "actionItems": [
    {
      "task": "Task that needs to be completed",
      "assignee": "Person responsible, or Unassigned",
      "priority": "high | medium | low"
    }
  ]
}

Rules:
- Do not invent information.
- Only use information explicitly supported by the transcript.
- If there are no decisions, return an empty array.
- If there are no action items, return an empty array.
- If the responsible person is unclear, use "Unassigned".
- Keep the summary concise.
- Extract concrete action items.

MEETING TRANSCRIPT:

${transcript}
`;

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `Gemini request attempt ${attempt}/${maxAttempts}`
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;

      if (!text) {
        throw new Error("Gemini returned an empty response");
      }

      return JSON.parse(text);
    } catch (error) {
      console.error(
        `Gemini attempt ${attempt} failed:`,
        error.message
      );

      const status = error.status || error.code;

      if (
        status !== 503 ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      const delay = attempt * 3000;

      console.log(
        `Gemini temporarily unavailable. Retrying in ${delay / 1000} seconds...`
      );

      await sleep(delay);
    }
  }
};

module.exports = {
  generateMeetingInsights,
};