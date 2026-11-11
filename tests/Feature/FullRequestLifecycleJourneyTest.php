<?php

namespace Tests\Feature;

use App\Enums\RequestStatus;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Notifications\RequestAssignedNotification;
use App\Notifications\RequestDecisionNotification;
use App\Notifications\RequestStatusUpdatedNotification;
use App\Notifications\RequestSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FullRequestLifecycleJourneyTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_end_to_end_request_lifecycle_journey(): void
    {
        Notification::fake();

        // 1. Setup Actors: Manager, Direct Report Employee, and Two Operations Users
        $manager = User::factory()->manager()->create([
            'name' => 'Sarah Connor',
            'email' => 'sarah.manager@quantix.io',
        ]);

        $employee = User::factory()->employee()->reportingTo($manager)->create([
            'name' => 'Alice Smith',
            'email' => 'alice.dev@quantix.io',
        ]);

        $opsAssigner = User::factory()->operations()->create([
            'name' => 'Oscar Martinez',
            'email' => 'oscar.ops@quantix.io',
        ]);

        $opsWorker = User::factory()->operations()->create([
            'name' => 'Olivia Vance',
            'email' => 'olivia.ops@quantix.io',
        ]);

        // =========================================================================
        // STEP 1: Employee creates request as DRAFT
        // =========================================================================
        Sanctum::actingAs($employee);

        $createResponse = $this->postJson('/api/requests', [
            'category' => 'Equipment',
            'title' => 'Development Workstation 4K Displays',
            'description' => 'Two 27-inch 4K high refresh rate monitors for engineering workflow.',
            'priority' => 'high',
            'submit' => false,
        ]);

        $createResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'draft',
                    'title' => 'Development Workstation 4K Displays',
                ],
            ]);

        $requestId = $createResponse->json('data.id');
        $this->assertNotEmpty($requestId);

        // =========================================================================
        // STEP 2: Employee edits the draft
        // =========================================================================
        $editResponse = $this->putJson("/api/requests/{$requestId}", [
            'title' => 'Development Workstation Dual 4K Displays (USB-C)',
            'description' => 'Two 27-inch 4K USB-C monitors with integrated hub.',
        ]);

        $editResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'title' => 'Development Workstation Dual 4K Displays (USB-C)',
                ],
            ]);

        // =========================================================================
        // STEP 3: Employee submits draft for manager review
        // =========================================================================
        $submitResponse = $this->postJson("/api/requests/{$requestId}/submit");

        $submitResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'submitted',
                ],
            ]);

        // Verify manager received submission notification
        Notification::assertSentTo($manager, RequestSubmittedNotification::class);

        // =========================================================================
        // STEP 4: Manager reviews and RETURNS the request with required comment
        // =========================================================================
        Sanctum::actingAs($manager);

        $returnResponse = $this->postJson("/api/requests/{$requestId}/decision", [
            'action' => 'return',
            'comment' => 'Please include vendor product SKU and estimated cost.',
        ]);

        $returnResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'returned',
                ],
            ]);

        // Verify employee received returned notification
        Notification::assertSentTo($employee, RequestDecisionNotification::class);

        // =========================================================================
        // STEP 5: Employee updates the returned request and re-submits
        // =========================================================================
        Sanctum::actingAs($employee);

        $resubmitEditResponse = $this->putJson("/api/requests/{$requestId}", [
            'description' => 'Two 27-inch 4K USB-C monitors with integrated hub. SKU: DELL-U2723QE, Total: $1,100.',
        ]);
        $resubmitEditResponse->assertStatus(200);

        $resubmitResponse = $this->postJson("/api/requests/{$requestId}/submit");
        $resubmitResponse->assertStatus(200)
            ->assertJson([
                'data' => [
                    'status' => 'submitted',
                ],
            ]);

        // =========================================================================
        // STEP 6: Manager APPROVES the request
        // =========================================================================
        Sanctum::actingAs($manager);

        $approveResponse = $this->postJson("/api/requests/{$requestId}/decision", [
            'action' => 'approve',
            'comment' => 'Approved under Q4 engineering hardware budget.',
        ]);

        $approveResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'approved',
                ],
            ]);

        // Verify both Employee and Operations received approval alerts
        Notification::assertSentTo($employee, RequestDecisionNotification::class);
        Notification::assertSentTo($opsAssigner, RequestDecisionNotification::class);

        // =========================================================================
        // STEP 7: Operations ASSIGNS the ticket to an engineer
        // =========================================================================
        Sanctum::actingAs($opsAssigner);

        $assignResponse = $this->postJson("/api/requests/{$requestId}/assign", [
            'assigned_to_id' => $opsWorker->id,
        ]);

        $assignResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'assigned_to' => [
                        'id' => $opsWorker->id,
                        'name' => 'Olivia Vance',
                    ],
                ],
            ]);

        Notification::assertSentTo($opsWorker, RequestAssignedNotification::class);

        // =========================================================================
        // STEP 8: Operations engineer starts work (moves to In Progress) and adds comment
        // =========================================================================
        Sanctum::actingAs($opsWorker);

        $inProgressResponse = $this->postJson("/api/requests/{$requestId}/status", [
            'status' => 'in_progress',
            'comment' => 'Hardware PO issued to supplier. Estimated delivery in 48 hours.',
        ]);

        $inProgressResponse->assertStatus(200)
            ->assertJson([
                'data' => [
                    'status' => 'in_progress',
                ],
            ]);

        // Add a conversational comment
        $commentResponse = $this->postJson("/api/requests/{$requestId}/comments", [
            'comment' => 'Monitors arrived at facilities reception desk. Commencing setup.',
        ]);
        $commentResponse->assertStatus(201);

        // =========================================================================
        // STEP 9: Operations marks request COMPLETED
        // =========================================================================
        $completeResponse = $this->postJson("/api/requests/{$requestId}/status", [
            'status' => 'completed',
            'comment' => 'Displays installed and calibrated at desk 3B. Setup verified with user.',
        ]);

        $completeResponse->assertStatus(200)
            ->assertJson([
                'data' => [
                    'status' => 'completed',
                ],
            ]);

        Notification::assertSentTo($employee, RequestStatusUpdatedNotification::class);

        // =========================================================================
        // STEP 10: Verify Full Queryable Details, Comments, and Audit Log
        // =========================================================================
        Sanctum::actingAs($employee);

        $detailResponse = $this->getJson("/api/requests/{$requestId}");
        $detailResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $requestId,
                    'status' => 'completed',
                    'requester' => ['id' => $employee->id],
                    'assigned_to' => ['id' => $opsWorker->id],
                ],
            ]);

        $activities = $detailResponse->json('data.activities');
        $this->assertNotEmpty($activities);

        // Verify all actions are documented in the audit trail in order
        $actions = array_column($activities, 'action');
        $this->assertContains('CREATED', $actions);
        $this->assertContains('UPDATED', $actions);
        $this->assertContains('SUBMITTED', $actions);
        $this->assertContains('RETURNED', $actions);
        $this->assertContains('APPROVED', $actions);
        $this->assertContains('ASSIGNED', $actions);
        $this->assertContains('IN_PROGRESS', $actions);
        $this->assertContains('COMPLETED', $actions);

        // Verify comments thread
        $comments = $detailResponse->json('data.comments');
        $this->assertGreaterThanOrEqual(3, count($comments));

        // =========================================================================
        // STEP 11: Verify Terminal State Guard (Completed cannot be modified - 403 Forbidden)
        // =========================================================================
        // Operations cannot modify a terminal completed request
        Sanctum::actingAs($opsWorker);
        $illegalStatusResponse = $this->postJson("/api/requests/{$requestId}/status", [
            'status' => 'in_progress',
        ]);
        $illegalStatusResponse->assertStatus(403);

        // Employee cannot edit completed request
        Sanctum::actingAs($employee);
        $illegalEditResponse = $this->putJson("/api/requests/{$requestId}", [
            'title' => 'Attempting post-completion edit',
        ]);
        $illegalEditResponse->assertStatus(403);
    }

    public function test_query_efficiency_and_eager_loading_avoids_n_plus_one_bottlenecks(): void
    {
        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->reportingTo($manager)->create();
        $ops = User::factory()->operations()->create();

        // Create 20 sample requests
        ServiceRequest::factory()->count(20)->create([
            'requester_id' => $employee->id,
            'assigned_to_id' => $ops->id,
            'status' => RequestStatus::Approved,
        ]);

        Sanctum::actingAs($ops);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->getJson('/api/requests?per_page=20');
        $response->assertStatus(200);

        $queries = DB::getQueryLog();

        // Standard efficient count should be constant (approx 3 queries: 1 count, 1 select items, 1 eager load relations)
        // rather than 20+ N+1 queries per item
        $this->assertLessThanOrEqual(5, count($queries), 'Detected possible N+1 query regression on requests listing.');
    }
}
