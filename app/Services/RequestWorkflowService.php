<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\RequestActivity;
use App\Models\RequestComment;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestWorkflowService
{
    /**
     * State transition matrix defining all permitted transitions.
     *
     * @var array<string, list<RequestStatus>>
     */
    private const TRANSITION_MAP = [
        RequestStatus::Draft->value => [
            RequestStatus::Submitted,
        ],
        RequestStatus::Returned->value => [
            RequestStatus::Submitted,
        ],
        RequestStatus::Submitted->value => [
            RequestStatus::Approved,
            RequestStatus::Rejected,
            RequestStatus::Returned,
        ],
        RequestStatus::Approved->value => [
            RequestStatus::InProgress,
        ],
        RequestStatus::InProgress->value => [
            RequestStatus::Completed,
        ],
        RequestStatus::Completed->value => [],
        RequestStatus::Rejected->value => [],
    ];

    /**
     * Get the list of allowed destination statuses from a given current status.
     *
     * @return list<RequestStatus>
     */
    public function getValidTransitions(RequestStatus $currentStatus): array
    {
        return self::TRANSITION_MAP[$currentStatus->value] ?? [];
    }

    /**
     * Check if a transition from current status to target status is valid.
     */
    public function canTransition(ServiceRequest $request, RequestStatus $targetStatus): bool
    {
        $allowed = $this->getValidTransitions($request->status);

        return in_array($targetStatus, $allowed, true);
    }

    /**
     * Execute a state transition within an atomic database transaction.
     *
     * @param  array<string, mixed>  $metadata
     *
     * @throws InvalidStateTransitionException
     * @throws ValidationException
     */
    public function transition(
        ServiceRequest $request,
        RequestStatus $targetStatus,
        User $actor,
        ?string $comment = null,
        array $metadata = []
    ): ServiceRequest {
        $fromStatus = $request->status;

        // 1. Guard against invalid transitions
        if (! $this->canTransition($request, $targetStatus)) {
            $valid = $this->getValidTransitions($fromStatus);
            throw new InvalidStateTransitionException($fromStatus, $targetStatus, $valid);
        }

        // 2. Validate business rules for specific transitions
        if ($targetStatus === RequestStatus::Returned && empty(trim((string) $comment))) {
            throw ValidationException::withMessages([
                'comment' => ['A comment explaining why the request is returned is mandatory.'],
            ]);
        }

        // 3. Execute atomic transition
        return DB::transaction(function () use ($request, $fromStatus, $targetStatus, $actor, $comment, $metadata) {
            // Update timestamp milestones
            if ($targetStatus === RequestStatus::Submitted) {
                $request->submitted_at = now();
            } elseif ($targetStatus === RequestStatus::Approved) {
                $request->approved_at = now();
            } elseif ($targetStatus === RequestStatus::Completed) {
                $request->completed_at = now();
            }

            $request->status = $targetStatus;
            $request->save();

            // Record immutable activity log
            RequestActivity::query()->create([
                'service_request_id' => $request->id,
                'user_id' => $actor->id,
                'action' => strtoupper($targetStatus->value),
                'from_status' => $fromStatus->value,
                'to_status' => $targetStatus->value,
                'comment' => $comment,
                'metadata' => ! empty($metadata) ? $metadata : null,
                'created_at' => now(),
            ]);

            // If a decision note was supplied, record it in the discourse thread as well
            if (! empty($comment)) {
                RequestComment::query()->create([
                    'service_request_id' => $request->id,
                    'user_id' => $actor->id,
                    'comment' => $comment,
                    'is_internal' => false,
                ]);
            }

            return $request->fresh(['requester', 'assignedTo', 'comments.user', 'activities.user']);
        });
    }
}
