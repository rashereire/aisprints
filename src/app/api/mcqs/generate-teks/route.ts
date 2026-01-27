import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  teksMcqGenerationSchema,
  teksSelectionSchema,
} from '@/lib/schemas/teks-mcq-schema';

/**
 * POST /api/mcqs/generate-teks
 * Generates a Multiple Choice Question aligned with a TEKS standard using AI.
 * 
 * Request Body:
 * {
 *   subject: string;
 *   gradeLevel: string;
 *   strandName: string;
 *   standardCode: string;
 *   standardDescription: string;
 *   topicDescription: string;
 * }
 * 
 * Response: Generated MCQ matching McqCreateInput structure
 */
export async function POST(req: NextRequest) {
  try {
    // Get OpenAI API key from environment
    // In Cloudflare Workers, environment variables from .dev.vars need to be accessed
    // through getCloudflareContext() or process.env (if nodejs_compat is enabled)
    let apiKey: string | undefined;
    
    try {
      // Try to get from Cloudflare context first (for Workers environment)
      const context = getCloudflareContext();
      // Environment variables from .dev.vars should be in process.env when using Wrangler
      // But we'll also check context.env as a fallback
      apiKey = process.env.OPENAI_API_KEY || (context.env as any)?.OPENAI_API_KEY;
    } catch (contextError) {
      // If getCloudflareContext fails, try process.env directly
      // This works if nodejs_compat_populate_process_env is enabled
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      console.error('Available env vars with OPENAI:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
      return NextResponse.json(
        {
          error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your .dev.vars file and restart the server.',
        },
        { status: 500 }
      );
    }

    // Log that we have the key (but not the actual key value)
    console.log('OpenAI API key found, length:', apiKey.length);
    console.log('OpenAI API key prefix (first 7 chars):', apiKey.substring(0, 7));
    console.log('OpenAI API key suffix (last 4 chars):', apiKey.substring(apiKey.length - 4));

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body with teksSelectionSchema
    let selection;
    try {
      selection = teksSelectionSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validationError.issues,
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Construct AI prompt with TEKS standard and topic information
    const prompt = `Generate a multiple choice question aligned with the following TEKS standard:

Subject: ${selection.subject}
Grade Level: ${selection.gradeLevel}
Strand: ${selection.strandName}
Standard Code: ${selection.standardCode}
Standard Description: ${selection.standardDescription}
Topic: ${selection.topicDescription}

Requirements:
- Create a question that directly assesses the TEKS standard: ${selection.standardCode}
- The question should be appropriate for ${selection.gradeLevel} students
- Include exactly 4 answer choices
- Exactly one answer must be correct
- Make incorrect answers (distractors) plausible but clearly wrong
- Question should be clear, concise, and aligned with the standard's expectations
- Title should be descriptive and related to the topic: ${selection.topicDescription}
- The question should test understanding of the specific topic: ${selection.topicDescription}
- Use language and concepts appropriate for ${selection.gradeLevel} students
- Ensure the correct answer directly demonstrates mastery of the standard: ${selection.standardDescription}

The question should help teachers assess whether students have met the learning expectation described in the standard.`;

    // Verify API key is present before making the call
    console.log('=== API Key Verification ===');
    console.log('API key present:', !!apiKey);
    console.log('API key length:', apiKey?.length || 0);
    if (apiKey) {
      // Log first 8 characters (as OpenAI support suggested) and last 4
      console.log('API key prefix (first 8 chars):', apiKey.substring(0, 8));
      console.log('API key suffix (last 4 chars):', apiKey.substring(apiKey.length - 4));
      // Check if it's a project key (sk-proj-) or org key (sk-)
      if (apiKey.startsWith('sk-proj-')) {
        console.log('API key type: Project key (sk-proj-*)');
      } else if (apiKey.startsWith('sk-')) {
        console.log('API key type: Organization key (sk-*)');
      }
    } else {
      console.error('API KEY IS MISSING - Cannot proceed with OpenAI call');
    }
    console.log('Environment: Local development (localhost:3000)');
    console.log('API key source: .dev.vars file');
    console.log('=== End API Key Verification ===');

    // Check if AI mocking is enabled (for testing without API costs)
    // Can be set via environment variable or request header
    const mockAiHeader = req.headers.get('x-mock-ai-responses');
    const mockAiEnv = process.env.MOCK_AI_RESPONSES === 'true' || 
                      (process.env as any).MOCK_AI_RESPONSES === 'true';
    const mockAiResponses = mockAiHeader === 'true' || mockAiEnv;
    
    let generatedMcq;
    
    if (mockAiResponses) {
      // Return mock MCQ structure for testing without OpenAI API costs
      console.log('MOCK MODE: Returning mock MCQ structure (AI API call skipped)');
      generatedMcq = {
        title: 'Mock TEKS MCQ - Patterns in Weather and Seasons',
        description: 'This is a mock MCQ generated for testing purposes. AI API call was skipped.',
        questionText: 'Which of the following best describes a pattern that can be observed in weather and seasons?',
        choices: [
          {
            choiceText: 'Weather patterns repeat in predictable cycles throughout the year',
            isCorrect: true,
            displayOrder: 0,
          },
          {
            choiceText: 'Weather is completely random and cannot be predicted',
            isCorrect: false,
            displayOrder: 1,
          },
          {
            choiceText: 'Seasons only occur in certain parts of the world',
            isCorrect: false,
            displayOrder: 2,
          },
          {
            choiceText: 'Weather patterns never change from year to year',
            isCorrect: false,
            displayOrder: 3,
          },
        ],
      };
    } else {
      // Create OpenAI provider with explicit API key
      // This ensures the API key is passed correctly, especially in Cloudflare Workers
      // where process.env might not be available at module load time
      const openaiClient = createOpenAI({
        apiKey: apiKey,
      });

      try {
        const result = await generateObject({
          model: openaiClient('gpt-4o'),
          schema: teksMcqGenerationSchema,
          prompt,
        });
        generatedMcq = result.object;
      } catch (aiError: any) {
      // Log the raw error object first - before any transformation
      console.error('=== RAW OpenAI API Error ===');
      console.error('Error name:', aiError?.name);
      console.error('Error type:', aiError?.constructor?.name);
      console.error('Error message:', aiError?.message);
      
      // Extract HTTP status code from various possible locations
      let httpStatus: number | string = 'unknown';
      if (aiError?.status) {
        httpStatus = aiError.status;
      } else if (aiError?.response?.status) {
        httpStatus = aiError.response.status;
      } else if (aiError?.statusCode) {
        httpStatus = aiError.statusCode;
      } else if (aiError?.cause?.status) {
        httpStatus = aiError.cause.status;
      } else if (aiError?.cause?.response?.status) {
        httpStatus = aiError.cause.response.status;
      }
      console.error('HTTP Status Code:', httpStatus);
      
      // Extract OpenAI error response from various possible locations
      let openaiError: any = null;
      if (aiError?.response?.data) {
        openaiError = aiError.response.data;
      } else if (aiError?.data) {
        openaiError = aiError.data;
      } else if (aiError?.cause?.data) {
        openaiError = aiError.cause.data;
      } else if (aiError?.cause?.response?.data) {
        openaiError = aiError.cause.response.data;
      }
      
      // For AI_RetryError, check the errors array and cause
      if (aiError?.name === 'AI_RetryError') {
        console.error('AI_RetryError detected, checking errors array...');
        
        // Check errors array (if it exists) - this is the primary location
        if (Array.isArray(aiError.errors) && aiError.errors.length > 0) {
          console.error('Found errors array with', aiError.errors.length, 'errors');
          const lastError = aiError.errors[aiError.errors.length - 1];
          console.error('Last error in errors array (full):', JSON.stringify(lastError, null, 2));
          
          // Try to extract error data from various locations
          if (lastError?.data) {
            openaiError = lastError.data;
          } else if (lastError?.response?.data) {
            openaiError = lastError.response.data;
          } else if (lastError?.cause?.data) {
            openaiError = lastError.cause.data;
          } else if (lastError?.cause?.response?.data) {
            openaiError = lastError.cause.response.data;
          }
          
          // Try to extract HTTP status from all possible locations
          if (lastError?.status) {
            httpStatus = lastError.status;
            console.error('Found HTTP status in lastError.status:', httpStatus);
          } else if (lastError?.response?.status) {
            httpStatus = lastError.response.status;
            console.error('Found HTTP status in lastError.response.status:', httpStatus);
          } else if (lastError?.cause?.status) {
            httpStatus = lastError.cause.status;
            console.error('Found HTTP status in lastError.cause.status:', httpStatus);
          } else if (lastError?.cause?.response?.status) {
            httpStatus = lastError.cause.response.status;
            console.error('Found HTTP status in lastError.cause.response.status:', httpStatus);
          } else {
            // Check all properties of lastError for status-like fields
            console.error('Checking all properties of lastError for status:', Object.keys(lastError));
            if (lastError.statusCode) {
              httpStatus = lastError.statusCode;
              console.error('Found HTTP status in lastError.statusCode:', httpStatus);
            }
          }
        }
        
        // Also check cause array (alternative structure)
        if (!openaiError && Array.isArray(aiError.cause)) {
          console.error('Found cause array with', aiError.cause.length, 'causes');
          const lastCause = aiError.cause[aiError.cause.length - 1];
          console.error('Last cause in array:', JSON.stringify(lastCause, null, 2).substring(0, 1000));
          
          if (lastCause?.data) {
            openaiError = lastCause.data;
          } else if (lastCause?.response?.data) {
            openaiError = lastCause.response.data;
          }
          
          if (httpStatus === 'unknown') {
            if (lastCause?.status) {
              httpStatus = lastCause.status;
            } else if (lastCause?.response?.status) {
              httpStatus = lastCause.response.status;
            }
          }
        }
      }
      
      if (openaiError) {
        console.error('=== OpenAI Error Response (Full JSON) ===');
        console.error(JSON.stringify(openaiError, null, 2));
        console.error('OpenAI Error Type:', openaiError?.error?.type);
        console.error('OpenAI Error Code:', openaiError?.error?.code);
        console.error('OpenAI Error Message:', openaiError?.error?.message);
        console.error('OpenAI Error Param:', openaiError?.error?.param);
        console.error('=== End OpenAI Error Response ===');
      } else {
        console.error('No OpenAI error response found in error object');
        console.error('Full error structure:', JSON.stringify(aiError, Object.getOwnPropertyNames(aiError), 2));
      }
      
      // Try to extract request ID from error (for OpenAI support debugging)
      let requestId: string | undefined;
      if (Array.isArray(aiError?.errors) && aiError.errors.length > 0) {
        const lastErr = aiError.errors[aiError.errors.length - 1];
        // Check various locations for request ID
        if (lastErr?.response?.headers?.['x-request-id']) {
          requestId = lastErr.response.headers['x-request-id'];
        } else if (lastErr?.headers?.['x-request-id']) {
          requestId = lastErr.headers['x-request-id'];
        } else if (lastErr?.response?.headers) {
          const headers = lastErr.response.headers;
          requestId = headers['x-request-id'] || headers['X-Request-Id'];
        }
      }
      if (requestId) {
        console.error('OpenAI Request ID (for support):', requestId);
      } else {
        console.error('OpenAI Request ID: Not found in error structure');
      }
      
      
      // Check for specific error types from AI SDK
      if (aiError?.name === 'AI_APICallError' || aiError?.name === 'AI_RetryError') {
        console.error('AI SDK Error Type:', aiError.name);
        if (aiError.cause) {
          console.error('AI SDK Error Cause (first 500 chars):', JSON.stringify(aiError.cause, null, 2).substring(0, 500));
        }
      }
      
      console.error('Error stack:', aiError?.stack || 'No stack trace');
      console.error('=== End Raw Error ===');
      
      // Now provide specific error messages based on actual error details
      const errorType = openaiError?.error?.type || '';
      const errorCode = openaiError?.error?.code || '';
      const errorMessage = (aiError?.message || '').toLowerCase();
      
      // Check for authentication errors (401)
      if (httpStatus === 401 || errorType === 'invalid_request_error' || errorCode === 'invalid_api_key' || 
          errorMessage.includes('api key') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'OpenAI API authentication failed. Please check your OPENAI_API_KEY in .dev.vars and restart the server.',
            details: 'The API key may be missing, incorrect, expired, or not properly loaded. Check server logs for API key presence.',
            httpStatus: httpStatus,
            openaiErrorType: errorType,
            openaiErrorCode: errorCode,
          },
          { status: 401 }
        );
      }
      
      // Check for rate limit errors (429)
      if (httpStatus === 429 || errorType === 'rate_limit_error' || errorCode === 'rate_limit_exceeded' ||
          errorMessage.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'OpenAI API rate limit exceeded. Please try again later.',
            httpStatus: httpStatus,
            openaiErrorType: errorType,
            openaiErrorCode: errorCode,
          },
          { status: 429 }
        );
      }
      
      // Check for quota/billing errors (402)
      if (httpStatus === 402 || errorType === 'insufficient_quota' || errorCode === 'insufficient_quota' ||
          errorMessage.includes('quota') || errorMessage.includes('insufficient_quota') || errorMessage.includes('exceeded')) {
        return NextResponse.json(
          {
            error: 'OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits.',
            details: 'You have exceeded your current quota. Please check your plan and billing details at https://platform.openai.com/account/billing',
            httpStatus: httpStatus,
            openaiErrorType: errorType,
            openaiErrorCode: errorCode,
          },
          { status: 402 }
        );
      }
      
      // Generic error response with all available details
      return NextResponse.json(
        {
          error: 'Failed to generate MCQ. Please try again.',
          details: aiError?.message || 'Unknown error',
          httpStatus: httpStatus,
          openaiErrorType: errorType,
          openaiErrorCode: errorCode,
          rawError: process.env.NODE_ENV === 'development' ? String(aiError) : undefined,
        },
        { status: 500 }
      );
    }
    }

    // Validate the generated MCQ (should already be validated by schema, but double-check)
    try {
      const validatedMcq = teksMcqGenerationSchema.parse(generatedMcq);
      
      // Ensure description is null (not empty string) for compatibility with McqCreateInput
      // The schema allows null, but AI might return empty string
      const mcqForResponse = {
        ...validatedMcq,
        description: validatedMcq.description === '' || validatedMcq.description === null 
          ? null 
          : validatedMcq.description,
      };
      
      // Return the generated MCQ
      return NextResponse.json(mcqForResponse, { status: 200 });
    } catch (validationError) {
      // This should rarely happen since generateObject validates against the schema
      console.error('Generated MCQ validation error:', validationError);
      return NextResponse.json(
        {
          error: 'Generated MCQ did not meet validation requirements',
          details: validationError instanceof z.ZodError ? validationError.issues : 'Unknown validation error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in POST /api/mcqs/generate-teks:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while generating the MCQ',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
