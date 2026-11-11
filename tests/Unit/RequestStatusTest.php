<?php

namespace Tests\Unit;

use App\Enums\RequestStatus;
use PHPUnit\Framework\TestCase;

class RequestStatusTest extends TestCase
{
    public function test_request_status_enum_has_all_required_cases(): void
    {
        $values = RequestStatus::values();

        $this->assertContains('draft', $values);
        $this->assertContains('submitted', $values);
        $this->assertContains('returned', $values);
        $this->assertContains('approved', $values);
        $this->assertContains('in_progress', $values);
        $this->assertContains('completed', $values);
        $this->assertContains('rejected', $values);
        $this->assertCount(7, $values);
    }

    public function test_request_status_finality_rule(): void
    {
        // Only completed and rejected are terminal / final states
        $this->assertTrue(RequestStatus::Completed->isFinal());
        $this->assertTrue(RequestStatus::Rejected->isFinal());

        $this->assertFalse(RequestStatus::Draft->isFinal());
        $this->assertFalse(RequestStatus::Submitted->isFinal());
        $this->assertFalse(RequestStatus::Returned->isFinal());
        $this->assertFalse(RequestStatus::Approved->isFinal());
        $this->assertFalse(RequestStatus::InProgress->isFinal());
    }

    public function test_request_status_editability_rule(): void
    {
        // Only draft and returned are editable by employees
        $this->assertTrue(RequestStatus::Draft->isEditable());
        $this->assertTrue(RequestStatus::Returned->isEditable());

        $this->assertFalse(RequestStatus::Submitted->isEditable());
        $this->assertFalse(RequestStatus::Approved->isEditable());
        $this->assertFalse(RequestStatus::InProgress->isEditable());
        $this->assertFalse(RequestStatus::Completed->isEditable());
        $this->assertFalse(RequestStatus::Rejected->isEditable());
    }

    public function test_request_status_labels(): void
    {
        $this->assertSame('Draft', RequestStatus::Draft->label());
        $this->assertSame('Pending Approval', RequestStatus::Submitted->label());
        $this->assertSame('Returned', RequestStatus::Returned->label());
        $this->assertSame('Approved', RequestStatus::Approved->label());
        $this->assertSame('In Progress', RequestStatus::InProgress->label());
        $this->assertSame('Completed', RequestStatus::Completed->label());
        $this->assertSame('Rejected', RequestStatus::Rejected->label());
    }
}
