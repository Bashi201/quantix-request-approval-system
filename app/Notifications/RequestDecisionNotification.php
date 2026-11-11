<?php

namespace App\Notifications;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequestDecisionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ServiceRequest $request,
        public string $decision,
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
        $verb = match ($this->decision) {
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'returned' => 'Returned for Revision',
            default => ucfirst($this->decision),
        };

        $mail = (new MailMessage)
            ->subject("Service Request {$this->request->request_number}: {$verb}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your service request '{$this->request->title}' ({$this->request->request_number}) was {$this->decision} by {$this->actor->name}.");

        if (! empty($this->comment)) {
            $mail->line("Manager Note: \"{$this->comment}\"");
        }

        if ($this->decision === 'returned') {
            $mail->line('You may update the request details and re-submit it for approval.');
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
            'status' => $this->request->status->value,
            'action' => $this->decision,
            'actor_name' => $this->actor->name,
            'comment' => $this->comment,
            'message' => "Your request {$this->request->request_number} was {$this->decision} by {$this->actor->name}.",
        ];
    }
}
