<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'manager_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    /**
     * The direct manager who supervises this user.
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * The direct reports who report to this manager.
     */
    public function directReports(): HasMany
    {
        return $this->hasMany(User::class, 'manager_id');
    }

    /**
     * Service requests submitted by this user as requester.
     */
    public function submittedRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'requester_id');
    }

    /**
     * Service requests assigned to this user as operations handler.
     */
    public function assignedRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'assigned_to_id');
    }

    /**
     * Comments authored by this user.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(RequestComment::class);
    }

    /**
     * Activity log entries triggered by this user.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(RequestActivity::class);
    }

    /**
     * Determine if user has the Employee role.
     */
    public function isEmployee(): bool
    {
        return $this->role === UserRole::Employee;
    }

    /**
     * Determine if user has the Manager role.
     */
    public function isManager(): bool
    {
        return $this->role === UserRole::Manager;
    }

    /**
     * Determine if user has the Operations role.
     */
    public function isOperations(): bool
    {
        return $this->role === UserRole::Operations;
    }
}
