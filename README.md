# Quantix Service Request & Approval Platform

> **Candidate Engineering Challenge**: Service Request & Approval API for a Business SaaS Platform  
> **Built with**: Laravel 11+ · PHP 8.2+ · MySQL 8.0 · Laravel Sanctum · PHPUnit · PSR-12 (Laravel Pint)

---

## 1. Project Overview

The **Quantix Service Request & Approval Platform** provides a structured, enterprise-grade backend module for managing internal company requests (IT support, equipment, maintenance, and access provisioning). 

It replaces informal spreadsheets and messages with:
- **Role-Based Access Control**: Strict boundaries separating **Employees**, **Managers**, and **Operations Users**.
- **Guarded Workflow State Machine**: Explicit transitions (`Draft` → `Pending Approval` → `Approved` | `Returned` | `Rejected` → `In Progress` → `Completed`) preventing illegal jumps or status bypassing.
- **Reporting Hierarchy**: Managers can only review and act on requests submitted by their direct reports (`manager_id`).
- **Complete Audit Trail**: Immutable history recording every state change, actor, timestamp, and optional comment.
- **Threaded Discourse**: Contextual comment thread on each request between authorized participants.
- **Asynchronous Notifications**: Queued alerts dispatched on state changes without blocking synchronous API responses.

---

## 2. System Architecture & Diagrams

### System Architecture
The application is structured as a **Modular Monolith with a Service Layer**, decoupling business logic from HTTP controllers and database persistence:

![System Architecture](docs/Service%20Request%20System%20Architecture.png)

### Database Entity-Relationship Diagram (ERD)
The relational schema satisfies 3rd Normal Form (3NF) with compound query indexes:

![Database ERD](docs/Service%20Request%20System%20ERD.png)

---

## 3. Technology Stack & Prerequisites

- **PHP**: `^8.2` (Developed and tested with `PHP 8.5.12`)
- **Framework**: `Laravel 11+`
- **Database**: `MySQL 8.0+` (or compatible PostgreSQL/SQLite)
- **Token Authentication**: `Laravel Sanctum 4+`
- **Testing**: `PHPUnit 12+` with `RefreshDatabase`
- **Code Hygiene**: `Laravel Pint` (PSR-12 strict formatting)
- **Package Manager**: `Composer 2.x`

---

## 4. Quick Start & Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/Bashi201/quantix-request-approval-system.git
cd quantix-request-approval-system
```

### Step 2: Install Composer Dependencies
```bash
composer install
```

### Step 3: Configure Environment
Copy the example environment file:
```bash
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

### Step 4: Run Migrations and Seeders (One Command)
Run database migrations and populate the comprehensive test suite in a single command:
```bash
php artisan migrate:fresh --seed
```

### Step 5: Start Local Development Server
```bash
php artisan serve
```
The API is now live at `http://127.0.0.1:8000/api`.

---

## 5. Queue Worker Instructions

All notifications (email and in-app database alerts) run through Laravel's asynchronous queue to avoid blocking API response times.

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

### Test Suite Summary:
- **67 Automated Tests**, **286 Assertions**, **100% Pass Rate**.
- Covers:
  - Full end-to-end continuous journey (`Employee` → `Manager` → `Operations` → `Completed`).
  - Unit tests for State Machine transition validation and terminal state rules.
  - Security boundary tests verifying `403 Forbidden` for all unauthorized actions.
  - Form validation and illegal transition tests returning `422 Unprocessable Entity`.
  - Queued notification dispatching and transaction `afterCommit` integrity.
  - Query performance tests preventing N+1 regressions.

---

## 7. Seeded Login Credentials

All seeded test accounts use the password: `password`.

| Role | Name | Email | Password | Supervisor | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Manager** | Sarah Connor | `sarah.manager@quantix.io` | `password` | None | Engineering Lead with 2 direct reports. |
| **Employee 1** | Alice Smith | `alice.dev@quantix.io` | `password` | Sarah Connor | Direct report to Sarah Connor. |
| **Employee 2** | Bob Jones | `bob.qa@quantix.io` | `password` | Sarah Connor | Direct report to Sarah Connor. |
| **Employee 3** | Charlie Brown | `charlie.ext@quantix.io` | `password` | None | Non-report employee (for 403 test). |
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
    "title": "Ergonomic Mechanical Keyboard",
    "description": "Split wireless keyboard for workstation ergonomical setup.",
    "priority": "medium",
    "submit": true
  }'
```

### 3. Manager Review Decision (Return for Revision)
```bash
curl -X POST http://127.0.0.1:8000/api/requests/1/decision \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MANAGER_TOKEN>" \
  -d '{
    "action": "return",
    "comment": "Please specify the hardware vendor SKU and unit price."
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
3. **Manager Scope & Independence**:
   - Managers can strictly act only on requests submitted by their own direct reports (`requester.manager_id == auth.id`).
   - Requests from employees without a direct manager can be viewed by Operations.
4. **Discourse Threading via Decisions**:
   - When a manager returns or rejects a request with an explanation, that explanation is mirrored in both `request_activities` (audit log) and `request_comments` (discourse feed).
5. **Zero-Dependency Queue Persistence**:
   - Local development uses the database queue driver (`QUEUE_CONNECTION=database`), requiring no external Redis or Docker containers to review background notifications.

---

## 11. API Documentation Assets

The repository includes pre-built API testing assets:
- **Postman Collection**: [`docs/Quantix_Service_Request_API.postman_collection.json`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/Quantix_Service_Request_API.postman_collection.json) (Pre-configured environment variables and Bearer tokens for all 3 roles).
- **OpenAPI 3.0 Specification**: [`docs/openapi.yaml`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/openapi.yaml).
- **Architecture Documentation**: [`docs/ARCHITECTURE.md`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/ARCHITECTURE.md).
- **Database Schema Specification**: [`docs/DATABASE_DESIGN.md`](file:///c:/Users/IAGZ/Desktop/Internship%20Project%20Bhashitha/docs/DATABASE_DESIGN.md).

---

## 12. Future Improvements (Roadmap to Production)

1. **File Attachments**: Add S3/local file uploads to service requests (e.g. equipment quotes, hardware receipts, access authorization PDFs).
2. **Dynamic SLA Engine**: Calculate business-hours SLAs (excluding weekends and company holidays).
3. **Webhook Subscriptions**: Dispatch outbound Webhooks to Slack/Microsoft Teams when requests are approved or require urgent review.
4. **React SPA Client**: Connect the standalone React + TypeScript client (designed in `IMPLEMENTATION_PLAN.md`).
