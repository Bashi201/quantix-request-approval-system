# System Architecture & Technical Specification

## 1. Executive Summary

This document specifies the architectural blueprint for the **Quantix Service Request & Approval Platform**. The system is composed of:
1. **Backend**: A robust **Modular Monolith** built on **Laravel 11+** (PHP 8.2+) with strict Service Layer separation, Form Requests, Sanctum token authentication, Policies, Queued Notifications, and automated Pest/PHPUnit tests.
2. **Frontend**: A dedicated, decoupled **React 18+ SPA** (built with TypeScript, Vite, Tailwind CSS, TanStack React Query, and React Hook Form) consuming the REST API.

---

## 2. High-Level Architectural Diagram

```mermaid
graph TD
    subgraph ClientLayer["Frontend Client Layer (Vite + React SPA)"]
        UI["React 18 SPA (TypeScript + Tailwind)"]
        State["State / Data Cache (TanStack Query)"]
        AuthContext["Auth Context & Token Manager"]
    end

    subgraph APIGateway["HTTP / API Layer (Laravel Sanctum)"]
        Routes["API Routing (routes/api.php)"]
        Sanctum["Sanctum Token Guard (auth:sanctum)"]
        FormRequests["Form Request Validation Layer"]
        Policies["Authorization Policies & Gates"]
    end

    subgraph BusinessLayer["Service & Business Domain Layer"]
        Controllers["API Resource Controllers"]
        Services["Domain Services (RequestService, WorkflowService)"]
        StateMachine["Guarded Workflow State Machine"]
        ActivityLogger["Activity & Audit Logger"]
    end

    subgraph AsyncLayer["Queue & Notification Subsystem"]
        EventDispatcher["Laravel Event Dispatcher"]
        QueueWorker["Database Queue Worker"]
        Notifier["Database & Mail Notifications"]
    end

    subgraph DataLayer["Persistence Layer"]
        Eloquent["Eloquent ORM Models"]
        DB[("Relational Database (MySQL 8.0)")]
    end

    UI -->|HTTP / JSON with Bearer Token| APIGateway
    Routes --> Sanctum
    Sanctum --> FormRequests
    FormRequests --> Policies
    Policies --> Controllers
    Controllers --> Services
    Services --> StateMachine
    Services --> ActivityLogger
    Services --> Eloquent
    Services --> EventDispatcher
    EventDispatcher -.->|Async Queue| QueueWorker
    QueueWorker --> Notifier
    Notifier --> DB
    Eloquent --> DB
```

---

## 3. Backend Architecture: Modular Monolith with Service Layer

To avoid the pitfalls of "Fat Controllers" or "Bloated Active Record Models", the Laravel backend employs a clean **Layered Architecture (Modular Monolith)**:

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/
│   │   │   ├── AuthController.php
│   │   │   ├── ServiceRequestController.php
│   │   │   ├── RequestWorkflowController.php
│   │   │   ├── RequestCommentController.php
│   │   │   └── NotificationController.php
│   ├── Requests/
│   │   ├── LoginRequest.php
│   │   ├── StoreServiceRequest.php
│   │   ├── UpdateServiceRequest.php
│   │   ├── WorkflowDecisionRequest.php
│   │   ├── AssignRequest.php
│   │   ├── UpdateStatusRequest.php
│   │   └── StoreCommentRequest.php
│   ├── Resources/
│   │   ├── UserResource.php
│   │   ├── ServiceRequestResource.php
│   │   ├── ServiceRequestListResource.php
│   │   ├── RequestCommentResource.php
│   │   ├── RequestActivityResource.php
│   │   └── NotificationResource.php
│   └── Middleware/
│       └── EnsureUserHasRole.php
├── Models/
│   ├── User.php
│   ├── ServiceRequest.php
│   ├── RequestComment.php
│   └── RequestActivity.php
├── Policies/
│   └── ServiceRequestPolicy.php
├── Services/
│   ├── ServiceRequestService.php
│   ├── WorkflowEngine/
│   │   ├── RequestStateMachine.php
│   │   ├── RequestState.php
│   │   └── Transitions/
│   ├── ActivityLogService.php
│   └── NotificationService.php
├── Events/
│   └── RequestStatusChanged.php
├── Listeners/
│   └── SendStatusChangeNotification.php
└── Notifications/
    ├── RequestSubmittedNotification.php
    ├── RequestDecisionNotification.php
    ├── RequestAssignedNotification.php
    └── RequestStatusUpdatedNotification.php
```

### 3.1. Responsibilities of Architectural Components

| Component | Responsibility | Constraints |
| :--- | :--- | :--- |
| **Controllers** | Orchestrates HTTP request/response flow, invokes Form Requests, calls Service methods, and transforms output via API Resources. | Strictly no database queries, business rules, or status mutations inside controllers. |
| **Form Requests** | Validates inbound HTTP payloads, extracts verified data, and standardizes validation failure responses (HTTP 422). | Reusable rules, no state mutation. |
| **Policies & Gates** | Enforces Role-Based Access Control (RBAC) and object-level permissions (e.g. manager direct reports check). | Throws `403 Forbidden` if user is unauthorized. |
| **Domain Services** | Houses core business logic (`ServiceRequestService`, `ActivityLogService`). Coordinates transactions (`DB::transaction`). | Contains no HTTP/JSON references. |
| **Workflow State Machine** | Strict state transition table ensuring requests advance only along valid paths. Throws `InvalidStateTransitionException` (422) on violations. | Single source of truth for request status lifecycle. |
| **Eloquent Models** | Data access, relationship declarations, query scopes, and property casting. | Clean Active Record models without workflow side-effects. |
| **API Resources** | Serializes models into consistent, predictable JSON responses. Excludes internal hashes and provides formatted timestamps. | All API outputs pass through Resources. |
| **Events & Queues** | Decouples status change side-effects (email, in-app notification) from the synchronous HTTP cycle. | Handled asynchronously via database queue. |

---

## 4. Role-Based Access Control (RBAC) & Authorization

The system enforces three primary roles:
1. **Employee**: Submits requests, edits requests in `draft` or `returned` status, submits requests for review, tracks own requests, adds comments.
2. **Manager**: Reviews requests submitted **only by their own direct reports** (`requester.manager_id == auth.id`), makes decision (`approved`, `rejected`, `returned` with mandatory comment).
3. **Operations**: Views all approved requests across the company, assigns request owners, transitions work to `in_progress`, marks requests `completed`.

### Authorization Implementation:
- **`EnsureUserHasRole` Middleware**: Verifies whether the authenticated user holds one of the required roles before executing routes.
- **`ServiceRequestPolicy`**: Granular method-level authorization:
  - `view(User $user, ServiceRequest $request)`:
    - Employee: only if `$request->requester_id === $user->id`
    - Manager: only if `$request->requester->manager_id === $user->id`
    - Operations: allowed for all requests
  - `update(User $user, ServiceRequest $request)`:
    - Only Employee who created it, AND status is `draft` or `returned`.
  - `submit(User $user, ServiceRequest $request)`:
    - Only Employee who created it, AND status is `draft` or `returned`.
  - `makeDecision(User $user, ServiceRequest $request)`:
    - Only Manager where `$request->requester->manager_id === $user->id`, AND status is `submitted`.
  - `assign(User $user, ServiceRequest $request)`:
    - Only Operations role, AND status is `approved` or `in_progress`.
  - `updateStatus(User $user, ServiceRequest $request)`:
    - Only Operations role, AND status is `approved` or `in_progress`.
  - `addComment(User $user, ServiceRequest $request)`:
    - Requester, Requester's direct Manager, or any Operations staff.

---

## 5. Workflow State Machine & Lifecycle Rules

The lifecycle is modeled using an explicit, guarded state transition table in `App\Services\WorkflowEngine\RequestStateMachine`:

```mermaid
stateDiagram-v2
    [*] --> draft : Employee creates draft
    [*] --> submitted : Employee creates & submits directly

    draft --> submitted : Employee submits for review
    returned --> submitted : Employee edits & re-submits

    submitted --> approved : Manager approves
    submitted --> returned : Manager returns with comment
    submitted --> rejected : Manager rejects (Final)

    approved --> in_progress : Operations starts work / assigns
    in_progress --> completed : Operations completes (Final)

    rejected --> [*]
    completed --> [*]
```

### Transition Matrix & Guard Rules:

| Source Status | Allowed Action | Destination Status | Allowed Role | Mandatory Requirements |
| :--- | :--- | :--- | :--- | :--- |
| `draft` | `submit` | `submitted` | Employee (Owner) | Requester must have an assigned manager |
| `returned` | `submit` | `submitted` | Employee (Owner) | Must have passed validation |
| `submitted` | `approve` | `approved` | Manager (Direct) | Optional approval comment |
| `submitted` | `return` | `returned` | Manager (Direct) | **Mandatory comment explaining reason** |
| `submitted` | `reject` | `rejected` | Manager (Direct) | Optional rejection reason; **Terminal State** |
| `approved` | `assign` | `approved` | Operations | Valid `assigned_to_id` (Operations user) |
| `approved` | `start` | `in_progress` | Operations | Changes status to working |
| `in_progress`| `assign` | `in_progress` | Operations | Re-assigns owner |
| `in_progress`| `complete` | `completed` | Operations | **Terminal State** |

> **Transition Integrity**: Attempting any transition not defined above (e.g. `draft` -> `in_progress` or modifying a `completed`/`rejected` request) immediately aborts the transaction and returns `HTTP 422 Unprocessable Entity` with a descriptive error message.

---

## 6. End-to-End Sequence Diagrams

### 6.1. Complete Happy Path: From Submission to Completion

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Employee (Alice)
    actor Mgr as Manager (Sarah)
    actor Ops as Operations (Oscar)
    participant API as Laravel API
    participant WF as Workflow Engine
    participant DB as MySQL DB
    participant Queue as Queue & Notification

    Note over Emp,DB: Step 1: Request Creation & Submission
    Emp->>API: POST /api/requests (title, description, category, priority, submit=true)
    API->>WF: Validate transition [initial -> submitted]
    WF->>DB: Insert request (status: 'submitted', requester: Alice)
    WF->>DB: Log activity (action: 'SUBMITTED', actor: Alice)
    API->>Queue: Dispatch RequestSubmittedNotification to Sarah
    API-->>Emp: 201 Created (Request Resource)

    Note over Mgr,DB: Step 2: Manager Review & Approval
    Mgr->>API: GET /api/requests (scoped to direct reports)
    API-->>Mgr: 200 OK (List includes Alice's request)
    Mgr->>API: POST /api/requests/{id}/decision { action: 'approve' }
    API->>WF: Validate transition [submitted -> approved]
    WF->>DB: Update request status='approved', approved_at=NOW()
    WF->>DB: Log activity (action: 'APPROVED', actor: Sarah)
    API->>Queue: Dispatch RequestDecisionNotification to Alice & Ops
    API-->>Mgr: 200 OK (Request Resource)

    Note over Ops,DB: Step 3: Operations Assignment & Execution
    Ops->>API: GET /api/requests?status=approved
    API-->>Ops: 200 OK (List approved requests)
    Ops->>API: POST /api/requests/{id}/assign { assigned_to_id: Oscar }
    API->>DB: Update assigned_to_id=Oscar
    API->>DB: Log activity (action: 'ASSIGNED', actor: Oscar, assigned_to: Oscar)
    API-->>Ops: 200 OK

    Ops->>API: POST /api/requests/{id}/status { status: 'in_progress' }
    API->>WF: Validate transition [approved -> in_progress]
    WF->>DB: Update status='in_progress'
    WF->>DB: Log activity (action: 'IN_PROGRESS', actor: Oscar)
    API-->>Ops: 200 OK

    Note over Ops,DB: Step 4: Completion
    Ops->>API: POST /api/requests/{id}/status { status: 'completed' }
    API->>WF: Validate transition [in_progress -> completed]
    WF->>DB: Update status='completed', completed_at=NOW()
    WF->>DB: Log activity (action: 'COMPLETED', actor: Oscar)
    API->>Queue: Dispatch RequestStatusUpdatedNotification to Alice
    API-->>Ops: 200 OK (Request Resource)
```

### 6.2. Return and Re-submission Journey

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Employee
    actor Mgr as Manager
    participant API as Laravel API
    participant DB as MySQL DB

    Emp->>API: POST /api/requests (submit=true)
    API-->>Emp: 201 Created (status: 'submitted')

    Mgr->>API: POST /api/requests/{id}/decision { action: 'return', comment: 'Missing quote' }
    API->>DB: Update status='returned'
    API->>DB: Insert comment & activity log
    API-->>Mgr: 200 OK

    Note over Emp: Request is now editable by Employee
    Emp->>API: PUT /api/requests/{id} { title, description: 'Updated with quote' }
    API->>DB: Update request details
    API-->>Emp: 200 OK

    Emp->>API: POST /api/requests/{id}/submit
    API->>DB: Update status='submitted'
    API->>DB: Log activity (action: 'RESUBMITTED')
    API-->>Emp: 200 OK
```

---

## 7. Audit Trail & Activity Logging Architecture

Every mutation to a `service_requests` row produces an immutable record in `request_activities`:
- Actor User ID (`user_id`)
- Action identifier (`action`)
- Previous status (`from_status`)
- Target status (`to_status`)
- Decision or transition comment (`comment`)
- Contextual metadata (`metadata`: JSON diff of altered fields or assigned user ID)
- Creation timestamp (`created_at`)

Because `request_activities` is append-only, historical records can never be mutated or falsified, guaranteeing compliance with enterprise SaaS audit standards.

---

## 8. Asynchronous Notifications & Queues

When a state transition occurs:
1. `ServiceRequestService` fires a domain event: `RequestStatusChanged`.
2. A queued listener `SendStatusChangeNotification` intercepts the event and determines recipients:
   - Request Submitted -> Notifies direct Manager.
   - Request Returned / Rejected / Approved -> Notifies Requester.
   - Request Approved -> Notifies Operations group.
   - Request Assigned -> Notifies Assigned Operations User & Requester.
   - Request Completed -> Notifies Requester.
3. Notifications are dispatched via Laravel's `Queue` driver (configured as `database` for zero-dependency local execution) and persisted to the `notifications` table.

---

## 9. Performance & Query Optimization Strategy

1. **Eager Loading**: All list queries automatically eager-load `['requester:id,name,email', 'assignedTo:id,name,email']` to eradicate N+1 query bottlenecks.
2. **Selective Column Loading**: List endpoints return summary fields without bloated description texts.
3. **Compound Database Indexes**:
   - `(requester_id, status)` for Employee dashboards.
   - `(status, created_at)` for Operations queues.
   - `(manager_id)` on `users` for fast manager-hierarchy resolution.
4. **Pagination**: All listing endpoints enforce standardized pagination (`page` and `per_page`, capped at 100).
5. **Code Quality & Static Analysis**: Automated formatting with **Laravel Pint** and static analysis with **PHPStan / Larastan** (Level 6+).

