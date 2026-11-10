<?php

namespace App\Models;

use Database\Factories\RequestActivityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestActivity extends Model
{
    /** @use HasFactory<RequestActivityFactory> */
    use HasFactory;

    /**
     * Immutable audit log has no updated_at column.
     */
    public const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'service_request_id',
        'user_id',
        'action',
        'from_status',
        'to_status',
        'comment',
        'metadata',
        'created_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * The service request this activity belongs to.
     */
    public function serviceRequest(): BelongsTo
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    /**
     * The user who triggered this activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
