import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/cases/[id]/discovery/parse-text
 * Parse pasted text to extract RFP/Interrogatory requests
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (text.trim().length < 10) {
      return NextResponse.json(
        { error: "Text is too short. Please provide the full request text." },
        { status: 400 }
      );
    }

    // Use OpenAI to parse the text and extract individual requests
    const systemPrompt = `You are a legal document parser specialized in family law discovery requests.

Your task is to extract individual RFP (Request for Production) and Interrogatory items from the provided text.

For each request found, provide:
1. type: Either "RFP" or "Interrogatory"
2. number: The request number (e.g., 1, 2, 3)
3. text: The full text of the request
4. suggestedCategory: One of: "Financial", "Medical", "Legal", "Communications", "Property", "Employment", "Personal", "Parenting", or null if unclear
5. confidence: A score from 0-100 indicating how confident you are this is a valid request

Return the results as a JSON object with this structure:
{
  "requests": [
    {
      "type": "RFP",
      "number": 1,
      "text": "All bank statements from January 2023 to present",
      "suggestedCategory": "Financial",
      "confidence": 95
    }
  ],
  "metadata": {
    "totalExtracted": 5,
    "documentTitle": null,
    "parseConfidence": 90
  }
}

Important:
- Look for patterns like "RFP 1:", "Request for Production No. 1:", "Interrogatory 1:", "Interrogatory No. 1:", etc.
- If no clear numbering, infer from line breaks or bullet points
- Clean up the request text (remove extra whitespace)
- If the text appears to be a single request without numbering, treat it as request #1
- Return ONLY valid JSON, no markdown or explanations`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract all RFP and Interrogatory requests from this text:\n\n${text.slice(0, 10000)}` },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      throw new Error("Failed to parse AI response");
    }

    // Validate the response structure
    if (!parsed.requests || !Array.isArray(parsed.requests)) {
      parsed.requests = [];
    }

    if (!parsed.metadata) {
      parsed.metadata = {
        totalExtracted: parsed.requests.length,
        parseConfidence: 70,
      };
    }

    // Ensure all requests have required fields
    parsed.requests = parsed.requests.map((req: any, index: number) => ({
      type: req.type === "Interrogatory" ? "Interrogatory" : "RFP",
      number: req.number || index + 1,
      text: req.text || "",
      suggestedCategory: req.suggestedCategory || null,
      confidence: req.confidence || 70,
    }));

    parsed.metadata.totalExtracted = parsed.requests.length;

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error parsing text:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse text" },
      { status: 500 }
    );
  }
}
