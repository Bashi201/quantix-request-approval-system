<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RequestCommentController;
use App\Http\Controllers\Api\RequestWorkflowController;
use App\Http\Controllers\Api\ServiceRequestController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Quantix Service Request & Approval RESTful API.
|
*/

// Public Authentication
Route::post('/login', [AuthController::class, 'login'])->name('api.login');

// Authenticated Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Current user session management
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/me', [AuthController::class, 'me'])->name('api.me');

    // Operations user directory for ticket assignment
    Route::get('/users/operations', [UserController::class, 'operationsUsers'])
        ->middleware('role:operations,manager')
        ->name('api.users.operations');

    // Service Requests Core Endpoints
    Route::get('/requests', [ServiceRequestController::class, 'index'])->name('api.requests.index');
    Route::post('/requests', [ServiceRequestController::class, 'store'])->name('api.requests.store');
    Route::get('/requests/{serviceRequest}', [ServiceRequestController::class, 'show'])->name('api.requests.show');
    Route::put('/requests/{serviceRequest}', [ServiceRequestController::class, 'update'])->name('api.requests.update');

    // Workflow Transitions & Decisions
    Route::post('/requests/{serviceRequest}/submit', [RequestWorkflowController::class, 'submit'])->name('api.requests.submit');
    Route::post('/requests/{serviceRequest}/decision', [RequestWorkflowController::class, 'decision'])->name('api.requests.decision');
    Route::post('/requests/{serviceRequest}/assign', [RequestWorkflowController::class, 'assign'])->name('api.requests.assign');
    Route::post('/requests/{serviceRequest}/status', [RequestWorkflowController::class, 'updateStatus'])->name('api.requests.status');

    // Threaded Participant Discourse
    Route::post('/requests/{serviceRequest}/comments', [RequestCommentController::class, 'store'])->name('api.requests.comments.store');
});
