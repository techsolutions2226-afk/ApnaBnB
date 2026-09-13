# ApnaBnB — Before Edit Instructions

> **IMPORTANT:** Read this entire file before making ANY change to the ApnaBnB project.
>
> These instructions apply to every Claude Code / AI coding session working on this project.

---

## 1. Core Rules — NON-NEGOTIABLE

### 1.1 Never create a code file longer than 500 lines

- No code file should exceed **500 lines**.
- If a file approaches 500 lines, stop and evaluate whether the logic should be:
  - split into smaller modules,
  - extracted into reusable functions,
  - moved into a service,
  - moved into a utility,
  - moved into a reusable component,
  - or reorganized into a better architecture.

- Do NOT split files artificially just to satisfy the line limit.
- Keep each file focused on a clear responsibility.

### 1.2 Always prioritize a Single Source of Truth

- Every piece of important information must have **one authoritative source**.
- Do not duplicate:
  - business rules,
  - validation rules,
  - API contracts,
  - configuration,
  - constants,
  - database-related rules,
  - matching/scoring logic,
  - authentication logic,
  - permission logic,
  - UI data definitions.

- If the same information is required in multiple places, reference the authoritative source instead of copying it.
- Before creating a new constant, function, configuration value, or rule, search the project to determine whether it already exists.

### 1.3 Never assume code exists

**Do not believe that a file, function, component, API, route, model, middleware, utility, or feature exists until you have actually inspected the project.**

Before modifying anything:

1. Locate the relevant files.
2. Read the existing implementation.
3. Understand how the code currently works.
4. Trace dependencies where necessary.
5. Only then make changes.

Never say:

> "The project already has X"

unless you have verified X in the actual codebase.

### 1.4 Never blindly overwrite existing code

- Do not replace an entire file when only a small change is required.
- Preserve existing functionality unless the requested change explicitly requires removing it.
- Make the smallest safe change necessary.
- Do not rewrite working architecture simply because another implementation looks cleaner.

### 1.5 Execute changes in batches

Changes must be performed in **small, logical batches**.

Example:

```text
Batch 1 → Authentication changes
Batch 2 → Backend validation
Batch 3 → Frontend validation
Batch 4 → UI changes
Batch 5 → Testing / cleanup
```

Do not make a huge number of unrelated changes in one batch.

After each batch:

1. Review the changes.
2. Run relevant validation/tests.
3. Check for unintended changes.
4. Stage the intended files.
5. Commit the batch.

---

# 2. Git Rules

## 2.1 Commit after every completed change batch

Every logical batch must have its own commit.

Example:

```bash
git status
git diff
git add <specific-files>
git diff --cached
git commit -m "fix: validate Pakistan phone numbers"
```

### IMPORTANT

Never blindly use:

```bash
git add .
```

unless there is a specific reason and the entire working tree is intentionally part of the commit.

Prefer:

```bash
git add <specific files>
```

This prevents unrelated changes from accidentally entering the commit.

---

## 2.2 Always inspect Git status first

Before modifying code:

```bash
git status
```

Understand what changes already exist.

**Never overwrite or discard existing user changes without explicit permission.**

---

## 2.3 Never reset or delete user work without permission

Do NOT run destructive commands such as:

```bash
git reset --hard
git clean -fd
git checkout -- .
```

unless explicitly instructed.

Never delete existing work just because it looks unfinished or incorrect.

---

## 2.4 Review staged changes before committing

Before every commit:

```bash
git diff --cached
```

Confirm:

- only intended files are staged,
- no secrets are staged,
- no environment files are staged,
- no unrelated changes are included,
- no debugging code is included.

---

# 3. Discovery Before Editing

Before editing any feature, perform a focused investigation.

### Required process

```text
Understand request
        ↓
Inspect project structure
        ↓
Find relevant implementation
        ↓
Read existing code
        ↓
Trace dependencies
        ↓
Identify existing reusable components/functions
        ↓
Identify existing source of truth
        ↓
Plan smallest safe change
        ↓
Implement
        ↓
Validate
        ↓
Stage
        ↓
Commit
```

Do not skip discovery simply because the requested change appears simple.

---

# 4. Reuse Before Creating

Before creating a new:

- component,
- hook,
- utility,
- service,
- middleware,
- validator,
- API helper,
- schema,
- constant,
- CSS class pattern,
- layout,
- modal,
- form component,

search the project first.

If an existing implementation provides the same functionality, reuse it.

### Do not create duplicates such as:

```text
PhoneInput.jsx
PakistanPhoneInput.jsx
SignupPhoneInput.jsx
RegisterPhoneInput.jsx
```

if they all solve the same underlying problem.

Prefer one reusable source of truth.

---

# 5. Component Reuse

ApnaBnB should use reusable components wherever functionality or UI behavior is shared.

For example:

```text
Buttons
Inputs
Form fields
Cards
Property cards
Requirement cards
Modals
Dropdowns
Navigation
Headers
Footers
Loading states
Error states
Empty states
Authentication UI
Dashboard sections
```

If two pages need essentially the same component, do not duplicate the component.

Create or reuse a shared component.

---

# 6. Do Not Over-Abstract

Reuse does NOT mean creating complicated abstractions for everything.

Only extract something when:

- it is genuinely reusable,
- it has a clear responsibility,
- abstraction reduces duplication,
- or it establishes a necessary source of truth.

Avoid creating unnecessary layers simply to make the architecture appear sophisticated.

**Simple and maintainable > clever and complicated.**

---

# 7. Backend Rules

The backend is the authoritative source for business-critical rules.

Never rely only on frontend validation.

Frontend validation improves user experience.

Backend validation provides actual protection.

Every important rule must ultimately be enforced server-side.

Examples:

- authentication,
- authorization,
- user roles,
- property ownership,
- requirement ownership,
- permissions,
- financial values,
- property data,
- phone numbers,
- account status,
- deal states,
- matching rules,
- sensitive operations.

---

# 8. API Single Source of Truth

Before creating or modifying an API:

1. Find the existing route.
2. Find its controller/handler.
3. Find its service if applicable.
4. Find its validation.
5. Find its frontend usage.
6. Understand the request/response structure.

Do not create a second endpoint when an existing endpoint can be extended safely.

Avoid duplicate APIs such as:

```text
/api/properties
/api/property
/api/user-properties
/api/my-properties
```

unless there is a clear architectural reason.

---

# 9. Database Rules

The database schema/model is the authoritative structure for stored data.

Before adding a field:

1. Search whether the field already exists.
2. Check its model/schema.
3. Check backend usage.
4. Check frontend usage.
5. Check whether an existing field already represents the same information.

Do not create duplicate fields representing the same concept.

Example:

Do not create:

```text
phone
phoneNumber
mobile
mobileNumber
contactNumber
```

for the same purpose.

Use one authoritative field.

---

# 10. ApnaBnB Business Logic

ApnaBnB is a real-estate marketplace, not simply a basic property-listing clone.

Maintain clear separation between:

### Seller

Property owner / person offering a property.

### Buyer

Person searching for a property.

### Dealer

Real-estate agent / intermediary.

### Admin

Platform administrator.

Do not mix role-specific business logic unnecessarily.

---

# 11. Property vs Requirement

ApnaBnB has two important sides:

### Property

Supply:

> "I have this property available."

### Requirement

Demand:

> "I am looking for this type of property."

Do not accidentally treat a Requirement as a Property.

Keep their models, validation, lifecycle, and UI behavior clear.

---

# 12. Matching System

The property/requirement matching system must have **one authoritative implementation**.

The existing matching/scoring logic must not be duplicated across:

- frontend,
- backend,
- API routes,
- components,
- dashboards.

If matching calculations are business-critical, the backend should be authoritative.

Do not create a second scoring algorithm because a frontend component needs a score.

---

# 13. Authentication & Authorization

Authentication and authorization are security-critical.

Before changing authentication:

1. Trace the complete authentication flow.
2. Inspect login.
3. Inspect signup.
4. Inspect token handling.
5. Inspect middleware.
6. Inspect protected routes.
7. Inspect logout/revocation.
8. Inspect role/permission checks.
9. Inspect frontend authentication state.
10. Inspect socket authentication if applicable.

Never modify one part of authentication without checking how the other parts depend on it.

Do not introduce a second authentication mechanism unless explicitly required.

---

# 14. Security Rules

Security must be considered whenever modifying:

- authentication,
- authorization,
- passwords,
- tokens,
- cookies,
- localStorage/sessionStorage,
- APIs,
- file uploads,
- property ownership,
- user data,
- contact information,
- dealer functionality,
- deal rooms,
- payments,
- admin functionality.

Never trust frontend-controlled values for authorization.

Never expose secrets in:

```text
frontend code
Git
logs
API responses
client-side environment variables
```

Never commit:

```text
.env
private keys
API secrets
database credentials
JWT secrets
service-account credentials
```

---

# 15. Privacy / Contact Protection

ApnaBnB is intended to protect users from bypassing the platform.

When modifying contact-related functionality, carefully verify:

- who can see contact information,
- when it becomes visible,
- whether authorization is server-side,
- whether APIs expose hidden contact information,
- whether frontend code accidentally receives protected data.

Do not expose sensitive information simply because it is hidden using CSS.

If data must be private, it should not be unnecessarily sent to the client.

---

# 16. Validation Rules

Every user input should have appropriate validation.

Use:

```text
Frontend validation
        +
Backend validation
```

Frontend:

- user experience,
- immediate feedback,
- preventing obvious invalid input.

Backend:

- actual enforcement,
- security,
- data integrity.

Do not duplicate complicated validation logic unnecessarily.

Where practical, establish a clear authoritative validation rule and reuse it.

---

# 17. Error Handling

Do not silently swallow errors.

Avoid patterns such as:

```javascript
try {
   ...
} catch (error) {}
```

unless there is a deliberate reason.

Errors should:

- be handled intentionally,
- provide useful feedback,
- avoid leaking sensitive information,
- be logged appropriately on the server,
- produce predictable API responses.

---

# 18. Frontend Rules

The frontend should remain:

- responsive,
- mobile-first,
- reusable,
- consistent,
- accessible,
- maintainable.

ApnaBnB should prioritize mobile users.

Do not create desktop-only layouts and attempt to patch mobile behavior afterward.

---

# 19. UI Consistency

Before creating new UI:

1. Search for existing components.
2. Search for existing spacing patterns.
3. Search for existing typography.
4. Search for existing buttons.
5. Search for existing form controls.
6. Search for existing cards.
7. Search for existing responsive behavior.

Do not introduce a completely new visual pattern when an existing design system already provides the required behavior.

---

# 20. Loading / Error / Empty States

Important pages and components should consider:

```text
Loading
Success
Error
Empty
Unauthorized
Not found
```

Do not assume API data will always exist.

For example:

```text
No properties found
No requirements found
No matches found
Unable to load properties
Session expired
Property no longer available
```

should be handled intentionally where relevant.

---

# 21. Do Not Change Functionality While Changing UI

If the task is a UI/design change:

- do not modify backend behavior,
- do not modify API contracts,
- do not modify database schemas,
- do not modify authentication,
- do not modify business logic,

unless explicitly required.

Likewise, if the task is backend functionality, do not unnecessarily redesign unrelated frontend screens.

Keep changes scoped.

---

# 22. Do Not Fix Unrelated Problems Automatically

If you discover an unrelated bug:

1. Mention it.
2. Determine whether it blocks the requested work.
3. Do not silently change unrelated code.

Avoid scope creep.

---

# 23. Dependency Rules

Do not install a new npm package simply because it makes one small task easier.

Before adding a dependency:

1. Check whether an existing dependency already provides the functionality.
2. Check whether native JavaScript/React/Node functionality is sufficient.
3. Consider bundle size and maintenance.
4. Check compatibility with the existing project.
5. Only install it when there is a clear benefit.

Do not introduce unnecessary dependencies.

---

# 24. Environment Awareness

Before running commands that may affect the project, inspect the current environment.

Check:

```text
OS
Node version
npm version
project package manager
running services
ports
environment configuration
```

Do not assume a service is running on a specific port.

Do not assume a command exists.

Do not assume the project uses npm when the project may use another package manager.

Inspect:

```text
package.json
lock files
configuration files
```

first.

---

# 25. Do Not Modify Configuration Without Understanding It

Before modifying:

- Vite configuration,
- Next.js configuration,
- Express configuration,
- MongoDB configuration,
- environment variables,
- Docker configuration,
- deployment configuration,
- TypeScript configuration,
- ESLint configuration,

inspect how it is currently being used.

Configuration changes can affect the entire application.

---

# 26. Testing / Validation

After every meaningful change, validate the affected area.

Depending on the change, use:

```text
Lint
Build
Unit tests
Integration tests
API tests
Manual browser testing
Existing test suite
```

At minimum, verify that the modified functionality works and that the project still builds.

Do not claim:

> "Everything works"

unless you actually validated it.

---

# 27. Never Fake Verification

Never state:

- "I tested it" if you did not test it.
- "The API works" if you did not verify it.
- "The file exists" if you did not inspect it.
- "The build passes" if you did not run the build.
- "The database contains X" if you did not verify it.

Be explicit about what was actually checked.

---

# 28. Before Editing a File

For every file you intend to modify:

```text
1. Open/read the file.
2. Understand its responsibility.
3. Search for its imports/usages.
4. Identify dependencies.
5. Determine whether another file is the actual source of truth.
6. Make the smallest required change.
```

---

# 29. After Editing a File

Check:

```text
1. Syntax
2. Imports
3. Existing behavior
4. New behavior
5. Error handling
6. Responsive behavior if UI
7. Security implications if relevant
8. File size
9. Duplication
10. Single-source-of-truth compliance
```

---

# 30. AI Session Handoff Rule

Every new AI coding session must begin by understanding the current project state.

Do not assume the previous AI session completed everything it claimed.

First inspect:

```bash
git status
git log --oneline -10
```

Then inspect the relevant files.

Treat the actual repository as the source of truth — **not previous AI messages**.

If previous session instructions conflict with the actual code, trust the actual code after verifying it.

---

# 31. Session Handoff Summary

At the end of a significant session, provide a concise summary containing:

```text
## Completed
- ...

## Files Changed
- ...

## Commits
- ...

## Validation
- ...

## Known Issues
- ...

## Next Recommended Step
- ...
```

This makes the next Claude Code session easier to continue.

---

# 32. Keep Documentation Accurate

If architecture or important behavior changes, update the relevant documentation.

Do not create documentation that contradicts the actual implementation.

Documentation must never become a second source of truth for behavior that can be derived from the code/configuration.

---

# 33. Avoid Premature Refactoring

Do not refactor unrelated code simply because you encounter it.

Refactor when:

- it is necessary for the requested change,
- it causes a real maintainability problem,
- it violates a project rule,
- it creates duplication,
- or it is explicitly requested.

Prefer controlled incremental improvement.

---

# 34. Preserve Backward Compatibility Where Appropriate

Before changing an API, model, component interface, or shared utility:

Search for all usages.

Do not change a shared function/component signature without checking its consumers.

If a breaking change is necessary, update all affected consumers in the same controlled batch.

---

# 35. Performance

Do not optimize blindly.

Before making a performance-related change:

1. Identify the actual bottleneck.
2. Verify it.
3. Make the smallest effective change.
4. Validate that functionality remains correct.

Avoid unnecessary:

- API calls,
- database queries,
- React re-renders,
- large client-side data processing,
- duplicated requests,
- expensive computations.

---

# 36. Database Query Discipline

Avoid unnecessary database queries.

When modifying backend functionality:

- inspect existing queries,
- reuse existing service logic where appropriate,
- avoid N+1 query patterns,
- fetch only necessary data,
- use appropriate indexes when justified,
- do not add indexes blindly.

Never expose more database data to the frontend than necessary.

---

# 37. API Response Discipline

API responses should be intentional.

Do not return entire database documents when only a few fields are required.

Especially avoid unnecessarily exposing:

```text
passwords
tokens
internal IDs
private contact information
internal administrative fields
security-related information
```

unless explicitly required and authorized.

---

# 38. No Duplicate Business Rules

If a rule says:

```text
A user can perform X only when condition Y is true.
```

there should be one authoritative implementation of that business rule.

Do not implement:

```text
Frontend version
Backend version
Dashboard version
Admin version
Socket version
```

with slightly different logic.

The backend should enforce security-sensitive/business-critical rules.

---

# 39. Search Before Creating

Before creating anything, search.

At minimum search for:

```text
filename
component name
function name
route
API endpoint
database field
constant
CSS class
business term
```

This prevents accidental duplication.

---

# 40. Minimal Change Principle

When fixing a bug:

> **Change only what is necessary to correctly solve the problem.**

Do not rewrite an entire system to fix a small issue.

But do not make a tiny patch that creates technical debt when a small proper refactor is clearly required.

Use engineering judgment.

---

# 41. No Placeholder Implementations

Do not leave production functionality as:

```text
TODO
FIXME
dummy data
fake API response
hardcoded production values
temporary bypass
mock authentication
```

unless explicitly requested for development/testing.

Clearly identify temporary implementations.

---

# 42. No Silent Security Downgrades

Never weaken:

- authentication,
- authorization,
- validation,
- password security,
- token security,
- ownership checks,
- rate limiting,
- privacy controls,

just to make a feature easier to implement.

If a requested feature conflicts with security, stop and explain the conflict before implementing a weaker solution.

---

# 43. Final Pre-Commit Checklist

Before every commit, verify:

```text
[ ] Requested change is implemented
[ ] Existing functionality is preserved
[ ] No duplicate source of truth was created
[ ] Existing reusable components were considered
[ ] No unnecessary files were created
[ ] No code file exceeds 500 lines
[ ] No unrelated files were modified
[ ] No secrets are included
[ ] Validation/tests were performed
[ ] Build passes when applicable
[ ] Git diff was reviewed
[ ] Only intended files are staged
[ ] Commit message accurately describes the change
```

---

# 44. Golden Rule

When uncertain:

> **STOP → INSPECT → UNDERSTAND → PLAN → CHANGE → VALIDATE → STAGE → COMMIT**

Never:

> **ASSUME → CHANGE → HOPE**

The actual ApnaBnB repository is the source of truth.

Previous AI messages, assumptions, generated plans, and documentation are secondary to the actual code.

---

# 45. Priority Order

When making engineering decisions, prioritize in this order:

1. **Security**
2. **Correctness**
3. **Single Source of Truth**
4. **Data integrity**
5. **Existing functionality**
6. **Maintainability**
7. **Reusability**
8. **Performance**
9. **User experience**
10. **Visual polish**

Do not sacrifice higher-priority items for lower-priority ones.

---

## FINAL INSTRUCTION

**Do not start editing immediately.**

First inspect the actual project.

Understand the existing architecture.

Find the current source of truth.

Identify reusable code.

Make a small, controlled batch of changes.

Validate it.

Review the diff.

Stage only the intended files.

Commit the batch.

Then move to the next batch.

**Never assume. Never duplicate. Never blindly overwrite. Never exceed 500 lines per code file.**
