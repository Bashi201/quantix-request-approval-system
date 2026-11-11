<?php

namespace App\Notifications;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequestAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ServiceRequest $request,
        public User $assignedUser,
        public User $actor
    ) {
        $this->afterCommit();
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isAssignee = $notifiable->id === $this->assignedUser->id;

        $subject = $isAssignee
            ? "Service Request {$this->request->request_number} Assigned to You"
            : "Service Request {$this->request->request_number} Assigned to {$this->assignedUser->name}";

        $message = $isAssignee
            ? "You have been assigned to service request '{$this->request->title}' ({$this->request->request_number}) by {$this->actor->name}."
            : "Your service request '{$this->request->title}' ({$this->request->request_number}) has been assigned to {$this->assignedUser->name}.";

        return (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name},")
            ->line($message)
            ->line("Category: {$this->request->category}")
            ->line('Priority: '.ucfirst($this->request->priority));
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $isAssignee = $notifiable->id === $this->assignedUser->id;

        return [
            'request_id' => $this->request->id,
            'request_number' => $this->request->request_number,
            'title' => $this->request->title,
            'status' => $this->request->status->value,
            'action' => 'assigned',
            'assigned_to_id' => $this->assignedUser->id,
            'assigned_to_name' => $this->assignedUser->name,
            'actor_name' => $this->actor->name,
            'message' => $isAssignee
                ? "You have been assigned to request {$this->request->request_number} by {$this->actor->name}."
                : "Request {$this->request->request_number} has been assigned to {$this->assignedUser->name}.",
        ];
    }
}
