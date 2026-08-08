# VidyaSetu Mobile App

> Native Android/iOS app for VidyaSetu ERP — built with React Native 0.73 + TypeScript

## 📱 Screens Implemented

| Screen | Path | Description |
|---|---|---|
| Login | `screens/auth/LoginScreen.tsx` | Bilingual login (Marathi/English), JWT auth |
| Dashboard | `screens/home/DashboardScreen.tsx` | Stats, quick actions, recent announcements |
| Attendance | `screens/attendance/AttendanceScreen.tsx` | Mark class attendance with bulk actions |
| Fees | `screens/finance/FeesScreen.tsx` | Student fee status + receipt history |
| Announcements | `screens/communication/AnnouncementsScreen.tsx` | View and mark-read notices |
| Profile | `screens/profile/ProfileScreen.tsx` | User info and logout |

## 🗂️ Project Structure

```
mobile/
├── App.tsx                         # App entry point
├── package.json
├── src/
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Stack + Tab navigator
│   ├── screens/
│   │   ├── auth/LoginScreen.tsx
│   │   ├── home/DashboardScreen.tsx
│   │   ├── attendance/AttendanceScreen.tsx
│   │   ├── finance/FeesScreen.tsx
│   │   ├── communication/AnnouncementsScreen.tsx
│   │   └── profile/ProfileScreen.tsx
│   ├── services/
│   │   └── api.ts                  # Axios + all API endpoints
│   └── store/
│       └── authStore.ts            # Zustand auth state
```

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Android Studio + Android SDK (for Android)
- Xcode 14+ (for iOS, Mac only)
- Java 17

### Install & Run (Android)

```bash
cd mobile
npm install

# Start Metro bundler
npm start

# In a new terminal — run on Android emulator/device
npm run android
```

### iOS (Mac only)
```bash
cd mobile/ios && pod install && cd ..
npm run ios
```

## 🔑 API Configuration

Edit `src/services/api.ts`:

```typescript
// For Android emulator:
const BASE_URL = 'http://10.0.2.2:8000/api/v1';

// For physical Android device on same WiFi:
const BASE_URL = 'http://192.168.1.XXX:8000/api/v1';

// For iOS simulator:
const BASE_URL = 'http://localhost:8000/api/v1';

// For production:
const BASE_URL = 'https://your-school.vidyasetu.in/api/v1';
```

## 🔔 Push Notifications (Firebase)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Download `google-services.json` → place in `android/app/`
3. Download `GoogleService-Info.plist` → place in `ios/VidyaSetuMobile/`
4. The `@react-native-firebase/messaging` package is already in `package.json`

## 🧪 Demo Credentials
- **Username:** `admin`
- **Password:** `admin123`

> Change in `.env` or backend settings before production deployment.
