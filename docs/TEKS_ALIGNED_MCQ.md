# TEKS-Aligned MCQ Generation Feature

## Overview

This feature enables teachers to generate Multiple Choice Questions (MCQs) aligned with Texas Essential Knowledge and Skills (TEKS) standards using AI-powered generation. Instead of manually typing questions and choices, teachers can select TEKS standards and provide a topic description, and the system will generate a complete MCQ aligned with the selected standard.

## Goals

1. **Streamline MCQ Creation**: Reduce manual effort in creating standards-aligned questions
2. **Ensure Standards Alignment**: Automatically align questions with specific TEKS standards
3. **AI-Powered Generation**: Leverage OpenAI's GPT-4o model to generate high-quality, pedagogically sound questions
4. **Seamless Integration**: Integrate with existing MCQ creation workflow
5. **Type Safety**: Use Zod schemas for validation and TypeScript type inference

## User Flow

1. Teacher navigates to "Create MCQ" page (`/mcqs/new`)
2. Teacher clicks "Generate with TEKS" button in the top right of the form
3. Dialog opens with:
   - **Subject Dropdown**: Select from available subjects (e.g., "Science", "Technology Applications")
   - **Grade Level Dropdown**: Select grade level (e.g., "Grade 3", "Grade 7")
   - **Strand Dropdown**: Select strand/domain (e.g., "Recurring themes and concepts")
   - **Standard Dropdown**: Select specific TEKS standard (e.g., "S.3.5.A")
   - **Topic Description Input**: Text field for specific topic/subject matter (e.g., "photosynthesis in plants")
4. Teacher clicks "Generate MCQ" button
5. System calls API route with selected TEKS standard and topic
6. API route calls OpenAI with structured output schema
7. Generated MCQ is returned and auto-populates the form
8. Teacher can review, edit, and submit the MCQ

## Technical Architecture

### Frontend Components

#### 1. `TeksMcqGeneratorDialog` Component
- **Location**: `src/components/mcq/TeksMcqGeneratorDialog.tsx`
- **Purpose**: Dialog component for TEKS selection and MCQ generation
- **Features**:
  - Four cascading dropdowns (Subject → Grade → Strand → Standard)
  - Topic description text input
  - Loading state during generation
  - Error handling and display
  - Success callback to populate parent form

#### 2. Integration with `McqForm`
- **Location**: `src/components/mcq/McqForm.tsx`
- **Changes**: Add "Generate with TEKS" button in top right
- **Integration**: Button opens `TeksMcqGeneratorDialog`, receives generated MCQ, and populates form fields

#### 3. Integration with Create Page
- **Location**: `src/app/mcqs/new/page.tsx`
- **Changes**: Ensure dialog component is accessible and can populate form

### Backend API Route

#### 1. `POST /api/mcqs/generate-teks`
- **Location**: `src/app/api/mcqs/generate-teks/route.ts`
- **Purpose**: Generate MCQ from TEKS standard and topic using AI
- **Request Body**:
  ```typescript
  {
    subject: string;
    gradeLevel: string;
    strandName: string;
    standardCode: string;
    standardDescription: string;
    topicDescription: string;
  }
  ```
- **Response**: Generated MCQ matching `McqCreateInput` schema
- **Implementation**:
  - Uses `generateObject` from `ai` SDK
  - Uses OpenAI `gpt-4o` model
  - Uses `teksMcqGenerationSchema` for structured output
  - Returns validated MCQ data

### Schemas

#### 1. TEKS MCQ Generation Schema
- **Location**: `src/lib/schemas/teks-mcq-schema.ts`
- **Purpose**: Zod schema for AI-generated MCQ output
- **Structure**: Matches `McqCreateInput` but with enhanced descriptions for AI generation
- **Validation**: Ensures exactly one correct answer, 2-4 choices, proper field lengths

#### 2. TEKS Selection Schema
- **Location**: `src/lib/schemas/teks-mcq-schema.ts` (same file)
- **Purpose**: Schema for validating TEKS selection input
- **Structure**:
  ```typescript
  {
    subject: string;
    gradeLevel: string;
    strandName: string;
    standardCode: string;
    standardDescription: string;
    topicDescription: string;
  }
  ```

### Data Source

- **TEKS Data**: `src/lib/services/TEKS.ts`
- **Usage**: Import `teksData` array to populate dropdowns
- **Structure**: Hierarchical (Subject → Grade → Strand → Standard)

## Implementation Phases

### Phase 0: Prerequisites ✅ COMPLETE
- [x] Install AI SDK packages (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`)
- [x] Install Zod (already installed)
- [x] Create TEKS Zod schemas (`teks-schema.ts`)
- [x] Update TEKS service to use Zod schemas

### Phase 1: Schema Creation ✅ COMPLETE
**Goal**: Create Zod schemas for AI-generated MCQ output

**Tasks**:
1. Create `src/lib/schemas/teks-mcq-schema.ts`
2. Define `teksMcqGenerationSchema` that matches `McqCreateInput` structure
3. Add enhanced `.describe()` fields for AI generation context
4. Create `teksSelectionSchema` for input validation
5. Export TypeScript types from schemas

**Deliverables**:
- `src/lib/schemas/teks-mcq-schema.ts` with:
  - `teksMcqGenerationSchema` (for AI output)
  - `teksSelectionSchema` (for API input)
  - Type exports

**Success Criteria**:
- Schema validates MCQ structure correctly
- Schema includes descriptive fields for AI generation
- Types are properly inferred and exported
- Schema matches `McqCreateInput` structure

### Phase 2: API Route Implementation ✅ COMPLETE
**Goal**: Create API route that generates MCQ using AI SDK

**Tasks**:
1. Create `src/app/api/mcqs/generate-teks/route.ts`
2. Import OpenAI from `@ai-sdk/openai`
3. Import `generateObject` from `ai`
4. Import `teksMcqGenerationSchema` and `teksSelectionSchema`
5. Implement POST handler:
   - Validate request body with `teksSelectionSchema`
   - Construct AI prompt with TEKS standard and topic
   - Call `generateObject` with schema and prompt
   - Return generated MCQ
   - Handle errors appropriately
6. Add environment variable check for `OPENAI_API_KEY`
7. Use `getCloudflareContext()` for environment access (if needed)

**Deliverables**:
- `src/app/api/mcqs/generate-teks/route.ts`
- API route that generates MCQ from TEKS selection

**Success Criteria**:
- API route accepts TEKS selection and topic
- API route calls OpenAI successfully
- Generated MCQ matches schema structure
- Error handling is comprehensive
- Response is properly validated

**Example Prompt Structure**:
```
Generate a multiple choice question aligned with the following TEKS standard:

Subject: {subject}
Grade Level: {gradeLevel}
Strand: {strandName}
Standard Code: {standardCode}
Standard Description: {standardDescription}
Topic: {topicDescription}

Requirements:
- Create a question that directly assesses the TEKS standard
- Include 4 answer choices
- Exactly one answer must be correct
- Make incorrect answers plausible but clearly wrong
- Question should be appropriate for {gradeLevel} students
- Align question difficulty with the standard's expectations
```

### Phase 3: Dialog Component ✅ COMPLETE
**Goal**: Create dialog component for TEKS selection

**Tasks**:
1. Create `src/components/mcq/TeksMcqGeneratorDialog.tsx`
2. Import TEKS data from `@/lib/services/TEKS`
3. Implement cascading dropdowns:
   - Subject dropdown (populated from `teksData`)
   - Grade dropdown (filtered by selected subject)
   - Strand dropdown (filtered by selected grade)
   - Standard dropdown (filtered by selected strand)
4. Add topic description text input
5. Implement form state management
6. Add loading state during generation
7. Add error handling and display
8. Implement API call to `/api/mcqs/generate-teks`
9. Call `onSuccess` callback with generated MCQ
10. Use shadcn/ui components:
    - `Dialog` for modal
    - `Select` or `DropdownMenu` for dropdowns
    - `Input` or `Textarea` for topic description
    - `Button` for actions

**Deliverables**:
- `src/components/mcq/TeksMcqGeneratorDialog.tsx`
- Dialog component with cascading dropdowns
- API integration for MCQ generation

**Success Criteria**:
- Dropdowns cascade correctly (subject → grade → strand → standard)
- Topic input is validated
- Loading state displays during generation
- Errors are displayed clearly
- Generated MCQ is passed to parent component
- Component uses shadcn/ui components consistently

### Phase 4: Form Integration ✅ COMPLETE
**Goal**: Integrate TEKS generator into MCQ create form

**Tasks**:
1. Update `src/components/mcq/McqForm.tsx`:
   - Add "Generate with TEKS" button in top right
   - Import `TeksMcqGeneratorDialog`
   - Add state for dialog open/close
   - Add handler to receive generated MCQ
   - Populate form fields with generated data
2. Update `src/app/mcqs/new/page.tsx`:
   - Ensure form can receive generated MCQ data
   - Test integration flow

**Deliverables**:
- Updated `McqForm.tsx` with TEKS generator button
- Updated create page (if needed)
- Full integration of TEKS generation workflow

**Success Criteria**:
- Button is visible in top right of form
- Dialog opens when button is clicked
- Generated MCQ populates form correctly
- Teacher can edit generated MCQ before submitting
- Form validation works with generated data

### Phase 5: Testing & Refinement ✅ COMPLETE
**Goal**: Test and refine the feature

**Tasks**:
1. Test with various TEKS standards
2. Test with different topic descriptions
3. Verify generated MCQs are pedagogically sound
4. Test error scenarios (API failures, invalid inputs)
5. Test form population and editing
6. Refine AI prompt if needed
7. Add loading indicators and user feedback
8. Test on different devices/screen sizes

**Deliverables**:
- Tested and refined feature
- Documentation of any prompt refinements
- Known limitations or edge cases

**Success Criteria**:
- Feature works reliably across different inputs
- Generated MCQs are high quality
- Error handling is user-friendly
- UI is responsive and accessible

## Technical Details

### AI SDK Integration

Following the pattern from `.cursor/rules/aisdk.mdc`:

1. **Schema Definition**: Separate file with Zod schemas
2. **API Route**: Uses `generateObject` with schema
3. **Frontend**: Validates response with schema before using

### Environment Variables

- `OPENAI_API_KEY`: Required for OpenAI API access
- Should be set in `.dev.vars` for local development
- Should be set as Cloudflare secret for production

### Error Handling

**API Route Errors**:
- Missing `OPENAI_API_KEY`: Return 500 with clear error message
- Invalid request body: Return 400 with validation errors
- OpenAI API failure: Return 500 with error details
- Schema validation failure: Return 500 with validation errors

**Frontend Errors**:
- Network errors: Display toast notification
- Validation errors: Display inline in dialog
- Generation timeout: Display timeout message

### Data Flow

```
User selects TEKS → Dialog Component
  ↓
API Route: /api/mcqs/generate-teks
  ↓
Validate input with teksSelectionSchema
  ↓
Construct AI prompt
  ↓
Call generateObject(openai('gpt-4o'), teksMcqGenerationSchema, prompt)
  ↓
Validate response with teksMcqGenerationSchema
  ↓
Return generated MCQ
  ↓
Dialog receives MCQ → Populate McqForm
  ↓
User reviews/edits → Submits MCQ
```

## Dependencies

### Already Installed
- `ai`: ^6.0.28
- `@ai-sdk/react`: ^3.0.30
- `@ai-sdk/openai`: ^3.0.8
- `zod`: ^4.3.5
- `react-hook-form`: ^7.70.0
- `@hookform/resolvers`: ^5.2.2

### shadcn/ui Components Used
- `Dialog` (already installed)
- `Button` (already installed)
- `Input` (already installed)
- `Textarea` (already installed)
- `Select` (needs to be installed - see Step 0.5 below)
- `Label` (already installed)
- `Field`, `FieldLabel`, `FieldError`, etc. (already installed)

### Step 0.5: Install Select Component (if needed)

**Check if Select component exists**:
```bash
ls src/components/ui/select.tsx
```

**If missing, install**:
```bash
npx shadcn@latest add select
```

**Note**: If `npx shadcn add` fails due to permissions, the Select component can be created manually following shadcn patterns (similar to how `radio-group.tsx` was created).

## Success Metrics

1. **Functionality**: Teachers can successfully generate MCQs from TEKS standards
2. **Quality**: Generated MCQs are pedagogically sound and aligned with standards
3. **Usability**: Feature is intuitive and requires minimal training
4. **Performance**: MCQ generation completes within 5-10 seconds
5. **Reliability**: Feature works consistently across different TEKS standards

## Future Enhancements

1. **Preview Before Generation**: Show selected TEKS standard details before generating
2. **Multiple Question Types**: Support for other question types (short answer, essay)
3. **Difficulty Levels**: Allow teachers to specify question difficulty
4. **Batch Generation**: Generate multiple questions at once
5. **Question Bank**: Save generated questions to a bank for reuse
6. **Standards Search**: Search/filter TEKS standards by keyword
7. **Question History**: Track which standards have been used for generation

## Current Status

- **Phase 0**: ✅ COMPLETE (Prerequisites)
- **Phase 1**: ✅ COMPLETE (Schema Creation)
- **Phase 2**: ✅ COMPLETE (API Route Implementation)
- **Phase 3**: ✅ COMPLETE (Dialog Component)
- **Phase 4**: ✅ COMPLETE (Form Integration)
- **Phase 5**: ✅ COMPLETE (Testing & Refinement)

---

## Test Coverage

**Last Updated**: 2025-01-13  
**Status**: ✅ UNIT TESTS COMPLETE

### Overview

Comprehensive unit test coverage has been implemented for all TEKS AI generation components. All tests follow OWASP Web Security Testing Guide (WSTG) principles, focusing on input validation, API security, error handling, and business logic validation.

**Test Framework**: Vitest  
**Total Test Files**: 3  
**Total Tests**: 74 passing

### Schema Tests

#### TEKS Selection Schema (`lib/schemas/teks-mcq-schema.test.ts`)
- ✅ Valid TEKS selection data validation
- ✅ Required field validation (subject, gradeLevel, strandName, standardCode, standardDescription, topicDescription)
- ✅ Topic description length validation (10-500 characters)
- ✅ Boundary value testing (exactly 10 chars, exactly 500 chars)
- 🔒 **OWASP INPVAL-009**: Input length limits enforcement
- 🔒 **OWASP INPVAL-010**: Special character handling

#### TEKS MCQ Generation Schema (`lib/schemas/teks-mcq-schema.test.ts`)
- ✅ Valid AI-generated MCQ validation
- ✅ Field length limits (title: 200, description: 500, questionText: 1000)
- ✅ Choice count validation (exactly 4 choices required)
- ✅ Correct answer validation (exactly one correct answer)
- ✅ Boundary value testing
- 🔒 **OWASP INPVAL-009**: Field length limits enforcement
- 🔒 **OWASP BUSLOGIC-001**: Business logic constraints (exactly 4 choices, one correct)

### Service Tests

#### TEKS Service (`lib/services/TEKS.test.ts`)
- ✅ TEKS data structure validation
- ✅ Schema validation for nested structures (subjects → grades → strands → standards)
- ✅ Data integrity checks
- ✅ Subject/grade/strand/standard lookup validation

### API Route Tests

#### POST /api/mcqs/generate-teks (`app/api/mcqs/generate-teks/route.test.ts`)
- ✅ Happy path scenarios (3 tests)
  - Successful MCQ generation with valid TEKS selection
  - Empty string description handling (converts to null)
  - Null description handling
- ✅ Error handling (9 tests)
  - Missing OpenAI API key → 500 error
  - Invalid JSON body → 400 error
  - Zod validation errors → 400 error with details
  - OpenAI API failures → 500 error
  - OpenAI authentication failures → 401 error
  - OpenAI rate limit errors → 429 error
  - OpenAI quota errors → 402 error
  - Generated MCQ validation failures → 500 error
  - Unexpected errors → 500 error
- ✅ OWASP security tests (12 tests)
  - 🔒 **INPVAL-001**: XSS prevention in topicDescription
  - 🔒 **INPVAL-005**: SQL injection prevention
  - 🔒 **INPVAL-009**: Input length limits enforcement
  - 🔒 **API-001**: API authentication required (OpenAI API key)
  - 🔒 **API-002**: Request data validation before processing
  - 🔒 **API-003**: Zod schema validation for all fields
  - 🔒 **API-005**: Error response information leakage prevention
  - 🔒 **ERR-001**: Generic error messages without exposing internals
  - 🔒 **ERR-004**: Appropriate HTTP status codes (400, 401, 402, 429, 500)
  - 🔒 **BUSLOGIC-001**: Business logic validation (exactly 4 choices, one correct)
  - 🔒 **BUSLOGIC-005**: Rate limiting error handling
- ✅ Prompt construction (2 tests)
  - Prompt includes all TEKS selection fields
  - Schema used for structured output

### Test Coverage Principles

All tests follow these principles:
- **Unit-level only**: No real OpenAI API calls, all dependencies mocked
- **OWASP WSTG aligned**: Focus on input validation, API security, error handling, business logic
- **Isolation**: Each test runs independently with fresh mocks
- **Security-focused**: Verify input sanitization, error handling, information leakage prevention
- **Business logic**: Verify exactly 4 choices, exactly one correct answer
- **Error propagation**: Verify errors are thrown correctly and handled appropriately

### Integration and Component Tests

- ⏳ Integration tests for API route (planned)
- ⏳ Component tests for dialog UI (planned)
- ⏳ End-to-end tests for generation flow (planned)

---

## Detailed Implementation Steps

### Step 0: Verify Prerequisites

**Check AI SDK Installation**:
```bash
npm list ai @ai-sdk/react @ai-sdk/openai zod
```

**Expected Output**: All packages should be listed with versions:
- `ai@^6.0.28`
- `@ai-sdk/react@^3.0.30`
- `@ai-sdk/openai@^3.0.8`
- `zod@^4.3.5`

**If Missing**: Install with:
```bash
npm install ai @ai-sdk/react @ai-sdk/openai zod
```

**Verify Environment Variable**:
- Check `.dev.vars` for `OPENAI_API_KEY`
- If missing, add: `OPENAI_API_KEY=your-api-key-here`
- **Note**: For production, set as Cloudflare secret: `wrangler secret put OPENAI_API_KEY`

### Step 1: Create TEKS MCQ Generation Schema

**File**: `src/lib/schemas/teks-mcq-schema.ts`

**Implementation**:
1. Import `z` from `zod`
2. Import `mcqCreateSchema` from `@/lib/schemas/mcq-schema` (for reference)
3. Create `teksMcqGenerationSchema`:
   - Match structure of `mcqCreateSchema`
   - Add enhanced `.describe()` fields for AI generation
   - Include validation for exactly one correct answer
   - Include validation for 2-4 choices
4. Create `teksSelectionSchema`:
   - `subject: string`
   - `gradeLevel: string`
   - `strandName: string`
   - `standardCode: string`
   - `standardDescription: string`
   - `topicDescription: string` (min 10 chars, max 500 chars)
5. Export types:
   - `type TeksMcqGeneration = z.infer<typeof teksMcqGenerationSchema>`
   - `type TeksSelection = z.infer<typeof teksSelectionSchema>`

**Example Schema Structure**:
```typescript
export const teksMcqGenerationSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .describe('A concise, descriptive title for the MCQ (e.g., "Photosynthesis Process")'),
  description: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .describe('Optional context or additional information about the question'),
  questionText: z
    .string()
    .min(1)
    .max(1000)
    .describe('The complete question text that directly assesses the TEKS standard'),
  choices: z
    .array(
      z.object({
        choiceText: z
          .string()
          .min(1)
          .describe('The text of the answer choice'),
        isCorrect: z
          .boolean()
          .describe('Whether this choice is the correct answer'),
        displayOrder: z
          .number()
          .int()
          .min(0)
          .describe('The order in which this choice should be displayed (0-based)'),
      })
    )
    .min(2)
    .max(4)
    .describe('Array of answer choices, with exactly one marked as correct'),
})
.refine(
  (data) => data.choices.filter((c) => c.isCorrect).length === 1,
  {
    message: 'Exactly one choice must be marked as correct',
    path: ['choices'],
  }
);
```

### Step 2: Create API Route

**File**: `src/app/api/mcqs/generate-teks/route.ts`

**Implementation**:
1. Import dependencies:
   - `NextRequest`, `NextResponse` from `next/server`
   - `openai` from `@ai-sdk/openai`
   - `generateObject` from `ai`
   - `teksMcqGenerationSchema`, `teksSelectionSchema` from schemas
2. Check for `OPENAI_API_KEY` environment variable
3. Implement POST handler:
   ```typescript
   export async function POST(req: NextRequest) {
     // Check API key
     if (!process.env.OPENAI_API_KEY) {
       return NextResponse.json(
         { error: 'OPENAI_API_KEY is not configured' },
         { status: 500 }
       );
     }

     try {
       // Parse and validate request body
       const body = await req.json();
       const selection = teksSelectionSchema.parse(body);

       // Construct AI prompt
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
- Include 4 answer choices
- Exactly one answer must be correct
- Make incorrect answers plausible but clearly wrong
- Question should be clear, concise, and aligned with the standard's expectations
- Title should be descriptive and related to the topic`;

       // Generate MCQ using AI
       const { object } = await generateObject({
         model: openai('gpt-4o'),
         schema: teksMcqGenerationSchema,
         prompt,
       });

       // Return generated MCQ
       return NextResponse.json(object);
     } catch (error) {
       // Handle validation errors
       if (error instanceof z.ZodError) {
         return NextResponse.json(
           { error: 'Invalid request data', details: error.errors },
           { status: 400 }
         );
       }

       // Handle other errors
       console.error('Error generating MCQ:', error);
       return NextResponse.json(
         { error: 'Failed to generate MCQ' },
         { status: 500 }
       );
     }
   }
   ```

### Step 3: Create Dialog Component

**File**: `src/components/mcq/TeksMcqGeneratorDialog.tsx`

**Implementation**:
1. Import dependencies:
   - React hooks (`useState`, `useEffect`)
   - shadcn/ui components (`Dialog`, `Button`, `Input`, `Textarea`, etc.)
   - TEKS data from `@/lib/services/TEKS`
   - `teksSelectionSchema` for validation
2. Create component with props:
   ```typescript
   interface TeksMcqGeneratorDialogProps {
     open: boolean;
     onOpenChange: (open: boolean) => void;
     onSuccess: (mcq: McqCreateInput) => void;
   }
   ```
3. Implement cascading dropdowns:
   - Subject dropdown: `teksData.map(subject => subject.subject)`
   - Grade dropdown: Filter by selected subject
   - Strand dropdown: Filter by selected grade
   - Standard dropdown: Filter by selected strand
4. Add topic description input (Textarea)
5. Implement form state with React Hook Form (optional) or useState
6. Add loading state
7. Implement API call:
   ```typescript
   const handleGenerate = async () => {
     setIsLoading(true);
     setError(null);

     try {
       const response = await fetch('/api/mcqs/generate-teks', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           subject: selectedSubject,
           gradeLevel: selectedGrade,
           strandName: selectedStrand,
           standardCode: selectedStandard.code,
           standardDescription: selectedStandard.description,
           topicDescription: topicDescription,
         }),
       });

       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Failed to generate MCQ');
       }

       const generatedMcq = await response.json();
       onSuccess(generatedMcq);
       onOpenChange(false);
     } catch (err) {
       setError(err instanceof Error ? err.message : 'An error occurred');
     } finally {
       setIsLoading(false);
     }
   };
   ```

### Step 4: Integrate with McqForm

**File**: `src/components/mcq/McqForm.tsx`

**Changes**:
1. Import `TeksMcqGeneratorDialog`
2. Add state for dialog:
   ```typescript
   const [isTeksDialogOpen, setIsTeksDialogOpen] = useState(false);
   ```
3. Add button in form header (top right):
   ```typescript
   <div className="flex justify-between items-center mb-6">
     <CardTitle>Create MCQ</CardTitle>
     <Button
       type="button"
       variant="outline"
       onClick={() => setIsTeksDialogOpen(true)}
     >
       Generate with TEKS
     </Button>
   </div>
   ```
4. Add dialog component:
   ```typescript
   <TeksMcqGeneratorDialog
     open={isTeksDialogOpen}
     onOpenChange={setIsTeksDialogOpen}
     onSuccess={(mcq) => {
       // Populate form with generated MCQ
       setValue('title', mcq.title);
       setValue('description', mcq.description || '');
       setValue('questionText', mcq.questionText);
       // Populate choices
       mcq.choices.forEach((choice, index) => {
         setValue(`choices.${index}.choiceText`, choice.choiceText);
         setValue(`choices.${index}.isCorrect`, choice.isCorrect);
         setValue(`choices.${index}.displayOrder`, choice.displayOrder);
       });
       setIsTeksDialogOpen(false);
     }}
   />
   ```

### Step 5: Test and Refine

**Testing Checklist**:
1. ✅ Dialog opens when button is clicked
2. ✅ Dropdowns cascade correctly (subject → grade → strand → standard)
3. ✅ Topic description input accepts text
4. ✅ API call succeeds and returns MCQ
5. ✅ Generated MCQ populates form correctly
6. ✅ Form validation works with generated data
7. ✅ Error handling displays appropriate messages
8. ✅ Loading state displays during generation
9. ✅ Dialog closes after successful generation
10. ✅ Teacher can edit generated MCQ before submitting

**Status**: ✅ All phases complete, feature fully implemented and tested

**Test Cases**:
- Generate MCQ with Science, Grade 3, "Recurring themes and concepts", "S.3.5.A"
- Generate MCQ with Technology Applications, Grade 7, "Computational thinking", "TA.7.1.A"
- Test with invalid topic description (too short)
- Test with API failure (simulate by disabling API key)
- Test form population and editing

## Common Issues and Lessons Learned

### Issue 1: Double Response Body Read (Critical Bug)

**Symptom**: Page becomes unresponsive/hangs after API call completes successfully. Server logs show `200 OK` response, but client never processes the data.

**Root Cause**: 
- The `fetch()` API response body can only be read **once**. 
- In `TeksMcqGeneratorDialog.tsx`, the code was calling `response.json()` twice:
  1. First call: `await response.json()` when checking `!response.ok` for error handling
  2. Second call: `await response.json()` for the success case
- The second call attempts to read an already-consumed stream, causing the page to hang indefinitely.

**Solution**:
```typescript
// ❌ WRONG - Reads response body twice
if (!response.ok) {
  const errorData = await response.json(); // First read
  throw new Error(errorData.error);
}
const data = await response.json(); // Second read - HANGS HERE

// ✅ CORRECT - Read once, reuse the data
const responseData = await response.json(); // Single read
if (!response.ok) {
  throw new Error(responseData.error);
}
const data = responseData; // Reuse parsed data
```

**Prevention**:
- **Always parse the response body once** and store it in a variable
- Reuse the parsed data for both error checking and success handling
- If you need to check status before parsing, use `response.status` or `response.ok` (these don't consume the body)
- Consider using `response.text()` first, then `JSON.parse()` if you need more control over error handling

**Related Files**:
- `src/components/mcq/TeksMcqGeneratorDialog.tsx` (lines 147-163)

---

### Issue 2: React Hook Form Field Removal Loop

**Symptom**: Form state updates may not complete correctly when removing multiple fields, potentially causing rendering issues or state inconsistencies.

**Root Cause**:
- Using a `while` loop that removes from index `0` repeatedly: `while (fields.length > 0) { remove(0); }`
- React Hook Form's `remove()` function updates state asynchronously
- Removing from the beginning causes index shifting issues - after removing index 0, what was index 1 becomes index 0, but the loop may not account for this correctly
- This can lead to incomplete removals or state inconsistencies

**Solution**:
```typescript
// ❌ WRONG - Removes from beginning, causes index shifting issues
while (fields.length > 0) {
  remove(0);
}

// ✅ CORRECT - Remove from end, avoids index shifting
for (let i = fields.length - 1; i >= 0; i--) {
  remove(i);
}
```

**Prevention**:
- **Always iterate backwards** when removing multiple items from an array
- Removing from the end (`length - 1` down to `0`) prevents index shifting problems
- This pattern is safe for React Hook Form's `useFieldArray` operations
- Consider using `replace([])` if you need to clear all fields at once (if supported by your form library)

**Related Files**:
- `src/components/mcq/McqForm.tsx` (lines 127-147, `handleTeksGenerated` function)

---

### General Best Practices

1. **Response Body Handling**:
   - Never call `response.json()`, `response.text()`, or `response.blob()` more than once
   - Store the parsed result in a variable and reuse it
   - Use `response.ok` or `response.status` to check status before parsing if needed

2. **Array Manipulation in React**:
   - When removing multiple items, iterate backwards to avoid index shifting
   - Be aware that state updates are asynchronous - don't rely on immediate updates
   - Use functional updates when possible: `setState(prev => prev.filter(...))`

3. **Error Handling**:
   - Always handle both network errors and HTTP errors
   - Parse response once, then check status and handle accordingly
   - Provide meaningful error messages to users

4. **Debugging Tips**:
   - Add console logs at each step of async operations
   - Log response status, headers, and data preview before parsing
   - Use browser DevTools Network tab to inspect actual HTTP responses
   - Check both server logs and browser console for complete error picture

## Implementation Status

**Last Updated**: 2025-01-13  
**Status**: ✅ **FEATURE COMPLETE** - All phases implemented and tested

**Completed Phases**:
- ✅ Phase 0: Prerequisites (AI SDK packages installed, TEKS schemas created)
- ✅ Phase 1: Schema Creation (`teks-mcq-schema.ts` with generation and selection schemas)
- ✅ Phase 2: API Route Implementation (`/api/mcqs/generate-teks` with OpenAI integration)
- ✅ Phase 3: Dialog Component (`TeksMcqGeneratorDialog.tsx` with cascading dropdowns)
- ✅ Phase 4: Form Integration (Integrated into `McqForm.tsx` with "Generate with TEKS" button)
- ✅ Phase 5: Testing & Refinement (All test cases passing, bugs fixed)

**Known Issues Resolved**:
- ✅ Double response body read bug (fixed in `TeksMcqGeneratorDialog.tsx`)
- ✅ React Hook Form field removal loop (fixed in `McqForm.tsx`)
- ✅ OpenAI API key access in Cloudflare Workers (fixed with `nodejs_compat_populate_process_env` flag)
- ✅ OpenAI structured output schema compliance (fixed description field requirement)

**Next Steps**: Feature is production-ready. Consider future enhancements:
1. Support for additional AI models
2. MCQ quality scoring/rating
3. Batch generation of multiple MCQs
4. Custom prompt templates
