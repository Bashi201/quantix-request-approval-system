<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\RequestAssignedNotification;
use App\Notifications\RequestDecisionNotification;
use App\Notifications\RequestStatusUpdatedNotification;
use App\Notifications\RequestSubmittedNotification;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LaptopRepairEndToEndWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed default personas
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Exact 10-Step Workflow Scenario Verification:
     * 1. Employee logs in.
     * 2. Employee creates a laptop repair request.
     * 3. Employee submits the request.
     * 4. Manager logs in.
     * 5. Manager reviews and approves it.
     * 6. Operations user logs in.
     * 7. Operations assigns an owner.
     * 8. Operations starts the work.
     * 9. Operations completes the request.
     * 10. Employee logs back in and sees the completed request.
     */
    public function test_complete_laptop_repair_10_step_journey_with_audits_and_notifications(): void
    {
        Notification::fake();

        // Retrieve seeded personas
        $alice = User::query()->where('email', 'alice.dev@quantix.io')->firstOrFail();
        $sarah = User::query()->where('email', 'sarah.manager@quantix.io')->firstOrFail();
        $oscar = User::query()->where('email', 'oscar.ops@quantix.io')->firstOrFail();

        // =====================================================================
        // STEP 1: Employee logs in
        // =====================================================================
        $loginEmployeeRes = $this->postJson('/api/login', [
            'email' => 'alice.dev@quantix.io',
            'password' => 'password',
        ]);

        $loginEmployeeRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.id', $alice->id)
            ->assertJsonPath('data.user.role', 'employee');

        $aliceToken = $loginEmployeeRes->json('data.token');
        $aliceHeaders = ['Authorization' => "Bearer {$aliceToken}"];

        // =====================================================================
        // STEP 2: Employee creates a laptop repair request (Draft)
        // =====================================================================
        $createRes = $this->withHeaders($aliceHeaders)->postJson('/api/requests', [
            'title' => 'MacBook Pro M3 Max Keyboard Repair',
            'category' => 'Equipment',
            'priority' => 'high',
            'description' => 'Spacebar and return keys are sticking intermittently during software development. Requires hardware diagnostics and keyboard module replacement.',
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.requester.id', $alice->id)
            ->assertJsonPath('data.title', 'MacBook Pro M3 Max Keyboard Repair');

        $requestId = $createRes->json('data.id');
        $this->assertNotEmpty($requestId);

        // =====================================================================
        // STEP 3: Employee submits the request
        // =====================================================================
        $submitRes = $this->withHeaders($aliceHeaders)->postJson("/api/requests/{$requestId}/submit");
        $submitRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'submitted');

        // Verify manager received submission notification
        Notification::assertSentTo($sarah, RequestSubmittedNotification::class);

        // =====================================================================
        // STEP 4: Manager logs in
        // =====================================================================
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $loginManagerRes = $this->postJson('/api/login', [
            'email' => 'sarah.manager@quantix.io',
            'password' => 'password',
        ]);

        $loginManagerRes->assertOk()
            ->assertJsonPath('data.user.role', 'manager');

        $sarahToken = $loginManagerRes->json('data.token');
        $sarahHeaders = ['Authorization' => "Bearer {$sarahToken}"];

        // Manager checks pending approvals dashboard
        $pendingListRes = $this->withHeaders($sarahHeaders)->getJson('/api/requests?status=submitted');
        $pendingListRes->assertOk();
        $pendingIds = array_column($pendingListRes->json('data'), 'id');
        $this->assertContains($requestId, $pendingIds);

        // =====================================================================
        // STEP 5: Manager reviews and approves it
        // =====================================================================
        $approveRes = $this->withHeaders($sarahHeaders)->postJson("/api/requests/{$requestId}/decision", [
            'action' => 'approve',
            'comment' => 'Approved under engineering workstation hardware warranty and repair program.',
        ]);

        $approveRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'approved');

        // Verify approval notifications sent to employee and operations team
        Notification::assertSentTo($alice, RequestDecisionNotification::class);
        Notification::assertSentTo($oscar, RequestDecisionNotification::class);

        // =====================================================================
        // STEP 6: Operations user logs in
        // =====================================================================
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $loginOpsRes = $this->postJson('/api/login', [
            'email' => 'oscar.ops@quantix.io',
            'password' => 'password',
        ]);

        $loginOpsRes->assertOk()
            ->assertJsonPath('data.user.role', 'operations');

        $oscarToken = $loginOpsRes->json('data.token');
        $oscarHeaders = ['Authorization' => "Bearer {$oscarToken}"];

        // Operations checks unassigned queue
        $opsQueueRes = $this->withHeaders($oscarHeaders)->getJson('/api/requests?status=approved');
        $opsQueueRes->assertOk();
        $queueIds = array_column($opsQueueRes->json('data'), 'id');
        $this->assertContains($requestId, $queueIds);

        // =====================================================================
        // STEP 7: Operations assigns an owner
        // =====================================================================
        $olivia = User::query()->where('email', 'olivia.ops@quantix.io')->firstOrFail();

        $assignRes = $this->withHeaders($oscarHeaders)->postJson("/api/requests/{$requestId}/assign", [
            'assigned_to_id' => $olivia->id,
        ]);

        $assignRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.assigned_to.id', $olivia->id);

        Notification::assertSentTo($olivia, RequestAssignedNotification::class);
        Notification::assertSentTo($alice, RequestAssignedNotification::class);

        // =====================================================================
        // STEP 8: Operations starts the work
        // =====================================================================
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $loginOliviaRes = $this->postJson('/api/login', [
            'email' => 'olivia.ops@quantix.io',
            'password' => 'password',
        ]);
        $loginOliviaRes->assertOk();

        $oliviaToken = $loginOliviaRes->json('data.token');
        $oliviaHeaders = ['Authorization' => "Bearer {$oliviaToken}"];

        $startWorkRes = $this->withHeaders($oliviaHeaders)->postJson("/api/requests/{$requestId}/status", [
            'status' => 'in_progress',
            'comment' => 'Laptop checked in at service bay. Hardware diagnostic initiated.',
        ]);

        $startWorkRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'in_progress');

        Notification::assertSentTo($alice, RequestStatusUpdatedNotification::class);

        // Add a progress comment
        $commentRes = $this->withHeaders($oliviaHeaders)->postJson("/api/requests/{$requestId}/comments", [
            'comment' => 'Top case and battery assembly replacement completed. Running stress testing.',
        ]);
        $commentRes->assertCreated();

        // =====================================================================
        // STEP 9: Operations completes the request
        // =====================================================================
        $completeRes = $this->withHeaders($oliviaHeaders)->postJson("/api/requests/{$requestId}/status", [
            'status' => 'completed',
            'comment' => 'Repairs finalized, keyboard verified responsive, and ready for employee pickup at Desk 4B.',
        ]);

        $completeRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'completed');

        Notification::assertSentTo($alice, RequestStatusUpdatedNotification::class);

        // =====================================================================
        // STEP 10: Employee logs back in and sees the completed request
        // =====================================================================
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $employeeReLoginRes = $this->postJson('/api/login', [
            'email' => 'alice.dev@quantix.io',
            'password' => 'password',
        ]);
        $employeeReLoginRes->assertOk();

        $aliceNewToken = $employeeReLoginRes->json('data.token');
        $aliceNewHeaders = ['Authorization' => "Bearer {$aliceNewToken}"];

        // Employee fetches request details
        $detailRes = $this->withHeaders($aliceNewHeaders)->getJson("/api/requests/{$requestId}");
        $detailRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.requester.id', $alice->id)
            ->assertJsonPath('data.assigned_to.id', $olivia->id)
            ->assertJsonPath('data.title', 'MacBook Pro M3 Max Keyboard Repair');

        // Verify full activity audit history
        $activities = $detailRes->json('data.activities');
        $this->assertNotEmpty($activities);
        $actions = array_column($activities, 'action');

        $this->assertContains('CREATED', $actions);
        $this->assertContains('SUBMITTED', $actions);
        $this->assertContains('APPROVED', $actions);
        $this->assertContains('ASSIGNED', $actions);
        $this->assertContains('IN_PROGRESS', $actions);
        $this->assertContains('COMPLETED', $actions);

        // Verify comments count
        $comments = $detailRes->json('data.comments');
        $this->assertGreaterThanOrEqual(3, count($comments));

        // Verify immutable audit constraint: Audit records cannot be deleted/modified
        $this->deleteJson("/api/requests/{$requestId}")->assertMethodNotAllowed();
    }
}
