<?php

namespace App\Models;

use Database\Factories\RequestCommentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestComment extends Model
{
    /** @use HasFactory<RequestCommentFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'service_request_id',
        'user_id',
        'comment',
        'is_internal',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_internal' => 'boolean',
        ];
    }

    /**
     * The service request this comment belongs to.
     */
    public function serviceRequest(): BelongsTo
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    /**
     * The user who authored this comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

