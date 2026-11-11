<?php

namespace App\Exceptions;

use App\Enums\RequestStatus;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvalidStateTransitionException extends Exception
{
    protected RequestStatus $from;

    protected RequestStatus $to;

    /**
     * @param  array<RequestStatus>  $validTransitions
     */
    public function __construct(RequestStatus $from, RequestStatus $to, array $validTransitions = [])
    {
        $validList = empty($validTransitions)
            ? 'none (terminal state)'
            : implode(', ', array_map(fn (RequestStatus $s) => "'{$s->value}'", $validTransitions));

        $message = "Cannot transition request from '{$from->value}' to '{$to->value}'. Valid transitions from '{$from->value}' are: [{$validList}].";

        parent::__construct($message, 422);

        $this->from = $from;
        $this->to = $to;
    }

    /**
     * Render the exception into an HTTP JSON response.
     */
    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'errors' => [
                'status' => [$this->getMessage()],
            ],
        ], 422);
    }
}
