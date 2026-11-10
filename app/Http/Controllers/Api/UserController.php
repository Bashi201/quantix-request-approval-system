<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    /**
     * List operations users available for request assignment.
     */
    public function operationsUsers(): JsonResponse
    {
        $users = User::query()
            ->where('role', UserRole::Operations->value)
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users),
        ], 200);
    }
}
