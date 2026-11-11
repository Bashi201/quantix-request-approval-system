<?php

namespace Tests\Feature;

use App\Enums\RequestStatus;
use App\Models\ServiceRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleBasedClientWorkflowIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed database with realistic personas and workflow items
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Test Employee (Alice) end-to-end lifecycle actions:
     * Login, list own requests, create draft, update draft, comment, and submit.
     */
    public function test_seeded_employee_can_login_create_edit_comment_and_submit(): void
    {
        // 1. Login with seeded credentials
        $loginRes = $this->postJson('/api/login', [
            'email' => 'alice.dev@quantix.io',
            'password' => 'password',
        ]);

        $loginRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'employee');

        $token = $loginRes->json('data.token');
        $authHeaders = ['Authorization' => "Bearer {$token}"];

        // 2. Fetch authenticated profile
        $meRes = $this->withHeaders($authHeaders)->getJson('/api/me');
        $meRes->assertOk()->assertJsonPath('data.email', 'alice.dev@quantix.io');

        // 3. Create a new service request as draft
        $createRes = $this->withHeaders($authHeaders)->postJson('/api/requests', [
            'title' => 'WebStorm IDE Commercial License',
            'category' => 'Software & Access',
            'priority' => 'high',
            'description' => 'Need WebStorm license for TypeScript and React frontend development.',
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $requestId = $createRes->json('data.id');

        // 4. Update the draft request (Edit Request feature)
        $updateRes = $this->withHeaders($authHeaders)->putJson("/api/requests/{$requestId}", [
            'title' => 'WebStorm + Copilot License Suite',
            'category' => 'Software & Access',
            'priority' => 'high',
            'description' => 'Need WebStorm and AI assistant license for enterprise application builds.',
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.title', 'WebStorm + Copilot License Suite');

        // 5. Post a comment on the request
        $commentRes = $this->withHeaders($authHeaders)->postJson("/api/requests/{$requestId}/comments", [
            'comment' => 'Request created and verified with engineering department guidelines.',
        ]);

        $commentRes->assertCreated();

        // 6. Submit the request for manager review
        $submitRes = $this->withHeaders($authHeaders)->postJson("/api/requests/{$requestId}/submit");
        $submitRes->assertOk()
            ->assertJsonPath('data.status', 'submitted');
    }

    /**
     * Test Manager (Sarah) review cycle:
     * Login, view direct report's submitted request, return with comment, approve resubmission.
     */
    public function test_seeded_manager_can_return_and_approve_direct_report_request(): void
    {
        $alice = User::query()->where('email', 'alice.dev@quantix.io')->firstOrFail();
        $sarah = User::query()->where('email', 'sarah.manager@quantix.io')->firstOrFail();

        // Alice creates and submits a request
        $request = ServiceRequest::query()->create([
            'request_number' => 'REQ-TEST-MGR-01',
            'requester_id' => $alice->id,
            'category' => 'Equipment',
            'title' => 'Ergonomic Standing Desk Converter',
            'description' => 'Adjustable height workstation converter.',
            'priority' => 'medium',
            'status' => RequestStatus::Submitted,
            'sla_due_at' => now()->addDays(3),
            'submitted_at' => now(),
        ]);

        // Sarah logs in
        $managerToken = $sarah->createToken('manager-test')->plainTextToken;
        $managerHeaders = ['Authorization' => "Bearer {$managerToken}"];

        // Sarah views pending requests
        $listRes = $this->withHeaders($managerHeaders)->getJson('/api/requests?status=submitted');
        $listRes->assertOk();

        // Sarah returns request for revision (mandatory reason)
        $returnRes = $this->withHeaders($managerHeaders)->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'return',
            'comment' => 'Please provide quote from approved vendor list.',
        ]);

        $returnRes->assertOk()
            ->assertJsonPath('data.status', 'returned');

        // Alice edits and resubmits
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $aliceToken = $alice->createToken('alice-test')->plainTextToken;
        $aliceHeaders = ['Authorization' => "Bearer {$aliceToken}"];

        $editRes = $this->withHeaders($aliceHeaders)->putJson("/api/requests/{$request->id}", [
            'title' => 'Ergonomic Desk Converter (Vendor Quote Attached)',
            'category' => 'Equipment',
            'priority' => 'medium',
            'description' => 'Vendor quote #4492 from Approved Supplier Corp attached.',
        ]);
        $editRes->assertOk();

        $resubmitRes = $this->withHeaders($aliceHeaders)->postJson("/api/requests/{$request->id}/submit");
        $resubmitRes->assertOk()->assertJsonPath('data.status', 'submitted');

        // Sarah approves the resubmitted request
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $approveRes = $this->withHeaders($managerHeaders)->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'approve',
            'comment' => 'Vendor quote verified. Approved for operations fulfillment.',
        ]);

        $approveRes->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    /**
     * Test Operations (Oscar) fulfillment workflow:
     * Login, view approved queue, assign to self, start work, add comment, mark completed.
     */
    public function test_seeded_operations_can_assign_start_and_complete_request(): void
    {
        $alice = User::query()->where('email', 'alice.dev@quantix.io')->firstOrFail();
        $oscar = User::query()->where('email', 'oscar.ops@quantix.io')->firstOrFail();

        // Create an approved request ready for operations
        $request = ServiceRequest::query()->create([
            'request_number' => 'REQ-TEST-OPS-01',
            'requester_id' => $alice->id,
            'assigned_to_id' => null,
            'category' => 'Software & Access',
            'title' => 'GitHub Enterprise Admin Access',
            'description' => 'Provision team admin privileges on organization repository.',
            'priority' => 'high',
            'status' => RequestStatus::Approved,
            'sla_due_at' => now()->addDays(2),
            'approved_at' => now(),
        ]);

        // Oscar logs in
        $opsToken = $oscar->createToken('ops-test')->plainTextToken;
        $opsHeaders = ['Authorization' => "Bearer {$opsToken}"];

        // Oscar assigns request to himself
        $assignRes = $this->withHeaders($opsHeaders)->postJson("/api/requests/{$request->id}/assign", [
            'assigned_to_id' => $oscar->id,
        ]);

        $assignRes->assertOk()
            ->assertJsonPath('data.assigned_to.id', $oscar->id);

        // Oscar starts work (In Progress)
        $startRes = $this->withHeaders($opsHeaders)->postJson("/api/requests/{$request->id}/status", [
            'status' => 'in_progress',
            'comment' => 'Configuring SSO groups and repository team roles.',
        ]);

        $startRes->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        // Oscar adds progress comment
        $commentRes = $this->withHeaders($opsHeaders)->postJson("/api/requests/{$request->id}/comments", [
            'comment' => 'Invited user to organization team. Waiting for invitation acceptance.',
        ]);

        $commentRes->assertCreated();

        // Oscar marks request as completed
        $completeRes = $this->withHeaders($opsHeaders)->postJson("/api/requests/{$request->id}/status", [
            'status' => 'completed',
            'comment' => 'Permissions confirmed and active in GitHub Enterprise.',
        ]);

        $completeRes->assertOk()
            ->assertJsonPath('data.status', 'completed');

        // Verify request details return full audit history and comments (kick-off note + discussion + completion note = 3)
        $showRes = $this->withHeaders($opsHeaders)->getJson("/api/requests/{$request->id}");
        $showRes->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonCount(3, 'data.comments');
    }

    /**
     * Test role-based boundary enforcement and 403 Forbidden responses.
     */
    public function test_role_boundaries_prevent_unauthorized_actions(): void
    {
        $alice = User::query()->where('email', 'alice.dev@quantix.io')->firstOrFail();
        $oscar = User::query()->where('email', 'oscar.ops@quantix.io')->firstOrFail();

        $submittedReq = ServiceRequest::query()->where('status', RequestStatus::Submitted)->firstOrFail();

        // 1. Employee cannot make approval decisions (Sarah's job)
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $aliceToken = $alice->createToken('alice-unauth')->plainTextToken;
        $this->withHeaders(['Authorization' => "Bearer {$aliceToken}"])
            ->postJson("/api/requests/{$submittedReq->id}/decision", ['action' => 'approve'])
            ->assertForbidden();

        // 2. Operations cannot make approval decisions (Sarah's job)
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $opsToken = $oscar->createToken('oscar-unauth')->plainTextToken;
        $this->withHeaders(['Authorization' => "Bearer {$opsToken}"])
            ->postJson("/api/requests/{$submittedReq->id}/decision", ['action' => 'approve'])
            ->assertForbidden();

        // 3. Unauthenticated request receives 401 Unauthorized
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/requests')->assertUnauthorized();
    }
}
