<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_operations_users_endpoint_accessible_by_operations_and_manager(): void
    {
        $ops = User::factory()->operations()->create();
        $manager = User::factory()->manager()->create();

        Sanctum::actingAs($ops);
        $this->getJson('/api/users/operations')->assertStatus(200);

        Sanctum::actingAs($manager);
        $this->getJson('/api/users/operations')->assertStatus(200);
    }

    public function test_operations_users_endpoint_is_forbidden_for_employee(): void
    {
        $employee = User::factory()->employee()->create();

        Sanctum::actingAs($employee);
        $response = $this->getJson('/api/users/operations');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Forbidden: This action is unauthorized for your role.',
            ]);
    }

    public function test_employee_can_only_view_own_requests(): void
    {
        $alice = User::factory()->employee()->create();
        $bob = User::factory()->employee()->create();

        $aliceRequest = ServiceRequest::factory()->create(['requester_id' => $alice->id]);

        $this->assertTrue(Gate::forUser($alice)->allows('view', $aliceRequest));
        $this->assertFalse(Gate::forUser($bob)->allows('view', $aliceRequest));
    }

    public function test_manager_can_view_and_decide_only_direct_reports_requests(): void
    {
        $sarah = User::factory()->manager()->create();
        $alice = User::factory()->employee()->reportingTo($sarah)->create();
        $charlie = User::factory()->employee()->create(); // not reporting to Sarah

        $aliceSubmitted = ServiceRequest::factory()->submitted()->create(['requester_id' => $alice->id]);
        $charlieSubmitted = ServiceRequest::factory()->submitted()->create(['requester_id' => $charlie->id]);
        $aliceDraft = ServiceRequest::factory()->draft()->create(['requester_id' => $alice->id]);

        // Sarah can view Alice's request because Alice is a direct report
        $this->assertTrue(Gate::forUser($sarah)->allows('view', $aliceSubmitted));

        // Sarah can make decisions on Alice's submitted request
        $this->assertTrue(Gate::forUser($sarah)->allows('makeDecision', $aliceSubmitted));

        // Sarah cannot view or make decisions on Charlie's request (Charlie reports to someone else)
        $this->assertFalse(Gate::forUser($sarah)->allows('view', $charlieSubmitted));
        $this->assertFalse(Gate::forUser($sarah)->allows('makeDecision', $charlieSubmitted));

        // Sarah cannot make decision on Alice's draft request (not submitted)
        $this->assertFalse(Gate::forUser($sarah)->allows('makeDecision', $aliceDraft));
    }

    public function test_employees_cannot_perform_manager_actions(): void
    {
        $alice = User::factory()->employee()->create();
        $submittedReq = ServiceRequest::factory()->submitted()->create();

        $this->assertFalse(Gate::forUser($alice)->allows('makeDecision', $submittedReq));
    }

    public function test_operations_users_cannot_make_manager_approval_decisions(): void
    {
        $oscar = User::factory()->operations()->create();
        $submittedReq = ServiceRequest::factory()->submitted()->create();

        $this->assertFalse(Gate::forUser($oscar)->allows('makeDecision', $submittedReq));
    }

    public function test_managers_cannot_perform_operations_actions(): void
    {
        $sarah = User::factory()->manager()->create();
        $approvedReq = ServiceRequest::factory()->approved()->create();

        $this->assertFalse(Gate::forUser($sarah)->allows('assign', $approvedReq));
        $this->assertFalse(Gate::forUser($sarah)->allows('updateStatus', $approvedReq));
    }

    public function test_operations_users_can_assign_and_update_status_on_eligible_requests(): void
    {
        $oscar = User::factory()->operations()->create();
        $approvedReq = ServiceRequest::factory()->approved()->create();
        $inProgressReq = ServiceRequest::factory()->inProgress()->create();
        $submittedReq = ServiceRequest::factory()->submitted()->create();
        $completedReq = ServiceRequest::factory()->completed()->create();

        // Eligible states for operations
        $this->assertTrue(Gate::forUser($oscar)->allows('assign', $approvedReq));
        $this->assertTrue(Gate::forUser($oscar)->allows('assign', $inProgressReq));
        $this->assertTrue(Gate::forUser($oscar)->allows('updateStatus', $approvedReq));
        $this->assertTrue(Gate::forUser($oscar)->allows('updateStatus', $inProgressReq));

        // Ineligible states for operations
        $this->assertFalse(Gate::forUser($oscar)->allows('assign', $submittedReq));
        $this->assertFalse(Gate::forUser($oscar)->allows('assign', $completedReq));
        $this->assertFalse(Gate::forUser($oscar)->allows('updateStatus', $submittedReq));
    }

    public function test_employees_can_only_edit_draft_or_returned_requests(): void
    {
        $alice = User::factory()->employee()->create();

        $draftReq = ServiceRequest::factory()->draft()->create(['requester_id' => $alice->id]);
        $returnedReq = ServiceRequest::factory()->returned()->create(['requester_id' => $alice->id]);
        $submittedReq = ServiceRequest::factory()->submitted()->create(['requester_id' => $alice->id]);
        $approvedReq = ServiceRequest::factory()->approved()->create(['requester_id' => $alice->id]);

        $this->assertTrue(Gate::forUser($alice)->allows('update', $draftReq));
        $this->assertTrue(Gate::forUser($alice)->allows('update', $returnedReq));
        $this->assertTrue(Gate::forUser($alice)->allows('submit', $draftReq));
        $this->assertTrue(Gate::forUser($alice)->allows('submit', $returnedReq));

        $this->assertFalse(Gate::forUser($alice)->allows('update', $submittedReq));
        $this->assertFalse(Gate::forUser($alice)->allows('update', $approvedReq));
        $this->assertFalse(Gate::forUser($alice)->allows('submit', $submittedReq));
    }

    public function test_comment_authorization_participants_only(): void
    {
        $sarah = User::factory()->manager()->create();
        $alice = User::factory()->employee()->reportingTo($sarah)->create();
        $bob = User::factory()->employee()->create();
        $oscar = User::factory()->operations()->create();

        $request = ServiceRequest::factory()->create(['requester_id' => $alice->id]);

        // Alice (requester), Sarah (direct manager), and Oscar (operations) can comment
        $this->assertTrue(Gate::forUser($alice)->allows('addComment', $request));
        $this->assertTrue(Gate::forUser($sarah)->allows('addComment', $request));
        $this->assertTrue(Gate::forUser($oscar)->allows('addComment', $request));

        // Bob (unrelated employee) cannot comment
        $this->assertFalse(Gate::forUser($bob)->allows('addComment', $request));
    }
}
