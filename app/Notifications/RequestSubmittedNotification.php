<?php

namespace App\Notifications;

use App\Models\ServiceRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequestSubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ServiceRequest $request
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
        $requesterName = $this->request->requester?->name ?? 'An employee';

        return (new MailMessage)
            ->subject("Service Request {$this->request->request_number} Submitted for Approval")
            ->greeting("Hello {$notifiable->name},")
            ->line("A new service request has been submitted by {$requesterName} and requires your managerial review.")
            ->line("Title: {$this->request->title}")
            ->line("Category: {$this->request->category}")
            ->line('Priority: '.ucfirst($this->request->priority))
            ->line('Please review and approve, return, or reject this request.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $requesterName = $this->request->requester?->name ?? 'An employee';

        return [
            'request_id' => $this->request->id,
            'request_number' => $this->request->request_number,
            'title' => $this->request->title,
            'category' => $this->request->category,
            'priority' => $this->request->priority,
            'status' => $this->request->status->value,
            'action' => 'submitted',
            'message' => "New request {$this->request->request_number} from {$requesterName} is pending your approval.",
        ];
    }
}
