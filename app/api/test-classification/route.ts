/**
 * Test Classification API
 * Diagnostic endpoint to test OpenAI GPT-5-nano classification
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { getClassificationConfig } from '@/lib/ai/model-config';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modelConfig = getClassificationConfig();
    const isGpt5Model = modelConfig.model.startsWith('gpt-5');
    const isNewModel = modelConfig.model.startsWith('o1') ||
                       modelConfig.model.startsWith('o3') ||
                       modelConfig.model.startsWith('gpt-5') ||
                       modelConfig.model.startsWith('gpt-4o');

    // Build test request
    const requestParams: any = {
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a test assistant. Respond with valid JSON.',
        },
        {
          role: 'user',
          content: 'Classify this test document. Respond with: {"category": "Test", "confidence": 0.95}',
        },
      ],
    };

    // Only add temperature for non-GPT-5 models
    if (!isGpt5Model) {
      requestParams.temperature = modelConfig.temperature;
    }

    // Add token limit
    if (isNewModel) {
      requestParams.max_completion_tokens = isGpt5Model ? 2000 : modelConfig.maxTokens;
      if (isGpt5Model) {
        requestParams.reasoning_effort = 'minimal';
      }
    } else {
      requestParams.max_tokens = modelConfig.maxTokens;
    }

    // Add response format (not for o1/o3)
    const isReasoningModel = modelConfig.model.startsWith('o1') || modelConfig.model.startsWith('o3');
    if (!isReasoningModel) {
      requestParams.response_format = { type: 'json_object' };
    }

    console.log('[TestClassification] Request params:', JSON.stringify(requestParams, null, 2));

    // Make request
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const startTime = Date.now();
    const response = await client.chat.completions.create(requestParams);
    const duration = Date.now() - startTime;

    const content = response.choices[0]?.message?.content || '{}';

    return NextResponse.json({
      success: true,
      model: modelConfig.model,
      isGpt5Model,
      isNewModel,
      requestParams: {
        ...requestParams,
        messages: '[redacted]',
      },
      response: {
        content,
        parsed: JSON.parse(content),
        tokensUsed: response.usage?.total_tokens,
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        reasoningTokens: (response.usage as any)?.completion_tokens_details?.reasoning_tokens,
      },
      durationMs: duration,
    });
  } catch (error: any) {
    console.error('[TestClassification] Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      param: error.param,
    }, { status: 500 });
  }
}
