<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Models\RequestActivity;
use App\Models\RequestComment;
use App\Models\ServiceRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ServiceRequestService
{
    public function __construct(
        protected RequestWorkflowService $workflowService
    ) {}

    /**
     * Generate the next unique human-readable request number (e.g. REQ-202611-0011).
     */
    public function generateRequestNumber(): string
    {
        $prefix = 'REQ-'.date('Ym').'-';

        $latest = ServiceRequest::query()
            ->where('request_number', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->value('request_number');

        if ($latest && preg_match('/(\d+)$/', $latest, $matches)) {
            $nextSequence = (int) $matches[1] + 1;
        } else {
            $nextSequence = ServiceRequest::query()->count() + 1;
        }

        return $prefix.str_pad((string) $nextSequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate SLA target timestamp based on request priority.
     */
    public function calculateSlaDueAt(string $priority): Carbon
    {
        return match (strtolower($priority)) {
            'urgent' => now()->addDay(),
            'high' => now()->addDays(2),
            'medium' => now()->addDays(3),
            'low' => now()->addDays(5),
            default => now()->addDays(3),
        };
    }

    /**
     * Create a new service request as Draft or direct Submission.
     *
     * @param  array<string, mixed>  $data
     */
    public function createRequest(array $data, User $creator): ServiceRequest
    {
        return DB::transaction(function () use ($data, $creator) {
            $shouldSubmit = ! empty($data['submit']);
            $initialStatus = $shouldSubmit ? RequestStatus::Submitted : RequestStatus::Draft;

            $requestNumber = $this->generateRequestNumber();
            $slaDueAt = $this->calculateSlaDueAt($data['priority'] ?? 'medium');

            $request = ServiceRequest::query()->create([
                'request_number' => $requestNumber,
                'requester_id' => $creator->id,
                'assigned_to_id' => null,
                'category' => $data['category'],
                'title' => $data['title'],
                'description' => $data['description'],
                'priority' => $data['priority'],
                'status' => $initialStatus,
                'sla_due_at' => $slaDueAt,
                'is_overdue' => false,
                'submitted_at' => $shouldSubmit ? now() : null,
            ]);

            // Record initial activity
            RequestActivity::query()->create([
                'service_request_id' => $request->id,
                'user_id' => $creator->id,
                'action' => 'CREATED',
                'from_status' => null,
                'to_status' => RequestStatus::Draft->value,
                'comment' => 'Request created.',
                'created_at' => now(),
            ]);

            if ($shouldSubmit) {
                RequestActivity::query()->create([
                    'service_request_id' => $request->id,
                    'user_id' => $creator->id,
                    'action' => 'SUBMITTED',
                    'from_status' => RequestStatus::Draft->value,
                    'to_status' => RequestStatus::Submitted->value,
                    'comment' => 'Request submitted for manager review.',
                    'created_at' => now(),
                ]);
            }

            return $request->fresh(['requester', 'assignedTo', 'activities.user', 'comments.user']);
        });
    }

    /**
     * Update details of an existing editable request (Draft or Returned).
     *
     * @param  array<string, mixed>  $data
     */
    public function updateRequest(ServiceRequest $request, array $data, User $editor): ServiceRequest
    {
        return DB::transaction(function () use ($request, $data, $editor) {
            $dirtyFields = [];

            foreach (['title', 'description', 'category', 'priority'] as $field) {
                if (isset($data[$field]) && $data[$field] !== $request->{$field}) {
                    $dirtyFields[$field] = [
                        'old' => $request->{$field},
                        'new' => $data[$field],
                    ];
                    $request->{$field} = $data[$field];
                }
            }

            if (isset($data['priority'])) {
                $request->sla_due_at = $this->calculateSlaDueAt($data['priority']);
            }

            $request->save();

            RequestActivity::query()->create([
                'service_request_id' => $request->id,
                'user_id' => $editor->id,
                'action' => 'UPDATED',
                'from_status' => $request->status->value,
                'to_status' => $request->status->value,
                'comment' => 'Request details updated.',
                'metadata' => ! empty($dirtyFields) ? $dirtyFields : null,
                'created_at' => now(),
            ]);

            return $request->fresh(['requester', 'assignedTo', 'activities.user', 'comments.user']);
        });
    }

    /**
     * Assign an Operations user to an approved or in-progress request.
     */
    public function assignRequest(ServiceRequest $request, User $assignedUser, User $actor): ServiceRequest
    {
        if (! $assignedUser->isOperations()) {
            throw ValidationException::withMessages([
                'assigned_to_id' => ['The designated user must possess an Operations role.'],
            ]);
        }

        return DB::transaction(function () use ($request, $assignedUser, $actor) {
            $previousAssigned = $request->assignedTo?->name ?? 'None';
            $request->assigned_to_id = $assignedUser->id;
            $request->save();

            RequestActivity::query()->create([
                'service_request_id' => $request->id,
                'user_id' => $actor->id,
                'action' => 'ASSIGNED',
                'from_status' => $request->status->value,
                'to_status' => $request->status->value,
                'comment' => "Assigned to {$assignedUser->name}.",
                'metadata' => [
                    'previous_assigned' => $previousAssigned,
                    'assigned_to_id' => $assignedUser->id,
                    'assigned_to_name' => $assignedUser->name,
                ],
                'created_at' => now(),
            ]);

            return $request->fresh(['requester', 'assignedTo', 'activities.user', 'comments.user']);
        });
    }

    /**
     * Add a participant comment to the request discourse thread.
     */
    public function addComment(ServiceRequest $request, string $commentText, User $author, bool $isInternal = false): RequestComment
    {
        return DB::transaction(function () use ($request, $commentText, $author, $isInternal) {
            $comment = RequestComment::query()->create([
                'service_request_id' => $request->id,
                'user_id' => $author->id,
                'comment' => $commentText,
                'is_internal' => $isInternal,
            ]);

            RequestActivity::query()->create([
                'service_request_id' => $request->id,
                'user_id' => $author->id,
                'action' => 'COMMENTED',
                'from_status' => $request->status->value,
                'to_status' => $request->status->value,
                'comment' => 'Added a comment to request.',
                'created_at' => now(),
            ]);

            return $comment->load('user');
        });
    }

    /**
     * List requests with strict role-based scoping, search, filters, sorting and pagination.
     *
     * @param  array<string, mixed>  $filters
     */
    public function listRequests(User $user, array $filters = []): LengthAwarePaginator
    {
        $query = ServiceRequest::query();

        // 1. Role-specific query scoping
        if ($user->isEmployee()) {
            $query->where('requester_id', $user->id);
        } elseif ($user->isManager()) {
            $query->whereHas('requester', function ($q) use ($user) {
                $q->where('manager_id', $user->id);
            });
        }
        // Operations users see all records across the company (no restriction)

        // 2. Filter by status (supports single or comma-separated values, plus aliases)
        if (! empty($filters['status'])) {
            $rawList = explode(',', (string) $filters['status']);
            $validValues = [];
            foreach ($rawList as $raw) {
                $statusEnum = RequestStatus::fromValueOrAlias($raw);
                if ($statusEnum) {
                    $validValues[] = $statusEnum->value;
                }
            }

            if (! empty($validValues)) {
                $query->whereIn('status', $validValues);
            }
        }

        // 3. Filter by category
        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        // 4. Filter by priority
        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // 5. Keyword search across number, title, and description
        if (! empty($filters['search'])) {
            $term = '%'.trim((string) $filters['search']).'%';
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', $term)
                    ->orWhere('description', 'like', $term)
                    ->orWhere('request_number', 'like', $term);
            });
        }

        // 6. Sorting
        $allowedSorts = ['created_at', 'priority', 'status', 'sla_due_at', 'updated_at', 'title'];
        $sortBy = in_array($filters['sort_by'] ?? '', $allowedSorts, true) ? $filters['sort_by'] : 'created_at';
        $sortOrder = strtolower((string) ($filters['sort_order'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortBy, $sortOrder);

        // 7. Eager load relations and count to avoid N+1
        $query->with([
            'requester:id,name,email,role',
            'assignedTo:id,name,email,role',
        ])->withCount('comments');

        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 100);

        return $query->paginate($perPage);
    }
}
