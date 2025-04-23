import './App.css'
import { GoogleAuthProvider } from './context/GoogleAuthProvider';
import CalendarApp from './components/calendar/CalendarApp';

export default function App() {
  return (
    <GoogleAuthProvider>
      <CalendarApp />
    </GoogleAuthProvider>
  );
}
