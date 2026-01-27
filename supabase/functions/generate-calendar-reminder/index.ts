import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  time_preference: 'morning' | 'evening';
  timezone: string;
  format: 'google' | 'ics';
}

// Format date for iCal (YYYYMMDDTHHMMSS)
function formatICalDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// Format date for Google Calendar URL (YYYYMMDDTHHMMSSZ for UTC)
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Get the next occurrence of the preferred time
function getNextReminderTime(timezone: string, timePreference: 'morning' | 'evening'): Date {
  const now = new Date();
  
  // Get today's date in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDateStr = formatter.format(now);
  
  // Set the preferred hour (7:00 for morning, 20:00 for evening)
  const hour = timePreference === 'morning' ? 7 : 20;
  
  // Create the reminder time in the user's timezone
  // We'll use tomorrow to ensure the first reminder is in the future
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tomorrowFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const tomorrowDateStr = tomorrowFormatter.format(tomorrow);
  
  // Create a date string in the user's timezone
  const reminderDate = new Date(`${tomorrowDateStr}T${hour.toString().padStart(2, '0')}:00:00`);
  
  return reminderDate;
}

// Generate .ics file content
function generateICS(startTime: Date, timezone: string): string {
  const endTime = new Date(startTime.getTime() + 5 * 60 * 1000); // 5 minutes duration
  
  const uid = `dashboard-checkin-${Date.now()}@thedashboard.agbcoaching.com`;
  const dtstamp = formatICalDate(new Date());
  const dtstart = formatICalDate(startTime);
  const dtend = formatICalDate(endTime);
  
  // Escape special characters in text
  const description = `A calm check-in with The Dashboard.\\nOne honest rep. Then you're done.\\n\\nOpen: https://thedashboard.agbcoaching.com`;
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//The Dashboard//Calendar Reminder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:${timezone}
END:VTIMEZONE
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}Z
DTSTART;TZID=${timezone}:${dtstart}
DTEND;TZID=${timezone}:${dtend}
RRULE:FREQ=DAILY
SUMMARY:Dashboard Check-In
DESCRIPTION:${description}
URL:https://thedashboard.agbcoaching.com
STATUS:CONFIRMED
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;
}

// Generate Google Calendar URL
function generateGoogleCalendarUrl(startTime: Date, timezone: string): string {
  const endTime = new Date(startTime.getTime() + 5 * 60 * 1000); // 5 minutes duration
  
  const title = encodeURIComponent('Dashboard Check-In');
  const description = encodeURIComponent(`A calm check-in with The Dashboard.
One honest rep. Then you're done.

Open: https://thedashboard.agbcoaching.com`);
  
  const startStr = formatGoogleDate(startTime);
  const endStr = formatGoogleDate(endTime);
  
  // RRULE for daily recurrence
  const recur = encodeURIComponent('RRULE:FREQ=DAILY');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&dates=${startStr}/${endStr}&recur=${recur}&ctz=${encodeURIComponent(timezone)}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { time_preference, timezone, format }: ReminderRequest = await req.json();
    
    // Validate inputs
    if (!time_preference || !['morning', 'evening'].includes(time_preference)) {
      return new Response(
        JSON.stringify({ error: 'Invalid time_preference. Must be "morning" or "evening".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!timezone) {
      return new Response(
        JSON.stringify({ error: 'Timezone is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const startTime = getNextReminderTime(timezone, time_preference);
    
    if (format === 'ics') {
      // Return .ics file
      const icsContent = generateICS(startTime, timezone);
      
      return new Response(icsContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="dashboard-checkin.ics"',
        },
      });
    } else {
      // Return Google Calendar URL
      const googleUrl = generateGoogleCalendarUrl(startTime, timezone);
      
      return new Response(
        JSON.stringify({ url: googleUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error generating calendar reminder:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate calendar reminder' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
