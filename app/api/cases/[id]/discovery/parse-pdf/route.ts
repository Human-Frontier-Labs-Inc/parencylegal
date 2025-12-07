import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ParsedRequest {
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  suggestedCategory: string | null;
  confidence: number;
}

/**
 * POST /api/cases/[id]/discovery/parse-pdf
 * Parse a PDF file to extract RFP/Interrogatory requests
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

    // Get the form data with the PDF file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF using unpdf
    let pdfText = "";
    try {
      const { extractText } = await import("unpdf");
      const result = await extractText(buffer);
      pdfText = result.text;
    } catch (pdfError: any) {
      console.error("PDF parsing error:", pdfError);
      return NextResponse.json(
        { error: "Failed to extract text from PDF. Please ensure the PDF contains readable text." },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF appears to be empty or contains only images. Please ensure the PDF has readable text." },
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
    "documentTitle": "Requests for Production - Smith v. Smith",
    "parseConfidence": 90
  }
}

Important:
- Look for patterns like "RFP 1:", "Request for Production No. 1:", "Interrogatory 1:", "Interrogatory No. 1:", etc.
- Clean up the request text (remove extra whitespace, fix OCR errors if obvious)
- If a request references a previous one (e.g., "See RFP 1"), still include it as a separate item
- Return ONLY valid JSON, no markdown or explanations`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract all RFP and Interrogatory requests from this document:\n\n${pdfText.slice(0, 15000)}` },
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
    console.error("Error parsing PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
