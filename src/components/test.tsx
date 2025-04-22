import { useEffect, useRef, useState } from 'react';
import { Calendar, momentLocalizer, SlotInfo, RBCEvent, View, NavigateAction } from 'react-big-calendar';
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
    gapi: any;
    google: any;
  }
}

export default function CalendarApp() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>('month');

  const calendarRef = useRef<HTMLDivElement>(null);

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

      const savedToken = localStorage.getItem('gapi_access_token');
      const expiresAt = Number(localStorage.getItem('gapi_expires_at') || 0);

      const isTokenStillValid = savedToken && expiresAt > Date.now();

      if (isTokenStillValid) {
        window.gapi.client.setToken({ access_token: savedToken });
        setIsSignedIn(true);
        const range = getRangeForView(currentView, currentDate);
        setCurrentRange(range);
        await listEventsInRange(range.start, range.end);
      } else if (tokenClient) {
        const previousConsent = localStorage.getItem('user_consented') === 'true';
        if (previousConsent) {
          tokenClient.callback = async (resp: any) => {
            if (resp.error !== undefined) return;
            handleTokenSuccess(resp.access_token);
            setIsSignedIn(true);
            const range = getRangeForView(currentView, currentDate);
            setCurrentRange(range);
            await listEventsInRange(range.start, range.end);
          };
          try {
            tokenClient.requestAccessToken({ prompt: '' });
          } catch (err) {
            console.warn('Silent token refresh failed', err);
          }
        }
      }
    };

    const initializeGisClient = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // assigned dynamically
      });
      setTokenClient(client);
    };

    loadScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenClient]);

  const handleTokenSuccess = (accessToken: string) => {
    const expiresIn = 3600 * 1000; // 1 hour
    const expiresAt = Date.now() + expiresIn;
    window.gapi.client.setToken({ access_token: accessToken });
    localStorage.setItem('gapi_access_token', accessToken);
    localStorage.setItem('gapi_expires_at', expiresAt.toString());
    localStorage.setItem('user_consented', 'true');
  };

  const handleAuthClick = () => {
    if (!tokenClient) return;

    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        console.error(resp);
        return;
      }
      handleTokenSuccess(resp.access_token);
      setIsSignedIn(true);
      if (currentRange) {
        await listEventsInRange(currentRange.start, currentRange.end);
      } else {
        const range = getRangeForView(currentView, currentDate);
        setCurrentRange(range);
        await listEventsInRange(range.start, range.end);
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
        localStorage.removeItem('gapi_expires_at');
        localStorage.removeItem('user_consented');
        setIsSignedIn(false);
        setEvents([]);
      });
    }
  };

  const listEventsInRange = async (start: Date, end: Date) => {
    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const items = response.result.items || [];
      const mappedEvents: CalendarEvent[] = items.map((item: any) => ({
        title:
          item.summary +
          (item.conferenceData?.entryPoints?.[0]?.uri ? ` (${item.conferenceData.entryPoints[0].uri})` : ''),
        start: new Date(item.start.dateTime || item.start.date),
        end: new Date(item.end.dateTime || item.end.date),
      }));

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

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

      const newEvent = {
        start,
        end,
        title: `${title}${meetLink ? ` (${meetLink})` : ''}`,
      };

      setEvents((prev) => [...prev, newEvent]);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  // Utility: get start/end range based on view and date
  const getRangeForView = (view: View, date: Date): { start: Date; end: Date } => {
    switch (view) {
      case 'month':
        return {
          start: moment(date).startOf('month').startOf('week').toDate(),
          end: moment(date).endOf('month').endOf('week').toDate(),
        };
      case 'week':
        return {
          start: moment(date).startOf('week').toDate(),
          end: moment(date).endOf('week').toDate(),
        };
      case 'day':
        return {
          start: moment(date).startOf('day').toDate(),
          end: moment(date).endOf('day').toDate(),
        };
      case 'agenda':
        // For agenda, let's just show a 30-day range from the current date as example
        return {
          start: moment(date).startOf('day').toDate(),
          end: moment(date).add(30, 'days').endOf('day').toDate(),
        };
      default:
        // fallback to month range
        return {
          start: moment(date).startOf('month').startOf('week').toDate(),
          end: moment(date).endOf('month').endOf('week').toDate(),
        };
    }
  };

  // Called on view change (month/week/day/agenda)
  const handleViewChange = (view: View) => {
    setCurrentView(view);
    // When view changes, fetch new range of events for currentDate
    const range = getRangeForView(view, currentDate);
    setCurrentRange(range);
    if (isSignedIn) listEventsInRange(range.start, range.end);
  };

  // Called when user navigates with next/previous/today buttons
  const handleNavigate = (date: Date, action: NavigateAction) => {
    setCurrentDate(date);
    const range = getRangeForView(currentView, date);
    setCurrentRange(range);
    if (isSignedIn) listEventsInRange(range.start, range.end);
  };

  return (
    <div className="calendar-container" ref={calendarRef}>
      <div className="button-group">
        <button onClick={handleAuthClick}>{isSignedIn ? 'Refresh Events' : 'Authorize'}</button>
        {isSignedIn && <button onClick={handleSignoutClick}>Sign Out</button>}
      </div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        date={currentDate}
        view={currentView}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onSelectSlot={handleSelectSlot}
        style={{ height: '90vh', marginTop: '20px' }}
      />
    </div>
  );
}
