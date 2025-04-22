import { useEffect, useState } from 'react';
import { Calendar, momentLocalizer, SlotInfo, Event as RBCEvent, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './style.css';

const localizer = momentLocalizer(moment);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

interface CalendarEvent extends RBCEvent {
  start: Date;
  end: Date;
  title: string;
}

declare global {
  interface Window {
    gapi: unknown;
    google: unknown;
  }
}

export default function CalendarApp() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [tokenClient, setTokenClient] = useState<unknown>(null);
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null);

  // Utility to get first and last day of month for a given date
  const getVisibleMonthRange = (date: Date) => {
    const start = moment(date).startOf('month').toDate();
    const end = moment(date).endOf('month').toDate();
    return { start, end };
  };

  useEffect(() => {
    const loadScripts = () => {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi.load('client', initializeGapiClient);
      };
      document.body.appendChild(gapiScript);

      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = initializeGisClient;
      document.body.appendChild(gisScript);
    };

    const initializeGapiClient = async () => {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });

      // Try to restore saved token on load
      const savedToken = localStorage.getItem('gapi_access_token');
      if (savedToken) {
        window.gapi.client.setToken({ access_token: savedToken });
        setIsSignedIn(true);
        // Fetch events for current month on load
        const initialRange = getVisibleMonthRange(new Date());
        setCurrentRange(initialRange);
        await listEventsInRange(initialRange.start, initialRange.end);
      }
    };

    const initializeGisClient = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // set later dynamically
      });
      setTokenClient(client);
    };

    loadScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthClick = () => {
    if (!tokenClient) return;

    tokenClient.callback = async (resp: aunknownny) => {
      if (resp.error !== undefined) {
        console.error(resp);
        return;
      }
      if (resp.access_token) {
        localStorage.setItem('gapi_access_token', resp.access_token);
        window.gapi.client.setToken({ access_token: resp.access_token });
      }
      setIsSignedIn(true);
      if (currentRange) {
        await listEventsInRange(currentRange.start, currentRange.end);
      } else {
        // fallback to current month range if no range selected yet
        const initialRange = getVisibleMonthRange(new Date());
        setCurrentRange(initialRange);
        await listEventsInRange(initialRange.start, initialRange.end);
      }
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  };

  const handleSignoutClick = () => {
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken('');
        localStorage.removeItem('gapi_access_token');
        setIsSignedIn(false);
        setEvents([]);
        setCurrentRange(null);
      });
    }
  };

  // Load events within specified date range
  const listEventsInRange = async (start: Date, end: Date) => {
    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 2500,
        orderBy: 'startTime',
      });

      const items = response.result.items || [];
      const mappedEvents: CalendarEvent[] = items.map((item: any) => ({
        title:
          item.summary +
          (item.conferenceData?.entryPoints?.[0]?.uri
            ? ` (${item.conferenceData.entryPoints[0].uri})`
            : ''),
        start: new Date(item.start.dateTime || item.start.date),
        end: new Date(item.end.dateTime || item.end.date),
      }));

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  // On selecting a range in calendar, update state and fetch events for new range
  const handleRangeChange = (range: Date[] | { start: Date; end: Date }, view?: View) => {
    let start: Date, end: Date;
    if (Array.isArray(range)) {
      start = range[0];
      end = range[range.length - 1];
    } else {
      start = range.start;
      end = range.end;
    }

    setCurrentRange({ start, end });
    if (isSignedIn) {
      listEventsInRange(start, end);
    }
  };

  // Create event on selected slot
  const handleSelectSlot = async ({ start, end }: SlotInfo) => {
    if (!isSignedIn) {
      alert('Please sign in first.');
      return;
    }

    const title = prompt('Enter event title');
    if (!title) return;

    const event = {
      summary: title,
      start: {
        dateTime: start.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
        },
      },
    };

    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
      });

      const createdEvent = response.result;
      const meetLink = createdEvent.conferenceData?.entryPoints?.[0]?.uri || '';

      setEvents((prev) => [
        ...prev,
        {
          start,
          end,
          title: `${title} ${meetLink ? `(${meetLink})` : ''}`,
        },
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  return (
    <div className="calendar-container">
      <div className="button-group">
        <button onClick={handleAuthClick}>
          {isSignedIn ? 'Refresh Events' : 'Authorize'}
        </button>
        {isSignedIn && <button onClick={handleSignoutClick}>Sign Out</button>}
      </div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={handleSelectSlot}
        onRangeChange={handleRangeChange}
        style={{ height: '90vh', marginTop: '20px' }}
      />
    </div>
  );
}
