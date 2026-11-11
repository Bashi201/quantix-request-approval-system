<?php

namespace App\Http\Controllers\Api;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignRequest;
use App\Http\Requests\UpdateStatusRequest;
use App\Http\Requests\WorkflowDecisionRequest;
use App\Http\Resources\ServiceRequestResource;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RequestWorkflowService;
use App\Services\ServiceRequestService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequestWorkflowController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected RequestWorkflowService $workflowService,
        protected ServiceRequestService $requestService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Submit a draft or re-submit a returned request for manager review.
     */
    public function submit(Request $request, ServiceRequest $serviceRequest): JsonResponse
    {
        $this->authorize('submit', $serviceRequest);

        $updated = $this->workflowService->transition(
            $serviceRequest,
            RequestStatus::Submitted,
            $request->user(),
            'Submitted for manager review.'
        );

        $this->notificationService->notifySubmitted($updated, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Request submitted for manager review.',
            'data' => new ServiceRequestResource($updated),
        ], 200);
    }

    /**
     * Manager decision: approve, reject, or return with comment.
     */
    public function decision(WorkflowDecisionRequest $request, ServiceRequest $serviceRequest): JsonResponse
    {
        $this->authorize('makeDecision', $serviceRequest);

        $targetStatus = match ($request->validated('action')) {
            'approve' => RequestStatus::Approved,
            'reject' => RequestStatus::Rejected,
            'return' => RequestStatus::Returned,
        };

        $actionVerb = match ($request->validated('action')) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'return' => 'returned',
        };

        $updated = $this->workflowService->transition(
            $serviceRequest,
            $targetStatus,
            $request->user(),
            $request->validated('comment')
        );

        $this->notificationService->notifyDecision(
            $updated,
            $actionVerb,
            $request->user(),
            $request->validated('comment')
        );

        return response()->json([
            'success' => true,
            'message' => "Request {$actionVerb} successfully.",
            'data' => new ServiceRequestResource($updated),
        ], 200);
    }

    /**
     * Assign an Operations user to an approved or in-progress request.
     */
    public function assign(AssignRequest $request, ServiceRequest $serviceRequest): JsonResponse
    {
        $this->authorize('assign', $serviceRequest);

        $assignedUser = User::query()->findOrFail($request->validated('assigned_to_id'));

        $updated = $this->requestService->assignRequest(
            $serviceRequest,
            $assignedUser,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => "Request assigned to {$assignedUser->name}.",
            'data' => new ServiceRequestResource($updated),
        ], 200);
    }

    /**
     * Operations status advancement: move to In Progress or Completed.
     */
    public function updateStatus(UpdateStatusRequest $request, ServiceRequest $serviceRequest): JsonResponse
    {
        $this->authorize('updateStatus', $serviceRequest);

        $targetStatus = RequestStatus::fromValueOrAlias($request->validated('status'));

        $updated = $this->workflowService->transition(
            $serviceRequest,
            $targetStatus,
            $request->user(),
            $request->validated('comment')
        );

        $this->notificationService->notifyStatusUpdated(
            $updated,
            $targetStatus,
            $request->user(),
            $request->validated('comment')
        );

        return response()->json([
            'success' => true,
            'message' => "Request status updated to {$targetStatus->value}.",
            'data' => new ServiceRequestResource($updated),
        ], 200);
    }
}
