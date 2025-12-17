import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { extractTextFromPDF } from "@/lib/ai/classification";

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
 * Uses the same robust extraction as document classification (with OCR fallback)
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

    // Use the robust extraction from classification system (includes OCR fallback)
    console.log(`[RFP Parse] Extracting text from PDF: ${file.name}`);
    let extractedResult = await extractTextFromPDF(buffer);
    let pdfText = extractedResult.text;
    let usedOcr = false;

    // If low word count, try OCR for scanned PDFs
    if (extractedResult.wordCount < 100) {
      console.log(`[RFP Parse] Low word count (${extractedResult.wordCount}), attempting OCR...`);
      try {
        const { ocrPDF, isProbablyScanned } = await import("@/lib/ai/ocr");

        if (isProbablyScanned(pdfText.length, buffer.length, extractedResult.pages)) {
          const ocrResult = await ocrPDF(buffer);
          if (ocrResult.text.length > pdfText.length) {
            console.log(`[RFP Parse] OCR extracted ${ocrResult.text.length} chars (was ${pdfText.length})`);
            pdfText = ocrResult.text;
            usedOcr = true;
          }
        }
      } catch (ocrError) {
        console.error("[RFP Parse] OCR fallback failed:", ocrError);
      }
    }

    // Final check for text content
    const wordCount = pdfText.split(/\s+/).filter(w => w.length > 0).length;
    if (!pdfText || wordCount < 20) {
      return NextResponse.json(
        {
          error: "Could not extract readable text from PDF. The document may be an image-only scan or protected. Please try a different file or paste the text directly.",
          details: { wordCount, usedOcr, pages: extractedResult.pages }
        },
        { status: 400 }
      );
    }

    console.log(`[RFP Parse] Successfully extracted ${wordCount} words from ${extractedResult.pages} pages${usedOcr ? ' (via OCR)' : ''}`)

    // Use OpenAI to parse the text and extract individual requests
    const systemPrompt = `You are a legal document parser specialized in family law discovery requests.

Your task is to extract individual RFP (Request for Production) and Interrogatory items from the provided text.

For each request found, provide:
1. type: Either "RFP" or "Interrogatory" (also recognize "Request for Production", "RFPD", "ROG" for interrogatories)
2. number: The request number (e.g., 1, 2, 3)
3. text: The COMPLETE and FULL text of the request - include all details, sub-parts, and conditions
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
- Look for patterns like "RFP 1:", "Request for Production No. 1:", "Interrogatory 1:", "Interrogatory No. 1:", "RFPD No.", "ROG No.", etc.
- PRESERVE THE COMPLETE TEXT of each request - do not truncate or summarize
- Clean up OCR artifacts (fix obvious typos like "docurnents" → "documents")
- If a request has multiple sub-parts (a, b, c), include ALL sub-parts in the text
- If a request references definitions from earlier in the document, note it but still extract the full request
- Extract requests even if they appear malformed - capture what you can
- Return ONLY valid JSON, no markdown or explanations`;

    // Send more text to GPT-4 for better context (up to ~30k chars)
    const textToAnalyze = pdfText.slice(0, 30000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract all RFP and Interrogatory requests from this document:\n\n${textToAnalyze}` },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 4096,
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

    // Add extraction metadata for debugging and transparency
    parsed.metadata.totalExtracted = parsed.requests.length;
    parsed.metadata.extraction = {
      wordCount,
      pages: extractedResult.pages,
      usedOcr,
      fileName: file.name,
    };

    console.log(`[RFP Parse] Successfully parsed ${parsed.requests.length} requests from ${file.name}`);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
