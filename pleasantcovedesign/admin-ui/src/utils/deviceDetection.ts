// Device detection utilities for communication features

export const deviceDetection = {
  // Check if the device is Apple (iOS/macOS)
  isAppleDevice(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod|Mac/.test(ua) && !(window as any).MSStream;
  },

  // Check if running in Safari
  isSafari(): boolean {
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua);
  },

  // Check if FaceTime is likely supported
  isFaceTimeSupported(): boolean {
    return this.isAppleDevice() && this.isSafari();
  },

  // Check if on mobile
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Check if tel: links are supported
  isTelSupported(): boolean {
    // Most modern browsers support tel: links
    // But desktop behavior varies (Skype, system dialer, etc.)
    return true;
  },

  // Get the best communication method for the device
  getBestPhoneMethod(): 'facetime' | 'tel' {
    return this.isFaceTimeSupported() ? 'facetime' : 'tel';
  },

  // Check email client limits
  getMaxMailtoLength(): number {
    // Conservative limits for different clients
    const ua = navigator.userAgent;
    
    if (ua.includes('Outlook')) {
      return 500; // Outlook desktop is very limited
    } else if (ua.includes('Gmail')) {
      return 2000; // Gmail web has moderate limits
    }
    
    return 1000; // Safe default for most clients
  },

  // Check WebSocket support
  isWebSocketSupported(): boolean {
    return 'WebSocket' in window || 'MozWebSocket' in window;
  },

  // Get device info for debugging
  getDeviceInfo(): {
    isApple: boolean;
    isSafari: boolean;
    isMobile: boolean;
    faceTimeSupported: boolean;
    webSocketSupported: boolean;
    userAgent: string;
  } {
    return {
      isApple: this.isAppleDevice(),
      isSafari: this.isSafari(),
      isMobile: this.isMobile(),
      faceTimeSupported: this.isFaceTimeSupported(),
      webSocketSupported: this.isWebSocketSupported(),
      userAgent: navigator.userAgent
    };
  }
};

// URL encoding utilities
export const urlUtils = {
  // Safely encode email subject
  encodeEmailSubject(subject: string): string {
    return encodeURIComponent(subject);
  },

  // Safely encode email body with length check
  encodeEmailBody(body: string, maxLength?: number): string {
    const encoded = encodeURIComponent(body);
    const limit = maxLength || deviceDetection.getMaxMailtoLength();
    
    if (encoded.length > limit) {
      // Truncate and add ellipsis
      const truncated = body.substring(0, Math.floor(limit * 0.8)) + '...';
      return encodeURIComponent(truncated);
    }
    
    return encoded;
  },

  // Build safe mailto URL
  buildMailtoUrl(email: string, subject: string, body: string): string {
    const encodedSubject = this.encodeEmailSubject(subject);
    const encodedBody = this.encodeEmailBody(body);
    
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  },

  // Clean phone number for tel: links
  cleanPhoneNumber(phone: string): string {
    // Remove all non-digits except + for international
    return phone.replace(/[^\d+]/g, '');
  },

  // Build tel: URL
  buildTelUrl(phone: string): string {
    return `tel:${this.cleanPhoneNumber(phone)}`;
  },

  // Build FaceTime URL
  buildFaceTimeUrl(contact: string): string {
    // FaceTime accepts phone numbers or email addresses
    const cleaned = contact.includes('@') ? contact : this.cleanPhoneNumber(contact);
    return `facetime:${cleaned}`;
  }
};

// Communication fallback strategies
export const communicationFallbacks = {
  // Handle phone call with universal compatibility
  initiatePhoneCall(phone: string, companyName: string): void {
    // Always use regular phone calls for universal compatibility
    // FaceTime only works Apple-to-Apple, so avoid confusion
    const makeCall = window.confirm(
      `Call ${companyName} at ${phone}?\n\nThis will use your default phone app.`
    );
    
    if (makeCall) {
      window.open(urlUtils.buildTelUrl(phone), '_blank');
    }
  },

  // NEW: Offer video meeting options that work cross-platform
  initiateVideoCall(phone: string, email: string, companyName: string): void {
    const options = [
      '📞 Regular Phone Call (Universal)',
      '📹 Schedule Zoom Meeting (Cross-platform)',
      '📱 FaceTime (Apple devices only)',
      '❌ Cancel'
    ];

    const choice = window.prompt(
      `Video/Call options for ${companyName}:\n\n` +
      options.map((opt, i) => `${i + 1}. ${opt}`).join('\n') +
      '\n\nChoose option (1-4):'
    );

    const choiceNum = parseInt(choice || '0');
    
    switch (choiceNum) {
      case 1:
        // Regular phone call (works everywhere)
        window.open(urlUtils.buildTelUrl(phone), '_blank');
        break;
      case 2:
        // Schedule Zoom meeting (suggest booking an appointment)
        alert(`Let's schedule a Zoom meeting with ${companyName}!\n\nUse the "Schedule" button to book a video consultation.`);
        break;
      case 3:
        // FaceTime (with warning)
        if (deviceDetection.isAppleDevice()) {
          const confirmFaceTime = window.confirm(
            `FaceTime only works if ${companyName} has an Apple device.\n\nProceed with FaceTime?`
          );
          if (confirmFaceTime) {
            window.open(urlUtils.buildFaceTimeUrl(phone), '_blank');
          }
        } else {
          alert('FaceTime requires an Apple device (Mac, iPhone, iPad)');
        }
        break;
      default:
        // Cancel or invalid choice
        break;
    }
  },

  // Handle email with fallback for long templates
  initiateEmail(email: string, subject: string, body: string): void {
    const mailtoUrl = urlUtils.buildMailtoUrl(email, subject, body);
    
    // Check if URL is too long
    if (mailtoUrl.length > 2048) {
      // Offer to copy template instead
      const copyTemplate = window.confirm(
        'The email template is too long for some email clients.\n\n' +
        'Would you like to copy the template to your clipboard instead?'
      );
      
      if (copyTemplate) {
        navigator.clipboard.writeText(
          `To: ${email}\nSubject: ${subject}\n\n${body}`
        ).then(() => {
          alert('Email template copied to clipboard!');
        }).catch(() => {
          alert('Failed to copy. Please manually copy the template.');
        });
        return;
      }
    }
    
    window.open(mailtoUrl);
  },

  // WebSocket connection with fallback
  async connectWebSocket(url: string, options: any): Promise<any> {
    if (!deviceDetection.isWebSocketSupported()) {
      console.warn('WebSocket not supported, falling back to polling');
      // Return a polling-based connection instead
      throw new Error('WebSocket not supported - implement polling fallback');
    }
    
    // Normal WebSocket connection
    return new WebSocket(url);
  },

  // NEW: Handle SMS with cross-platform compatibility
  initiateSMS(phone: string, companyName: string, templateMessage?: string): void {
    // Clean the phone number
    const cleanPhone = urlUtils.cleanPhoneNumber(phone);
    
    // Default template message for new leads
    const defaultMessage = templateMessage || 
      `Hi ${companyName}! This is Ben from Pleasant Cove Design. I'd love to discuss creating a beautiful website for your business. When would be a good time for a quick call?`;
    
    // Encode the message for SMS URL
    const encodedMessage = encodeURIComponent(defaultMessage);
    
    // Create SMS URL (works on most mobile devices)
    const smsUrl = `sms:${cleanPhone}${deviceDetection.isMobile() ? '?body=' : '&body='}${encodedMessage}`;
    
    // Show confirmation with message preview
    const confirmed = window.confirm(
      `Send SMS to ${companyName} at ${phone}?\n\n` +
      `Message preview:\n"${defaultMessage}"\n\n` +
      `Note: This will open your SMS app. You can edit the message before sending.`
    );
    
    if (confirmed) {
      // Try to open SMS app
      try {
        window.open(smsUrl, '_blank');
      } catch (error) {
        // Fallback: copy message to clipboard
        navigator.clipboard.writeText(
          `Phone: ${phone}\nMessage: ${defaultMessage}`
        ).then(() => {
          alert(
            `SMS app couldn't open automatically.\n\n` +
            `Phone number and message copied to clipboard!\n\n` +
            `Manually send to: ${phone}`
          );
        }).catch(() => {
          alert(
            `SMS app couldn't open automatically.\n\n` +
            `Please manually text ${phone}:\n\n` +
            `"${defaultMessage}"`
          );
        });
      }
    }
  }
}; 