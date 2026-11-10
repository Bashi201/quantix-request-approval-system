<?php

namespace Database\Seeders;

use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Models\RequestActivity;
use App\Models\RequestComment;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $defaultPassword = Hash::make('password');

        // 1. Create Manager (Sarah Connor)
        $manager = User::query()->create([
            'name' => 'Sarah Connor',
            'email' => 'sarah.manager@quantix.io',
            'password' => $defaultPassword,
            'role' => UserRole::Manager,
            'manager_id' => null,
            'email_verified_at' => now(),
        ]);

        // 2. Create Direct Reports (Employees reporting to Sarah Connor)
        $alice = User::query()->create([
            'name' => 'Alice Smith',
            'email' => 'alice.dev@quantix.io',
            'password' => $defaultPassword,
            'role' => UserRole::Employee,
            'manager_id' => $manager->id,
            'email_verified_at' => now(),
        ]);

        $bob = User::query()->create([
            'name' => 'Bob Jones',
            'email' => 'bob.qa@quantix.io',
            'password' => $defaultPassword,
            'role' => UserRole::Employee,
            'manager_id' => $manager->id,
            'email_verified_at' => now(),
        ]);

        // 3. Create Independent / Other Employee (Charlie Brown)
        $charlie = User::query()->create([
            'name' => 'Charlie Brown',
            'email' => 'charlie.ext@quantix.io',
            'password' => $defaultPassword,
            'role' => UserRole::Employee,
            'manager_id' => null,
            'email_verified_at' => now(),
        ]);

        // 4. Create Operations Users
        $oscar = User::query()->create([
            'name' => 'Oscar Martinez',
            'email' => 'oscar.ops@quantix.io',
            'password' => $defaultPassword,
            'role' => UserRole::Operations,
            'manager_id' => null,
            'email_verified_at' => now(),
        ]);

        $olivia = User::query()->create([
            'name' => 'Olivia Vance',
            'email' => 'olivia.ops@quantix.io',
            'password' => $defaultPassword,
            'role' => UserRole::Operations,
            'manager_id' => null,
            'email_verified_at' => now(),
        ]);

        // 5. Create 10 Service Requests distributed across all statuses

        // Request 1: Draft (Alice)
        $req1 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0001',
            'requester_id' => $alice->id,
            'assigned_to_id' => null,
            'category' => 'Equipment',
            'title' => 'Second 4K Monitor for Development',
            'description' => 'Requesting an additional 27-inch Dell UltraSharp 4K monitor to increase multitasking efficiency for frontend feature builds.',
            'priority' => 'medium',
            'status' => RequestStatus::Draft,
            'sla_due_at' => now()->addDays(5),
            'is_overdue' => false,
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req1->id,
            'user_id' => $alice->id,
            'action' => 'CREATED',
            'from_status' => null,
            'to_status' => RequestStatus::Draft->value,
            'comment' => 'Initial draft created by requester.',
            'created_at' => now()->subHours(24),
        ]);

        // Request 2: Submitted (Alice)
        $req2 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0002',
            'requester_id' => $alice->id,
            'assigned_to_id' => null,
            'category' => 'Access Request',
            'title' => 'AWS Production CloudWatch Read-Only Access',
            'description' => 'Need read-only IAM access to AWS CloudWatch logs and metrics to troubleshoot API latency spikes in production.',
            'priority' => 'high',
            'status' => RequestStatus::Submitted,
            'sla_due_at' => now()->addDays(2),
            'is_overdue' => false,
            'submitted_at' => now()->subHours(4),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req2->id,
            'user_id' => $alice->id,
            'action' => 'CREATED',
            'from_status' => null,
            'to_status' => RequestStatus::Draft->value,
            'comment' => 'Request drafted.',
            'created_at' => now()->subHours(5),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req2->id,
            'user_id' => $alice->id,
            'action' => 'SUBMITTED',
            'from_status' => RequestStatus::Draft->value,
            'to_status' => RequestStatus::Submitted->value,
            'comment' => 'Submitted for manager review.',
            'created_at' => now()->subHours(4),
        ]);

        // Request 3: Returned (Alice)
        $req3 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0003',
            'requester_id' => $alice->id,
            'assigned_to_id' => null,
            'category' => 'Software License',
            'title' => 'IntelliJ IDEA Ultimate License Renewal',
            'description' => 'Annual developer subscription renewal for JetBrains IntelliJ IDEA Ultimate IDE.',
            'priority' => 'medium',
            'status' => RequestStatus::Returned,
            'sla_due_at' => now()->addDays(3),
            'is_overdue' => false,
            'submitted_at' => now()->subHours(8),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req3->id,
            'user_id' => $alice->id,
            'action' => 'SUBMITTED',
            'from_status' => RequestStatus::Draft->value,
            'to_status' => RequestStatus::Submitted->value,
            'created_at' => now()->subHours(8),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req3->id,
            'user_id' => $manager->id,
            'action' => 'RETURNED',
            'from_status' => RequestStatus::Submitted->value,
            'to_status' => RequestStatus::Returned->value,
            'comment' => 'Please provide the project billing code before approval.',
            'created_at' => now()->subHours(6),
        ]);
        RequestComment::query()->create([
            'service_request_id' => $req3->id,
            'user_id' => $manager->id,
            'comment' => 'Please provide the project billing code before approval.',
            'is_internal' => false,
            'created_at' => now()->subHours(6),
        ]);

        // Request 4: Approved (Alice)
        $req4 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0004',
            'requester_id' => $alice->id,
            'assigned_to_id' => null,
            'category' => 'Equipment',
            'title' => 'Ergonomic Split Mechanical Keyboard & Wrist Rest',
            'description' => 'Ergonomic keyboard replacement recommended by occupational health assessment.',
            'priority' => 'low',
            'status' => RequestStatus::Approved,
            'sla_due_at' => now()->addDays(4),
            'is_overdue' => false,
            'submitted_at' => now()->subHours(10),
            'approved_at' => now()->subHours(2),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req4->id,
            'user_id' => $manager->id,
            'action' => 'APPROVED',
            'from_status' => RequestStatus::Submitted->value,
            'to_status' => RequestStatus::Approved->value,
            'comment' => 'Approved under annual hardware ergonomics stipend.',
            'created_at' => now()->subHours(2),
        ]);

        // Request 5: In Progress (Alice, assigned to Oscar)
        $req5 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0005',
            'requester_id' => $alice->id,
            'assigned_to_id' => $oscar->id,
            'category' => 'Maintenance',
            'title' => 'Workstation Desk Ethernet Port Repair',
            'description' => 'Physical RJ45 wall jack at desk 4B is intermittent and dropping gigabit link speeds.',
            'priority' => 'high',
            'status' => RequestStatus::InProgress,
            'sla_due_at' => now()->addDay(),
            'is_overdue' => false,
            'submitted_at' => now()->subDay(),
            'approved_at' => now()->subHours(18),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req5->id,
            'user_id' => $oscar->id,
            'action' => 'ASSIGNED',
            'from_status' => RequestStatus::Approved->value,
            'to_status' => RequestStatus::Approved->value,
            'comment' => 'Assigned ticket to Oscar Martinez.',
            'created_at' => now()->subHours(16),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req5->id,
            'user_id' => $oscar->id,
            'action' => 'IN_PROGRESS',
            'from_status' => RequestStatus::Approved->value,
            'to_status' => RequestStatus::InProgress->value,
            'comment' => 'Dispatched facilities technician with network cable tester.',
            'created_at' => now()->subHours(12),
        ]);
        RequestComment::query()->create([
            'service_request_id' => $req5->id,
            'user_id' => $oscar->id,
            'comment' => 'Wall keystone was re-crimped. Running 1Gbps throughput tests now.',
            'is_internal' => false,
            'created_at' => now()->subHours(3),
        ]);

        // Request 6: Completed (Alice, assigned to Oscar)
        $req6 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0006',
            'requester_id' => $alice->id,
            'assigned_to_id' => $oscar->id,
            'category' => 'Access Request',
            'title' => 'GitHub Enterprise Organization Membership',
            'description' => 'Grant developer access to repository group @quantix/frontend-team on GitHub.',
            'priority' => 'high',
            'status' => RequestStatus::Completed,
            'sla_due_at' => now()->subDay(),
            'is_overdue' => false,
            'submitted_at' => now()->subDays(3),
            'approved_at' => now()->subDays(2),
            'completed_at' => now()->subHours(5),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req6->id,
            'user_id' => $oscar->id,
            'action' => 'COMPLETED',
            'from_status' => RequestStatus::InProgress->value,
            'to_status' => RequestStatus::Completed->value,
            'comment' => 'SSO mapping configured and GitHub invite accepted.',
            'created_at' => now()->subHours(5),
        ]);
        RequestComment::query()->create([
            'service_request_id' => $req6->id,
            'user_id' => $oscar->id,
            'comment' => 'Invite has been verified and developer access is active.',
            'is_internal' => false,
            'created_at' => now()->subHours(5),
        ]);

        // Request 7: Submitted (Bob)
        $req7 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0007',
            'requester_id' => $bob->id,
            'assigned_to_id' => null,
            'category' => 'Equipment',
            'title' => 'Mobile QA Test Devices (iPhone 15 & Pixel 8)',
            'description' => 'Target test devices for mobile responsive testing of the customer portal.',
            'priority' => 'urgent',
            'status' => RequestStatus::Submitted,
            'sla_due_at' => now()->addDay(),
            'is_overdue' => false,
            'submitted_at' => now()->subHours(3),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req7->id,
            'user_id' => $bob->id,
            'action' => 'SUBMITTED',
            'from_status' => RequestStatus::Draft->value,
            'to_status' => RequestStatus::Submitted->value,
            'comment' => 'Urgent QA equipment requirement for sprint regression testing.',
            'created_at' => now()->subHours(3),
        ]);

        // Request 8: Rejected (Bob)
        $req8 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0008',
            'requester_id' => $bob->id,
            'assigned_to_id' => null,
            'category' => 'Equipment',
            'title' => 'Custom Water-Cooled Desktop Tower for QA',
            'description' => 'Requesting custom desktop hardware with liquid cooling setup for test automation.',
            'priority' => 'low',
            'status' => RequestStatus::Rejected,
            'sla_due_at' => now()->addDays(2),
            'is_overdue' => false,
            'submitted_at' => now()->subDays(2),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req8->id,
            'user_id' => $manager->id,
            'action' => 'REJECTED',
            'from_status' => RequestStatus::Submitted->value,
            'to_status' => RequestStatus::Rejected->value,
            'comment' => 'Custom liquid-cooled hardware is not compliant with corporate IT policy. Standard cloud test runners should be used.',
            'created_at' => now()->subDay(),
        ]);
        RequestComment::query()->create([
            'service_request_id' => $req8->id,
            'user_id' => $manager->id,
            'comment' => 'Custom liquid-cooled hardware is not compliant with corporate IT policy. Standard cloud test runners should be used.',
            'is_internal' => false,
            'created_at' => now()->subDay(),
        ]);

        // Request 9: In Progress (Bob, assigned to Olivia)
        $req9 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0009',
            'requester_id' => $bob->id,
            'assigned_to_id' => $olivia->id,
            'category' => 'IT Support',
            'title' => 'Docker Desktop Business License Configuration',
            'description' => 'Docker Desktop authentication token expiring on QA runner machine.',
            'priority' => 'medium',
            'status' => RequestStatus::InProgress,
            'sla_due_at' => now()->addDays(1),
            'is_overdue' => false,
            'submitted_at' => now()->subHours(14),
            'approved_at' => now()->subHours(8),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req9->id,
            'user_id' => $olivia->id,
            'action' => 'IN_PROGRESS',
            'from_status' => RequestStatus::Approved->value,
            'to_status' => RequestStatus::InProgress->value,
            'comment' => 'Assigned license seat in Docker Hub admin console.',
            'created_at' => now()->subHours(4),
        ]);

        // Request 10: Submitted (Charlie Brown - Employee with no manager / external)
        $req10 = ServiceRequest::query()->create([
            'request_number' => 'REQ-202611-0010',
            'requester_id' => $charlie->id,
            'assigned_to_id' => null,
            'category' => 'Maintenance',
            'title' => 'Replacement Building Access Keycard',
            'description' => 'Lost keycard while traveling. Need replacement NFC security badge.',
            'priority' => 'medium',
            'status' => RequestStatus::Submitted,
            'sla_due_at' => now()->addDays(3),
            'is_overdue' => false,
            'submitted_at' => now()->subHours(2),
        ]);
        RequestActivity::query()->create([
            'service_request_id' => $req10->id,
            'user_id' => $charlie->id,
            'action' => 'SUBMITTED',
            'from_status' => RequestStatus::Draft->value,
            'to_status' => RequestStatus::Submitted->value,
            'comment' => 'Submitted replacement request.',
            'created_at' => now()->subHours(2),
        ]);
    }
}
