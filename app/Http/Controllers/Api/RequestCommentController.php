<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\RequestCommentResource;
use App\Models\ServiceRequest;
use App\Services\ServiceRequestService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;

class RequestCommentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected ServiceRequestService $requestService
    ) {}

    /**
     * Append a comment to the service request conversation thread.
     */
    public function store(StoreCommentRequest $request, ServiceRequest $serviceRequest): JsonResponse
    {
        $this->authorize('addComment', $serviceRequest);

        $comment = $this->requestService->addComment(
            $serviceRequest,
            $request->validated('comment'),
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Comment added successfully.',
            'data' => new RequestCommentResource($comment),
        ], 201);
    }
}
