export const SCHEDULING_RULES = {
  appointmentLengthMinutes: 30,
  bufferMinutes: 30, // 30 min between the two slots
  maxPerDay: 2, // Only 2 consultations per day
  // Both time ranges are the same now - just two morning slots
  preferredTimeRange: { start: "08:30", end: "10:00" }, 
  generalTimeRange: { start: "08:30", end: "10:00" },
  highScoreThreshold: 85, // Score threshold for preferred time access
  availableSlots: ["08:30", "09:00"], // Fixed slots
  dailyAvailability: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
  }
};

// Helper to check if a day is available
export function isDayAvailable(dayOfWeek: number): boolean {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dayOfWeek] as keyof typeof SCHEDULING_RULES.dailyAvailability;
  return SCHEDULING_RULES.dailyAvailability[dayName];
}

// Helper to get time range based on lead score
export function getTimeRangeForScore(score: number) {
  // Since you only have two morning slots, everyone gets the same range
  return SCHEDULING_RULES.generalTimeRange;
}

// Get available time slots for the day
export function getDailySlots(): string[] {
  return SCHEDULING_RULES.availableSlots;
} 