<?php

namespace App\Models;

use App\Enums\RequestStatus;
use Database\Factories\ServiceRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceRequest extends Model
{
    /** @use HasFactory<ServiceRequestFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'request_number',
        'requester_id',
        'assigned_to_id',
        'category',
        'title',
        'description',
        'priority',
        'status',
        'sla_due_at',
        'is_overdue',
        'submitted_at',
        'approved_at',
        'completed_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => RequestStatus::class,
            'is_overdue' => 'boolean',
            'sla_due_at' => 'datetime',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * The employee who submitted this service request.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    /**
     * The operations user assigned to fulfill this request.
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    /**
     * Comments posted on this service request.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(RequestComment::class);
    }

    /**
     * Activity log records documenting state transitions and actions.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(RequestActivity::class);
    }
}
