import { apiRequest } from "./queryClient";
import type { Business, InsertBusiness, Campaign, InsertCampaign, Activity, Template, AvailabilityConfig, InsertAvailabilityConfig, BlockedDate, InsertBlockedDate, Appointment, InsertAppointment } from "@shared/schema";

// API Configuration - PRODUCTION-FIRST
const API_BASE_URL = 'https://pleasantcovedesign-production.up.railway.app/api';

class API {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API request to Railway:', url);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Stats
  async getStats() {
    return this.request("/stats");
  }

  // Businesses
  async getBusinesses(): Promise<Business[]> {
    return this.request("/businesses");
  }

  async getBusiness(id: number): Promise<Business> {
    return this.request(`/businesses/${id}`);
  }

  async getBusinessActivities(id: number): Promise<Activity[]> {
    return this.request(`/businesses/${id}/activities`);
  }

  async getBusinessesByStage(stage: string): Promise<Business[]> {
    return this.request(`/businesses/stage/${stage}`);
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    return this.request("/businesses", { method: "POST", body: JSON.stringify(business) });
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business> {
    return this.request(`/businesses/${id}`, { method: "PUT", body: JSON.stringify(updates) });
  }

  async deleteBusiness(id: number): Promise<void> {
    await this.request(`/businesses/${id}`, { method: "DELETE" });
  }

  async importBusinesses(businesses: InsertBusiness[]) {
    return this.request("/businesses/import", { method: "POST", body: JSON.stringify({ businesses }) });
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return this.request("/campaigns");
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    return this.request("/campaigns", { method: "POST", body: JSON.stringify(campaign) });
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    return this.request(`/campaigns/${id}`, { method: "PUT", body: JSON.stringify(updates) });
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return this.request("/templates");
  }

  // Activities
  async getActivities(limit?: number): Promise<Activity[]> {
    const url = limit ? `/activities?limit=${limit}` : "/activities";
    return this.request(url);
  }

  // Google Sheets import
  async importFromGoogleSheets(sheetId: string) {
    return this.request("/import/google-sheets", { method: "POST", body: JSON.stringify({ sheetId }) });
  }

  // Scheduling APIs
  async getPendingLeads(): Promise<Business[]> {
    return this.request("/leads/pending");
  }

  async createSchedule(businessId: number, datetime: string) {
    return this.request("/schedule", { method: "POST", body: JSON.stringify({ 
      business_id: businessId, 
      datetime 
    }) });
  }

  async getScheduledMeetings(): Promise<Business[]> {
    return this.request("/schedule");
  }

  async getAvailabilityConfig(): Promise<AvailabilityConfig[]> {
    return this.request("/availability");
  }

  async updateAvailabilityConfig(configs: InsertAvailabilityConfig[]) {
    return this.request("/availability", { method: "POST", body: JSON.stringify(configs) });
  }

  // New Scheduling System APIs
  async getSchedulingLink(businessId: number) {
    return this.request(`/scheduling/link/${businessId}`);
  }

  async getSchedulingAppointments(): Promise<Array<{
    id: number;
    businessId: number;
    businessName: string;
    datetime: string;
    phone: string;
    score: number;
    isAutoScheduled: boolean;
    notes: string | null;
    appointmentStatus?: string;
  }>> {
    return this.request("/scheduling/appointments");
  }

  async getAvailableSlots(date: string, businessId?: number) {
    const params = new URLSearchParams({ date });
    if (businessId) params.append("businessId", businessId.toString());
    return this.request(`/scheduling/slots?${params}`);
  }

  async bookAppointment(businessId: number, datetime: string) {
    return this.request("/scheduling/book", { method: "POST", body: JSON.stringify({ businessId, datetime }) });
  }

  async getBookingDetails(businessId: number): Promise<Business> {
    return this.request(`/scheduling/booking/${businessId}`);
  }

  async getSchedulingAnalytics(): Promise<{
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
  }> {
    return this.request("/scheduling/analytics");
  }

  async updateAppointmentStatus(businessId: number, status: 'confirmed' | 'completed' | 'no-show') {
    return this.request(`/scheduling/appointments/${businessId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  }

  // Blocked dates APIs
  async getBlockedDates(): Promise<BlockedDate[]> {
    return this.request("/blocked-dates");
  }

  async createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate> {
    return this.request("/blocked-dates", { method: "POST", body: JSON.stringify(blockedDate) });
  }

  async deleteBlockedDate(id: number): Promise<void> {
    await this.request(`/blocked-dates/${id}`, { method: "DELETE" });
  }

  // Appointment APIs (new system)
  async getAppointments(businessId?: number): Promise<Appointment[]> {
    const params = businessId ? `?businessId=${businessId}` : "";
    return this.request(`/appointments${params}`);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    return this.request("/appointments", { method: "POST", body: JSON.stringify(appointment) });
  }

  async updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment> {
    return this.request(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
  }

  async cancelAppointment(id: number) {
    return this.request(`/appointments/${id}`, { method: "DELETE" });
  }

  async getBusinessAppointments(businessId: number): Promise<Appointment[]> {
    return this.request(`/businesses/${businessId}/appointments`);
  }

  // Progress entries
  async getBusinessProgress(businessId: number) {
    return this.request(`/businesses/${businessId}/progress`);
  }
  
  async getPublicProgress(identifier: string) {
    return this.request(`/progress/public/${identifier}`);
  }
  
  async createProgressEntry(businessId: number, data: {
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
  }) {
    return this.request(`/businesses/${businessId}/progress`, { method: "POST", body: JSON.stringify(data) });
  }
  
  async deleteProgressEntry(entryId: number) {
    return this.request(`/progress/${entryId}`, { method: "DELETE" });
  }
  
  async updateProgressEntry(entryId: number, data: {
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
  }) {
    return this.request(`/progress/${entryId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  
  async updateProgressVisibility(entryId: number, publiclyVisible: boolean) {
    return this.request(`/progress/${entryId}`, { method: "PATCH", body: JSON.stringify({ publiclyVisible }) });
  }

  // MESSAGE HISTORY API - Connect to Railway's messaging system
  async getMessageHistory(businessId?: number): Promise<any[]> {
    // If no businessId provided, load messages for all businesses
    // For now, we'll load the main project messages
    const projectToken = businessId === 1 ? 'mc516tr5_CSU4OUADdSIHB3AXxZPpbw' : 'mc516tr5_CSU4OUADdSIHB3AXxZPpbw';
    return this.request(`/messages?projectToken=${projectToken}`);
  }

  async sendMessage(businessId: number, message: string, senderType: 'admin' | 'client' = 'admin') {
    // Map businessId to the correct projectToken for Railway API
    const projectToken = businessId === 1 ? 'mc516tr5_CSU4OUADdSIHB3AXxZPpbw' : 'default-token';
    const senderName = senderType === 'admin' ? 'Ben Dickinson' : 'Client';
    
    return this.request("/messages", { 
      method: "POST", 
      body: JSON.stringify({ 
        projectToken, 
        sender: senderName, 
        body: message 
      }) 
    });
  }
}

export const api = new API();
