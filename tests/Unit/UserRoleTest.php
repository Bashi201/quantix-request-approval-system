<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use App\Models\User;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_user_role_enum_has_all_expected_cases(): void
    {
        $values = UserRole::values();

        $this->assertContains('employee', $values);
        $this->assertContains('manager', $values);
        $this->assertContains('operations', $values);
        $this->assertCount(3, $values);
    }

    public function test_user_role_has_readable_labels(): void
    {
        $this->assertSame('Employee', UserRole::Employee->label());
        $this->assertSame('Manager', UserRole::Manager->label());
        $this->assertSame('Operations User', UserRole::Operations->label());
    }

    public function test_user_model_role_helper_methods(): void
    {
        $employee = new User(['role' => UserRole::Employee]);
        $this->assertTrue($employee->isEmployee());
        $this->assertFalse($employee->isManager());
        $this->assertFalse($employee->isOperations());

        $manager = new User(['role' => UserRole::Manager]);
        $this->assertFalse($manager->isEmployee());
        $this->assertTrue($manager->isManager());
        $this->assertFalse($manager->isOperations());

        $ops = new User(['role' => UserRole::Operations]);
        $this->assertFalse($ops->isEmployee());
        $this->assertFalse($ops->isManager());
        $this->assertTrue($ops->isOperations());
    }
}
