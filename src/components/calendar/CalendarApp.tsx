import { useEffect, useRef, useState } from 'react';
import { Calendar, momentLocalizer, SlotInfo, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './style.css';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { getRangeForView } from '../../shared/dateUtils';

const localizer = momentLocalizer(moment);

export default function CalendarApp() {
  const {
    events,
    fetchEventsInRange,
    fetchEventsDebounced,
    createEvent,
  } = useCalendarEvents();

  const {
    isSignedIn,
    handleAuthClick,
    handleSignoutClick,
    tokenReady,
  } = useGoogleAuth();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>('month');
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tokenReady && isSignedIn) {
      const range = getRangeForView(currentView, currentDate);
      fetchEventsInRange(range.start, range.end);
    }
  }, [tokenReady, isSignedIn, currentView, currentDate, fetchEventsInRange]);

  const handleSelectSlot = async ({ start, end }: SlotInfo) => {
    if (!isSignedIn) {
      alert('Please sign in first.');
      return;
    }

    const title = prompt('Enter event title');
    if (!title) return;

    await createEvent(start, end, title);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    const range = getRangeForView(view, currentDate);
    if (isSignedIn) fetchEventsDebounced(range.start, range.end);
  };

  const handleNavigate = (newDate: Date, view: View) => {
    setCurrentDate(newDate);
    setCurrentView(view);
    const range = getRangeForView(view, newDate);
    if (isSignedIn) fetchEventsDebounced(range.start, range.end);
  };

  return (
    <div className="calendar-container" ref={calendarRef}>
      <div className="button-group">
        <button className='signin-button' onClick={handleAuthClick}>{isSignedIn ? 'Refresh Events' : 'Authorize'}</button>
        {isSignedIn && <button className='signout-button' onClick={handleSignoutClick}>Sign Out</button>}
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
