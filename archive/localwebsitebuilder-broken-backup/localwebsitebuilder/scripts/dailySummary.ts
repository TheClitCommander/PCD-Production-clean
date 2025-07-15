import { storage } from "../server/storage";
import moment from "moment";

interface DailyAppointment {
  time: string;
  businessName: string;
  phone: string;
  isAutoScheduled: boolean;
}

async function sendDailySummary() {
  try {
    console.log("[Daily Summary] Starting daily appointment summary...");
    
    // Get all businesses
    const businesses = await storage.getBusinesses();
    
    // Filter for today's appointments
    const today = moment().format('YYYY-MM-DD');
    const todaysAppointments = businesses
      .filter(b => 
        b.scheduledTime && 
        moment(b.scheduledTime).format('YYYY-MM-DD') === today &&
        b.appointmentStatus !== 'no-show' // Don't include no-shows in summary
      )
      .sort((a, b) => new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime())
      .map(b => ({
        time: moment(b.scheduledTime).format('h:mm A'),
        businessName: b.name,
        phone: b.phone,
        isAutoScheduled: b.notes?.includes('[Auto-Scheduled]') || false
      }));
    
    if (todaysAppointments.length === 0) {
      console.log("[Daily Summary] No appointments scheduled for today.");
      return;
    }
    
    // Format the message
    let message = `🗓️ Today's Appointments (${moment().format('MMMM D, YYYY')}):\n\n`;
    
    todaysAppointments.forEach((apt, index) => {
      const bookingType = apt.isAutoScheduled ? '[Auto]' : '[Manual]';
      message += `${apt.time} – ${apt.businessName} ${bookingType}\n`;
      message += `📞 ${apt.phone}\n`;
      if (index < todaysAppointments.length - 1) {
        message += '\n';
      }
    });
    
    message += `\n\nTotal: ${todaysAppointments.length} consultation${todaysAppointments.length > 1 ? 's' : ''}`;
    
    console.log("[Daily Summary] Message prepared:");
    console.log(message);
    
    // TODO: Send via Telegram or Email
    // For Telegram:
    // await sendTelegramMessage(TELEGRAM_CHAT_ID, message);
    
    // For Email (using SendGrid example):
    // await sendEmail({
    //   to: 'ben@pleasantcovedesign.com',
    //   subject: `Daily Appointments - ${moment().format('MMM D')}`,
    //   text: message,
    //   html: formatAsHtml(message)
    // });
    
    // Log activity
    await storage.createActivity({
      type: 'daily_summary_sent',
      description: `Daily summary sent: ${todaysAppointments.length} appointments scheduled`,
    });
    
    console.log("[Daily Summary] ✅ Daily summary sent successfully!");
    
  } catch (error) {
    console.error("[Daily Summary] ❌ Error generating daily summary:", error);
  }
}

// For Telegram integration
async function sendTelegramMessage(chatId: string, message: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("[Daily Summary] No Telegram bot token configured");
    return;
  }
  
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.statusText}`);
  }
}

// Run if called directly
if (require.main === module) {
  sendDailySummary()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { sendDailySummary }; 