# SHOPFLOW REACT DEVELOPMENT RULES

## 1. General
- This is a React frontend for a real product.
- Build code for maintainability, scalability, and future feature expansion.
- Do not create unnecessary duplicate code.
- Do not modify unrelated pages or components.
- Before creating a new component, check whether an existing reusable component can be used.

## 2. Folder Structure
Use:
- `pages/`        → complete screens
- `components/`   → reusable UI components
- `features/`     → feature-specific logic/components
- `services/`     → API communication
- `hooks/`        → reusable React hooks
- `validations/`  → input validation
- `utils/`        → helper functions
- `routes/`       → routing and protected routes
- `layouts/`      → shared page layouts

Keep UI, business logic, API communication, and validation separated where practical.

## 3. React
Use:
- Functional components
- JSX
- Props for parent → child data
- `useState` for local changing state
- `useEffect` only when side effects are required
- Reusable components
- Clear component boundaries

Avoid unnecessarily large components.

## 4. UI / Design
- Follow the provided Figma/Stitch design accurately.
- Maintain consistent spacing, typography, alignment, borders, buttons, inputs, tables, and cards.
- Reuse the existing design system.
- Do not introduce random colors, fonts, spacing, or styles.
- Desktop-first for the current project.

## 5. Viewport
Test the desktop UI at:
- 1366 × 768
- 1440 × 900
- 1920 × 1080

Check:
- No horizontal overflow
- No overlapping elements
- Sidebar alignment
- Table alignment
- Modal positioning
- Text wrapping
- Button visibility

## 6. Functionality
Every interactive element must work.

Check:
- Buttons
- Forms
- Search
- Filters
- Tables
- Modals
- Dropdowns
- Add/Edit/Delete actions
- Navigation

Do not create fake buttons that appear functional but do nothing.

## 7. State
Every data-driven page should consider:
- Initial state
- Loading state
- Success state
- Empty state
- Error state

Use appropriate React state management.

## 8. Validation
Validate user input before submission.

Examples:
- Required fields
- Phone number
- Quantity
- Price
- Discount
- GST
- Invalid values
- Maximum/minimum values

Frontend validation improves UX but must NOT be treated as the final security layer.

## 9. Error Handling
Separate user-facing errors from developer debugging information.

User should see:
"Unable to save the bill. Please try again."

Do NOT expose:
- Stack traces
- Database errors
- File paths
- Internal server information
- API secrets
- Technical implementation details

Keep useful technical error information available for developer debugging/logging.
Never silently swallow important errors.

## 10. Security
Frontend security requirements:
- Never hardcode passwords, API keys, database credentials, or secret keys.
- Never expose backend secrets in client-side code.
- Do not unnecessarily store sensitive customer/shop data in `localStorage`.
- Use HTTPS for production API communication.
- Validate and sanitize appropriate user input.
- Avoid unsafe HTML rendering.
- Do not use `dangerouslySetInnerHTML` unless absolutely necessary and properly sanitized.
- Use protected routes for authenticated pages.
- Handle authentication state safely.
- Clear sensitive client state during logout.

Important:
Frontend security is NOT sufficient for data protection.
Backend must enforce:
- Authentication
- Authorization
- Data validation
- Tenant/shop isolation
- Database access control

Never trust `shopId`, `userId`, `price`, permissions, or other security-sensitive values supplied by the frontend.

## 11. Data Leakage Prevention
Before completing a page, check:
- Is sensitive data unnecessarily exposed in the UI?
- Is sensitive data stored unnecessarily in browser storage?
- Are API responses exposing unnecessary fields?
- Are secrets present in source code?
- Are technical errors exposed to users?
- Can one shop access another shop's data?

Only request and display the data required by the page.

## 12. Accessibility
Use:
- Semantic HTML
- Proper labels
- Keyboard navigation
- Visible focus states
- Accessible buttons
- Appropriate input labels
- Meaningful alt text where images require it
- Sufficient text/background contrast

Do not rely only on color to communicate important information.

## 13. Scalability
Write code so future features can be added without rewriting unrelated functionality.

Prefer:
- Reusable components
- Feature-based organization
- Service/API abstraction
- Reusable validation
- Shared constants
- Small focused components

Avoid:
- Huge components
- Duplicate business logic
- Hardcoded repeated values
- Page-specific copies of reusable components

## 14. Page Completion Process
For EVERY page, follow:
1. Understand the design
2. Inspect existing project structure
3. Identify reusable components
4. Create page structure
5. Build components
6. Implement state
7. Implement events/interactions
8. Implement validation
9. Connect API/service layer when required
10. Add loading state
11. Add empty state
12. Add success state
13. Add error handling
14. Perform security review
15. Perform data-leakage review
16. Check accessibility
17. Check desktop viewport
18. Test edge cases
19. Fix errors
20. Review code quality
21. Mark page complete only after all checks pass

## 15. Before Coding
Do not immediately start coding.

First:
- Inspect existing files
- Understand the current architecture
- Identify reusable components
- Identify dependencies
- Identify existing styles
- Identify existing API/service patterns

Then explain the implementation plan briefly before making major structural changes.

## 16. After Coding
Provide a short completion report:

```markdown
PAGE:
[page name]

FILES CREATED:
[...]

FILES MODIFIED:
[...]

FUNCTIONALITY:
[...]

VALIDATION:
[...]

ERROR HANDLING:
[...]

SECURITY:
[...]

DATA LEAKAGE CHECK:
[...]

ACCESSIBILITY:
[...]

VIEWPORT CHECK:
[...]

REMAINING ISSUES:
[...]
```

Do not claim something was tested if it was not actually tested.
