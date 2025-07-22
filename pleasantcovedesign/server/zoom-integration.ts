import axios from 'axios';
import jwt from 'jsonwebtoken';

export interface ZoomMeetingOptions {
  topic: string;
  startTime: Date;
  duration: number;
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: {
    hostVideo?: boolean;
    participantVideo?: boolean;
    joinBeforeHost?: boolean;
    muteUponEntry?: boolean;
    waitingRoom?: boolean;
    recordingType?: 'local' | 'cloud' | 'none';
  };
}

export interface ZoomMeetingResponse {
  id: string;
  joinUrl: string;
  startUrl: string;
  password: string;
  dialInNumbers?: Array<{
    country: string;
    number: string;
    type: string;
  }>;
}

export class ZoomIntegration {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string = 'https://api.zoom.us/v2';

  constructor() {
    // Load from environment variables
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    try {
      const tokenUrl = 'https://zoom.us/oauth/token';
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(tokenUrl, null, {
        params: {
          grant_type: 'account_credentials',
          account_id: this.accountId
        },
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get Zoom access token:', error);
      throw new Error('Zoom authentication failed');
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(options: ZoomMeetingOptions): Promise<ZoomMeetingResponse | null> {
    try {
      // Check if Zoom is configured
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.log('⚠️ Zoom integration not configured - skipping meeting creation');
        return null;
      }

      const accessToken = await this.getAccessToken();
      
      const meetingData = {
        topic: options.topic,
        type: 2, // Scheduled meeting
        start_time: options.startTime.toISOString(),
        duration: options.duration,
        timezone: options.timezone || 'America/New_York',
        password: options.password || this.generatePassword(),
        agenda: options.agenda || '',
        settings: {
          host_video: options.settings?.hostVideo ?? true,
          participant_video: options.settings?.participantVideo ?? true,
          join_before_host: options.settings?.joinBeforeHost ?? true,
          mute_upon_entry: options.settings?.muteUponEntry ?? false,
          waiting_room: options.settings?.waitingRoom ?? false,
          audio: 'both',
          auto_recording: options.settings?.recordingType || 'none',
          registration_type: 1,
          approval_type: 0
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/users/me/meetings`,
        meetingData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const meeting = response.data;
      
      return {
        id: meeting.id.toString(),
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        password: meeting.password,
        dialInNumbers: meeting.settings?.global_dial_in_numbers
      };
    } catch (error) {
      console.error('Failed to create Zoom meeting:', error);
      // Return null instead of throwing to allow appointment booking to continue
      return null;
    }
  }

  /**
   * Generate a secure meeting password
   */
  private generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Format meeting details for email/display
   */
  formatMeetingDetails(meeting: ZoomMeetingResponse): string {
    let details = `
Join Zoom Meeting:
${meeting.joinUrl}

Meeting ID: ${meeting.id}
Password: ${meeting.password}
`;

    if (meeting.dialInNumbers && meeting.dialInNumbers.length > 0) {
      details += '\n\nDial by phone:';
      meeting.dialInNumbers.slice(0, 3).forEach(dialIn => {
        details += `\n${dialIn.country}: ${dialIn.number}`;
      });
    }

    return details.trim();
  }
}

export const zoomIntegration = new ZoomIntegration(); 