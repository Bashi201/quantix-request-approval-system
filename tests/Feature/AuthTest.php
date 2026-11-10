<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->employee()->create([
            'email' => 'alice@quantix.io',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'alice@quantix.io',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Login successful.',
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'token',
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'role',
                        'manager_id',
                    ],
                ],
            ]);

        $this->assertEquals(UserRole::Employee->value, $response->json('data.user.role'));
        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'alice@quantix.io',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'alice@quantix.io',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ])
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_with_non_existent_email(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nobody@quantix.io',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ])
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_access_me_profile_with_manager_info(): void
    {
        $manager = User::factory()->manager()->create([
            'name' => 'Sarah Connor',
            'email' => 'sarah@quantix.io',
        ]);

        $employee = User::factory()->employee()->reportingTo($manager)->create([
            'name' => 'Alice Smith',
            'email' => 'alice@quantix.io',
        ]);

        Sanctum::actingAs($employee);

        $response = $this->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $employee->id,
                    'name' => 'Alice Smith',
                    'email' => 'alice@quantix.io',
                    'role' => UserRole::Employee->value,
                    'manager_id' => $manager->id,
                    'manager' => [
                        'id' => $manager->id,
                        'name' => 'Sarah Connor',
                        'email' => 'sarah@quantix.io',
                    ],
                ],
            ]);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_authenticated_user_can_logout_and_revoke_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Token revoked successfully.',
            ]);

        $this->assertCount(0, $user->fresh()->tokens);
    }
}
