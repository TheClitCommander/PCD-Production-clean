import { storage } from "./storage";
import type { Business } from "@shared/schema";
import moment from "moment";
import { SCHEDULING_RULES, isDayAvailable, getTimeRangeForScore, getDailySlots } from "./config/schedule";

// Configuration constants
const SLOT_DURATION = 30; // minutes
const BUFFER_TIME = 15; // minutes between slots
const MAX_DAILY_SLOTS = 4;
const PRIME_TIME_START = 9; // 9 AM
const PRIME_TIME_END = 14; // 2 PM
const HIGH_SCORE_THRESHOLD = 85;
const BASE_URL = "https://www.pleasantcovedesign.com"; // Updated URL with www

export function generateSchedulingLink(businessId: number): string {
  const baseUrl = process.env.PUBLIC_URL || "https://www.pleasantcovedesign.com";
  return `${baseUrl}/schedule?lead_id=${businessId}`;
}

export async function getAvailableSlots(date: string, leadScore: number = 0): Promise<string[]> {
  const targetDate = moment(date);
  const dayOfWeek = targetDate.day();
  
  // Check if this day is available
  if (!isDayAvailable(dayOfWeek)) {
    return [];
  }
  
  // Check for blocked dates
  const blockedDates = await storage.getBlockedDatesByRange(date, date);
  const isWholeDayBlocked = blockedDates.some(blocked => 
    blocked.date === date && !blocked.startTime && !blocked.endTime
  );
  
  if (isWholeDayBlocked) {
    return [];
  }
  
  // Get existing bookings for this date
  const allBusinesses = await storage.getBusinesses();
  const bookingsOnDate = allBusinesses.filter(b => 
    b.scheduledTime && moment(b.scheduledTime).isSame(targetDate, 'day')
  );
  
  // Check if we've hit the daily limit
  if (bookingsOnDate.length >= SCHEDULING_RULES.maxPerDay) {
    return [];
  }
  
  // Get the fixed daily slots
  const dailySlots = getDailySlots();
  const availableSlots: string[] = [];
  
  // Check each fixed slot
  for (const slotTime of dailySlots) {
    const slotDateTime = moment(`${date} ${slotTime}`, 'YYYY-MM-DD HH:mm');
    
    // Check if this specific time slot is blocked
    const isTimeBlocked = blockedDates.some(blocked => {
      if (blocked.date === date && blocked.startTime && blocked.endTime) {
        const blockedStart = moment(`${date} ${blocked.startTime}`, 'YYYY-MM-DD HH:mm');
        const blockedEnd = moment(`${date} ${blocked.endTime}`, 'YYYY-MM-DD HH:mm');
        return slotDateTime.isBetween(blockedStart, blockedEnd, null, '[)');
      }
      return false;
    });
    
    if (isTimeBlocked) {
      continue;
    }
    
    // Check if this slot is already booked
    const isBooked = bookingsOnDate.some(booking => {
      const bookingTime = moment(booking.scheduledTime);
      return bookingTime.format('HH:mm') === slotTime;
    });
    
    if (!isBooked) {
      availableSlots.push(slotDateTime.toISOString());
    }
  }
  
  return availableSlots;
}

export async function createBooking(businessId: number, datetime: string, duration: number = 30): Promise<Business> {
  const business = await storage.getBusinessById(businessId);
  if (!business) {
    throw new Error('Business not found');
  }

  // Check if slot is available
  const dateObj = new Date(datetime);
  const dayOfWeek = dateObj.getDay();
  const time = dateObj.toTimeString().substring(0, 5);
  const dateStr = moment(datetime).format('YYYY-MM-DD');
  
  // Check if the day is available
  if (!isDayAvailable(dayOfWeek)) {
    throw new Error('Selected day is not available');
  }
  
  // Check for blocked dates
  const blockedDates = await storage.getBlockedDatesByRange(dateStr, dateStr);
  const isBlocked = blockedDates.some(blocked => {
    // Whole day blocked
    if (blocked.date === dateStr && !blocked.startTime && !blocked.endTime) {
      return true;
    }
    // Specific time blocked
    if (blocked.date === dateStr && blocked.startTime && blocked.endTime) {
      const slotTime = moment(datetime);
      const blockedStart = moment(`${dateStr} ${blocked.startTime}`, 'YYYY-MM-DD HH:mm');
      const blockedEnd = moment(`${dateStr} ${blocked.endTime}`, 'YYYY-MM-DD HH:mm');
      return slotTime.isBetween(blockedStart, blockedEnd, null, '[)');
    }
    return false;
  });
  
  if (isBlocked) {
    throw new Error('This time slot has been blocked');
  }
  
  // Check if the time is one of the allowed slots
  const availableSlots = getDailySlots();
  if (!availableSlots.includes(time)) {
    throw new Error('Selected time slot is not available');
  }

  // Check for existing bookings at this time
  const existingBookings = await storage.getBusinesses();
  const conflictingBooking = existingBookings.find(b => 
    b.scheduledTime && 
    new Date(b.scheduledTime).getTime() === dateObj.getTime() &&
    b.id !== businessId
  );
  
  if (conflictingBooking) {
    throw new Error('This time slot is already booked');
  }

  // Update business with scheduled time and add auto-scheduled note
  const updatedBusiness = await storage.updateBusiness(businessId, {
    stage: 'scheduled',
    scheduledTime: datetime,
    notes: `${business.notes || ''}\n\n[Auto-Scheduled] Source: Scheduling Link\nBooked on: ${new Date().toLocaleString()}`
  });

  // Create activity
  await storage.createActivity({
    type: 'meeting_scheduled',
    description: `Consultation auto-scheduled for ${dateObj.toLocaleString()} via self-service link`,
    businessId
  });

  return updatedBusiness;
}

export async function getBookingDetails(businessId: number): Promise<Business | undefined> {
  const business = await storage.getBusinessById(businessId);
  
  if (!business || !business.scheduledTime) {
    return undefined;
  }
  
  return business;
}

export async function sendSchedulingReminder(businessId: number, hoursBeforeAppointment: number): Promise<void> {
  const business = await storage.getBusinessById(businessId);
  
  if (!business || !business.scheduledTime) {
    return;
  }
  
  const appointmentTime = moment(business.scheduledTime);
  const reminderMessage = hoursBeforeAppointment === 24 
    ? `Hi ${business.name}, this is a reminder that we have a consultation scheduled for tomorrow at ${appointmentTime.format('h:mm A')}. Looking forward to speaking with you!`
    : `Hi ${business.name}, just a quick reminder about our call in 1 hour (${appointmentTime.format('h:mm A')}). I'll be calling you at ${business.phone}. Talk soon!`;
  
  // TODO: Integrate with SMS/email system
  console.log(`[SMS Reminder] To ${business.phone}: ${reminderMessage}`);
  
  // Log activity
  await storage.createActivity({
    type: 'reminder_sent',
    description: `${hoursBeforeAppointment}hr reminder sent`,
    businessId
  });
}

export async function handleNoShow(businessId: number): Promise<void> {
  const business = await storage.getBusinessById(businessId);
  
  if (!business) {
    return;
  }
  
  // Add note about no-show
  await storage.updateBusiness(businessId, {
    notes: `${business.notes}\n\nNo-show for scheduled call on ${moment(business.scheduledTime).format('MMMM D, YYYY at h:mm A')}`
  });
  
  // Log activity
  await storage.createActivity({
    type: 'no_show',
    description: 'Did not attend scheduled consultation',
    businessId
  });
  
  // TODO: Send follow-up message
  const followUpMessage = `Hi ${business.name}, I noticed we missed our scheduled call today. No worries! If you're still interested in discussing a website for your business, here's my calendar to reschedule: ${generateSchedulingLink(businessId)}`;
  
  console.log(`[SMS Follow-up] To ${business.phone}: ${followUpMessage}`);
}

export async function getSchedulingStats() {
  const businesses = await storage.getBusinesses();
  const activities = await storage.getActivities();
  
  const scheduled = businesses.filter(b => b.scheduledTime);
  const schedulingActivities = activities.filter(a => a.type === 'meeting_scheduled');
  const noShows = activities.filter(a => a.type === 'no_show');
  
  // Get appointments with status
  const confirmedAppointments = scheduled.filter(b => b.appointmentStatus === 'confirmed');
  const completedAppointments = scheduled.filter(b => b.appointmentStatus === 'completed'); 
  const noShowAppointments = scheduled.filter(b => b.appointmentStatus === 'no-show');
  
  // Count auto vs manual scheduled
  const autoScheduled = scheduled.filter(b => 
    b.notes?.includes('Source: Scheduling Link') || 
    b.notes?.includes('[Auto-Scheduled]')
  );
  const manualScheduled = scheduled.filter(b => 
    !b.notes?.includes('Source: Scheduling Link') && 
    !b.notes?.includes('[Auto-Scheduled]')
  );
  
  // Calculate metrics
  const totalScheduled = scheduled.length;
  const totalNoShows = noShowAppointments.length;
  const showRate = totalScheduled > 0 ? ((totalScheduled - totalNoShows) / totalScheduled) * 100 : 0;
  
  // Find best performing time slots
  const slotPerformance: { [key: string]: { scheduled: number; showed: number; noShow: number } } = {};
  
  scheduled.forEach(business => {
    if (business.scheduledTime) {
      const time = moment(business.scheduledTime).format('HH:mm');
      
      if (!slotPerformance[time]) {
        slotPerformance[time] = { scheduled: 0, showed: 0, noShow: 0 };
      }
      
      slotPerformance[time].scheduled++;
      
      if (business.appointmentStatus === 'completed') {
        slotPerformance[time].showed++;
      } else if (business.appointmentStatus === 'no-show') {
        slotPerformance[time].noShow++;
      }
    }
  });
  
  // Calculate average time to booking
  const bookingTimes = schedulingActivities
    .filter(a => a.businessId && a.createdAt)
    .map(a => {
      const business = businesses.find(b => b.id === a.businessId);
      if (business?.createdAt) {
        return moment(a.createdAt).diff(moment(business.createdAt), 'hours');
      }
      return null;
    })
    .filter(time => time !== null) as number[];
  
  const avgTimeToBooking = bookingTimes.length > 0 
    ? bookingTimes.reduce((a, b) => a + b, 0) / bookingTimes.length 
    : 0;
  
  // Find most popular time
  const popularSlots = Object.entries(slotPerformance)
    .sort((a, b) => b[1].scheduled - a[1].scheduled);
  
  const mostPopularTime = popularSlots.length > 0 ? popularSlots[0][0] : null;
  
  return {
    totalScheduled,
    totalNoShows,
    showRate: Math.round(showRate),
    slotPerformance,
    bookingRate: 0, // TODO: Calculate from link clicks when tracking is implemented
    avgTimeToBookingHours: Math.round(avgTimeToBooking),
    popularSlots: popularSlots.slice(0, 3).map(([time, stats]) => ({ time, ...stats })),
    
    // New detailed analytics
    totalBookings: totalScheduled,
    autoScheduledCount: autoScheduled.length,
    manualCount: manualScheduled.length,
    noShowRate: totalScheduled > 0 ? Math.round((totalNoShows / totalScheduled) * 100) : 0,
    avgTimeToBooking: Math.round(avgTimeToBooking),
    mostPopularTime,
    appointmentBreakdown: {
      confirmed: confirmedAppointments.length,
      completed: completedAppointments.length,
      noShow: noShowAppointments.length
    }
  };
} 