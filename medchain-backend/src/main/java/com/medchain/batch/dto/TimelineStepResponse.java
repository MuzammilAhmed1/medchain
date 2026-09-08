package com.medchain.batch.dto;

public record TimelineStepResponse(
        String title,
        String state, // "done" | "current" | "pending" - matches the frontend Timeline component
        String timestamp,
        String description
) {
    public static TimelineStepResponse done(String title, String timestamp, String description) {
        return new TimelineStepResponse(title, "done", timestamp, description);
    }

    public static TimelineStepResponse current(String title, String description) {
        return new TimelineStepResponse(title, "current", "In progress", description);
    }

    public static TimelineStepResponse pending(String title) {
        return new TimelineStepResponse(title, "pending", null, null);
    }
}
