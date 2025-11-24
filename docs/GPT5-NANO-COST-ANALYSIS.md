# GPT-5-Nano Cost Analysis for Parency Lawyer App

## 📊 Model Specifications

**Model:** `gpt-5-nano`
**Released:** August 2025
**Pricing:**
- **Input tokens:** $0.05 per 1M tokens
- **Output tokens:** $0.40 per 1M tokens
- **Context window:** 400,000 tokens
- **Cache discount:** 90% off cached tokens

---

## 💰 Cost Breakdown by Operation

### 1. Document Classification

**Use Case:** Classify a single document into category + subtype + metadata extraction

**Typical Token Usage:**
- **System prompt:** ~800 tokens (classification instructions, category taxonomy)
- **Document content:** ~2,000 tokens (average PDF converted to text)
- **Classification output:** ~150 tokens (JSON response with category, subtype, confidence, metadata)

**Total per classification:**
- Input: 2,800 tokens
- Output: 150 tokens

**Cost per classification:**
```
Input:  2,800 tokens × $0.05 / 1M = $0.00014
Output:   150 tokens × $0.40 / 1M = $0.00006
-------------------------------------------------
Total per document:                  $0.00020
```

**With 90% cache discount on system prompt (800 tokens cached):**
```
Cached input:  800 tokens × $0.05 / 1M × 0.1 = $0.000004
New input:   2,000 tokens × $0.05 / 1M       = $0.000100
Output:        150 tokens × $0.40 / 1M       = $0.000060
-------------------------------------------------
Total with caching:                          $0.000164 (~$0.0002/doc)
```

---

### 2. Discovery Request Mapping

**Use Case:** Match documents to a specific RFP or Interrogatory

**Typical Token Usage:**
- **System prompt:** ~600 tokens (matching instructions)
- **Discovery request text:** ~300 tokens (full RFP text)
- **Document summaries:** ~1,500 tokens (10 candidate documents × 150 tokens each)
- **Mapping output:** ~400 tokens (JSON array with matches, confidence, reasoning)

**Total per mapping operation:**
- Input: 2,400 tokens
- Output: 400 tokens

**Cost per mapping:**
```
Input:  2,400 tokens × $0.05 / 1M = $0.00012
Output:   400 tokens × $0.40 / 1M = $0.00016
-------------------------------------------------
Total per mapping:                   $0.00028
```

**With caching (system prompt cached):**
```
Cached input:  600 tokens × $0.05 / 1M × 0.1 = $0.000003
New input:   1,800 tokens × $0.05 / 1M       = $0.000090
Output:        400 tokens × $0.40 / 1M       = $0.000160
-------------------------------------------------
Total with caching:                          $0.000253 (~$0.00025/mapping)
```

---

### 3. Missing Document Detection

**Use Case:** Analyze date coverage for financial records

**Typical Token Usage:**
- **System prompt:** ~500 tokens (gap detection instructions)
- **Document metadata:** ~800 tokens (30 statements × ~25 tokens metadata each)
- **Gap analysis output:** ~300 tokens (missing months, recommendations)

**Total per analysis:**
- Input: 1,300 tokens
- Output: 300 tokens

**Cost per analysis:**
```
Input:  1,300 tokens × $0.05 / 1M = $0.000065
Output:   300 tokens × $0.40 / 1M = $0.000120
-------------------------------------------------
Total per analysis:                  $0.000185 (~$0.0002/analysis)
```

**With caching:**
```
Cached input:  500 tokens × $0.05 / 1M × 0.1 = $0.0000025
New input:     800 tokens × $0.05 / 1M       = $0.0000400
Output:        300 tokens × $0.40 / 1M       = $0.0001200
-------------------------------------------------
Total with caching:                          $0.0001625 (~$0.00016/analysis)
```

---

## 📈 Monthly Cost Projections

### Solo Attorney Plan (500 docs/month)

**Operations:**
- 500 document classifications
- 100 discovery mappings (average 5 RFPs × 20 docs each)
- 20 gap analyses (2-3 per case for financial docs)

**Monthly AI Costs:**
```
Classifications:   500 × $0.0002  = $0.10
Mappings:          100 × $0.00025 = $0.025
Gap analyses:       20 × $0.00016 = $0.0032
-------------------------------------------------
Total AI cost per month:            $0.1282 (~$0.13/month)
```

**Cost per document processed:** $0.13 / 500 = **$0.00026/document**

**Revenue vs AI Cost:**
- Monthly subscription: $99
- AI cost: $0.13
- **AI cost is 0.13% of revenue** ✅

---

### Small Firm Plan (2,500 docs/month)

**Operations:**
- 2,500 document classifications
- 500 discovery mappings
- 100 gap analyses

**Monthly AI Costs:**
```
Classifications: 2,500 × $0.0002  = $0.50
Mappings:          500 × $0.00025 = $0.125
Gap analyses:      100 × $0.00016 = $0.016
-------------------------------------------------
Total AI cost per month:            $0.641 (~$0.64/month)
```

**Cost per document processed:** $0.64 / 2,500 = **$0.000256/document**

**Revenue vs AI Cost:**
- Monthly subscription: $299
- AI cost: $0.64
- **AI cost is 0.21% of revenue** ✅

---

### Enterprise Plan (10,000 docs/month estimate)

**Operations:**
- 10,000 document classifications
- 2,000 discovery mappings
- 400 gap analyses

**Monthly AI Costs:**
```
Classifications: 10,000 × $0.0002  = $2.00
Mappings:         2,000 × $0.00025 = $0.50
Gap analyses:       400 × $0.00016 = $0.064
-------------------------------------------------
Total AI cost per month:            $2.564 (~$2.56/month)
```

**Cost per document processed:** $2.56 / 10,000 = **$0.000256/document**

**Revenue vs AI Cost (assuming $999/month):**
- Monthly subscription: $999
- AI cost: $2.56
- **AI cost is 0.26% of revenue** ✅

---

## 🚀 Scaling Analysis

### At 1,000 Customers

**Mix:**
- 700 Solo plans (700 × 500 docs = 350,000 docs/month)
- 250 Small Firm plans (250 × 2,500 docs = 625,000 docs/month)
- 50 Enterprise plans (50 × 10,000 docs = 500,000 docs/month)

**Total documents:** 1,475,000 docs/month

**Total AI Cost:**
```
Solo plans:      700 × $0.13   = $91
Small Firm:      250 × $0.64   = $160
Enterprise:       50 × $2.56   = $128
-------------------------------------------------
Total AI cost:                   $379/month
```

**Total Revenue:**
```
Solo plans:      700 × $99  = $69,300
Small Firm:      250 × $299 = $74,750
Enterprise:       50 × $999 = $49,950
-------------------------------------------------
Total revenue:                $194,000/month
```

**AI cost as % of revenue:** $379 / $194,000 = **0.20%** ✅

---

## 💡 Cost Optimization Strategies

### 1. Prompt Caching (Already Included)
- **Strategy:** Cache system prompts for classification, mapping, gap detection
- **Savings:** 90% discount on cached tokens
- **Implementation:** OpenAI automatically caches identical prompts
- **Impact:** Already factored into above calculations

### 2. Batch Processing
- **Strategy:** Process multiple documents in a single API call
- **Savings:** Reduce per-request overhead
- **Implementation:** Queue up 5-10 documents, send as batch
- **Estimated savings:** Additional 10-15%

### 3. Smart Re-classification
- **Strategy:** Only re-run AI on documents that fail initial classification
- **Savings:** Avoid double-processing
- **Implementation:** Track classification status, skip if already high-confidence
- **Estimated savings:** 5-10%

### 4. Tiered Classification
- **Strategy:** Use GPT-5-nano for initial classification, only escalate complex docs to GPT-5-mini
- **Savings:** Balance speed/cost/accuracy
- **Implementation:** If GPT-5-nano confidence <70%, retry with GPT-5-mini
- **Estimated savings:** Minimal extra cost, but better accuracy

### 5. Client-Side OCR
- **Strategy:** Use Tesseract.js (client-side) for basic OCR before sending to API
- **Savings:** Reduce token usage on scanned documents
- **Implementation:** Pre-process scanned PDFs
- **Estimated savings:** 20-30% on scanned docs

---

## 📊 Comparison to Alternatives

### GPT-4o-mini (Previous Generation)
**Pricing:** $0.15/1M input, $0.60/1M output

**Cost per document classification:**
```
Input:  2,800 tokens × $0.15 / 1M = $0.00042
Output:   150 tokens × $0.60 / 1M = $0.00009
-------------------------------------------------
Total:                              $0.00051
```

**GPT-5-nano is 61% cheaper than GPT-4o-mini** ✅

### GPT-5-mini
**Pricing:** $0.25/1M input, $2.00/1M output

**Cost per document classification:**
```
Input:  2,800 tokens × $0.25 / 1M = $0.00070
Input:  2,800 tokens × $0.25 / 1M = $0.00070
Output:   150 tokens × $2.00 / 1M = $0.00030
-------------------------------------------------
Total:                              $0.00100
```

**GPT-5-nano is 80% cheaper than GPT-5-mini** ✅

---

## 🎯 Break-Even Analysis

**When does AI cost become significant?**

Assuming **$0.0002/document** with caching:

| Monthly Docs | AI Cost | Solo Plan Revenue ($99) | % of Revenue |
|--------------|---------|-------------------------|--------------|
| 500          | $0.10   | $99                     | 0.10%        |
| 1,000        | $0.20   | $99                     | 0.20%        |
| 5,000        | $1.00   | $99                     | 1.01%        |
| 10,000       | $2.00   | $99                     | 2.02%        |
| 50,000       | $10.00  | $99                     | 10.10% ⚠️   |

**Conclusion:** AI costs remain negligible (<2%) up to 10,000 docs/month per customer, which is **20x the Solo plan limit**.

---

## 🔒 Cost Control Measures

### 1. Hard Limits by Plan
```typescript
const PLAN_LIMITS = {
  solo: { monthly_docs: 500 },
  small_firm: { monthly_docs: 2500 },
  enterprise: { monthly_docs: 100000 }
};
```

### 2. Overage Pricing
- Solo plan: $0.10/document over 500/month
- Small Firm: $0.08/document over 2,500/month
- Enterprise: Custom pricing

**Example:** Solo attorney processes 600 docs
- Base: $99
- Overage: 100 × $0.10 = $10
- Total: $109
- AI cost: 600 × $0.0002 = $0.12
- Margin: $10 - $0.12 = **$9.88 profit on overage** ✅

### 3. Rate Limiting
- Max 100 documents/hour per user
- Prevents accidental bulk processing
- Protects against abuse

### 4. Monthly Usage Dashboard
- Show customers their usage
- Send alerts at 80% and 100% of limit
- Encourage upgrade before hitting limit

---

## 📈 ROI Summary

**AI cost per customer is negligible:**
- Solo: $0.13/month (0.13% of revenue)
- Small Firm: $0.64/month (0.21% of revenue)
- Enterprise: $2.56/month (0.26% of revenue at $999/month)

**Main costs are:**
1. **Infrastructure:** Vercel hosting, Supabase database ($200-500/month at scale)
2. **Support:** Customer service, onboarding ($2,000+/month with staff)
3. **Development:** Engineering time (upfront + ongoing)

**AI is the cheapest part of the stack** ✅

---

## 🚀 Action Items

1. ✅ **Implement prompt caching** (built into OpenAI API)
2. ✅ **Set hard limits** per pricing tier
3. ✅ **Track token usage** in Supabase for billing
4. ✅ **Monitor costs** with OpenAI usage dashboard
5. ✅ **Set up alerts** when costs spike unexpectedly
6. ⏳ **Implement batch processing** (Phase 3 optimization)
7. ⏳ **Add client-side OCR** (Phase 3 optimization)

---

**Last Updated:** November 2025
**Model:** GPT-5-nano
**Status:** Cost-effective for all pricing tiers ✅
