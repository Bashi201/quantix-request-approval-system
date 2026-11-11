<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServiceRequestApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_create_request_as_draft(): void
    {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $payload = [
            'category' => 'Equipment',
            'title' => 'External Mechanical Keyboard',
            'description' => 'Wireless split mechanical keyboard with tactile switches.',
            'priority' => 'medium',
            'submit' => false,
        ];

        $response = $this->postJson('/api/requests', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Service request draft created successfully.',
                'data' => [
                    'title' => 'External Mechanical Keyboard',
                    'category' => 'Equipment',
                    'priority' => 'medium',
                    'status' => 'draft',
                    'requester' => [
                        'id' => $employee->id,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'title' => 'External Mechanical Keyboard',
            'status' => 'draft',
            'requester_id' => $employee->id,
        ]);

        $this->assertDatabaseHas('request_activities', [
            'action' => 'CREATED',
            'to_status' => 'draft',
        ]);
    }

    public function test_employee_can_create_and_submit_directly(): void
    {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $payload = [
            'category' => 'Access Request',
            'title' => 'Production Kubernetes Cluster Read Access',
            'description' => 'Need read-only access to kube-system namespace for metric auditing.',
            'priority' => 'high',
            'submit' => true,
        ];

        $response = $this->postJson('/api/requests', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Service request submitted for manager review.',
                'data' => [
                    'status' => 'submitted',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'title' => 'Production Kubernetes Cluster Read Access',
            'status' => 'submitted',
        ]);

        $this->assertDatabaseHas('request_activities', [
            'action' => 'SUBMITTED',
            'from_status' => 'draft',
            'to_status' => 'submitted',
        ]);
    }

    public function test_non_employee_cannot_create_request(): void
    {
        $manager = User::factory()->manager()->create();
        Sanctum::actingAs($manager);

        $response = $this->postJson('/api/requests', [
            'category' => 'Equipment',
            'title' => 'Manager Laptop Upgrade',
            'description' => 'Upgraded laptop required for architecture planning.',
            'priority' => 'medium',
        ]);

        $response->assertStatus(403);
    }

    public function test_request_listing_is_strictly_scoped_by_user_role(): void
    {
        $manager = User::factory()->manager()->create();
        $alice = User::factory()->employee()->reportingTo($manager)->create();
        $charlie = User::factory()->employee()->create(); // reports elsewhere
        $ops = User::factory()->operations()->create();

        $aliceReq = ServiceRequest::factory()->submitted()->create(['requester_id' => $alice->id, 'title' => "Alice's Request"]);
        $charlieReq = ServiceRequest::factory()->submitted()->create(['requester_id' => $charlie->id, 'title' => "Charlie's Request"]);

        // 1. Alice sees only Alice's request
        Sanctum::actingAs($alice);
        $resAlice = $this->getJson('/api/requests');
        $resAlice->assertStatus(200);
        $this->assertCount(1, $resAlice->json('data'));
        $this->assertSame($aliceReq->id, $resAlice->json('data.0.id'));

        // 2. Manager Sarah sees only direct report Alice's request, not Charlie's
        Sanctum::actingAs($manager);
        $resManager = $this->getJson('/api/requests');
        $resManager->assertStatus(200);
        $this->assertCount(1, $resManager->json('data'));
        $this->assertSame($aliceReq->id, $resManager->json('data.0.id'));

        // 3. Operations Oscar sees all requests
        Sanctum::actingAs($ops);
        $resOps = $this->getJson('/api/requests');
        $resOps->assertStatus(200);
        $this->assertCount(2, $resOps->json('data'));
    }

    public function test_request_listing_supports_filtering_search_and_pagination(): void
    {
        $ops = User::factory()->operations()->create();
        Sanctum::actingAs($ops);

        ServiceRequest::factory()->draft()->create(['category' => 'Hardware', 'title' => 'Lenovo Monitor']);
        ServiceRequest::factory()->submitted()->create(['category' => 'Software', 'title' => 'JetBrains License']);
        ServiceRequest::factory()->approved()->create(['category' => 'Hardware', 'title' => 'Apple Trackpad']);

        // Filter by category
        $resCat = $this->getJson('/api/requests?category=Hardware');
        $resCat->assertStatus(200);
        $this->assertCount(2, $resCat->json('data'));

        // Filter by status (accepts alias)
        $resStatus = $this->getJson('/api/requests?status=pending_approval');
        $resStatus->assertStatus(200);
        $this->assertCount(1, $resStatus->json('data'));
        $this->assertSame('JetBrains License', $resStatus->json('data.0.title'));

        // Search
        $resSearch = $this->getJson('/api/requests?search=Trackpad');
        $resSearch->assertStatus(200);
        $this->assertCount(1, $resSearch->json('data'));
        $this->assertSame('Apple Trackpad', $resSearch->json('data.0.title'));

        // Pagination metadata
        $resPage = $this->getJson('/api/requests?per_page=2');
        $resPage->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
                'links',
            ]);
        $this->assertCount(2, $resPage->json('data'));
    }

    public function test_employee_can_view_own_request_details(): void
    {
        $alice = User::factory()->employee()->create();
        $request = ServiceRequest::factory()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($alice);
        $response = $this->getJson("/api/requests/{$request->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $request->id,
                    'request_number' => $request->request_number,
                ],
            ]);
    }

    public function test_employee_cannot_view_another_employees_request(): void
    {
        $alice = User::factory()->employee()->create();
        $bob = User::factory()->employee()->create();
        $request = ServiceRequest::factory()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($bob);
        $response = $this->getJson("/api/requests/{$request->id}");

        $response->assertStatus(403);
    }

    public function test_employee_can_edit_draft_request(): void
    {
        $alice = User::factory()->employee()->create();
        $draft = ServiceRequest::factory()->draft()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($alice);
        $response = $this->putJson("/api/requests/{$draft->id}", [
            'title' => 'Updated Monitor Specifications',
            'priority' => 'high',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'title' => 'Updated Monitor Specifications',
                    'priority' => 'high',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $draft->id,
            'title' => 'Updated Monitor Specifications',
            'priority' => 'high',
        ]);
    }

    public function test_employee_cannot_edit_submitted_request(): void
    {
        $alice = User::factory()->employee()->create();
        $submitted = ServiceRequest::factory()->submitted()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($alice);
        $response = $this->putJson("/api/requests/{$submitted->id}", [
            'title' => 'Illegal Edit Attempt',
        ]);

        $response->assertStatus(403);
    }

    public function test_employee_can_submit_draft_request(): void
    {
        $alice = User::factory()->employee()->create();
        $draft = ServiceRequest::factory()->draft()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($alice);
        $response = $this->postJson("/api/requests/{$draft->id}/submit");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'submitted',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $draft->id,
            'status' => 'submitted',
        ]);
    }

    public function test_manager_can_approve_direct_report_request(): void
    {
        $manager = User::factory()->manager()->create();
        $alice = User::factory()->employee()->reportingTo($manager)->create();
        $request = ServiceRequest::factory()->submitted()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($manager);
        $response = $this->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'approve',
            'comment' => 'Approved, within departmental budget.',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Request approved successfully.',
                'data' => [
                    'status' => 'approved',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'approved',
        ]);
    }

    public function test_manager_can_return_request_with_comment(): void
    {
        $manager = User::factory()->manager()->create();
        $alice = User::factory()->employee()->reportingTo($manager)->create();
        $request = ServiceRequest::factory()->submitted()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($manager);
        $response = $this->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'return',
            'comment' => 'Please attach the official hardware vendor quote.',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Request returned successfully.',
                'data' => [
                    'status' => 'returned',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'returned',
        ]);

        $this->assertDatabaseHas('request_comments', [
            'service_request_id' => $request->id,
            'comment' => 'Please attach the official hardware vendor quote.',
        ]);
    }

    public function test_manager_returning_without_comment_returns_422(): void
    {
        $manager = User::factory()->manager()->create();
        $alice = User::factory()->employee()->reportingTo($manager)->create();
        $request = ServiceRequest::factory()->submitted()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($manager);
        $response = $this->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'return',
            'comment' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['comment']);
    }

    public function test_manager_cannot_act_on_non_report_request(): void
    {
        $manager = User::factory()->manager()->create();
        $charlie = User::factory()->employee()->create(); // reports to someone else
        $request = ServiceRequest::factory()->submitted()->create(['requester_id' => $charlie->id]);

        Sanctum::actingAs($manager);
        $response = $this->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'approve',
        ]);

        $response->assertStatus(403);
    }

    public function test_operations_can_assign_approved_request(): void
    {
        $ops = User::factory()->operations()->create();
        $opsAssignee = User::factory()->operations()->create(['name' => 'Oscar Martinez']);
        $request = ServiceRequest::factory()->approved()->create();

        Sanctum::actingAs($ops);
        $response = $this->postJson("/api/requests/{$request->id}/assign", [
            'assigned_to_id' => $opsAssignee->id,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'assigned_to' => [
                        'id' => $opsAssignee->id,
                        'name' => 'Oscar Martinez',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'assigned_to_id' => $opsAssignee->id,
        ]);
    }

    public function test_operations_cannot_assign_to_employee_user(): void
    {
        $ops = User::factory()->operations()->create();
        $employee = User::factory()->employee()->create();
        $request = ServiceRequest::factory()->approved()->create();

        Sanctum::actingAs($ops);
        $response = $this->postJson("/api/requests/{$request->id}/assign", [
            'assigned_to_id' => $employee->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_to_id']);
    }

    public function test_operations_can_advance_status_to_in_progress_and_completed(): void
    {
        $ops = User::factory()->operations()->create();
        $request = ServiceRequest::factory()->approved()->create();

        Sanctum::actingAs($ops);

        // Move to in_progress
        $res1 = $this->postJson("/api/requests/{$request->id}/status", [
            'status' => 'in_progress',
            'comment' => 'Hardware ordered.',
        ]);
        $res1->assertStatus(200)
            ->assertJson(['data' => ['status' => 'in_progress']]);

        // Move to completed
        $res2 = $this->postJson("/api/requests/{$request->id}/status", [
            'status' => 'completed',
            'comment' => 'Hardware delivered and tested.',
        ]);
        $res2->assertStatus(200)
            ->assertJson(['data' => ['status' => 'completed']]);

        $this->assertNotNull($request->fresh()->completed_at);
    }

    public function test_illegal_status_jump_returns_422(): void
    {
        $ops = User::factory()->operations()->create();
        $request = ServiceRequest::factory()->approved()->create();

        Sanctum::actingAs($ops);

        // Cannot jump directly from approved to completed without in_progress
        $response = $this->postJson("/api/requests/{$request->id}/status", [
            'status' => 'completed',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_participants_can_add_comments(): void
    {
        $manager = User::factory()->manager()->create();
        $alice = User::factory()->employee()->reportingTo($manager)->create();
        $request = ServiceRequest::factory()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($alice);
        $response = $this->postJson("/api/requests/{$request->id}/comments", [
            'comment' => 'When can I expect this equipment?',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'comment' => 'When can I expect this equipment?',
                    'user' => [
                        'id' => $alice->id,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('request_comments', [
            'service_request_id' => $request->id,
            'comment' => 'When can I expect this equipment?',
        ]);
    }

    public function test_non_participant_cannot_add_comment(): void
    {
        $alice = User::factory()->employee()->create();
        $bob = User::factory()->employee()->create();
        $request = ServiceRequest::factory()->create(['requester_id' => $alice->id]);

        Sanctum::actingAs($bob);
        $response = $this->postJson("/api/requests/{$request->id}/comments", [
            'comment' => 'Unauthorized snooping comment.',
        ]);

        $response->assertStatus(403);
    }
}
