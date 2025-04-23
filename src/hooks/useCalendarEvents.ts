import { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { useGoogleAuth } from './useGoogleAuth';

export interface CalendarEvent {
  start: Date;
  end: Date;
  title: string;
}

export const useCalendarEvents = () => {
  const { isSignedIn } = useGoogleAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const fetchEventsInRange = useCallback(async (start: Date, end: Date) => {
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
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  }, []);

  const fetchEventsDebounced = useMemo(
    () =>
      debounce((start: Date, end: Date) => {
        if (isSignedIn) {
          fetchEventsInRange(start, end);
        }
      }, 300),
    [isSignedIn, fetchEventsInRange]
  );

  useEffect(() => {
    return () => {
      fetchEventsDebounced.cancel();
    };
  }, [fetchEventsDebounced]);

  const createEvent = async (start: Date, end: Date, title: string) => {
    try {
      const event = {
        summary: title,
        start: { dateTime: start.toISOString(), timeZone: 'UTC' },
        end: { dateTime: end.toISOString(), timeZone: 'UTC' },
        conferenceData: {
          createRequest: { requestId: `meet-${Date.now()}` },
        },
      };

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
    } catch (err) {
      console.error('Error creating calendar event:', err);
    }
  };

  return {
    events,
    setEvents,
    fetchEventsInRange,
    fetchEventsDebounced,
    createEvent,
  };
};
