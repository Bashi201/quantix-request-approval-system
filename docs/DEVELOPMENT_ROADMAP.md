# Phased Development Roadmap & Execution Strategy

## 1. Roadmap Overview & Time Allocation

The development roadmap is structured into distinct, testable, and independently verifiable phases. The primary priority is fulfilling the **15-hour core backend scope** required by the assignment brief, followed by the optional **React frontend application**.

```
Backend Scope (15h Total):
├── Phase 1: Environment & Project Foundation (1.5h)
├── Phase 2: Domain Modeling & Database Persistence (2.5h)
├── Phase 3: Authentication, RBAC & Policies (2.0h)
├── Phase 4: Workflow State Machine & Request Operations (3.5h)
├── Phase 5: Async Queues, Activity Logging & Notifications (2.5h)
└── Phase 6: Automated Testing & Verification Suite (3.0h)

Optional Frontend Scope (7h Total):
├── Phase 7: React SPA Initialization & Design System (2.0h)
├── Phase 8: Auth, Dashboards & Role-Based Portals (3.5h)
└── Phase 9: End-to-End Integration, Polish & Documentation (1.5h)
```

---

## 2. Phase-by-Phase Implementation Plan

### Phase 1: Environment & Foundation Setup
- **Objective**: Establish the clean Laravel 11 application scaffolding with standard tooling, code styles, and git repository foundation.
- **Estimated Effort**: 1.5 Hours
- **Features to Implement**:
  - Initialize Laravel 11 in workspace.
  - Configure `.env` for MySQL 8.0 (`MySQL80` service).
  - Install and configure Laravel Sanctum for API token authentication.
  - Install and configure Pest testing framework.
  - Configure Laravel Pint for automated PSR-12 code formatting.
  - Initialize git repository and create initial commit.
- **Tasks in Implementation Order**:
  1. Initialize fresh Laravel 11 project into root workspace.
  2. Configure `.env` with DB connection credentials (`DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=quantix_requests`, `DB_USERNAME=root`).
  3. Verify database connectivity via artisan.
  4. Publish Sanctum configuration and ensure API routes file (`routes/api.php`) is loaded.
  5. Setup Pest test harness (`pest --init`).
  6. Create initial git commit.
- **Files/Folders to Create/Modify**:
  - `composer.json`
  - `.env`, `.env.example`
  - `bootstrap/app.php`
  - `routes/api.php`
  - `pint.json`
- **Dependencies**: None.
- **Acceptance Criteria**:
  - `php artisan --version` confirms Laravel 11+.
  - `php artisan db:show` connects cleanly to MySQL.
  - `vendor/bin/pest` executes baseline test suite without errors.
- **Potential Risks**:
  - MySQL authentication or port conflict on Windows. (Mitigation: verified local MySQL80 service is active).

---

### Phase 2: Domain Modeling & Database Persistence
- **Objective**: Implement database schema, migrations, eloquent models, and comprehensive database seeders.
- **Estimated Effort**: 2.5 Hours
- **Features to Implement**:
  - Migrations for `users` (with `role` and `manager_id`), `service_requests` (with `requester_id` and `assigned_to_id`), `request_comments`, `request_activities`, and `notifications`.
  - Eloquent models with relationship declarations, casts, and helper methods.
  - Comprehensive `DatabaseSeeder` creating the required 3 roles, a manager with 2 direct reports, and 10 requests spanning all lifecycle statuses.
- **Tasks in Implementation Order**:
  1. Create migration for updated `users` table (`role`, `manager_id`).
  2. Create migration for `service_requests` table with foreign keys and compound indexes.
  3. Create migration for `request_comments` table.
  4. Create migration for `request_activities` audit log table.
  5. Create Laravel notifications migration (`php artisan notifications:table`).
  6. Create Eloquent models: `User`, `ServiceRequest`, `RequestComment`, `RequestActivity`.
  7. Implement Model Factories for `User` and `ServiceRequest`.
  8. Implement `DatabaseSeeder` matching the sample data matrix in `docs/DATABASE_DESIGN.md`.
  9. Run `php artisan migrate:fresh --seed` and verify database records.
- **Files/Folders Created**:
  - `database/migrations/2026_11_10_000001_create_users_table.php`
  - `database/migrations/2026_11_10_000003_create_service_requests_table.php`
  - `database/migrations/2026_11_10_000004_create_request_comments_table.php`
  - `database/migrations/2026_11_10_000005_create_request_activities_table.php`
  - `database/seeders/DatabaseSeeder.php`
  - `app/Models/User.php`
  - `app/Models/ServiceRequest.php`
  - `app/Models/RequestComment.php`
  - `app/Models/RequestActivity.php`
- **Dependencies**: Phase 1.
- **Acceptance Criteria**:
  - `php artisan migrate:fresh --seed` succeeds without errors or warnings.
  - All foreign key constraints and indexes created correctly in MySQL.
  - 10 sample requests created across all statuses (`draft`, `submitted`, `returned`, `approved`, `in_progress`, `completed`, `rejected`).
- **Potential Risks**:
  - Self-referencing foreign key constraint ordering on `users`. (Mitigation: make `manager_id` nullable and delete set null).

---

### Phase 3: Authentication, RBAC & Policies
- **Objective**: Implement authentication endpoints (`login`, `logout`, `me`) and establish declarative authorization gates and policies.
- **Estimated Effort**: 2.0 Hours
- **Features to Implement**:
  - `AuthController` for token-based authentication via Sanctum.
  - `EnsureUserHasRole` middleware for coarse-grained endpoint access.
  - `ServiceRequestPolicy` with object-level checks (e.g. manager direct reports check).
  - API Resources for consistent JSON response shaping (`UserResource`).
- **Tasks in Implementation Order**:
  1. Implement `LoginRequest` with validation rules.
  2. Implement `AuthController` with `login()`, `logout()`, and `me()`.
  3. Implement `EnsureUserHasRole` middleware and register alias.
  4. Implement `ServiceRequestPolicy` with view, update, submit, decision, assign, status, and comment permissions.
  5. Register policy in `AppServiceProvider`.
  6. Write automated tests for login, token verification, and 401 unauthorized handling.
- **Files/Folders Created**:
  - `app/Http/Controllers/Api/AuthController.php`
  - `app/Http/Requests/LoginRequest.php`
  - `app/Http/Middleware/EnsureUserHasRole.php`
  - `app/Policies/ServiceRequestPolicy.php`
  - `app/Http/Resources/UserResource.php`
  - `tests/Feature/AuthTest.php`
- **Dependencies**: Phase 2.
- **Acceptance Criteria**:
  - `POST /api/login` issues valid Bearer token for valid credentials.
  - `GET /api/me` returns authenticated user profile with direct manager details.
  - `POST /api/logout` revokes current token.
- **Testing Requirements**:
  - Tests for invalid credentials returning 422.
  - Tests for unauthenticated requests returning 401.

---

### Phase 4: Workflow State Machine & Request Operations
- **Objective**: Implement the core service request API, guarded workflow state machine, and comment engine.
- **Estimated Effort**: 3.5 Hours
- **Features to Implement**:
  - `RequestStateMachine` modeling guarded status transitions and validation.
  - `ServiceRequestService` handling atomic creation, updates, and transitions.
  - Form Requests for all endpoints with strict input validation.
  - Role-scoped `GET /api/requests` with search, filtering, sorting, and pagination.
  - Complete workflow endpoints: `submit`, `decision`, `assign`, `status`, `comments`.
  - Consistent API Resources with JSON response envelopes.
- **Tasks in Implementation Order**:
  1. Build `App\Services\WorkflowEngine\RequestStateMachine` with `transition()` and `canTransition()`.
  2. Build custom exception `InvalidStateTransitionException` rendering standard 422 JSON response.
  3. Implement `ServiceRequestService` with transaction-wrapped actions.
  4. Implement Form Requests: `StoreServiceRequest`, `UpdateServiceRequest`, `WorkflowDecisionRequest`, `AssignRequest`, `UpdateStatusRequest`, `StoreCommentRequest`.
  5. Implement `ServiceRequestController`, `RequestWorkflowController`, and `RequestCommentController`.
  6. Implement API Resources: `ServiceRequestResource`, `ServiceRequestListResource`, `RequestCommentResource`.
  7. Wire endpoints in `routes/api.php` with Sanctum middleware and policy authorization.
- **Files/Folders Created**:
  - `app/Services/WorkflowEngine/RequestStateMachine.php`
  - `app/Exceptions/InvalidStateTransitionException.php`
  - `app/Services/ServiceRequestService.php`
  - `app/Http/Controllers/Api/ServiceRequestController.php`
  - `app/Http/Controllers/Api/RequestWorkflowController.php`
  - `app/Http/Controllers/Api/RequestCommentController.php`
  - `app/Http/Requests/*` (6 Form Requests)
  - `app/Http/Resources/*` (3 Resources)
- **Dependencies**: Phase 3.
- **Acceptance Criteria**:
  - Invalid transitions fail with 422 and a descriptive JSON error.
  - Managers cannot act on requests from employees outside their direct reports (returns 403).
  - Employees can only edit `draft` and `returned` requests.
  - Only Operations users can assign and complete requests.
  - All responses conform to unified JSON envelopes.
- **Potential Risks**:
  - Edge cases in manager direct report checks. (Mitigation: policy explicitly validates `$request->requester->manager_id === $user->id`).

---

### Phase 5: Async Queues, Activity Logging & Notifications
- **Objective**: Implement background queues, automated audit logging for every status transition, and asynchronous notification delivery.
- **Estimated Effort**: 2.5 Hours
- **Features to Implement**:
  - `ActivityLogService` recording transitions and comments in `request_activities`.
  - Domain event `RequestStatusChanged` dispatched on every transition.
  - Queued event listener `SendStatusChangeNotification`.
  - Notification classes for each lifecycle change.
  - In-app notification retrieval (`GET /api/notifications`) and read receipt endpoints (`PATCH /api/notifications/{id}/read`).
- **Tasks in Implementation Order**:
  1. Implement `ActivityLogService` and integrate with `ServiceRequestService`.
  2. Create `RequestStatusChanged` event carrying the request, actor, previous status, and comments.
  3. Create queued notification classes: `RequestSubmittedNotification`, `RequestDecisionNotification`, `RequestAssignedNotification`, `RequestStatusUpdatedNotification`.
  4. Create `SendStatusChangeNotification` listener to determine target recipients.
  5. Implement `NotificationController` and `NotificationResource`.
  6. Verify queued jobs execute via `php artisan queue:work --once`.
- **Files/Folders Created**:
  - `app/Services/ActivityLogService.php`
  - `app/Events/RequestStatusChanged.php`
  - `app/Listeners/SendStatusChangeNotification.php`
  - `app/Notifications/*` (4 Notification classes)
  - `app/Http/Controllers/Api/NotificationController.php`
  - `app/Http/Resources/RequestActivityResource.php`
  - `app/Http/Resources/NotificationResource.php`
- **Dependencies**: Phase 4.
- **Acceptance Criteria**:
  - Every status change produces a corresponding `request_activities` row.
  - Notification jobs are reliably dispatched to queue when request changes state.
  - Targeted users receive notification in `notifications` table.

---

### Phase 6: Automated Testing & Verification Suite
- **Objective**: Author a comprehensive automated test suite in Pest/PHPUnit verifying all business rules, security boundaries, and edge cases.
- **Estimated Effort**: 3.0 Hours
- **Features to Implement**:
  - **Happy Path Tests**: End-to-end journey from Employee creation -> Manager approval -> Operations assignment -> In Progress -> Completion.
  - **Authorization & Security Tests**: Proving 403 Forbidden for:
    - Manager attempting to act on non-report's request.
    - Employee attempting to approve or assign requests.
    - Employee attempting to view another employee's request.
    - Operations attempting manager review.
  - **State Machine Guard Tests**: Proving 422 Unprocessable Entity for:
    - Attempting to complete a draft directly.
    - Attempting to edit an approved or completed request.
    - Attempting to return a request without a comment.
    - Attempting to alter a rejected request.
  - **Notification Dispatch Tests**: Proving notifications are pushed to queue on status updates (`Queue::fake()` / `Notification::fake()`).
  - **Performance Verification**: Ensuring no N+1 query warnings using query count assertions.
  - Run Laravel Pint to ensure 100% PSR-12 styling.
- **Tasks in Implementation Order**:
  1. Author `tests/Feature/HappyPathWorkflowTest.php`.
  2. Author `tests/Feature/AuthorizationSecurityTest.php`.
  3. Author `tests/Feature/WorkflowStateTransitionTest.php`.
  4. Author `tests/Feature/NotificationDispatchTest.php`.
  5. Author `tests/Unit/RequestStateMachineTest.php`.
  6. Execute `php artisan test` and verify 100% pass rate.
  7. Run `vendor/bin/pint` for code hygiene.
- **Dependencies**: Phase 5.
- **Acceptance Criteria**:
  - 100% of automated tests pass with a single `php artisan test` command.
  - Zero failing assertions or unhandled exceptions.

---

### Phase 7: React Frontend - Setup & Shared Design System (Optional Scope)
- **Objective**: Establish the React 18 SPA with Vite, TypeScript, Tailwind CSS, routing, and shared UI primitives.
- **Estimated Effort**: 2.0 Hours
- **Features to Implement**:
  - Vite + React + TypeScript scaffold in `client/` directory.
  - Tailwind CSS configured with modern SaaS palette (slate/indigo).
  - React Router DOM v6 setup with route guards (`ProtectedRoute`).
  - Lucide React icon library integration.
  - Axios HTTP client configured with Bearer token interceptor and global error handler.
  - Shared UI components: `Button`, `Input`, `Badge` (status-colored), `Card`, `Modal`, `Alert`, `LoadingSpinner`.
- **Dependencies**: Phase 6.

---

### Phase 8: React Frontend - Portals & Workflows (Optional Scope)
- **Objective**: Build out the role-tailored dashboards and request interaction pages.
- **Estimated Effort**: 3.5 Hours
- **Features to Implement**:
  - Authentication views: Login page with quick-fill sample user credentials for reviewers.
  - Layout: Responsive navbar with user profile dropdown, notification bell drawer, and sidebar.
  - **Employee Portal**:
    - My Requests data table (search, status filter, pagination).
    - New Request modal / page with draft/submit options.
    - Edit returned/draft request view.
  - **Manager Portal**:
    - Team Requests pending review queue.
    - One-click review drawer with Approve, Reject, and Return (with required comment) actions.
  - **Operations Portal**:
    - All Requests queue with status tabs.
    - Assign owner modal with operations user selector.
    - Status progress buttons (Start Work, Mark Completed).
  - **Shared Request Detail View**:
    - Request header and metadata cards.
    - Interactive visual status pipeline / stepper.
    - Chronological activity timeline audit trail.
    - Comment discussion thread with inline reply box.
- **Dependencies**: Phase 7.

---

### Phase 9: End-to-End Integration, Polish & Documentation
- **Objective**: Verify full stack operation, create automated seed commands, and complete final deliverables.
- **Estimated Effort**: 1.5 Hours
- **Features to Implement**:
  - Verify complete cross-role workflows in browser against backend API.
  - Generate comprehensive OpenAPI / Swagger specification and Postman collection.
  - Write detailed root `README.md` with 1-step setup instructions, test commands, credentials, and architectural notes.
  - Record git commits with clean, conventional commit messages.
- **Dependencies**: Phase 8.
- **Acceptance Criteria**:
  - Both backend and frontend run seamlessly from the workspace.
  - A reviewer can run tests, seed sample data, and test all user roles within minutes.

