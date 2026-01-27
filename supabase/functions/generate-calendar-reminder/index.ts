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

// Format date for iCal (YYYYMMDDTHHMMSS) - local time format
function formatICalDate(year: number, month: number, day: number, hour: number, minute: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

// Get tomorrow's date in user's timezone
function getTomorrowInTimezone(timezone: string): { year: number; month: number; day: number } {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Format in user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(tomorrow);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '01');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '01');
  
  return { year, month, day };
}

// Generate .ics file content with proper timezone handling
function generateICS(timezone: string, timePreference: 'morning' | 'evening'): string {
  const { year, month, day } = getTomorrowInTimezone(timezone);
  const hour = timePreference === 'morning' ? 7 : 20;
  
  const uid = `dashboard-checkin-${Date.now()}@thedashboard.agbcoaching.com`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dtstart = formatICalDate(year, month, day, hour, 0);
  const dtend = formatICalDate(year, month, day, hour, 5); // 5 minutes later
  
  // Escape special characters in text
  const description = `A calm check-in with The Dashboard.\\nOne honest rep. Then you're done.\\n\\nOpen: https://thedashboard.agbcoaching.com`;
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//The Dashboard//Calendar Reminder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
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

// Generate Google Calendar URL with proper local time handling
function generateGoogleCalendarUrl(timezone: string, timePreference: 'morning' | 'evening'): string {
  const { year, month, day } = getTomorrowInTimezone(timezone);
  const hour = timePreference === 'morning' ? 7 : 20;
  
  const title = encodeURIComponent('Dashboard Check-In');
  const description = encodeURIComponent(`A calm check-in with The Dashboard.
One honest rep. Then you're done.

Open: https://thedashboard.agbcoaching.com`);
  
  // Format dates as YYYYMMDDTHHMMSS (local time, no Z suffix)
  // When combined with ctz parameter, Google Calendar interprets this as local time
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startStr = `${year}${pad(month)}${pad(day)}T${pad(hour)}0000`;
  const endStr = `${year}${pad(month)}${pad(day)}T${pad(hour)}0500`; // 5 minutes later
  
  // RRULE for daily recurrence
  const recur = encodeURIComponent('RRULE:FREQ=DAILY');
  
  // ctz parameter tells Google Calendar which timezone the times are in
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
    
    if (format === 'ics') {
      // Return .ics file
      const icsContent = generateICS(timezone, time_preference);
      
      return new Response(icsContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="dashboard-checkin.ics"',
        },
      });
    } else {
      // Return Google Calendar URL
      const googleUrl = generateGoogleCalendarUrl(timezone, time_preference);
      
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
