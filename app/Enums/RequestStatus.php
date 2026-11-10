<?php

namespace App\Enums;

enum RequestStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Returned = 'returned';
    case Approved = 'approved';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Submitted => 'Submitted',
            self::Returned => 'Returned',
            self::Approved => 'Approved',
            self::InProgress => 'In Progress',
            self::Completed => 'Completed',
            self::Rejected => 'Rejected',
        };
    }

    /**
     * Determine if this status is terminal (cannot be modified).
     */
    public function isFinal(): bool
    {
        return in_array($this, [self::Completed, self::Rejected], true);
    }

    /**
     * Determine if a request with this status can be edited by an employee.
     */
    public function isEditable(): bool
    {
        return in_array($this, [self::Draft, self::Returned], true);
    }

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
