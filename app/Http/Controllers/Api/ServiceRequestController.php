<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreServiceRequest;
use App\Http\Requests\UpdateServiceRequest;
use App\Http\Resources\ServiceRequestListResource;
use App\Http\Resources\ServiceRequestResource;
use App\Models\ServiceRequest;
use App\Services\ServiceRequestService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceRequestController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected ServiceRequestService $requestService
    ) {}

    /**
     * List service requests scoped by user role with search, filtering, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ServiceRequest::class);

        $paginator = $this->requestService->listRequests($request->user(), $request->all());

        return response()->json([
            'success' => true,
            'data' => ServiceRequestListResource::collection($paginator),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
        ], 200);
    }

    /**
     * Store a newly created service request (Draft or direct Submit).
     */
    public function store(StoreServiceRequest $request): JsonResponse
    {
        $this->authorize('create', ServiceRequest::class);

        $serviceRequest = $this->requestService->createRequest($request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => $serviceRequest->status->value === 'submitted'
                ? 'Service request submitted for manager review.'
                : 'Service request draft created successfully.',
            'data' => new ServiceRequestResource($serviceRequest),
        ], 201);
    }

    /**
     * Display the specified service request with comments and audit activity.
     */
    public function show(ServiceRequest $serviceRequest): JsonResponse
    {
        $this->authorize('view', $serviceRequest);

        $serviceRequest->load([
            'requester',
            'assignedTo',
            'comments.user',
            'activities.user',
        ]);

        return response()->json([
            'success' => true,
            'data' => new ServiceRequestResource($serviceRequest),
        ], 200);
    }

    /**
     * Update an existing request in Draft or Returned status.
     */
    public function update(UpdateServiceRequest $request, ServiceRequest $serviceRequest): JsonResponse
    {
        $this->authorize('update', $serviceRequest);

        $updated = $this->requestService->updateRequest($serviceRequest, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Service request updated successfully.',
            'data' => new ServiceRequestResource($updated),
        ], 200);
    }
}
