<?php

namespace Database\Factories;

use App\Models\RequestComment;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RequestComment>
 */
class RequestCommentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'service_request_id' => ServiceRequest::factory(),
            'user_id' => User::factory(),
            'comment' => fake()->sentence(8),
            'is_internal' => false,
        ];
    }

    public function internal(): static
    {
        return $this->state(fn () => [
            'is_internal' => true,
        ]);
    }
}

