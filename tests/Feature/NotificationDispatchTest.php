<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use App\Notifications\RequestAssignedNotification;
use App\Notifications\RequestDecisionNotification;
use App\Notifications\RequestStatusUpdatedNotification;
use App\Notifications\RequestSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_dispatched_to_manager_when_request_is_submitted(): void
    {
        Notification::fake();

        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->reportingTo($manager)->create();

        Sanctum::actingAs($employee);

        $response = $this->postJson('/api/requests', [
            'category' => 'Equipment',
            'title' => 'Ergonomic Desk Chair',
            'description' => 'Replacing broken office chair.',
            'priority' => 'medium',
            'submit' => true,
        ]);

        $response->assertStatus(201);

        Notification::assertSentTo(
            $manager,
            RequestSubmittedNotification::class,
            function (RequestSubmittedNotification $notification) {
                return $notification->request->title === 'Ergonomic Desk Chair';
            }
        );
    }

    public function test_notifications_dispatched_when_manager_approves_request(): void
    {
        Notification::fake();

        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->reportingTo($manager)->create();
        $opsUser = User::factory()->operations()->create();

        $request = ServiceRequest::factory()->submitted()->create(['requester_id' => $employee->id]);

        Sanctum::actingAs($manager);

        $response = $this->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'approve',
            'comment' => 'Approved.',
        ]);

        $response->assertStatus(200);

        // Employee receives decision notification
        Notification::assertSentTo(
            $employee,
            RequestDecisionNotification::class,
            function (RequestDecisionNotification $n) {
                return $n->decision === 'approved';
            }
        );

        // Operations team receives notification that work is approved
        Notification::assertSentTo(
            $opsUser,
            RequestDecisionNotification::class,
            function (RequestDecisionNotification $n) {
                return $n->decision === 'approved';
            }
        );
    }

    public function test_notification_dispatched_when_manager_returns_request(): void
    {
        Notification::fake();

        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->reportingTo($manager)->create();

        $request = ServiceRequest::factory()->submitted()->create(['requester_id' => $employee->id]);

        Sanctum::actingAs($manager);

        $response = $this->postJson("/api/requests/{$request->id}/decision", [
            'action' => 'return',
            'comment' => 'Missing project quote.',
        ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            $employee,
            RequestDecisionNotification::class,
            function (RequestDecisionNotification $n) {
                return $n->decision === 'returned' && $n->comment === 'Missing project quote.';
            }
        );
    }

    public function test_notification_dispatched_when_operations_assigned(): void
    {
        Notification::fake();

        $ops = User::factory()->operations()->create();
        $assignee = User::factory()->operations()->create();
        $employee = User::factory()->employee()->create();

        $request = ServiceRequest::factory()->approved()->create(['requester_id' => $employee->id]);

        Sanctum::actingAs($ops);

        $response = $this->postJson("/api/requests/{$request->id}/assign", [
            'assigned_to_id' => $assignee->id,
        ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            $assignee,
            RequestAssignedNotification::class,
            function (RequestAssignedNotification $n) use ($request) {
                return $n->request->id === $request->id;
            }
        );

        Notification::assertSentTo(
            $employee,
            RequestAssignedNotification::class,
            function (RequestAssignedNotification $n) use ($request) {
                return $n->request->id === $request->id;
            }
        );
    }

    public function test_notification_dispatched_when_status_updated_to_completed(): void
    {
        Notification::fake();

        $ops = User::factory()->operations()->create();
        $employee = User::factory()->employee()->create();

        $request = ServiceRequest::factory()->inProgress($ops)->create(['requester_id' => $employee->id]);

        Sanctum::actingAs($ops);

        $response = $this->postJson("/api/requests/{$request->id}/status", [
            'status' => 'completed',
            'comment' => 'Deployment finished.',
        ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            $employee,
            RequestStatusUpdatedNotification::class,
            function (RequestStatusUpdatedNotification $n) {
                return $n->status->value === 'completed';
            }
        );
    }

    public function test_user_can_list_and_mark_notifications_as_read_via_api(): void
    {
        $employee = User::factory()->employee()->create();
        $request = ServiceRequest::factory()->create(['requester_id' => $employee->id]);

        // Send a real notification stored in database table
        $employee->notify(new RequestSubmittedNotification($request));

        Sanctum::actingAs($employee);

        // 1. Fetch notifications
        $listResponse = $this->getJson('/api/notifications');
        $listResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'meta' => [
                    'unread_count' => 1,
                ],
            ]);

        $notificationId = $listResponse->json('data.0.id');
        $this->assertNotEmpty($notificationId);

        // 2. Mark as read
        $readResponse = $this->patchJson("/api/notifications/{$notificationId}/read");
        $readResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Notification marked as read.',
            ]);

        $this->assertEquals(0, $employee->fresh()->unreadNotifications()->count());

        // 3. Mark all as read
        $allReadResponse = $this->postJson('/api/notifications/read-all');
        $allReadResponse->assertStatus(200);
    }
}

