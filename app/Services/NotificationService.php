<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Notifications\RequestAssignedNotification;
use App\Notifications\RequestDecisionNotification;
use App\Notifications\RequestStatusUpdatedNotification;
use App\Notifications\RequestSubmittedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class NotificationService
{
    /**
     * Dispatch notification when a request is submitted for manager review.
     */
    public function notifySubmitted(ServiceRequest $request, User $actor): void
    {
        $requester = $request->relationLoaded('requester') ? $request->requester : $request->requester()->with('manager')->first();
        $manager = $requester?->manager;

        if ($manager && $manager->id !== $actor->id) {
            DB::afterCommit(function () use ($manager, $request) {
                $manager->notify(new RequestSubmittedNotification($request));
            });
        }
    }

    /**
     * Dispatch notifications when a manager makes a review decision (approve, reject, return).
     */
    public function notifyDecision(ServiceRequest $request, string $decision, User $actor, ?string $comment = null): void
    {
        $requester = $request->relationLoaded('requester') ? $request->requester : $request->requester()->first();

        DB::afterCommit(function () use ($request, $decision, $actor, $comment, $requester) {
            // Notify the requesting employee
            if ($requester && $requester->id !== $actor->id) {
                $requester->notify(new RequestDecisionNotification($request, $decision, $actor, $comment));
            }

            // If approved, also alert Operations users that work is ready for assignment
            if ($decision === 'approved') {
                $operationsUsers = User::query()
                    ->where('role', UserRole::Operations->value)
                    ->where('id', '!=', $actor->id)
                    ->get();

                if ($operationsUsers->isNotEmpty()) {
                    Notification::send($operationsUsers, new RequestDecisionNotification($request, $decision, $actor, $comment));
                }
            }
        });
    }

    /**
     * Dispatch notification when an Operations user is assigned to a request.
     */
    public function notifyAssigned(ServiceRequest $request, User $assignedUser, User $actor): void
    {
        $requester = $request->relationLoaded('requester') ? $request->requester : $request->requester()->first();

        DB::afterCommit(function () use ($request, $assignedUser, $actor, $requester) {
            // Notify assigned Operations user
            if ($assignedUser->id !== $actor->id) {
                $assignedUser->notify(new RequestAssignedNotification($request, $assignedUser, $actor));
            }

            // Notify requester that someone has been assigned
            if ($requester && $requester->id !== $actor->id && $requester->id !== $assignedUser->id) {
                $requester->notify(new RequestAssignedNotification($request, $assignedUser, $actor));
            }
        });
    }

    /**
     * Dispatch notification when request status advances (In Progress, Completed).
     */
    public function notifyStatusUpdated(ServiceRequest $request, RequestStatus $status, User $actor, ?string $comment = null): void
    {
        $requester = $request->relationLoaded('requester') ? $request->requester : $request->requester()->first();
        $assignedTo = $request->relationLoaded('assignedTo') ? $request->assignedTo : $request->assignedTo()->first();

        DB::afterCommit(function () use ($request, $status, $actor, $comment, $requester, $assignedTo) {
            // Notify the requesting employee
            if ($requester && $requester->id !== $actor->id) {
                $requester->notify(new RequestStatusUpdatedNotification($request, $status, $actor, $comment));
            }

            // Notify assigned operations staff if someone else completed/updated the ticket
            if ($assignedTo && $assignedTo->id !== $actor->id && (! $requester || $assignedTo->id !== $requester->id)) {
                $assignedTo->notify(new RequestStatusUpdatedNotification($request, $status, $actor, $comment));
            }
        });
    }
}

