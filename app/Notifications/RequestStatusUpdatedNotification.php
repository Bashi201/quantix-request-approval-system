<?php

namespace App\Notifications;

use App\Enums\RequestStatus;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequestStatusUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ServiceRequest $request,
        public RequestStatus $status,
        public User $actor,
        public ?string $comment = null
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
        $statusLabel = $this->status->label();

        $mail = (new MailMessage)
            ->subject("Service Request {$this->request->request_number}: Status Updated to {$statusLabel}")
            ->greeting("Hello {$notifiable->name},")
            ->line("The status of service request '{$this->request->title}' ({$this->request->request_number}) was updated to {$statusLabel} by {$this->actor->name}.");

        if (! empty($this->comment)) {
            $mail->line("Note: \"{$this->comment}\"");
        }

        return $mail;
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'request_id' => $this->request->id,
            'request_number' => $this->request->request_number,
            'title' => $this->request->title,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'action' => 'status_updated',
            'actor_name' => $this->actor->name,
            'comment' => $this->comment,
            'message' => "Request {$this->request->request_number} is now {$this->status->label()}.",
        ];
    }
}
