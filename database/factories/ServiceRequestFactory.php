<?php

namespace Database\Factories;

use App\Enums\RequestStatus;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceRequest>
 */
class ServiceRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'request_number' => 'REQ-'.date('Ym').'-'.fake()->unique()->numberBetween(1000, 9999),
            'requester_id' => User::factory()->employee(),
            'assigned_to_id' => null,
            'category' => fake()->randomElement(['IT Support', 'Equipment', 'Maintenance', 'Access Request', 'Software License']),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(2),
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'urgent']),
            'status' => RequestStatus::Draft,
            'sla_due_at' => now()->addDays(3),
            'is_overdue' => false,
            'submitted_at' => null,
            'approved_at' => null,
            'completed_at' => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Draft,
            'submitted_at' => null,
            'approved_at' => null,
            'completed_at' => null,
        ]);
    }

    public function submitted(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Submitted,
            'submitted_at' => now()->subHours(2),
        ]);
    }

    public function returned(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Returned,
            'submitted_at' => now()->subHours(6),
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Approved,
            'submitted_at' => now()->subHours(5),
            'approved_at' => now()->subHours(1),
        ]);
    }

    public function inProgress(?User $assignedTo = null): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::InProgress,
            'assigned_to_id' => $assignedTo?->id ?? User::factory()->operations(),
            'submitted_at' => now()->subDay(),
            'approved_at' => now()->subHours(12),
        ]);
    }

    public function completed(?User $assignedTo = null): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Completed,
            'assigned_to_id' => $assignedTo?->id ?? User::factory()->operations(),
            'submitted_at' => now()->subDays(2),
            'approved_at' => now()->subDay(),
            'completed_at' => now()->subHours(1),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Rejected,
            'submitted_at' => now()->subHours(8),
        ]);
    }
}
