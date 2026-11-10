<?php

namespace Database\Factories;

use App\Models\RequestActivity;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RequestActivity>
 */
class RequestActivityFactory extends Factory
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
            'action' => 'CREATED',
            'from_status' => null,
            'to_status' => 'draft',
            'comment' => null,
            'metadata' => null,
            'created_at' => now(),
        ];
    }
}

