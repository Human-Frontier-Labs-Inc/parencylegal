# OpenAI API Model Pricing Guide
**Last Updated: November 28, 2025**

This document provides a comprehensive overview of OpenAI's API pricing for use in the Parency Legal application.

---

## Quick Recommendation for Parency Legal

| Use Case | Recommended Model | Cost (per 1M tokens) | Why |
|----------|-------------------|----------------------|-----|
| **Chat/Legal Assistant** | `gpt-5-mini` | $0.25 in / $2.00 out | Best balance of quality and cost for conversations |
| **Classification** | `gpt-5-nano` | $0.05 in / $0.40 out | Fast, cheap, great for categorization |
| **Embeddings** | `text-embedding-3-small` | $0.02 in | 90% cheaper than large, sufficient for RAG |

**Estimated monthly cost for typical usage (100 cases, 1000 docs):** ~$5-15/month

---

## GPT-5 Family (Released August 2025)

The GPT-5 family offers **30-40% cost savings** over GPT-4o while outperforming it in reasoning, code generation, and multimodal tasks.

### GPT-5 Pro (`gpt-5-pro`)
| Metric | Value |
|--------|-------|
| Input | $15.00 / 1M tokens |
| Output | $120.00 / 1M tokens |
| Context Window | 400K tokens |
| Best For | Complex reasoning, premium applications |

### GPT-5.1 (`gpt-5.1`)
| Metric | Value |
|--------|-------|
| Input | $1.25 / 1M tokens |
| Output | $10.00 / 1M tokens |
| Context Window | 400K tokens |
| Best For | Coding, agentic tasks |

### GPT-5 (`gpt-5`)
| Metric | Value |
|--------|-------|
| Input | $1.25 / 1M tokens |
| Output | $10.00 / 1M tokens |
| Context Window | 400K tokens |
| Best For | Production applications |

### GPT-5 Mini (`gpt-5-mini`) ⭐ RECOMMENDED FOR CHAT
| Metric | Value |
|--------|-------|
| Input | $0.25 / 1M tokens |
| Output | $2.00 / 1M tokens |
| Context Window | 400K tokens |
| Best For | **Legal assistant chat**, balanced performance |

### GPT-5 Nano (`gpt-5-nano`) ⭐ RECOMMENDED FOR CLASSIFICATION
| Metric | Value |
|--------|-------|
| Input | $0.05 / 1M tokens |
| Output | $0.40 / 1M tokens |
| Context Window | 400K tokens |
| Best For | **Document classification**, cost-sensitive apps |

---

## GPT-4 Family (Legacy)

### GPT-4o (`gpt-4o`)
| Metric | Value |
|--------|-------|
| Input | $2.50 / 1M tokens (cached: $1.25) |
| Output | $10.00 / 1M tokens |
| Context Window | 128K tokens |
| Best For | Legacy applications |

### GPT-4o Mini (`gpt-4o-mini`)
| Metric | Value |
|--------|-------|
| Input | $0.15 / 1M tokens |
| Output | $0.60 / 1M tokens |
| Context Window | 128K tokens |
| Best For | Budget-conscious apps (but GPT-5 nano is better value) |

### GPT-4.1 (`gpt-4.1`)
| Metric | Value |
|--------|-------|
| Input | $2.00 / 1M tokens |
| Output | $8.00 / 1M tokens |
| Context Window | 128K tokens |

### GPT-4.1 Mini (`gpt-4.1-mini`)
| Metric | Value |
|--------|-------|
| Input | $0.40 / 1M tokens |
| Output | $1.60 / 1M tokens |
| Context Window | 128K tokens |

---

## Reasoning Models (o-series)

### o1 (`o1`)
| Metric | Value |
|--------|-------|
| Input | $15.00 / 1M tokens |
| Output | $60.00 / 1M tokens |
| Best For | Complex multi-step reasoning |

### o1-mini (`o1-mini`)
| Metric | Value |
|--------|-------|
| Input | $1.10 / 1M tokens |
| Output | $4.40 / 1M tokens |

### o3 (`o3`)
| Metric | Value |
|--------|-------|
| Input | $2.00 / 1M tokens |
| Output | $8.00 / 1M tokens |

### o3-mini (`o3-mini`)
| Metric | Value |
|--------|-------|
| Input | $1.10 / 1M tokens |
| Output | $4.40 / 1M tokens |

---

## Embedding Models

### Text Embedding 3 Small (`text-embedding-3-small`) ⭐ RECOMMENDED
| Metric | Value |
|--------|-------|
| Input | $0.02 / 1M tokens |
| Dimensions | 1,536 |
| Best For | **RAG/semantic search** - great quality at low cost |

### Text Embedding 3 Large (`text-embedding-3-large`)
| Metric | Value |
|--------|-------|
| Input | $0.13 / 1M tokens |
| Dimensions | 3,072 |
| Best For | Maximum accuracy (6.5x more expensive than small) |

### Ada v2 (`text-embedding-ada-002`)
| Metric | Value |
|--------|-------|
| Input | $0.10 / 1M tokens |
| Dimensions | 1,536 |
| Best For | Legacy (deprecated, use v3 instead) |

---

## Cost Optimization Features

### Prompt Caching
- **90% discount** on cached input tokens
- Applies to repeated or semantically similar prompts
- Automatically enabled

### Batch API
- **50% discount** for non-urgent workloads
- Processed within 24 hours
- GPT-5 batch: $0.625/$5.00 per 1M tokens (vs $1.25/$10.00 standard)

### Free Credits
- New users: **$5 free credits**
- No credit card required
- Expires after 3 months

---

## Cost Comparison: GPT-5 vs GPT-4o

| Model | Input/1M | Output/1M | vs GPT-4o Savings |
|-------|----------|-----------|-------------------|
| GPT-4o | $2.50 | $10.00 | baseline |
| GPT-5 | $1.25 | $10.00 | **50% input savings** |
| GPT-5-mini | $0.25 | $2.00 | **90% input, 80% output** |
| GPT-5-nano | $0.05 | $0.40 | **98% input, 96% output** |

---

## Parency Legal Environment Variables

Set these in Vercel → Settings → Environment Variables:

```env
# Recommended production configuration
OPENAI_MODEL_CHAT=gpt-5-mini
OPENAI_MODEL_CLASSIFICATION=gpt-5-nano
OPENAI_MODEL_EMBEDDING=text-embedding-3-small

# Optional tuning
OPENAI_CHAT_MAX_TOKENS=2000
OPENAI_CHAT_TEMPERATURE=0.7
OPENAI_CLASSIFICATION_MAX_TOKENS=500
OPENAI_CLASSIFICATION_TEMPERATURE=0.1
```

---

## Sources

- [OpenAI Official Pricing](https://openai.com/api/pricing/)
- [OpenAI Platform Pricing Docs](https://platform.openai.com/docs/pricing)
- [OpenAI API Pricing Calculator (Nov 2025)](https://costgoat.com/pricing/openai-api)
- [DocsBot GPT Pricing Calculator](https://docsbot.ai/tools/gpt-openai-api-pricing-calculator)
- [GPT-5 vs GPT-4o Cost Guide](https://www.creolestudios.com/gpt-5-vs-gpt-4o-api-pricing-comparison/)

---

## Update History

| Date | Change |
|------|--------|
| Nov 28, 2025 | Initial document created |
