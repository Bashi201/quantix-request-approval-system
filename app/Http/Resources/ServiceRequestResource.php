<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'request_number' => $this->request_number,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => is_string($this->status) ? $this->status : $this->status->value,
            'status_label' => is_string($this->status) ? $this->status : $this->status->label(),
            'sla_due_at' => $this->sla_due_at?->toISOString(),
            'is_overdue' => (bool) $this->is_overdue,
            'requester' => $this->relationLoaded('requester') && $this->requester ? [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
                'email' => $this->requester->email,
                'role' => is_string($this->requester->role) ? $this->requester->role : $this->requester->role->value,
            ] : null,
            'assigned_to' => $this->relationLoaded('assignedTo') && $this->assignedTo ? [
                'id' => $this->assignedTo->id,
                'name' => $this->assignedTo->name,
                'email' => $this->assignedTo->email,
                'role' => is_string($this->assignedTo->role) ? $this->assignedTo->role : $this->assignedTo->role->value,
            ] : null,
            'comments' => RequestCommentResource::collection($this->whenLoaded('comments')),
            'activities' => RequestActivityResource::collection($this->whenLoaded('activities')),
            'submitted_at' => $this->submitted_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
