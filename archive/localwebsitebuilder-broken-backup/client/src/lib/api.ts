import { apiRequest } from "./queryClient";
import type { Business, InsertBusiness, Campaign, InsertCampaign, Activity, Template, AvailabilityConfig, InsertAvailabilityConfig, BlockedDate, InsertBlockedDate, Appointment, InsertAppointment } from "@shared/schema";

export const api = {
  // Stats
  getStats: async () => {
    const res = await apiRequest("GET", "/api/stats");
    return res.json();
  },

  // Businesses
  getBusinesses: async (): Promise<Business[]> => {
    const res = await apiRequest("GET", "/api/businesses");
    return res.json();
  },

  getBusiness: async (id: number): Promise<Business> => {
    const res = await apiRequest("GET", `/api/businesses/${id}`);
    return res.json();
  },

  getBusinessActivities: async (id: number): Promise<Activity[]> => {
    const res = await apiRequest("GET", `/api/businesses/${id}/activities`);
    return res.json();
  },

  getBusinessesByStage: async (stage: string): Promise<Business[]> => {
    const res = await apiRequest("GET", `/api/businesses/stage/${stage}`);
    return res.json();
  },

  createBusiness: async (business: InsertBusiness): Promise<Business> => {
    const res = await apiRequest("POST", "/api/businesses", business);
    return res.json();
  },

  updateBusiness: async (id: number, updates: Partial<Business>): Promise<Business> => {
    const res = await apiRequest("PUT", `/api/businesses/${id}`, updates);
    return res.json();
  },

  deleteBusiness: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/businesses/${id}`);
  },

  importBusinesses: async (businesses: InsertBusiness[]) => {
    const res = await apiRequest("POST", "/api/businesses/import", { businesses });
    return res.json();
  },

  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await apiRequest("GET", "/api/campaigns");
    return res.json();
  },

  createCampaign: async (campaign: InsertCampaign): Promise<Campaign> => {
    const res = await apiRequest("POST", "/api/campaigns", campaign);
    return res.json();
  },

  updateCampaign: async (id: number, updates: Partial<Campaign>): Promise<Campaign> => {
    const res = await apiRequest("PUT", `/api/campaigns/${id}`, updates);
    return res.json();
  },

  // Templates
  getTemplates: async (): Promise<Template[]> => {
    const res = await apiRequest("GET", "/api/templates");
    return res.json();
  },

  // Activities
  getActivities: async (limit?: number): Promise<Activity[]> => {
    const url = limit ? `/api/activities?limit=${limit}` : "/api/activities";
    const res = await apiRequest("GET", url);
    return res.json();
  },

  // Google Sheets import
  importFromGoogleSheets: async (sheetId: string): Promise<{ success: boolean; imported: number; businesses: Business[] }> => {
    const res = await apiRequest("POST", "/api/import/google-sheets", { sheetId });
    return res.json();
  },

  // Scheduling APIs
  getPendingLeads: async (): Promise<Business[]> => {
    const res = await apiRequest("GET", "/api/leads/pending");
    return res.json();
  },

  createSchedule: async (businessId: number, datetime: string): Promise<{ success: boolean; business: Business }> => {
    const res = await apiRequest("POST", "/api/schedule", { 
      business_id: businessId, 
      datetime 
    });
    return res.json();
  },

  getScheduledMeetings: async (): Promise<Business[]> => {
    const res = await apiRequest("GET", "/api/schedule");
    return res.json();
  },

  getAvailabilityConfig: async (): Promise<AvailabilityConfig[]> => {
    const res = await apiRequest("GET", "/api/availability");
    return res.json();
  },

  updateAvailabilityConfig: async (configs: InsertAvailabilityConfig[]): Promise<{ success: boolean }> => {
    const res = await apiRequest("POST", "/api/availability", configs);
    return res.json();
  },

  // New Scheduling System APIs
  getSchedulingLink: async (businessId: number): Promise<{ link: string; businessName: string }> => {
    const res = await apiRequest("GET", `/api/scheduling/link/${businessId}`);
    return res.json();
  },

  getSchedulingAppointments: async (): Promise<Array<{
    id: number;
    businessId: number;
    businessName: string;
    datetime: string;
    phone: string;
    score: number;
    isAutoScheduled: boolean;
    notes: string | null;
    appointmentStatus?: string;
  }>> => {
    const res = await apiRequest("GET", "/api/scheduling/appointments");
    return res.json();
  },

  getAvailableSlots: async (date: string, businessId?: number): Promise<{ slots: string[] }> => {
    const params = new URLSearchParams({ date });
    if (businessId) params.append("businessId", businessId.toString());
    const res = await apiRequest("GET", `/api/scheduling/slots?${params}`);
    return res.json();
  },

  bookAppointment: async (businessId: number, datetime: string): Promise<{ success: boolean; booking: Business }> => {
    const res = await apiRequest("POST", "/api/scheduling/book", { businessId, datetime });
    return res.json();
  },

  getBookingDetails: async (businessId: number): Promise<Business> => {
    const res = await apiRequest("GET", `/api/scheduling/booking/${businessId}`);
    return res.json();
  },

  getSchedulingAnalytics: async (): Promise<{
    totalScheduled: number;
    totalNoShows: number;
    showRate: number;
    slotPerformance: Record<string, { scheduled: number; showed: number }>;
    bookingRate: number;
    avgTimeToBookingHours: number;
    popularSlots: Array<{ time: string; scheduled: number; showed: number; noShow: number }>;
    totalBookings: number;
    autoScheduledCount: number;
    manualCount: number;
    noShowRate: number;
    avgTimeToBooking: number;
    mostPopularTime: string | null;
    appointmentBreakdown: {
      confirmed: number;
      completed: number;
      noShow: number;
    };
  }> => {
    const res = await apiRequest("GET", "/api/scheduling/analytics");
    return res.json();
  },

  updateAppointmentStatus: async (businessId: number, status: 'confirmed' | 'completed' | 'no-show'): Promise<{ success: boolean; business: Business }> => {
    const res = await apiRequest("PATCH", `/api/scheduling/appointments/${businessId}/status`, { status });
    return res.json();
  },

  // Blocked dates APIs
  getBlockedDates: async (): Promise<BlockedDate[]> => {
    const res = await apiRequest("GET", "/api/blocked-dates");
    return res.json();
  },

  createBlockedDate: async (blockedDate: InsertBlockedDate): Promise<BlockedDate> => {
    const res = await apiRequest("POST", "/api/blocked-dates", blockedDate);
    return res.json();
  },

  deleteBlockedDate: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/blocked-dates/${id}`);
  },

  // Appointment APIs (new system)
  getAppointments: async (businessId?: number): Promise<Appointment[]> => {
    const params = businessId ? `?businessId=${businessId}` : "";
    const res = await apiRequest("GET", `/api/appointments${params}`);
    return res.json();
  },

  createAppointment: async (appointment: InsertAppointment): Promise<Appointment> => {
    const res = await apiRequest("POST", "/api/appointments", appointment);
    return res.json();
  },

  updateAppointment: async (id: number, updates: Partial<Appointment>): Promise<Appointment> => {
    const res = await apiRequest("PATCH", `/api/appointments/${id}`, updates);
    return res.json();
  },

  cancelAppointment: async (id: number): Promise<{ success: boolean; appointment: Appointment }> => {
    const res = await apiRequest("DELETE", `/api/appointments/${id}`);
    return res.json();
  },

  getBusinessAppointments: async (businessId: number): Promise<Appointment[]> => {
    const res = await apiRequest("GET", `/api/businesses/${businessId}/appointments`);
    return res.json();
  },

  // Progress entries
  getBusinessProgress: (businessId: number) =>
    apiRequest("GET", `/businesses/${businessId}/progress`).then(r => r.json()),
  
  getPublicProgress: (identifier: string) =>
    apiRequest("GET", `/progress/public/${identifier}`).then(r => r.json()),
  
  createProgressEntry: (businessId: number, data: {
    stage: string;
    imageUrl: string;
    date: string;
    notes?: string;
    publiclyVisible?: boolean;
    paymentRequired?: boolean;
    paymentAmount?: number;
    paymentStatus?: 'pending' | 'partial' | 'paid';
    paymentNotes?: string;
    stripeLink?: string;
  }) =>
    apiRequest("POST", `/businesses/${businessId}/progress`, data).then(r => r.json()),
  
  deleteProgressEntry: (entryId: number) =>
    apiRequest("DELETE", `/progress/${entryId}`).then(r => r.json()),
  
  updateProgressEntry: (entryId: number, data: {
    stage?: string;
    imageUrl?: string;
    date?: string;
    notes?: string;
    publiclyVisible?: boolean;
    paymentRequired?: boolean;
    paymentAmount?: number;
    paymentStatus?: 'pending' | 'partial' | 'paid';
    paymentNotes?: string;
    stripeLink?: string;
  }) =>
    apiRequest("PATCH", `/progress/${entryId}`, data).then(r => r.json()),
  
  updateProgressVisibility: (entryId: number, publiclyVisible: boolean) =>
    apiRequest("PATCH", `/progress/${entryId}`, { publiclyVisible }).then(r => r.json()),
};
