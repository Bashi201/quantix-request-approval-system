# RESTful API Specification & Contract

## 1. API Standards & Global Conventions

### 1.1. Base URL & Headers
All requests must be prefixed with `/api` and include the standard headers:
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <sanctum_token>
```

### 1.2. Unified Response Envelopes

#### Success Envelope (Single Entity / Action)
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... }
}
```

#### Success Envelope (Paginated List)
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 35
  },
  "links": {
    "first": "/api/requests?page=1",
    "last": "/api/requests?page=3",
    "prev": null,
    "next": "/api/requests?page=2"
  }
}
```

#### Error Envelope
```json
{
  "success": false,
  "message": "Validation failed or business rule violation.",
  "errors": {
    "field_name": [
      "The specific validation failure description."
    ]
  }
}
```

### 1.3. Standard HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Authenticated user lacks role or entity-level authority (e.g. manager reviewing non-report).
- `404 Not Found`: Resource ID does not exist.
- `422 Unprocessable Entity`: Validation failure or **illegal workflow state transition**.
- `500 Internal Server Error`: Unhandled server exception.

---

## 2. Authentication & User Endpoints

### 2.1. `POST /api/login`
Issues a Laravel Sanctum personal access token.

- **Allowed Role**: Public (Any unauthenticated or authenticated user)
- **Request Headers**: `Accept: application/json`
- **Request Payload**:
```json
{
  "email": "sarah.manager@quantix.io",
  "password": "password"
}
```
- **Validation Rules**:
  - `email`: `required|string|email`
  - `password`: `required|string`
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "1|d7A2B9c8...4f8",
    "user": {
      "id": 1,
      "name": "Sarah Connor",
      "email": "sarah.manager@quantix.io",
      "role": "manager",
      "manager_id": null
    }
  }
}
```
- **HTTP Errors**:
  - `422 Unprocessable Entity`: Invalid credentials (`The provided credentials do not match our records.`) or missing fields.

---

### 2.2. `POST /api/logout`
Revokes the current access token.

- **Allowed Role**: Any Authenticated User (`auth:sanctum`)
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Token revoked successfully."
}
```
- **HTTP Errors**: `401 Unauthorized`.

---

### 2.3. `GET /api/me`
Retrieves current authenticated profile and organizational status.

- **Allowed Role**: Any Authenticated User (`auth:sanctum`)
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Alice Smith",
    "email": "alice.dev@quantix.io",
    "role": "employee",
    "manager": {
      "id": 1,
      "name": "Sarah Connor",
      "email": "sarah.manager@quantix.io"
    }
  }
}
```
- **HTTP Errors**: `401 Unauthorized`.

---

### 2.4. `GET /api/users/operations`
Lists operations users available for request assignment.

- **Allowed Role**: Operations, Manager (`role:operations,manager`)
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Oscar Martinez",
      "email": "oscar.ops@quantix.io",
      "role": "operations"
    },
    {
      "id": 6,
      "name": "Olivia Vance",
      "email": "olivia.ops@quantix.io",
      "role": "operations"
    }
  ]
}
```

---

## 3. Service Request Core Endpoints

### 3.1. `POST /api/requests`
Creates a new service request either as a `draft` or directly `submitted`.

- **Allowed Role**: Employee (`role:employee`)
- **Request Payload**:
```json
{
  "category": "Equipment",
  "title": "Dual 4K Monitor Setup",
  "description": "Requesting two 27-inch 4K monitors for development workstation.",
  "priority": "high",
  "submit": true
}
```
- **Validation Rules**:
  - `category`: `required|string|max:64`
  - `title`: `required|string|min:5|max:255`
  - `description`: `required|string|min:10`
  - `priority`: `required|in:low,medium,high,urgent`
  - `submit`: `boolean` (optional, default `false`). If `true`, status becomes `submitted`; if `false`, status becomes `draft`.
- **Expected Response (201 Created)**:
```json
{
  "success": true,
  "message": "Service request submitted for manager review.",
  "data": {
    "id": 12,
    "request_number": "REQ-202611-0012",
    "title": "Dual 4K Monitor Setup",
    "description": "Requesting two 27-inch 4K monitors for development workstation.",
    "category": "Equipment",
    "priority": "high",
    "status": "submitted",
    "sla_due_at": "2026-11-12T18:00:00Z",
    "is_overdue": false,
    "requester": {
      "id": 2,
      "name": "Alice Smith",
      "email": "alice.dev@quantix.io"
    },
    "assigned_to": null,
    "created_at": "2026-11-10T19:00:00Z",
    "updated_at": "2026-11-10T19:00:00Z"
  }
}
```
- **HTTP Errors**:
  - `401 Unauthorized`
  - `403 Forbidden`: User is not an employee.
  - `422 Unprocessable Entity`: Validation failure or attempting `submit=true` when employee has no manager assigned.

---

### 3.2. `GET /api/requests`
Lists service requests with role-based scoping, status filtering, search, sorting, and pagination.

- **Allowed Role**: All Authenticated Roles (`auth:sanctum`)
- **Role Scoping Rules**:
  - `employee`: Strictly scoped to requests submitted by the caller (`requester_id == auth.id`).
  - `manager`: Scoped to requests submitted by their direct reports (`users where manager_id == auth.id`).
  - `operations`: Unrestricted company-wide access across all requests.
- **Query Parameters**:
  - `status` (string, optional): e.g. `submitted`, `approved`, `in_progress`, `completed`, `rejected`, `returned`
  - `category` (string, optional): e.g. `Equipment`
  - `priority` (string, optional): `low`, `medium`, `high`, `urgent`
  - `search` (string, optional): Search keyword matched against `title`, `description`, or `request_number`
  - `sort_by` (string, optional): `created_at`, `priority`, `status`, `sla_due_at` (default `created_at`)
  - `sort_order` (string, optional): `asc`, `desc` (default `desc`)
  - `page` (integer, optional): default `1`
  - `per_page` (integer, optional): default `15`, max `100`
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "request_number": "REQ-202611-0012",
      "title": "Dual 4K Monitor Setup",
      "category": "Equipment",
      "priority": "high",
      "status": "submitted",
      "sla_due_at": "2026-11-12T18:00:00Z",
      "is_overdue": false,
      "requester": {
        "id": 2,
        "name": "Alice Smith"
      },
      "assigned_to": null,
      "comments_count": 0,
      "created_at": "2026-11-10T19:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 1
  },
  "links": {
    "first": "/api/requests?page=1",
    "last": "/api/requests?page=1",
    "prev": null,
    "next": null
  }
}
```

---

### 3.3. `GET /api/requests/{id}`
Retrieves full details of a specific request, including comments and activity audit trail.

- **Allowed Role**: All (Subject to `ServiceRequestPolicy@view`)
- **Policy Enforcement**:
  - Employee: must be own request (`requester_id == user.id`).
  - Manager: requester must be direct report (`requester.manager_id == user.id`).
  - Operations: allowed for all requests.
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 3,
    "request_number": "REQ-202611-0003",
    "title": "IntelliJ IDEA Ultimate License",
    "description": "Requesting annual license renewal.",
    "category": "IT Support",
    "priority": "medium",
    "status": "returned",
    "sla_due_at": "2026-11-13T10:00:00Z",
    "is_overdue": false,
    "requester": {
      "id": 2,
      "name": "Alice Smith",
      "email": "alice.dev@quantix.io"
    },
    "assigned_to": null,
    "comments": [
      {
        "id": 1,
        "comment": "Please add project billing code before approval.",
        "is_internal": false,
        "user": {
          "id": 1,
          "name": "Sarah Connor",
          "role": "manager"
        },
        "created_at": "2026-11-10T14:30:00Z"
      }
    ],
    "activities": [
      {
        "id": 1,
        "action": "CREATED",
        "from_status": null,
        "to_status": "draft",
        "comment": null,
        "user": {
          "id": 2,
          "name": "Alice Smith"
        },
        "created_at": "2026-11-10T12:00:00Z"
      },
      {
        "id": 2,
        "action": "SUBMITTED",
        "from_status": "draft",
        "to_status": "submitted",
        "comment": null,
        "user": {
          "id": 2,
          "name": "Alice Smith"
        },
        "created_at": "2026-11-10T12:05:00Z"
      },
      {
        "id": 3,
        "action": "RETURNED",
        "from_status": "submitted",
        "to_status": "returned",
        "comment": "Please add project billing code before approval.",
        "user": {
          "id": 1,
          "name": "Sarah Connor"
        },
        "created_at": "2026-11-10T14:30:00Z"
      }
    ],
    "created_at": "2026-11-10T12:00:00Z",
    "updated_at": "2026-11-10T14:30:00Z"
  }
}
```
- **HTTP Errors**:
  - `401 Unauthorized`
  - `403 Forbidden`: User has no access to view this request.
  - `404 Not Found`: Request ID does not exist.

---

### 3.4. `PUT /api/requests/{id}`
Updates the details of an existing request.

- **Allowed Role**: Employee (Must own request, status must be `draft` or `returned`)
- **Request Payload**:
```json
{
  "category": "IT Support",
  "title": "IntelliJ IDEA Ultimate License - Project Orion",
  "description": "Requesting renewal with billing code: CC-90812.",
  "priority": "medium"
}
```
- **Validation Rules**:
  - Same validation as creation.
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Service request updated successfully.",
  "data": {
    "id": 3,
    "title": "IntelliJ IDEA Ultimate License - Project Orion",
    "status": "returned"
  }
}
```
- **HTTP Errors**:
  - `403 Forbidden`: Not the request owner.
  - `422 Unprocessable Entity`: Status is not `draft` or `returned` ("Only requests in draft or returned status can be edited.").

---

### 3.5. `POST /api/requests/{id}/submit`
Submits a `draft` or re-submits a `returned` request for manager review.

- **Allowed Role**: Employee (Must own request)
- **Request Payload**: Empty `{}`
- **Validation / State Guard**: Request status must be `draft` or `returned`.
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Request submitted for manager review.",
  "data": {
    "id": 3,
    "status": "submitted",
    "submitted_at": "2026-11-10T15:00:00Z"
  }
}
```
- **HTTP Errors**:
  - `403 Forbidden`: Not the request owner.
  - `422 Unprocessable Entity`: Request status is not `draft` or `returned` (e.g. attempting to submit an already approved request).

---

### 3.6. `POST /api/requests/{id}/decision`
Records a manager's decision to approve, reject, or return a request.

- **Allowed Role**: Manager (Must be the direct manager of the requester)
- **Request Payload**:
```json
{
  "action": "return",
  "comment": "Please specify the exact hardware specs required."
}
```
- **Validation Rules**:
  - `action`: `required|in:approve,reject,return`
  - `comment`: `required_if:action,return|nullable|string|max:1000` (Comment is strictly mandatory for `return`, optional for `approve`/`reject`)
- **State Machine Guard**: Request must be in `submitted` status.
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Request returned to employee with comment.",
  "data": {
    "id": 3,
    "status": "returned"
  }
}
```
- **HTTP Errors**:
  - `403 Forbidden`: Manager is not the direct supervisor of the submitting employee.
  - `422 Unprocessable Entity`: Current status is not `submitted`, or missing mandatory comment when returning.

---

### 3.7. `POST /api/requests/{id}/assign`
Assigns an Operations staff member to an approved or in-progress request.

- **Allowed Role**: Operations (`role:operations`)
- **Request Payload**:
```json
{
  "assigned_to_id": 5
}
```
- **Validation Rules**:
  - `assigned_to_id`: `required|exists:users,id` (User must possess `role:operations`)
- **State Machine Guard**: Request must be in `approved` or `in_progress` status.
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Request assigned to Oscar Martinez.",
  "data": {
    "id": 4,
    "assigned_to": {
      "id": 5,
      "name": "Oscar Martinez"
    }
  }
}
```
- **HTTP Errors**:
  - `403 Forbidden`: Caller does not possess Operations role.
  - `422 Unprocessable Entity`: Assigned user is not in the Operations team, or request is in invalid status (`draft`, `submitted`, `rejected`, `completed`).

---

### 3.8. `POST /api/requests/{id}/status`
Transitions a request to `in_progress` or `completed`.

- **Allowed Role**: Operations (`role:operations`)
- **Request Payload**:
```json
{
  "status": "in_progress",
  "comment": "Parts ordered, commencing configuration."
}
```
- **Validation Rules**:
  - `status`: `required|in:in_progress,completed`
  - `comment`: `nullable|string|max:1000`
- **State Machine Guard**:
  - `in_progress` can only transition from `approved`.
  - `completed` can only transition from `in_progress`.
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Status updated to in_progress.",
  "data": {
    "id": 4,
    "status": "in_progress"
  }
}
```
- **HTTP Errors**:
  - `403 Forbidden`: Not Operations.
  - `422 Unprocessable Entity`: Invalid transition (e.g. attempting to jump straight from `approved` to `completed` without `in_progress`, or transitioning already completed/rejected requests).

---

### 3.9. `POST /api/requests/{id}/comments`
Appends a contextual comment to the request thread.

- **Allowed Role**: Request Participants (Requester, Requester's Manager, or Operations)
- **Request Payload**:
```json
{
  "comment": "Has the replacement arrived at reception yet?"
}
```
- **Validation Rules**:
  - `comment`: `required|string|min:2|max:2000`
- **Expected Response (201 Created)**:
```json
{
  "success": true,
  "message": "Comment added successfully.",
  "data": {
    "id": 7,
    "comment": "Has the replacement arrived at reception yet?",
    "user": {
      "id": 2,
      "name": "Alice Smith",
      "role": "employee"
    },
    "created_at": "2026-11-10T16:15:00Z"
  }
}
```
- **HTTP Errors**:
  - `403 Forbidden`: Caller is not a participant in this request.
  - `404 Not Found`: Request ID not found.

---

## 4. Notifications Endpoints

### 4.1. `GET /api/notifications`
Retrieves in-app notifications for the logged-in user.

- **Allowed Role**: Any Authenticated User
- **Query Parameters**: `unread_only=true|false`
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "type": "RequestDecisionNotification",
      "data": {
        "request_id": 3,
        "request_number": "REQ-202611-0003",
        "action": "returned",
        "message": "Sarah Connor returned your request: IntelliJ IDEA Ultimate License",
        "comment": "Please add project billing code before approval."
      },
      "read_at": null,
      "created_at": "2026-11-10T14:30:00Z"
    }
  ]
}
```

### 4.2. `PATCH /api/notifications/{id}/read`
Marks a specific notification as read.

- **Allowed Role**: Notification Recipient
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Notification marked as read."
}
```

