<?php

namespace App\Policies;

use App\Enums\RequestStatus;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ServiceRequestPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any service requests.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the specific service request.
     *
     * Rules:
     * - Employee: only if they are the requester.
     * - Manager: only if requester reports directly to them.
     * - Operations: can view all requests across the organization.
     */
    public function view(User $user, ServiceRequest $request): bool
    {
        if ($user->isOperations()) {
            return true;
        }

        if ($user->isEmployee()) {
            return $request->requester_id === $user->id;
        }

        if ($user->isManager()) {
            // Eagerly check requester manager relationship
            $requester = $request->requester ?? User::find($request->requester_id);

            return $requester && $requester->manager_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can create a service request.
     *
     * Only employees can create service requests.
     */
    public function create(User $user): bool
    {
        return $user->isEmployee();
    }

    /**
     * Determine whether the user can update the service request.
     *
     * Employees can edit a request only if they own it and it is in Draft or Returned status.
     */
    public function update(User $user, ServiceRequest $request): bool
    {
        if (! $user->isEmployee()) {
            return false;
        }

        if ($request->requester_id !== $user->id) {
            return false;
        }

        return $request->status->isEditable();
    }

    /**
     * Determine whether the user can submit the service request for review.
     *
     * Only the owning employee can submit when status is Draft or Returned.
     */
    public function submit(User $user, ServiceRequest $request): bool
    {
        if (! $user->isEmployee()) {
            return false;
        }

        if ($request->requester_id !== $user->id) {
            return false;
        }

        return $request->status->isEditable();
    }

    /**
     * Determine whether the user can make a review decision (approve, reject, return).
     *
     * Rules:
     * - Only managers can make review decisions.
     * - The manager must be the direct manager of the requester.
     * - The request must currently be in Submitted status.
     * - Operations users and Employees are strictly forbidden.
     */
    public function makeDecision(User $user, ServiceRequest $request): bool
    {
        if (! $user->isManager()) {
            return false;
        }

        $requester = $request->requester ?? User::find($request->requester_id);
        if (! $requester || $requester->manager_id !== $user->id) {
            return false;
        }

        return $request->status === RequestStatus::Submitted;
    }

    /**
     * Determine whether the user can assign an owner to the request.
     *
     * Rules:
     * - Only Operations users can assign work.
     * - The request must be in Approved or In Progress status.
     * - Managers and Employees are strictly forbidden.
     */
    public function assign(User $user, ServiceRequest $request): bool
    {
        if (! $user->isOperations()) {
            return false;
        }

        return in_array($request->status, [RequestStatus::Approved, RequestStatus::InProgress], true);
    }

    /**
     * Determine whether the user can update the status (move to In Progress or Completed).
     *
     * Rules:
     * - Only Operations users can advance work.
     * - The request must be in Approved or In Progress status.
     * - Managers and Employees are strictly forbidden.
     */
    public function updateStatus(User $user, ServiceRequest $request): bool
    {
        if (! $user->isOperations()) {
            return false;
        }

        return in_array($request->status, [RequestStatus::Approved, RequestStatus::InProgress], true);
    }

    /**
     * Determine whether the user can add a comment to the request.
     *
     * Allowed participants:
     * - The requesting employee.
     * - The direct manager of the requesting employee.
     * - Any Operations user.
     */
    public function addComment(User $user, ServiceRequest $request): bool
    {
        if ($user->isOperations()) {
            return true;
        }

        if ($request->requester_id === $user->id) {
            return true;
        }

        if ($user->isManager()) {
            $requester = $request->requester ?? User::find($request->requester_id);

            return $requester && $requester->manager_id === $user->id;
        }

        return false;
    }
}

