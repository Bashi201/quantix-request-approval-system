# Quantix Service Request & Approval Platform

> **Enterprise Service Request & Multi-Tier Approval System**  
> **Backend**: Laravel 11+ · PHP 8.2+ · MySQL 8.0 · Laravel Sanctum · PHPUnit · PSR-12 (Laravel Pint)  
> **Frontend**: React 19 · TypeScript · Vite · Tailwind CSS · TanStack Query · Lucide React

---

## 1. Project Overview

The **Quantix Service Request & Approval Platform** provides a structured, enterprise-grade application for managing internal company requests (IT hardware repair, developer software licenses, facilities maintenance, and secure access provisioning). 

It replaces informal email threads and spreadsheets with a governed, audited platform featuring:
- **Role-Based Access Control (RBAC)**: Strict boundaries separating **Employees**, **Managers**, and **Operations Staff**.
- **Guarded Workflow State Machine**: 7 deterministic lifecycle states (`Draft` → `Submitted` → `Approved` | `Returned` | `Rejected` → `In Progress` → `Completed`) preventing unauthorized status bypassing.
- **Reporting Hierarchy**: Managers review and decide on requests submitted by their direct reports (`manager_id`).
- **Complete Immutable Audit Trail**: System activity records every state change, actor, timestamp, previous status, new status, and optional comment.
- **Threaded Discourse**: Contextual discussions on each request between authorized participants.
- **Asynchronous Queued Notifications**: Email and database alerts dispatched after database transaction commit without blocking synchronous API responses.
- **Modern Responsive React SPA**: Dedicated role-tailored dashboards, accessible modal dialogs for request creation and revisions, live date/time header, and 1-click seeded persona switchers.

---

## 2. System Architecture & Diagrams

### System Architecture
The application is structured as a **Modular Monolith with a Service Layer**, decoupling business logic from HTTP controllers and database persistence:

![System Architecture](docs/Service%20Request%20System%20Architecture.png)

### Database Entity-Relationship Diagram (ERD)
The relational schema satisfies 3rd Normal Form (3NF) with compound query indexes for optimal query execution:

![Database ERD](docs/Service%20Request%20System%20ERD.png)

---

## 3. Technology Stack & Prerequisites

### Backend
- **PHP**: `^8.2` (Developed and tested with `PHP 8.5.12`)
- **Framework**: `Laravel 11+`
- **Database**: `MySQL 8.0+` (or compatible PostgreSQL/SQLite)
- **Token Authentication**: `Laravel Sanctum 4+`
- **Testing**: `PHPUnit 12+` with `RefreshDatabase`
- **Code Hygiene**: `Laravel Pint` (PSR-12 strict formatting)
- **Package Manager**: `Composer 2.x`

### Frontend
- **Framework**: `React 19` with `TypeScript`
- **Build Tool**: `Vite 8+`
- **Styling**: `Tailwind CSS 4+`
- **State & Server Cache**: `@tanstack/react-query`
- **Routing**: `react-router-dom 7+`
- **HTTP Client**: `Axios` with automatic Sanctum token injection and 401 interceptors
- **Icons**: `lucide-react`

---

## 4. Quick Start & Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/Bashi201/quantix-request-approval-system.git
cd quantix-request-approval-system
```

### Step 2: Install Backend Dependencies & Configure Environment
```bash
composer install
cp .env.example .env
```

Ensure your `.env` specifies your local MySQL credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quantix_requests
DB_USERNAME=root
DB_PASSWORD=

QUEUE_CONNECTION=database
```

Generate the unique application encryption key:
```bash
php artisan key:generate
```

### Step 3: Run Database Migrations & Seeders (One Command)
Run database migrations and populate realistic test personas and requests in a single command:
```bash
php artisan migrate:fresh --seed
```

### Step 4: Start Backend API Server
```bash
php artisan serve
```
The API is now live at `http://127.0.0.1:8000/api`.

---

### Step 5: Install & Run Frontend SPA
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
The React frontend is live at `http://localhost:3000`.

To build the client for production:
```bash
npm run build
```

---

## 5. Queue Worker Instructions

All notifications (email and in-app database alerts) run through Laravel's asynchronous database queue to avoid blocking API response times.

### Running Queue Worker in Development
To process notifications continuously:
```bash
php artisan queue:work
```

To process pending jobs once (ideal for scripts and CI/CD pipelines):
```bash
php artisan queue:work --once
```

---

## 6. Running the Automated Test Suite

Run the complete test suite with one single command:
```bash
php artisan test
```

Or run PHPUnit with full testdox test descriptions:
```bash
./vendor/bin/phpunit --testdox
```

### Test Suite Metrics:
- **72 Automated Tests**, **378 Assertions**, **100% Pass Rate**.
- Highlights:
  - `LaptopRepairEndToEndWorkflowTest`: Verifies the exact 10-step full journey (Employee create/submit → Manager approve → Operations assign/start/complete → Employee review).
  - `FullRequestLifecycleJourneyTest`: Complete lifecycle with rejection, return, revision, and multi-actor notifications.
  - `RoleBasedClientWorkflowIntegrationTest`: Verifies seeded personas (Alice, Sarah, Oscar) with full token-based API integration.
  - `AuthorizationSecurityTest`: Enforces `403 Forbidden` for all unauthorized role attempts.
  - `NotificationDispatchTest`: Verifies queued notification dispatching and transaction `afterCommit` integrity.

---

## 7. Seeded Login Credentials

All seeded test accounts use the password: `password`.

| Role | Name | Email | Password | Supervisor | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Manager** | Sarah Connor | `sarah.manager@quantix.io` | `password` | None | Engineering Lead with 2 direct reports. |
| **Employee 1** | Alice Smith | `alice.dev@quantix.io` | `password` | Sarah Connor | Direct report to Sarah Connor. |
| **Employee 2** | Bob Jones | `bob.qa@quantix.io` | `password` | Sarah Connor | Direct report to Sarah Connor. |
| **Employee 3** | Charlie Brown | `charlie.ext@quantix.io` | `password` | None | Non-report employee (for 403 tests). |
| **Operations 1** | Oscar Martinez | `oscar.ops@quantix.io` | `password` | None | Senior IT Operations Administrator. |
| **Operations 2** | Olivia Vance | `olivia.ops@quantix.io` | `password` | None | DevOps Infrastructure Engineer. |

### Seeded Requests Distribution (10 Sample Requests):
The database is pre-seeded with 10 realistic requests spanning all lifecycle states:
- `REQ-202611-0001`: Alice Smith — `draft`
- `REQ-202611-0002`: Alice Smith — `submitted`
- `REQ-202611-0003`: Alice Smith — `returned` (with return note from Sarah)
- `REQ-202611-0004`: Alice Smith — `approved` (awaiting assignment)
- `REQ-202611-0005`: Alice Smith — `in_progress` (assigned to Oscar Martinez)
- `REQ-202611-0006`: Alice Smith — `completed` (assigned to Oscar Martinez)
- `REQ-202611-0007`: Bob Jones — `submitted`
- `REQ-202611-0008`: Bob Jones — `rejected` (with rejection explanation from Sarah)
- `REQ-202611-0009`: Bob Jones — `in_progress` (assigned to Olivia Vance)
- `REQ-202611-0010`: Charlie Brown — `submitted` (external report)

---

## 8. RESTful API Endpoints & Contract

### Authentication & Profile
- `POST /api/login`: Authenticate and receive Sanctum Bearer token.
- `POST /api/logout`: Revoke active Bearer token.
- `GET /api/me`: Get current user profile and direct manager details.

### Service Requests
- `GET /api/requests`: Scoped list with search, status filtering, category filtering, sorting, and pagination.
- `POST /api/requests`: Create a request (`submit: false` for Draft, `submit: true` for Immediate Review).
- `GET /api/requests/{id}`: Detailed view including requester, assigned staff, comments, and full activity history.
- `PUT /api/requests/{id}`: Edit a request (allowed only for owning employee when in `draft` or `returned` status).

### Workflow Transitions & Decisions
- `POST /api/requests/{id}/submit`: Employee sends draft or returned request for manager review.
- `POST /api/requests/{id}/decision`: Manager decides (`action: "approve"`, `"return"`, or `"reject"`). *Comment is strictly mandatory when returning*.
- `POST /api/requests/{id}/assign`: Operations assigns ticket to an operations staff member (`assigned_to_id`).
- `POST /api/requests/{id}/status`: Operations advances ticket status (`status: "in_progress"` or `"completed"`).

### Collaboration & Notifications
- `POST /api/requests/{id}/comments`: Post a comment (restricted to Requester, Direct Manager, and Operations).
- `GET /api/notifications`: Retrieve in-app notification alerts with unread counter.
- `PATCH /api/notifications/{id}/read`: Mark specific notification as read.
- `POST /api/notifications/read-all`: Mark all notifications as read.
- `GET /api/users/operations`: Directory of Operations users for ticket assignment.

---

## 9. API Usage Examples (cURL)

### 1. Authenticate (Employee Login)
```bash
curl -X POST http://127.0.0.1:8000/api/login \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice.dev@quantix.io","password":"password"}'
```

### 2. Create Service Request (Direct Submit)
```bash
curl -X POST http://127.0.0.1:8000/api/requests \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "category": "Equipment",
    "title": "MacBook Pro M3 Max Keyboard Repair",
    "description": "Spacebar and return keys sticking during engineering development.",
    "priority": "high",
    "submit": true
  }'
```

### 3. Manager Review Decision (Approve)
```bash
curl -X POST http://127.0.0.1:8000/api/requests/1/decision \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MANAGER_TOKEN>" \
  -d '{
    "action": "approve",
    "comment": "Approved under engineering hardware support contract."
  }'
```

### 4. Operations Ticket Assignment
```bash
curl -X POST http://127.0.0.1:8000/api/requests/1/assign \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <OPS_TOKEN>" \
  -d '{"assigned_to_id": 5}'
```

---

## 10. Key Engineering Decisions & Assumptions

1. **Role Modeling via PHP 8.1+ Enums**:
   - Implemented native `UserRole` and `RequestStatus` enums.
   - Eliminates magic strings and grants type safety across queries and models.
2. **Guarded State Transition Table**:
   - State machine logic is centralized in [`RequestWorkflowService`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/app/Services/RequestWorkflowService.php). Controllers never mutate statuses directly.
   - Invalid jumps immediately throw `InvalidStateTransitionException`, returning consistent `422 Unprocessable Entity` JSON responses with allowed alternative transitions.
3. **Manager Scope & Hierarchy**:
   - Managers can strictly act only on requests submitted by their own direct reports (`requester.manager_id == auth.id`).
   - Requests from employees without a direct manager can be viewed by Operations.
4. **Modal Window UX**:
   - Creating new service requests and editing returned requests occurs in focused, accessible modal dialogs without losing page context.
5. **Threaded Discourse via Decisions**:
   - When a manager returns or rejects a request with an explanation, that explanation is mirrored in both `request_activities` (audit log) and `request_comments` (discourse feed).
6. **Zero-Dependency Queue Persistence**:
   - Local development uses the database queue driver (`QUEUE_CONNECTION=database`), requiring no external Redis or Docker containers to review background notifications.

---

## 11. API Documentation Assets

The repository includes pre-built API testing assets:
- **Postman Collection**: [`docs/Quantix_Service_Request_API.postman_collection.json`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/Quantix_Service_Request_API.postman_collection.json) (Pre-configured environment variables and Bearer tokens for all 3 roles).
- **OpenAPI 3.0 Specification**: [`docs/openapi.yaml`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/openapi.yaml).
- **Architecture Documentation**: [`docs/ARCHITECTURE.md`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/ARCHITECTURE.md).
- **Database Schema Specification**: [`docs/DATABASE_DESIGN.md`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/DATABASE_DESIGN.md).

---

## 12. Quality Assurance & Verification Summary

| Category | Requirement | Status | Verification Method |
| :--- | :--- | :--- | :--- |
| **Authentication** | Sanctum Token Auth, Secure Login, Logout | Passed | `AuthTest`, `RoleBasedClientWorkflowIntegrationTest` |
| **State Machine** | 7-State Deterministic Transitions | Passed | `RequestWorkflowServiceTest`, `LaptopRepairEndToEndWorkflowTest` |
| **Authorization** | Strict RBAC Boundaries & 403 Forbidden | Passed | `AuthorizationSecurityTest` (10 tests) |
| **Full Journey** | Employee → Manager → Ops → Completed | Passed | `FullRequestLifecycleJourneyTest`, `LaptopRepairEndToEndWorkflowTest` |
| **Audit Trails** | Immutable activity logging on all changes | Passed | Verified in all feature journeys |
| **Notifications** | Queued email & database notifications | Passed | `NotificationDispatchTest`, `NotificationServiceTest` |
| **Frontend UI** | React 19 SPA, Dashboards, Modals, Responsive | Passed | TypeScript build (`npm run build`), manual testing |
| **Code Style** | PSR-12 strict formatting via Laravel Pint | Passed | `vendor/bin/pint --test` |
