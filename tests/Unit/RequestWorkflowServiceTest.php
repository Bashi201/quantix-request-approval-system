<?php

namespace Tests\Unit;

use App\Enums\RequestStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Services\RequestWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RequestWorkflowServiceTest extends TestCase
{
    use RefreshDatabase;

    protected RequestWorkflowService $workflowService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->workflowService = new RequestWorkflowService;
    }

    public function test_can_transition_from_draft_to_submitted(): void
    {
        $request = ServiceRequest::factory()->draft()->create();
        $user = $request->requester;

        $updated = $this->workflowService->transition($request, RequestStatus::Submitted, $user);

        $this->assertSame(RequestStatus::Submitted, $updated->status);
        $this->assertNotNull($updated->submitted_at);
        $this->assertDatabaseHas('request_activities', [
            'service_request_id' => $request->id,
            'action' => 'SUBMITTED',
            'from_status' => 'draft',
            'to_status' => 'submitted',
        ]);
    }

    public function test_can_transition_from_returned_to_submitted(): void
    {
        $request = ServiceRequest::factory()->returned()->create();
        $user = $request->requester;

        $updated = $this->workflowService->transition($request, RequestStatus::Submitted, $user);

        $this->assertSame(RequestStatus::Submitted, $updated->status);
        $this->assertDatabaseHas('request_activities', [
            'service_request_id' => $request->id,
            'action' => 'SUBMITTED',
            'from_status' => 'returned',
            'to_status' => 'submitted',
        ]);
    }

    public function test_can_transition_from_submitted_to_approved(): void
    {
        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->reportingTo($manager)->create();
        $request = ServiceRequest::factory()->submitted()->create(['requester_id' => $employee->id]);

        $updated = $this->workflowService->transition($request, RequestStatus::Approved, $manager, 'Looks good.');

        $this->assertSame(RequestStatus::Approved, $updated->status);
        $this->assertNotNull($updated->approved_at);
        $this->assertDatabaseHas('request_comments', [
            'service_request_id' => $request->id,
            'comment' => 'Looks good.',
        ]);
    }

    public function test_can_transition_from_submitted_to_returned_with_mandatory_comment(): void
    {
        $manager = User::factory()->manager()->create();
        $request = ServiceRequest::factory()->submitted()->create();

        $updated = $this->workflowService->transition(
            $request,
            RequestStatus::Returned,
            $manager,
            'Please provide cost center code.'
        );

        $this->assertSame(RequestStatus::Returned, $updated->status);
        $this->assertDatabaseHas('request_comments', [
            'service_request_id' => $request->id,
            'comment' => 'Please provide cost center code.',
        ]);
    }

    public function test_transition_to_returned_fails_without_comment(): void
    {
        $manager = User::factory()->manager()->create();
        $request = ServiceRequest::factory()->submitted()->create();

        $this->expectException(ValidationException::class);
        $this->workflowService->transition($request, RequestStatus::Returned, $manager, '');
    }

    public function test_can_transition_from_submitted_to_rejected(): void
    {
        $manager = User::factory()->manager()->create();
        $request = ServiceRequest::factory()->submitted()->create();

        $updated = $this->workflowService->transition($request, RequestStatus::Rejected, $manager, 'Budget exhausted.');

        $this->assertSame(RequestStatus::Rejected, $updated->status);
        $this->assertDatabaseHas('request_activities', [
            'service_request_id' => $request->id,
            'action' => 'REJECTED',
            'to_status' => 'rejected',
        ]);
    }

    public function test_can_transition_from_approved_to_in_progress(): void
    {
        $ops = User::factory()->operations()->create();
        $request = ServiceRequest::factory()->approved()->create();

        $updated = $this->workflowService->transition($request, RequestStatus::InProgress, $ops);

        $this->assertSame(RequestStatus::InProgress, $updated->status);
    }

    public function test_can_transition_from_in_progress_to_completed(): void
    {
        $ops = User::factory()->operations()->create();
        $request = ServiceRequest::factory()->inProgress()->create();

        $updated = $this->workflowService->transition($request, RequestStatus::Completed, $ops, 'Hardware configured.');

        $this->assertSame(RequestStatus::Completed, $updated->status);
        $this->assertNotNull($updated->completed_at);
    }

    public function test_invalid_transitions_throw_exception(): void
    {
        $ops = User::factory()->operations()->create();

        // 1. Cannot jump from Draft to InProgress or Completed
        $draft = ServiceRequest::factory()->draft()->create();
        try {
            $this->workflowService->transition($draft, RequestStatus::Completed, $ops);
            $this->fail('Expected InvalidStateTransitionException was not thrown.');
        } catch (InvalidStateTransitionException $e) {
            $this->assertSame(422, $e->getCode());
        }

        // 2. Cannot jump from Approved to Completed skipping InProgress
        $approved = ServiceRequest::factory()->approved()->create();
        try {
            $this->workflowService->transition($approved, RequestStatus::Completed, $ops);
            $this->fail('Expected InvalidStateTransitionException was not thrown.');
        } catch (InvalidStateTransitionException $e) {
            $this->assertSame(422, $e->getCode());
        }

        // 3. Completed is a terminal state
        $completed = ServiceRequest::factory()->completed()->create();
        try {
            $this->workflowService->transition($completed, RequestStatus::InProgress, $ops);
            $this->fail('Expected InvalidStateTransitionException was not thrown.');
        } catch (InvalidStateTransitionException $e) {
            $this->assertSame(422, $e->getCode());
        }

        // 4. Rejected is a terminal state
        $rejected = ServiceRequest::factory()->rejected()->create();
        try {
            $this->workflowService->transition($rejected, RequestStatus::Submitted, $ops);
            $this->fail('Expected InvalidStateTransitionException was not thrown.');
        } catch (InvalidStateTransitionException $e) {
            $this->assertSame(422, $e->getCode());
        }
    }
}
