# Multiple Choice Questions (MCQ) CRUD - Technical PRD

## Overview

This document outlines the requirements for implementing Multiple Choice Question (MCQ) creation, reading, updating, and deletion functionality in QuizMaker. The system will allow teachers to create and manage MCQs with up to four answer choices, and students to take attempts at answering these questions. This feature serves as the core content management functionality for the quiz application.

---

## Business Requirements

### MCQ Management
- Teachers can create multiple choice questions with a title, description, question text, and up to four answer choices
- Teachers can view a list of all MCQs they have created
- Teachers can edit existing MCQs to modify any aspect of the question
- Teachers can delete MCQs they have created
- Each MCQ must have exactly one correct answer among its choices

### MCQ Attempts
- Students can view and attempt any MCQ
- Each attempt records the student's answer choice and whether it was correct
- Students can make multiple attempts on the same MCQ
- Attempt history is preserved for tracking student progress

### User Experience
- The home page (`/`) is public and redirects authenticated users to the MCQ listing page (`/mcqs`)
- The MCQ listing page displays a table listing all MCQs (initially empty)
- A "Create MCQ" button is prominently displayed at the top right, aligned with the page title
- Each MCQ row in the table has an action button with dropdown options for Edit and Delete
- Clicking on an MCQ row navigates to a preview/take mode where students can attempt the question
- Global navigation header with user menu is present on all pages

---

## Technical Requirements

### Database Schema

**Recommendation**: Use a separate `mcq_choices` table with a one-to-many relationship to the `mcqs` table. This approach provides:
- Better normalization and data integrity
- Easier querying and filtering
- Flexibility to add more choice fields in the future
- Simpler validation logic

```sql
-- Multiple Choice Questions table
CREATE TABLE mcqs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT,
  question_text TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MCQ Choices table (one-to-many relationship)
CREATE TABLE mcq_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs(id) ON DELETE CASCADE
);

-- MCQ Attempts table (records student attempts)
CREATE TABLE mcq_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  selected_choice_id TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_choice_id) REFERENCES mcq_choices(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_mcqs_created_by ON mcqs(created_by_user_id);
CREATE INDEX idx_mcq_choices_mcq_id ON mcq_choices(mcq_id);
CREATE INDEX idx_mcq_attempts_mcq_id ON mcq_attempts(mcq_id);
CREATE INDEX idx_mcq_attempts_user_id ON mcq_attempts(user_id);
```

### API Endpoints

#### GET /api/mcqs
**Purpose**: Retrieve paginated MCQs with optional search and filtering

**Query Parameters**:
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 10): Number of items per page
- `search` (optional): Search query to filter by title, description, or question text
- `userId` (optional): Filter by creator user ID

**Response**:
- Success (200): Paginated response with MCQ objects and metadata
```json
{
  "data": [
    {
      "id": "abc123",
      "title": "Sample Question",
      "description": "A sample description",
      "questionText": "What is 2+2?",
      "createdByUserId": "user123",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z",
      "choices": [
        {
          "id": "choice1",
          "choiceText": "3",
          "isCorrect": 0,
          "displayOrder": 1
        },
        {
          "id": "choice2",
          "choiceText": "4",
          "isCorrect": 1,
          "displayOrder": 2
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### GET /api/mcqs/[id]
**Purpose**: Retrieve a single MCQ by ID with its choices

**Response**:
- Success (200): MCQ object with nested choices
- Error (404): MCQ not found

#### POST /api/mcqs
**Purpose**: Create a new MCQ with choices

**Request Body**:
```json
{
  "title": "Sample Question",
  "description": "Optional description",
  "questionText": "What is 2+2?",
  "choices": [
    {
      "choiceText": "3",
      "isCorrect": false,
      "displayOrder": 1
    },
    {
      "choiceText": "4",
      "isCorrect": true,
      "displayOrder": 2
    },
    {
      "choiceText": "5",
      "isCorrect": false,
      "displayOrder": 3
    },
    {
      "choiceText": "6",
      "isCorrect": false,
      "displayOrder": 4
    }
  ]
}
```

**Validation Rules**:
- Title is required and must be 1-200 characters
- Question text is required and must be 1-1000 characters
- Must have between 2 and 4 choices
- Exactly one choice must be marked as correct
- All choice texts must be non-empty

**Response**:
- Success (201): Created MCQ object with choices
- Error (400): Validation error
- Error (401): Unauthorized (user not logged in)

#### PUT /api/mcqs/[id]
**Purpose**: Update an existing MCQ

**Request Body**: Same as POST /api/mcqs

**Validation Rules**:
- Same as POST
- User must be the creator of the MCQ

**Response**:
- Success (200): Updated MCQ object
- Error (400): Validation error
- Error (403): Forbidden (user is not the creator)
- Error (404): MCQ not found

#### DELETE /api/mcqs/[id]
**Purpose**: Delete an MCQ and all associated choices and attempts

**Response**:
- Success (200): Deletion confirmation
- Error (403): Forbidden (user is not the creator)
- Error (404): MCQ not found

#### POST /api/mcqs/[id]/attempt
**Purpose**: Record a student's attempt at answering an MCQ

**Request Body**:
```json
{
  "selectedChoiceId": "choice2"
}
```

**Response**:
- Success (201): Attempt record with result
```json
{
  "id": "attempt123",
  "mcqId": "mcq123",
  "userId": "user456",
  "selectedChoiceId": "choice2",
  "isCorrect": true,
  "attemptedAt": "2025-01-15T10:30:00Z"
}
```
- Error (400): Invalid choice ID or validation error
- Error (404): MCQ or choice not found

### User Interface Requirements

#### Page: Home Page (/)
**Layout**:
- Public page (accessible without authentication)
- If user is authenticated, automatically redirect to `/mcqs`
- If user is not authenticated, show welcome content or redirect to login

#### Page: MCQ Listing (/mcqs)
**Layout**:
- Global navigation header with user menu (includes logout functionality)
- Page title: "Multiple Choice Question Listing" (left-aligned)
- "Create MCQ" button (top right, aligned with title)
- Search bar above table (filters by title, description, or question text)
- Filter controls (optional, for future enhancements)
- Table displaying paginated MCQs
- Pagination controls below table

**Table Columns**:
- Title
- Description (truncated if long)
- Question Text (truncated if long)
- Number of Choices
- Created Date
- Actions (dropdown button on the right)

**Table Features**:
- Initially shows empty state with call-to-action: "No MCQs found. Get started by creating your first MCQ!" with prominent "Create MCQ" button
- Each row is clickable (navigates to preview/take mode)
- Action dropdown menu with:
  - Edit option (navigates to edit page)
  - Delete option (shows confirmation dialog)
- Pagination controls showing current page, total pages, and navigation buttons

**Actions**:
- Clicking "Create MCQ" navigates to `/mcqs/new`
- Clicking a row navigates to `/mcqs/[id]` (preview/take mode)
- Clicking "Edit" navigates to `/mcqs/[id]/edit`
- Clicking "Delete" shows confirmation dialog, then deletes and refreshes list

#### Page: Create MCQ (/mcqs/new)
**Form Fields**:
- Title (text input, required)
- Description (textarea, optional)
- Question Text (textarea, required)
- Choices section with:
  - Up to 4 choice inputs
  - Each choice has: text input and "Correct Answer" checkbox/radio
  - "Add Choice" button (disabled when 4 choices exist)
  - "Remove Choice" button for each choice (disabled when only 2 choices exist)

**Validation**:
- Real-time validation feedback
- Submit button disabled until all validations pass
- Error messages displayed below invalid fields

**Actions**:
- "Cancel" button (navigates back to listing)
- "Create MCQ" button (submits form, navigates to listing on success)

#### Page: Edit MCQ (/mcqs/[id]/edit)
**Features**:
- Same form as Create MCQ, pre-populated with existing data
- "Update MCQ" button instead of "Create MCQ"
- "Cancel" navigates back to listing or detail view

#### Page: MCQ Preview/Take Mode (/mcqs/[id])
**Display**:
- MCQ title (large, prominent)
- Description (if present)
- Question text (prominent)
- List of choices as radio buttons or clickable cards
- "Submit Answer" button

**Behavior**:
- User selects one choice
- On submit:
  - Answer is recorded in `mcq_attempts` table
  - Immediate feedback shown (correct/incorrect)
  - Result displayed: "Correct!" or "Incorrect. The correct answer is: [choice text]"
  - Option to try again (creates new attempt)

**Features**:
- Shows attempt history (if user has previous attempts)
- "Back to List" button to return to MCQ listing

---

## Implementation Phases

**Note**: These phases assume authentication (Phases 1-6 from Basic Authentication PRD) is already complete, as MCQ operations require user authentication.

### Phase 1: MCQ Database Migration

**Objective**: Create database schema for MCQs, choices, and attempts

**Status**: ✅ COMPLETE

**Tasks**:
1. Create migration file: `migrations/0002_create_mcqs.sql`
2. Define `mcqs` table schema:
   - id, title, description, question_text, created_by_user_id
   - created_at, updated_at timestamps
   - Foreign key to users table
3. Define `mcq_choices` table schema:
   - id, mcq_id, choice_text, is_correct, display_order
   - created_at timestamp
   - Foreign key to mcqs table with CASCADE delete
4. Define `mcq_attempts` table schema:
   - id, mcq_id, user_id, selected_choice_id, is_correct
   - attempted_at timestamp
   - Foreign keys to mcqs, users, and mcq_choices with CASCADE delete
5. Add indexes:
   - `idx_mcqs_created_by` on `mcqs(created_by_user_id)`
   - `idx_mcq_choices_mcq_id` on `mcq_choices(mcq_id)`
   - `idx_mcq_attempts_mcq_id` on `mcq_attempts(mcq_id)`
   - `idx_mcq_attempts_user_id` on `mcq_attempts(user_id)`
6. Test migration locally
7. Verify foreign key constraints and CASCADE behavior

**Deliverables**:
- ✅ `migrations/0002_create_mcqs.sql` file
- ✅ Database tables created and verified locally
- ✅ Indexes created for performance
- ✅ Migration tested and ready for production (when approved)

**Testing**:
- Verify all tables are created correctly
- Verify indexes are created
- Verify foreign key constraints
- Test CASCADE delete behavior
- Verify data types and constraints

**Deployment**:
- Migration can be applied to local database
- Ready for production migration (when approved)

---

### Phase 2: MCQ Services

**Objective**: Create service layer for MCQ operations

**Status**: ✅ COMPLETE

**Tasks**:
1. Create `lib/schemas/mcq-schema.ts` with Zod schemas:
   - `mcqCreateSchema` - validation for creating MCQs
   - `mcqUpdateSchema` - validation for updating MCQs
   - `mcqAttemptSchema` - validation for recording attempts
   - `mcqSchema` - MCQ data structure
   - `mcqChoiceSchema` - Choice data structure
2. Create `lib/services/mcq-service.ts`:
   - `createMcq(userId: string, mcqData: McqCreateInput): Promise<McqWithChoices>` - create MCQ with choices (use transaction)
   - `getMcqById(id: string): Promise<McqWithChoices | null>` - get MCQ with choices
   - `getMcqs(filters: { page?: number; limit?: number; search?: string; userId?: string }): Promise<PaginatedMcqs>` - get paginated MCQs with search
   - `updateMcq(id: string, userId: string, mcqData: McqUpdateInput): Promise<McqWithChoices>` - update MCQ (verify ownership)
   - `deleteMcq(id: string, userId: string): Promise<void>` - delete MCQ (verify ownership, CASCADE handles choices/attempts)
   - `verifyMcqOwnership(mcqId: string, userId: string): Promise<boolean>` - check if user owns MCQ
3. Create `lib/services/mcq-attempt-service.ts`:
   - `recordAttempt(userId: string, mcqId: string, choiceId: string): Promise<McqAttempt>` - record attempt and return result
   - `getAttemptsByMcq(mcqId: string, userId?: string): Promise<McqAttempt[]>` - get attempts for an MCQ
   - `getAttemptsByUser(userId: string): Promise<McqAttempt[]>` - get all attempts by a user
4. Write unit tests for all service methods
5. Test transaction handling for MCQ creation
6. Test pagination and search logic
7. Test ownership verification

**Deliverables**:
- ✅ `lib/schemas/mcq-schema.ts` with validation schemas
- ✅ `lib/services/mcq-service.ts` with MCQ CRUD operations
- ✅ `lib/services/mcq-attempt-service.ts` with attempt recording
- ⏳ Comprehensive test coverage (to be completed in Phase 6)
- ✅ Error handling implemented

**Testing**:
- Test MCQ creation with choices (transaction)
- Test MCQ retrieval (single and paginated)
- Test search functionality
- Test MCQ update with ownership verification
- Test MCQ delete with ownership verification
- Test attempt recording
- Test pagination logic
- Test error scenarios (invalid data, unauthorized access)

**Deployment**:
- Code is ready for deployment
- Services can be tested independently

---

### Phase 3: MCQ API Routes

**Objective**: Implement REST API endpoints for MCQ operations

**Status**: ✅ COMPLETE

**Tasks**:
1. Create `app/api/mcqs/route.ts`:
   - GET handler: List MCQs with pagination and search
     - Parse query parameters (page, limit, search, userId)
     - Call `getMcqs` service method
     - Return paginated response
   - POST handler: Create new MCQ
     - Require authentication
     - Validate input using Zod schema
     - Call `createMcq` service method
     - Return created MCQ
2. Create `app/api/mcqs/[id]/route.ts`:
   - GET handler: Get single MCQ by ID
     - Call `getMcqById` service method
     - Return MCQ with choices
   - PUT handler: Update MCQ
     - Require authentication
     - Verify ownership
     - Validate input
     - Call `updateMcq` service method
     - Return updated MCQ
   - DELETE handler: Delete MCQ
     - Require authentication
     - Verify ownership
     - Call `deleteMcq` service method
     - Return success response
3. Create `app/api/mcqs/[id]/attempt/route.ts`:
   - POST handler: Record attempt
     - Require authentication
     - Validate input (selectedChoiceId)
     - Call `recordAttempt` service method
     - Return attempt result
4. Add comprehensive error handling to all routes
5. Write integration tests for all endpoints

**Deliverables**:
- ✅ All MCQ API routes implemented
- ✅ Authentication checks in place
- ✅ Ownership verification working
- ✅ Pagination and search working
- ✅ Error handling with appropriate HTTP status codes
- ⏳ Integration tests (to be completed in Phase 6)

**Testing**:
- Test GET /api/mcqs (list with pagination)
- Test GET /api/mcqs?search=query (search functionality)
- Test POST /api/mcqs (create MCQ - authenticated)
- Test POST /api/mcqs (unauthenticated - should fail)
- Test GET /api/mcqs/[id] (get single MCQ)
- Test PUT /api/mcqs/[id] (update - verify ownership)
- Test DELETE /api/mcqs/[id] (delete - verify ownership)
- Test POST /api/mcqs/[id]/attempt (record attempt)
- Test all error scenarios

**Deployment**:
- API routes can be deployed and tested
- Can test with API client
- MCQ operations are fully functional via API

---

### Phase 4: MCQ UI Components

**Objective**: Build reusable UI components for MCQ functionality

**Status**: ⏳ PLANNED

**Tasks**:
1. Create `components/mcq/McqTable.tsx`:
   - Table component using shadcn/ui Table
   - Display MCQ data in columns
   - Make rows clickable
   - Show loading state
   - Handle empty state (delegated to McqEmptyState)
2. Create `components/mcq/McqSearch.tsx`:
   - Search input component
   - Debounced search functionality
   - Clear button
3. Create `components/mcq/McqPagination.tsx`:
   - Pagination controls using shadcn/ui components
   - Previous/Next buttons
   - Page number display
   - Disabled states
4. Create `components/mcq/McqEmptyState.tsx`:
   - Empty state component with call-to-action
   - Prominent "Create MCQ" button
   - Friendly messaging
5. Create `components/mcq/McqActionMenu.tsx`:
   - Dropdown menu using shadcn/ui DropdownMenu
   - Edit and Delete options
   - Delete confirmation dialog
6. Create `components/mcq/McqForm.tsx`:
   - Form component for create/edit
   - Use React Hook Form with Zod
   - Dynamic choice inputs (2-4 choices)
   - Add/Remove choice buttons
   - Correct answer selection (radio buttons)
   - Validation feedback
7. Create `components/mcq/McqPreview.tsx`:
   - Preview/take mode component
   - Display MCQ question and choices
   - Radio button selection
   - Submit button
   - Show feedback after submission
   - Display attempt history
8. Add loading states to all components
9. Add error handling UI
10. Ensure accessibility (ARIA labels, keyboard navigation)

**Deliverables**:
- All MCQ UI components implemented
- Components use shadcn/ui primitives
- Responsive design
- Loading and error states
- Accessibility features

**Testing**:
- Test each component in isolation
- Test component interactions
- Test form validation
- Test loading states
- Test error states
- Test responsive design
- Test accessibility

**Deployment**:
- Components are ready for use
- Can be tested in Storybook or isolated pages

---

### Phase 5: MCQ Pages and Integration

**Objective**: Create pages and integrate all components with API

**Status**: ⏳ PLANNED

**Tasks**:
1. Create `app/page.tsx` (Home Page):
   - Public page
   - Check authentication status
   - Redirect authenticated users to `/mcqs`
   - Show welcome content for unauthenticated users (optional)
2. Create `app/mcqs/page.tsx` (MCQ Listing):
   - Server component that fetches MCQs
   - Require authentication (redirect if not authenticated)
   - Integrate McqTable, McqSearch, McqPagination, McqEmptyState
   - Handle pagination state
   - Handle search state
   - "Create MCQ" button in header
3. Create `app/mcqs/new/page.tsx` (Create MCQ):
   - Client component with McqForm
   - Require authentication
   - Handle form submission
   - Show toast notifications
   - Redirect to listing on success
4. Create `app/mcqs/[id]/page.tsx` (Preview/Take MCQ):
   - Server component that fetches MCQ
   - Client component with McqPreview
   - Handle attempt submission
   - Show feedback and attempt history
5. Create `app/mcqs/[id]/edit/page.tsx` (Edit MCQ):
   - Server component that fetches MCQ
   - Verify ownership (redirect if not owner)
   - Client component with McqForm (pre-populated)
   - Handle form submission
   - Show toast notifications
   - Redirect to listing on success
6. Integrate NavigationHeader in root layout
7. Add toast notifications throughout (using Sonner)
8. Test complete user flows end-to-end

**Deliverables**:
- All pages implemented
- Forms integrated with React Hook Form and Zod
- API integration working
- Navigation and routing complete
- Toast notifications working
- Error handling in place

**Testing**:
- Test home page redirect logic
- Test MCQ listing page (pagination, search, empty state)
- Test create MCQ flow
- Test edit MCQ flow (with ownership check)
- Test preview/take MCQ flow
- Test attempt recording
- Test error handling
- Test authentication requirements
- Test complete user journeys

**Deployment**:
- Full application is functional
- All features are integrated
- Ready for production deployment

---

### Phase 6: Testing and Refinement

**Objective**: Comprehensive testing, bug fixes, and optimization

**Status**: ⏳ PLANNED

**Tasks**:
1. Write comprehensive unit tests for all services
2. Write integration tests for all API routes
3. Write component tests for UI components
4. Perform manual testing of all user flows
5. Test edge cases and error scenarios
6. Performance testing and optimization
7. Security testing
8. Accessibility audit
9. Fix all identified bugs
10. Code review and refactoring
11. Update documentation

**Deliverables**:
- Comprehensive test coverage
- All bugs fixed
- Performance optimized
- Security verified
- Accessibility compliant
- Documentation updated

**Testing**:
- Unit test coverage > 80%
- Integration tests for all API endpoints
- Component tests for critical UI
- End-to-end user flow tests
- Performance benchmarks
- Security audit results

**Deployment**:
- Application is production-ready
- All tests passing
- Performance meets requirements
- Security verified

---

## Technical Implementation Details

### Key Files
- `migrations/0001_create_mcqs.sql` - Database schema migration
- `lib/d1-client.ts` - Database access helpers
- `lib/services/mcq-service.ts` - MCQ business logic
- `lib/services/mcq-attempt-service.ts` - Attempt recording logic
- `lib/schemas/mcq-schema.ts` - Zod validation schemas
- `app/api/mcqs/route.ts` - List and create endpoints
- `app/api/mcqs/[id]/route.ts` - Get, update, delete endpoints
- `app/api/mcqs/[id]/attempt/route.ts` - Attempt recording endpoint
- `app/mcqs/page.tsx` - MCQ listing page
- `app/mcqs/new/page.tsx` - Create MCQ page
- `app/mcqs/[id]/page.tsx` - Preview/take MCQ page
- `app/mcqs/[id]/edit/page.tsx` - Edit MCQ page
- `components/mcq/` - All MCQ-related components

### Implementation Patterns

**Database Access Pattern**:
```typescript
// Use d1-client helpers for all database operations
import { executeQuery, executeQueryFirst, executeMutation } from '@/lib/d1-client';

// Example: Fetch MCQ with choices
const mcq = await executeQueryFirst<McqWithChoices>(
  `SELECT m.*, 
     json_group_array(
       json_object('id', c.id, 'choiceText', c.choice_text, 'isCorrect', c.is_correct, 'displayOrder', c.display_order)
     ) as choices
   FROM mcqs m
   LEFT JOIN mcq_choices c ON m.id = c.mcq_id
   WHERE m.id = ?1
   GROUP BY m.id`,
  [mcqId]
);
```

**Validation Pattern**:
```typescript
// Use Zod schemas for validation
import { z } from 'zod';
import { mcqCreateSchema } from '@/lib/schemas/mcq-schema';

const validatedData = mcqCreateSchema.parse(requestBody);
```

**Error Handling Pattern**:
```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
  }
  // Handle other errors
}
```

### Important Notes
- ✅ All database operations use the `lib/d1-client.ts` helpers to ensure proper parameter binding
- ✅ Services receive `db: D1Database` as parameter (no direct environment access)
- ✅ API routes use `getDatabaseFromEnv()` which internally uses `getCloudflareContext()` from `@opennextjs/cloudflare`
- ✅ Use API routes for all API calls (form submissions, data fetching, etc.)
- ⏳ Use React Hook Form with Zod for form validation on the client side (Phase 4)
- ✅ Proper authentication checks implemented - users can only edit/delete their own MCQs
- ✅ Choices validated to ensure exactly one is marked as correct (Zod refinement)
- ✅ Transactions used when creating/updating MCQs with choices (`executeBatch`)
- ✅ Pagination implemented from the start (default 10 per page, max 100)
- ✅ Search functionality queries title, description, and question_text fields (case-insensitive LIKE)
- ✅ Sorting support added (title, createdAt) - enhancement beyond PRD

---

## Success Criteria

- [ ] Users can create MCQs with 2-4 choices through the UI
- [ ] Users can view a list of all MCQs in a table format
- [ ] Users can edit their own MCQs
- [ ] Users can delete their own MCQs
- [ ] Users can click on an MCQ to view it in preview/take mode
- [ ] Students can submit answers and see immediate feedback
- [ ] All attempts are recorded in the database
- [ ] Validation prevents invalid MCQ creation (e.g., no correct answer, too few choices)
- [ ] Error messages are user-friendly and actionable
- [ ] UI is responsive and works on mobile devices
- [ ] All API endpoints return appropriate HTTP status codes
- [ ] Authentication is enforced on all protected routes

---

## Troubleshooting Guide

### Common Issue: MCQ creation fails silently
**Problem**: Form submission doesn't show error or success
**Cause**: Missing error handling in form submission
**Solution**: Add try-catch blocks and toast notifications
**Code Reference**: `app/mcqs/new/page.tsx`

### Common Issue: Choices not saving correctly
**Problem**: MCQ saves but choices are missing or incorrect
**Cause**: Transaction not properly handling choice inserts
**Solution**: Ensure batch insert uses transaction or proper error handling
**Code Reference**: `lib/services/mcq-service.ts`

### Common Issue: Attempt not recording
**Problem**: Student submits answer but attempt doesn't appear in database
**Cause**: Missing user authentication or incorrect choice ID
**Solution**: Verify authentication middleware and choice ID validation
**Code Reference**: `app/api/mcqs/[id]/attempt/route.ts`

---

## Future Enhancements

- Support for more than 4 choices
- Rich text formatting for questions and choices
- Image support in questions and choices
- Question categories and tags
- Bulk import/export of MCQs
- Question templates
- Analytics dashboard for attempt statistics
- Time limits for attempts
- Randomization of choice order
- Partial credit for multiple correct answers

## Future Enhancement Decisions

The following design decisions need to be made in future iterations:

### MCQ Visibility and Ownership
- Can teachers see MCQs created by other teachers, or only their own?
- Can students see all MCQs, or only ones assigned/shared with them?
- Should the listing page show all MCQs or filter by the current user by default?

### Role-Based Access Control
- Do we need distinct "teacher" and "student" roles, or is it user-based (creator vs. non-creator)?
- Should teachers have different permissions than students?
- Should there be an admin role with elevated permissions?

### MCQ Editing After Attempts
- Can a teacher edit an MCQ after students have attempted it?
- If yes, how should we handle existing attempts (keep as-is, invalidate, or mark as "legacy")?
- Should there be a warning when editing an MCQ that has existing attempts?

### Attempt Limits
- Should there be a limit on attempts per MCQ per student?
- Should students see their previous attempts and results in a history view?
- Should there be a "Review" mode showing all previous attempts with correct answers?

### MCQ Deletion Behavior
- When a teacher deletes an MCQ, should all attempts be deleted (CASCADE), or preserved for analytics?
- Should there be a confirmation dialog warning about deleting MCQs with existing attempts?
- Should we implement soft deletes for audit trails?

### UI/UX Enhancements
- Should there be additional filter options beyond search (by date, by creator, by category)?
- Should the MCQ listing support bulk operations (bulk delete, bulk export)?
- Should there be a dashboard view showing statistics about MCQs and attempts?
- Should the empty state have different messaging for teachers vs. students?

---

## Dependencies

### External Dependencies
- None (all functionality uses existing stack)

### Internal Dependencies
- User authentication system (must be implemented first)
- `lib/d1-client.ts` module (must be created)
- Database migration system (Wrangler)
- shadcn/ui components (Button, Table, Dialog, Form, etc.)

### Environment Variables
- None required (database binding handled via Cloudflare environment)

---

## Risks and Mitigation

### Technical Risks
- **Risk**: Database transaction failures could leave orphaned choices
- **Mitigation**: Use proper transaction handling and rollback on errors

- **Risk**: Concurrent edits could cause data loss
- **Mitigation**: Implement optimistic locking or last-write-wins with updated_at timestamp

- **Risk**: Large number of MCQs could slow down listing page
- **Mitigation**: Implement pagination from the start

### User Experience Risks
- **Risk**: Users might accidentally delete MCQs
- **Mitigation**: Implement confirmation dialogs and consider soft deletes

- **Risk**: Form validation errors might be unclear
- **Mitigation**: Provide specific, actionable error messages with field-level feedback

---

## Implementation Details

### Data Structures

#### TypeScript Interfaces

```typescript
// MCQ with nested choices
interface McqWithChoices {
  id: string;
  title: string;
  description: string | null;
  questionText: string;
  createdByUserId: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  choices: McqChoice[];
}

// Individual choice
interface McqChoice {
  id: string;
  mcqId: string;
  choiceText: string;
  isCorrect: boolean; // 0 or 1 in DB, boolean in TypeScript
  displayOrder: number;
  createdAt: string;
}

// MCQ Attempt
interface McqAttempt {
  id: string;
  mcqId: string;
  userId: string;
  selectedChoiceId: string;
  isCorrect: boolean;
  attemptedAt: string;
}

// Paginated response
interface PaginatedMcqs {
  data: McqWithChoices[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Create MCQ input
interface McqCreateInput {
  title: string;
  description?: string;
  questionText: string;
  choices: {
    choiceText: string;
    isCorrect: boolean;
    displayOrder: number;
  }[];
}

// Update MCQ input (same as create)
type McqUpdateInput = McqCreateInput;
```

### Component Inventory

#### Available shadcn/ui Components ✅

1. **Table Components** ✅
   - `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`
   - Location: `src/components/ui/table.tsx`
   - Status: Ready to use

2. **Form Components** ✅
   - `Button`, `Input`, `Textarea`, `Label`, `Field`, `FieldGroup`, `FieldError`, `FieldDescription`
   - Location: `src/components/ui/`
   - Status: Ready to use

3. **Dialog Components** ✅
   - `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
   - Location: `src/components/ui/dialog.tsx`
   - Status: Ready to use (for delete confirmation)

4. **Dropdown Menu** ✅
   - `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`
   - Location: `src/components/ui/dropdown-menu.tsx`
   - Status: Ready to use (for action menu)

5. **Badge** ✅
   - `Badge` component
   - Location: `src/components/ui/badge.tsx`
   - Status: Ready to use (for status indicators)

6. **Card** ✅
   - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
   - Location: `src/components/ui/card.tsx`
   - Status: Ready to use

7. **Toast Notifications** ✅
   - `sonner` via `Toaster` component
   - Location: `src/components/ui/sonner.tsx`
   - Status: Ready to use

8. **Skeleton** ✅
   - `Skeleton` component
   - Location: `src/components/ui/skeleton.tsx`
   - Status: Ready to use (for loading states)

#### Required Components (Need to Add)

1. **Pagination Component** ❌
   - **Status**: Not installed
   - **Action**: Install shadcn/ui pagination component
   - **Command**: `npx shadcn@latest add pagination`
   - **Location**: Will be created in `src/components/ui/pagination.tsx`
   - **Usage**: For MCQ listing pagination controls

2. **Sorting Icons** ⚠️
   - **Status**: Available via lucide-react
   - **Icons Needed**: `ArrowUpDown`, `ArrowUp`, `ArrowDown`
   - **Usage**: Sort indicators in table headers

### MCQ Listing Page Structure

#### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Navigation Header (with user menu)                      │
├─────────────────────────────────────────────────────────┤
│  Multiple Choice Question Listing    [Create MCQ] Button │
├─────────────────────────────────────────────────────────┤
│  [Search Input]                                          │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │ Title │ Description │ Question │ Choices │ Date │ ⚙ │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ ...   │ ...         │ ...      │ ...     │ ... │ ...│ │
│  └───────────────────────────────────────────────────┘ │
│  [Empty State if no MCQs]                               │
├─────────────────────────────────────────────────────────┤
│  [Pagination Controls]                                  │
└─────────────────────────────────────────────────────────┘
```

#### Table Columns

1. **Title** (Column 1)
   - Type: Text
   - Clickable: Yes (navigates to `/mcqs/[id]`)
   - Truncation: None (full width priority)

2. **Description** (Column 2)
   - Type: Text
   - Truncation: Max 100 characters, show ellipsis
   - Tooltip: Show full text on hover

3. **Question Text** (Column 3)
   - Type: Text
   - Truncation: Max 150 characters, show ellipsis
   - Tooltip: Show full text on hover

4. **Number of Choices** (Column 4)
   - Type: Badge with number
   - Format: "2 choices", "3 choices", "4 choices"

5. **Created Date** (Column 5)
   - Type: Formatted date
   - Format: "Jan 15, 2025" or relative "2 days ago"
   - Sortable: Yes (default: newest first)

6. **Actions** (Column 6)
   - Type: Dropdown menu button
   - Options: Edit, Delete
   - Icon: Three dots (MoreVertical from lucide-react)

#### Sorting Implementation

**Sortable Columns:**
- Title (ascending/descending)
- Created Date (newest first by default)
- Number of Choices (optional, for future)

**Sort State Management:**
- Use URL search params: `?sort=title&order=asc`
- Default: `?sort=createdAt&order=desc`
- Update URL on sort change, trigger data refetch

**Sort UI:**
- Clickable column headers
- Sort indicators: ArrowUpDown (unsorted), ArrowUp (asc), ArrowDown (desc)
- Visual feedback on active sort column

### Create MCQ Form Structure

#### Form Layout

```
┌─────────────────────────────────────────────────────────┐
│  Create Multiple Choice Question                        │
├─────────────────────────────────────────────────────────┤
│  Title *                                                │
│  [Input field - required, 1-200 chars]                  │
│                                                         │
│  Description (Optional)                                 │
│  [Textarea - optional, max 500 chars]                   │
│                                                         │
│  Question Text *                                         │
│  [Textarea - required, 1-1000 chars]                    │
│                                                         │
│  Choices *                                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Choice 1: [Input]  ○ Correct Answer  [Remove]     │ │
│  │ Choice 2: [Input]  ○ Correct Answer  [Remove]     │ │
│  └───────────────────────────────────────────────────┘ │
│  [+ Add Choice] (disabled when 4 choices)               │
│                                                         │
│  [Cancel]  [Create MCQ]                                 │
└─────────────────────────────────────────────────────────┘
```

#### Form Validation Rules

- **Title**: Required, 1-200 characters, real-time validation
- **Description**: Optional, max 500 characters (recommended)
- **Question Text**: Required, 1-1000 characters, real-time validation
- **Choices**: 
  - Minimum 2 choices required
  - Maximum 4 choices allowed
  - All choice texts must be non-empty
  - Exactly one choice must be marked as correct (radio button group)
  - Display order: 1, 2, 3, 4 (based on array index)

#### Form Behavior

- **Add Choice**: Adds new choice input, increments display order
- **Remove Choice**: Removes choice, reorders remaining choices
- **Correct Answer Selection**: Radio button group (only one selectable)
- **Submit Button**: Disabled until all validations pass
- **Cancel Button**: Navigates back to `/mcqs` listing

### Detailed Implementation Steps

#### Phase 0: Prerequisites

**Status**: ⏳ PARTIALLY COMPLETE

**Tasks:**
1. ✅ Verify authentication system is complete
2. ✅ Verify database migrations for users/sessions are applied
3. ⏳ Install pagination component: `npx shadcn@latest add pagination` (pending - needed for Phase 4)
4. ✅ Verify all required shadcn/ui components are available

**Deliverables:**
- ⏳ Pagination component installed (pending)
- ✅ All other prerequisites verified

---

#### Phase 1: MCQ Database Migration ✅ COMPLETE

**Objective**: Create database schema for MCQs, choices, and attempts

**Status**: ✅ COMPLETE

**Tasks:**
1. ✅ Create migration file: `migrations/0002_create_mcqs.sql`
2. ✅ Define `mcqs` table:
   ```sql
   CREATE TABLE mcqs (
     id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
     title TEXT NOT NULL,
     description TEXT,
     question_text TEXT NOT NULL,
     created_by_user_id TEXT NOT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
   );
   ```
3. ✅ Define `mcq_choices` table:
   ```sql
   CREATE TABLE mcq_choices (
     id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
     mcq_id TEXT NOT NULL,
     choice_text TEXT NOT NULL,
     is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
     display_order INTEGER NOT NULL DEFAULT 0,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (mcq_id) REFERENCES mcqs(id) ON DELETE CASCADE
   );
   ```
4. ✅ Define `mcq_attempts` table:
   ```sql
   CREATE TABLE mcq_attempts (
     id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
     mcq_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     selected_choice_id TEXT NOT NULL,
     is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
     attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (mcq_id) REFERENCES mcqs(id) ON DELETE CASCADE,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
     FOREIGN KEY (selected_choice_id) REFERENCES mcq_choices(id) ON DELETE CASCADE
   );
   ```
5. Add indexes:
   ```sql
   CREATE INDEX idx_mcqs_created_by ON mcqs(created_by_user_id);
   CREATE INDEX idx_mcq_choices_mcq_id ON mcq_choices(mcq_id);
   CREATE INDEX idx_mcq_attempts_mcq_id ON mcq_attempts(mcq_id);
   CREATE INDEX idx_mcq_attempts_user_id ON mcq_attempts(user_id);
   ```
6. ✅ Test migration locally: `wrangler d1 migrations apply quizmaker-db --local`
7. ✅ Verify tables, indexes, and foreign key constraints

**Deliverables:**
- ✅ `migrations/0002_create_mcqs.sql` file
- ✅ Database tables created and verified locally
- ✅ Migration ready for production (when approved)

---

#### Phase 2: MCQ Services ✅ COMPLETE

**Objective**: Create service layer for MCQ operations

**Status**: ✅ COMPLETE

**Tasks:**

1. **Create Zod Schemas** (`lib/schemas/mcq-schema.ts`):
   - `mcqChoiceSchema` - Single choice validation
   - `mcqCreateSchema` - Create MCQ validation (title, description, questionText, choices array)
   - `mcqUpdateSchema` - Update MCQ validation (same as create)
   - `mcqAttemptSchema` - Attempt validation (selectedChoiceId)
   - `mcqSchema` - Full MCQ structure
   - Validation rules:
     - Title: 1-200 characters
     - Question Text: 1-1000 characters
     - Choices: 2-4 choices, exactly one correct
     - All choice texts non-empty

2. **Create MCQ Service** (`lib/services/mcq-service.ts`):
   - `createMcq(userId: string, mcqData: McqCreateInput): Promise<McqWithChoices>`
     - Use transaction (`executeBatch`) to create MCQ and choices atomically
     - Generate IDs for MCQ and all choices
     - Set display_order based on array index
     - Return created MCQ with choices
   - `getMcqById(id: string): Promise<McqWithChoices | null>`
     - Fetch MCQ with all choices joined
     - Order choices by display_order
     - Return null if not found
   - `getMcqs(filters: { page?: number; limit?: number; search?: string; userId?: string; sort?: string; order?: 'asc' | 'desc' }): Promise<PaginatedMcqs>`
     - Default: page=1, limit=10, sort=createdAt, order=desc
     - Search: Query title, description, question_text (case-insensitive LIKE)
     - Pagination: Calculate offset, total count, total pages
     - Sorting: Support title, createdAt, choiceCount
     - Return paginated response
   - `updateMcq(id: string, userId: string, mcqData: McqUpdateInput): Promise<McqWithChoices>`
     - Verify ownership first
     - Delete existing choices, insert new choices (use transaction)
     - Update MCQ fields and updated_at timestamp
     - Return updated MCQ with choices
   - `deleteMcq(id: string, userId: string): Promise<void>`
     - Verify ownership first
     - Delete MCQ (CASCADE handles choices and attempts)
   - `verifyMcqOwnership(mcqId: string, userId: string): Promise<boolean>`
     - Check if user owns the MCQ

3. **Create Attempt Service** (`lib/services/mcq-attempt-service.ts`):
   - `recordAttempt(userId: string, mcqId: string, choiceId: string): Promise<McqAttempt>`
     - Validate choice belongs to MCQ
     - Check if choice is correct
     - Insert attempt record
     - Return attempt with isCorrect result
   - `getAttemptsByMcq(mcqId: string, userId?: string): Promise<McqAttempt[]>`
     - Get all attempts for an MCQ
     - Optionally filter by user
   - `getAttemptsByUser(userId: string): Promise<McqAttempt[]>`
     - Get all attempts by a user

**Deliverables:**
- ✅ `lib/schemas/mcq-schema.ts` with all validation schemas
- ✅ `lib/services/mcq-service.ts` with CRUD operations
- ✅ `lib/services/mcq-attempt-service.ts` with attempt operations
- ✅ All services use `lib/d1-client.ts` helpers
- ✅ Transaction handling for MCQ creation/update
- ✅ TypeScript compilation successful
- ⏳ Unit tests (to be completed in Phase 6)

---

#### Phase 3: MCQ API Routes ✅ COMPLETE

**Objective**: Implement REST API endpoints for MCQ operations

**Status**: ✅ COMPLETE

**Tasks:**

1. **Create `app/api/mcqs/route.ts`**:
   - **GET handler**:
     - Parse query params: `page`, `limit`, `search`, `userId`, `sort`, `order`
     - Validate pagination params (min/max limits)
     - Call `getMcqs` service method
     - Return paginated response with 200 status
   - **POST handler**:
     - Require authentication (use `getCurrentUser` helper)
     - Parse and validate request body with Zod schema
     - Call `createMcq` service method
     - Return created MCQ with 201 status
     - Handle validation errors (400)
     - Handle authentication errors (401)

2. **Create `app/api/mcqs/[id]/route.ts`**:
   - **GET handler**:
     - Extract `id` from params
     - Call `getMcqById` service method
     - Return MCQ with 200 status
     - Return 404 if not found
   - **PUT handler**:
     - Require authentication
     - Extract `id` from params
     - Verify ownership (call `verifyMcqOwnership`)
     - Parse and validate request body
     - Call `updateMcq` service method
     - Return updated MCQ with 200 status
     - Handle 403 if not owner
     - Handle 404 if not found
   - **DELETE handler**:
     - Require authentication
     - Extract `id` from params
     - Verify ownership
     - Call `deleteMcq` service method
     - Return 200 with success message
     - Handle 403 if not owner
     - Handle 404 if not found

3. **Create `app/api/mcqs/[id]/attempt/route.ts`**:
   - **POST handler**:
     - Require authentication
     - Extract `id` from params (mcqId)
     - Parse and validate request body (`selectedChoiceId`)
     - Call `recordAttempt` service method
     - Return attempt result with 201 status
     - Handle 400 for invalid choice
     - Handle 404 if MCQ or choice not found

**Deliverables:**
- ✅ All API routes implemented
- ✅ Authentication checks in place
- ✅ Ownership verification working
- ✅ Proper HTTP status codes
- ✅ Error handling with JSON responses
- ✅ Database access pattern correct (uses `getDatabaseFromEnv()`)
- ✅ TypeScript compilation successful
- ⏳ Integration tests (to be completed in Phase 6)

---

#### Phase 4: MCQ UI Components

**Objective**: Build reusable UI components for MCQ functionality

**Tasks:**

1. **Create `components/mcq/McqTable.tsx`**:
   - Props: `mcqs: McqWithChoices[]`, `onRowClick`, `onEdit`, `onDelete`
   - Use shadcn/ui Table components
   - Render table with all columns
   - Make rows clickable (cursor-pointer, hover effect)
   - Truncate description and question text
   - Show badge for choice count
   - Format dates
   - Show loading skeleton when `isLoading` prop is true
   - Handle empty state (delegated to McqEmptyState)

2. **Create `components/mcq/McqSearch.tsx`**:
   - Props: `value`, `onChange`, `placeholder`
   - Use Input component
   - Debounce search input (300ms delay)
   - Clear button (X icon) when value exists
   - Update URL search params on change

3. **Create `components/mcq/McqPagination.tsx`**:
   - Props: `page`, `totalPages`, `onPageChange`
   - Use shadcn/ui Pagination component
   - Show current page, total pages
   - Previous/Next buttons
   - Page number buttons (show ellipsis for many pages)
   - Disabled states for first/last page
   - Update URL search params on page change

4. **Create `components/mcq/McqEmptyState.tsx`**:
   - Props: `onCreateClick`
   - Show friendly message: "No MCQs found. Get started by creating your first MCQ!"
   - Prominent "Create MCQ" button
   - Optional illustration or icon

5. **Create `components/mcq/McqActionMenu.tsx`**:
   - Props: `mcqId`, `onEdit`, `onDelete`
   - Use DropdownMenu component
   - Three dots button (MoreVertical icon)
   - Edit menu item (navigates to edit page)
   - Delete menu item (opens confirmation dialog)
   - Use Dialog for delete confirmation

6. **Create `components/mcq/McqForm.tsx`**:
   - Props: `initialData?`, `onSubmit`, `onCancel`
   - Use React Hook Form with Zod resolver
   - Form fields: title, description, questionText
   - Dynamic choices array (2-4 choices)
   - Radio button group for correct answer
   - Add/Remove choice buttons
   - Real-time validation feedback
   - Submit button (disabled until valid)
   - Cancel button
   - Show loading state during submission

7. **Create `components/mcq/McqPreview.tsx`**:
   - Props: `mcq: McqWithChoices`, `onSubmit`, `userAttempts?`
   - Display MCQ title, description, question text
   - Render choices as radio buttons
   - Submit button
   - Show feedback after submission (correct/incorrect)
   - Display attempt history if provided
   - "Back to List" button

**Deliverables:**
- All MCQ UI components implemented
- Components use shadcn/ui primitives
- Responsive design
- Loading and error states
- Accessibility features (ARIA labels, keyboard navigation)

---

#### Phase 5: MCQ Pages and Integration

**Objective**: Create pages and integrate all components with API

**Tasks:**

1. **Update `app/page.tsx` (Home Page)**:
   - Check authentication status
   - Redirect authenticated users to `/mcqs`
   - Show welcome content for unauthenticated users (optional)

2. **Update `app/mcqs/page.tsx` (MCQ Listing)**:
   - Server component that checks authentication
   - Fetch initial MCQs (with pagination params from URL)
   - Pass data to client component
   - Create client component `McqListingPage`:
     - State: page, search, sort, order
     - Fetch MCQs from API on mount and when params change
     - Handle pagination
     - Handle search (debounced)
     - Handle sorting
     - Render: Header with "Create MCQ" button, McqSearch, McqTable (or McqEmptyState), McqPagination
     - Show loading skeleton during fetch
     - Show error toast on API errors

3. **Create `app/mcqs/new/page.tsx` (Create MCQ)**:
   - Client component with McqForm
   - Require authentication (redirect if not)
   - Handle form submission:
     - Call POST /api/mcqs
     - Show success toast
     - Redirect to `/mcqs` on success
     - Show error toast on failure
   - Handle cancel (navigate back)

4. **Create `app/mcqs/[id]/page.tsx` (Preview/Take MCQ)**:
   - Server component that fetches MCQ
   - Client component with McqPreview
   - Handle attempt submission:
     - Call POST /api/mcqs/[id]/attempt
     - Show feedback (correct/incorrect)
     - Refresh attempt history
   - Fetch user's previous attempts
   - Show attempt history

5. **Create `app/mcqs/[id]/edit/page.tsx` (Edit MCQ)**:
   - Server component that fetches MCQ
   - Verify ownership (redirect if not owner)
   - Client component with McqForm (pre-populated)
   - Handle form submission:
     - Call PUT /api/mcqs/[id]
     - Show success toast
     - Redirect to `/mcqs` on success
   - Handle cancel

6. **Integration**:
   - Ensure NavigationHeader is in root layout
   - Add toast notifications throughout (using Sonner)
   - Test complete user flows end-to-end

**Deliverables:**
- All pages implemented
- Forms integrated with React Hook Form and Zod
- API integration working
- Navigation and routing complete
- Toast notifications working
- Error handling in place

---

#### Phase 6: Testing and Refinement

**Objective**: Comprehensive testing, bug fixes, and optimization

**Tasks:**
1. Write unit tests for all services
2. Write integration tests for all API routes
3. Write component tests for UI components
4. Perform manual testing of all user flows
5. Test edge cases and error scenarios
6. Performance testing and optimization
7. Security testing
8. Accessibility audit
9. Fix all identified bugs
10. Code review and refactoring
11. Update documentation

**Deliverables:**
- Comprehensive test coverage (>80%)
- All bugs fixed
- Performance optimized
- Security verified
- Accessibility compliant
- Documentation updated

---

## Implementation To-Do List

### Phase 0: Prerequisites
- [x] Verify authentication system is working ✅
- [x] Verify database migrations for users/sessions are applied ✅
- [x] Verify all shadcn/ui components are available ✅
- [ ] Install pagination component: `npx shadcn@latest add pagination` (pending - needed for Phase 4)

### Phase 1: Database Migration ✅ COMPLETE
- [x] Create `migrations/0002_create_mcqs.sql` ✅
- [x] Define `mcqs` table schema ✅
- [x] Define `mcq_choices` table schema ✅
- [x] Define `mcq_attempts` table schema ✅
- [x] Add all required indexes ✅
- [x] Test migration locally: `wrangler d1 migrations apply quizmaker-db --local` ✅
- [x] Verify tables are created correctly ✅
- [x] Verify indexes are created ✅
- [x] Verify foreign key constraints work ✅
- [x] Test CASCADE delete behavior ✅

### Phase 2: Services Layer ✅ COMPLETE
- [x] Create `lib/schemas/mcq-schema.ts` ✅
  - [x] Define `mcqChoiceSchema` ✅
  - [x] Define `mcqCreateSchema` ✅
  - [x] Define `mcqUpdateSchema` ✅
  - [x] Define `mcqAttemptSchema` ✅
  - [x] Define `mcqSchema` ✅
  - [x] Define `mcqAttemptRecordSchema` ✅
  - [x] Define `PaginatedMcqs` interface ✅
- [x] Create `lib/services/mcq-service.ts` ✅
  - [x] Implement `createMcq` (with transaction) ✅
  - [x] Implement `getMcqById` ✅
  - [x] Implement `getMcqs` (with pagination, search, sorting) ✅
  - [x] Implement `updateMcq` (with ownership check) ✅
  - [x] Implement `deleteMcq` (with ownership check) ✅
  - [x] Implement `verifyMcqOwnership` ✅
- [x] Create `lib/services/mcq-attempt-service.ts` ✅
  - [x] Implement `recordAttempt` ✅
  - [x] Implement `getAttemptsByMcq` ✅
  - [x] Implement `getAttemptsByUser` ✅
- [x] TypeScript compilation successful ✅
- [ ] Write unit tests for all service methods (Phase 6)

### Phase 3: API Routes ✅ COMPLETE
- [x] Create `app/api/mcqs/route.ts` ✅
  - [x] Implement GET handler (list with pagination/search/sort) ✅
  - [x] Implement POST handler (create, authenticated) ✅
  - [x] Add error handling ✅
- [x] Create `app/api/mcqs/[id]/route.ts` ✅
  - [x] Implement GET handler (get single MCQ) ✅
  - [x] Implement PUT handler (update, ownership check) ✅
  - [x] Implement DELETE handler (delete, ownership check) ✅
  - [x] Add error handling ✅
- [x] Create `app/api/mcqs/[id]/attempt/route.ts` ✅
  - [x] Implement POST handler (record attempt) ✅
  - [x] Add error handling ✅
- [x] TypeScript compilation successful ✅
- [x] Verify authentication checks ✅
- [x] Verify ownership checks ✅
- [x] Verify database access pattern (uses `getDatabaseFromEnv()`) ✅
- [ ] Test all API endpoints (Phase 6 - integration tests)

### Phase 4: UI Components
- [ ] Create `components/mcq/McqTable.tsx`
  - [ ] Table structure with all columns
  - [ ] Clickable rows
  - [ ] Truncation for long text
  - [ ] Loading skeleton state
- [ ] Create `components/mcq/McqSearch.tsx`
  - [ ] Search input with debounce
  - [ ] Clear button
- [ ] Create `components/mcq/McqPagination.tsx`
  - [ ] Pagination controls
  - [ ] Page navigation
- [ ] Create `components/mcq/McqEmptyState.tsx`
  - [ ] Empty state message
  - [ ] Create button CTA
- [ ] Create `components/mcq/McqActionMenu.tsx`
  - [ ] Dropdown menu
  - [ ] Edit/Delete options
  - [ ] Delete confirmation dialog
- [ ] Create `components/mcq/McqForm.tsx`
  - [ ] Form with React Hook Form
  - [ ] Dynamic choices (2-4)
  - [ ] Correct answer selection (radio)
  - [ ] Add/Remove choice buttons
  - [ ] Validation feedback
- [ ] Create `components/mcq/McqPreview.tsx`
  - [ ] MCQ display
  - [ ] Choice selection (radio)
  - [ ] Submit button
  - [ ] Feedback display
  - [ ] Attempt history

### Phase 5: Pages and Integration
- [ ] Update `app/page.tsx`
  - [ ] Authentication check
  - [ ] Redirect logic
- [ ] Update `app/mcqs/page.tsx`
  - [ ] Server component (auth check, initial fetch)
  - [ ] Client component (state management, API calls)
  - [ ] Integrate McqTable, McqSearch, McqPagination
  - [ ] Handle pagination, search, sorting
  - [ ] Show loading/error states
- [ ] Create `app/mcqs/new/page.tsx`
  - [ ] Authentication check
  - [ ] McqForm integration
  - [ ] Form submission handling
  - [ ] Toast notifications
- [ ] Create `app/mcqs/[id]/page.tsx`
  - [ ] Server component (fetch MCQ)
  - [ ] Client component (McqPreview)
  - [ ] Attempt submission
  - [ ] Attempt history display
- [ ] Create `app/mcqs/[id]/edit/page.tsx`
  - [ ] Server component (fetch MCQ, ownership check)
  - [ ] Client component (McqForm pre-populated)
  - [ ] Form submission handling
  - [ ] Toast notifications
- [ ] Test complete user flows
- [ ] Verify navigation works
- [ ] Verify toast notifications

### Phase 6: Testing and Refinement
- [ ] Write unit tests for services
- [ ] Write integration tests for API routes
- [ ] Write component tests
- [ ] Manual testing of all flows
- [ ] Edge case testing
- [ ] Performance testing
- [ ] Security testing
- [ ] Accessibility audit
- [ ] Bug fixes
- [ ] Code review
- [ ] Documentation updates

---

## Current Status

**Last Updated**: 2025-01-09
**Current Phase**: Phase 3 Complete - Ready for Phase 4 (UI Components)
**Status**: ✅ PHASES 1-3 COMPLETE
**Completed Phases**:
- ✅ Phase 1: Database Migration (migrations/0002_create_mcqs.sql created and tested)
- ✅ Phase 2: Services Layer (schemas and services implemented)
- ✅ Phase 3: API Routes (all endpoints implemented)

**Next Steps**: 
1. Install pagination component: `npx shadcn@latest add pagination`
2. Begin Phase 4: MCQ UI Components
