# Google Calendar React App with Full Integration

A modern React application built with Vite that integrates seamlessly with Google Calendar using `react-big-calendar`, Google Identity Services (GIS), and Google API (GAPI). The app allows users to authenticate, fetch calendar events, and create new events with optional Google Meet links — all without page reloads or manual token handling.

---

## ✨ Features

- 🔐 Google Sign-In with OAuth 2.0 via Google Identity Services
- 🔁 Silent token refresh and session persistence via localStorage
- 📅 Full calendar UI using `react-big-calendar` and `moment`
- 📤 Create events with built-in support for Google Meet links
- 📥 Fetch events dynamically based on the visible date range and calendar view
- ⚡ Debounced calendar view changes to minimize API calls
- ✅ Clean separation of logic via custom hooks and context providers

---

## 🛠️ Tech Stack

- [Vite](https://vitejs.dev/) for fast bundling and development
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [react-big-calendar](https://github.com/jquense/react-big-calendar)
- [moment](https://momentjs.com/)
- Google APIs: GAPI + GIS (Google Identity Services)
- Lodash (for debounce)

---

## 📦 Installation

```bash
git clone https://github.com/your-username/google-calendar-react-app.git
cd google-calendar-react-app
npm install
```

---

## 🚀 Getting Started

### 1. Create a Google Cloud Project

- Visit [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project
- Enable the **Google Calendar API**
- Go to **OAuth Consent Screen**, configure as External, and publish
- Go to **Credentials**, create:
  - API Key
  - OAuth 2.0 Client ID (Web)
    - Add your Vite dev URL (e.g. `http://localhost:5173`) to **Authorized JavaScript origins**

---

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_GOOGLE_API_KEY=your_api_key_here
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_DISCOVERY_DOC=https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest
VITE_GOOGLE_SCOPES=https://www.googleapis.com/auth/calendar.events
```

---

### 3. Run the App

```bash
npm run dev
```

Your app will be available at [http://localhost:5173](http://localhost:5173)

---

## 🔍 Folder Structure

```
src/
├── components/
│   └── CalendarApp.tsx         # Calendar component (UI only)
├── hooks/
│   ├── useGoogleAuth.ts        # Handles auth, token management, localStorage
│   └── useCalendarEvents.ts    # Event fetching, debounced loading, creation
├── context/
│   └── GoogleAuthProvider.tsx  # Provides auth state and handlers
├── shared/
│   ├── consts.ts               # API key, client ID, scopes
│   └── dateUtils.ts            # date utils
├── style.css                   # Custom styles for calendar
├── main.tsx                    # Entry point
└── App.tsx                     # Wraps app with provider and renders Calendar
```

---

## 🔐 Authentication Flow

1. On first load, `useGoogleAuth` attempts a silent refresh using saved tokens.
2. If the token is expired or missing, user can click **Authorize**.
3. Once signed in, the app fetches visible events based on the current view.
4. Events are refreshed dynamically when changing views, navigating, or creating a new one.

---

## 📆 Creating Events

Click and drag on the calendar to select a time slot → you’ll be prompted for a title. If signed in, the event will be added to your Google Calendar with a Google Meet link.

---

## 🧹 Cleanup

Tokens are revoked and cleared from localStorage on **Sign Out**. The app state is reset and events are cleared.

---

## 🧪 Dev Tips

- `react-big-calendar` works best with `momentLocalizer`.
- Token refresh is fully handled internally — no need to manually refresh.
- You can update the debounce time for fetching in `useCalendarEvents.ts`.

---

## 📃 License

[MIT](LICENSE)

---

## 🙌 Acknowledgements

- [react-big-calendar](https://github.com/jquense/react-big-calendar)
- [Google Identity Services](https://developers.google.com/identity)
- [Vite](https://vitejs.dev/)