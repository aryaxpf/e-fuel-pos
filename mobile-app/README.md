# E-Fuel POS Mobile App

This is the mobile application for E-Fuel POS, built with React Native (Expo) and NativeWind.

## Prerequisites

-   Node.js (LTS recommended)
-   npm or yarn
-   Expo Go app on your phone (for testing)

## Setup

1.  **Install Dependencies**:
    The automated setup might have failed due to environment issues. We recommend using **Yarn**:
    ```bash
    yarn install
    ```
    If you don't have yarn, try:
    ```bash
    npm install --legacy-peer-deps
    ```

2.  **Environment Variables**:
    Ensure `.env` file exists with your Supabase credentials:
    ```
    EXPO_PUBLIC_SUPABASE_URL=...
    EXPO_PUBLIC_SUPABASE_ANON_KEY=...
    ```

## Running the App

1.  Start the development server:
    ```bash
    npx expo start
    ```
2.  Scan the QR code with your phone (using Expo Go) or press `a` to run on Android Emulator / `i` for iOS Simulator.

## Troubleshooting

-   **"Invalid Version" Error**: Try deleting `node_modules` and `package-lock.json` and running `npm install` again.
-   **Tailwind/NativeWind Issues**: Run `npm install nativewind tailwindcss` to ensure styles are built.

## Features

-   **Login**: Email/Password authentication via Supabase.
-   **Dashboard**: Main menu for employees.
-   **Attendance**: Clock In/Out with GPS and Camera verification.
