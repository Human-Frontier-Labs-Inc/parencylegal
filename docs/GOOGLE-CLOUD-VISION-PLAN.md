# Google Cloud Vision OCR Implementation Plan

## Overview
Implement Google Cloud Vision API for OCR on scanned PDFs to extract text from documents like bank statements that contain images/scans rather than searchable text.

## Pricing
- **First 1,000 pages/month**: FREE
- **1,001 - 5,000,000 pages/month**: $1.50 per 1,000 pages ($0.0015/page)
- **5,000,001+ pages/month**: $0.60 per 1,000 pages

## Implementation Steps

### Step 1: Google Cloud Setup (User Action Required)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Cloud Vision API**:
   - Go to APIs & Services > Library
   - Search for "Cloud Vision API"
   - Click Enable
4. Create a Service Account:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "Service Account"
   - Name it (e.g., "parency-vision-ocr")
   - Grant role: "Cloud Vision API User"
   - Click "Done"
5. Generate JSON Key:
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key" > JSON
   - Download the JSON file
6. Add to Vercel:
   - Go to Vercel project settings > Environment Variables
   - Add `GOOGLE_CLOUD_CREDENTIALS` with the JSON content (as a single line)
   - Or add `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the full JSON

### Step 2: Install Dependencies
```bash
npm install @google-cloud/vision
```

### Step 3: Create Vision Service (`lib/ai/google-vision.ts`)
- Initialize Vision client with credentials from env
- Implement `ocrPdfWithVision(pdfBuffer)` function
- Handle multi-page PDFs (Vision API supports up to 2000 pages)
- Return extracted text with confidence scores

### Step 4: Update OCR Module (`lib/ai/ocr.ts`)
- Import Google Vision service
- Update `ocrPDF()` to use Vision API when credentials available
- Fall back gracefully if credentials not configured

### Step 5: Update Classification Pipeline
- No changes needed - already calls `ocrPDF()` for scanned docs

## Architecture

```
Document Upload
      │
      ▼
┌─────────────────┐
│ Text Extraction │ ◄── unpdf (for text-based PDFs)
│    (unpdf)      │
└────────┬────────┘
         │
         ▼
    Is Scanned?
    (< 100 words)
         │
    YES  │  NO
         │   └──► Use extracted text
         ▼
┌─────────────────┐
│  Google Vision  │ ◄── Cloud Vision API
│      OCR        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Classification │ ◄── GPT-4o-mini
│   & Embedding   │
└─────────────────┘
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLOUD_CREDENTIALS` | Service account JSON (base64 encoded or raw) |
| `GOOGLE_CLOUD_PROJECT_ID` | Optional - extracted from credentials if not set |

## Error Handling
- If Vision API credentials not configured: fall back to filename classification
- If Vision API fails: log error, continue with empty text
- Rate limiting: Vision API has generous limits (1800 requests/min)

## Cost Controls
- Only use Vision API for documents detected as "scanned"
- Track usage in logs for monitoring
- Consider adding monthly budget alerts in Google Cloud

## Testing
1. Upload a scanned PDF (bank statement)
2. Click "Reprocess" button
3. Verify logs show Vision API being used
4. Check that extracted text appears in document metadata
5. Test chat queries about the document content

## Timeline
- Step 1 (User setup): 10-15 minutes
- Steps 2-5 (Code implementation): Ready to implement now
