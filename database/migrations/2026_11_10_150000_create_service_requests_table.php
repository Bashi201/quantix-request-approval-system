<?php

use App\Enums\RequestStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('service_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number', 32)->unique();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category', 64)->index();
            $table->string('title');
            $table->text('description');
            $table->string('priority', 20)->default('medium')->index();
            $table->string('status', 32)->default(RequestStatus::Draft->value)->index();
            $table->timestamp('sla_due_at')->nullable()->index();
            $table->boolean('is_overdue')->default(false)->index();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Compound indexes for query optimization
            $table->index(['requester_id', 'status']);
            $table->index(['assigned_to_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_requests');
    }
};
