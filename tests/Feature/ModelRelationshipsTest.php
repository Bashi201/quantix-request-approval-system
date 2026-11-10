<?php

namespace Tests\Feature;

use App\Enums\RequestStatus;
use App\Models\RequestActivity;
use App\Models\RequestComment;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelRelationshipsTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_hierarchy_and_direct_reports_relationship(): void
    {
        $manager = User::factory()->manager()->create([
            'name' => 'Sarah Connor',
            'email' => 'sarah@quantix.io',
        ]);

        $report1 = User::factory()->employee()->reportingTo($manager)->create([
            'name' => 'Alice Smith',
            'email' => 'alice@quantix.io',
        ]);

        $report2 = User::factory()->employee()->reportingTo($manager)->create([
            'name' => 'Bob Jones',
            'email' => 'bob@quantix.io',
        ]);

        $this->assertEquals($manager->id, $report1->manager->id);
        $this->assertEquals($manager->id, $report2->manager->id);
        $this->assertCount(2, $manager->directReports);
        $this->assertTrue($manager->directReports->contains($report1));
        $this->assertTrue($manager->directReports->contains($report2));
    }

    public function test_service_request_dual_user_relationships(): void
    {
        $requester = User::factory()->employee()->create();
        $assignedOps = User::factory()->operations()->create();

        $request = ServiceRequest::factory()->create([
            'requester_id' => $requester->id,
            'assigned_to_id' => $assignedOps->id,
            'status' => RequestStatus::InProgress,
        ]);

        $this->assertEquals($requester->id, $request->requester->id);
        $this->assertEquals($assignedOps->id, $request->assignedTo->id);
        $this->assertTrue($requester->submittedRequests->contains($request));
        $this->assertTrue($assignedOps->assignedRequests->contains($request));
    }

    public function test_request_comments_and_activities_relationships(): void
    {
        $requester = User::factory()->employee()->create();
        $request = ServiceRequest::factory()->create([
            'requester_id' => $requester->id,
        ]);

        $comment = RequestComment::factory()->create([
            'service_request_id' => $request->id,
            'user_id' => $requester->id,
            'comment' => 'Can this be expedited?',
        ]);

        $activity = RequestActivity::factory()->create([
            'service_request_id' => $request->id,
            'user_id' => $requester->id,
            'action' => 'SUBMITTED',
            'from_status' => 'draft',
            'to_status' => 'submitted',
        ]);

        $this->assertCount(1, $request->fresh()->comments);
        $this->assertCount(1, $request->fresh()->activities);
        $this->assertEquals($request->id, $comment->serviceRequest->id);
        $this->assertEquals($requester->id, $comment->user->id);
        $this->assertEquals($request->id, $activity->serviceRequest->id);
        $this->assertEquals($requester->id, $activity->user->id);
    }

    public function test_deleting_request_cascades_comments_and_activities(): void
    {
        $requester = User::factory()->employee()->create();
        $request = ServiceRequest::factory()->create([
            'requester_id' => $requester->id,
        ]);

        $comment = RequestComment::factory()->create([
            'service_request_id' => $request->id,
            'user_id' => $requester->id,
        ]);

        $activity = RequestActivity::factory()->create([
            'service_request_id' => $request->id,
            'user_id' => $requester->id,
        ]);

        $request->delete();

        $this->assertDatabaseMissing('service_requests', ['id' => $request->id]);
        $this->assertDatabaseMissing('request_comments', ['id' => $comment->id]);
        $this->assertDatabaseMissing('request_activities', ['id' => $activity->id]);
    }

    public function test_deleting_manager_sets_direct_report_manager_id_to_null(): void
    {
        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->reportingTo($manager)->create();

        $this->assertEquals($manager->id, $employee->manager_id);

        $manager->delete();

        $this->assertDatabaseMissing('users', ['id' => $manager->id]);
        $this->assertDatabaseHas('users', [
            'id' => $employee->id,
            'manager_id' => null,
        ]);
    }
}
