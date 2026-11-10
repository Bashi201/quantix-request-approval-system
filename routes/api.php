<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Quantitative Service Request & Approval RESTful API.
|
*/

// Public Authentication Routes
Route::post('/login', [AuthController::class, 'login'])->name('api.login');

// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    // Current user session management
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/me', [AuthController::class, 'me'])->name('api.me');

    // Operations user directory for request assignment
    Route::get('/users/operations', [UserController::class, 'operationsUsers'])
        ->middleware('role:operations,manager')
        ->name('api.users.operations');
});
