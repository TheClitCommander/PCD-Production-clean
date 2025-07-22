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
  // Handle phone call with fallbacks
  initiatePhoneCall(phone: string, companyName: string): void {
    if (deviceDetection.isFaceTimeSupported()) {
      // Offer choice on Apple devices
      const useFaceTime = window.confirm(
        `Call ${companyName}?\n\nOK for FaceTime\nCancel for regular phone call`
      );
      
      if (useFaceTime) {
        window.open(urlUtils.buildFaceTimeUrl(phone), '_blank');
      } else {
        window.open(urlUtils.buildTelUrl(phone), '_blank');
      }
    } else {
      // Direct phone call on non-Apple devices
      window.open(urlUtils.buildTelUrl(phone), '_blank');
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
  }
}; 