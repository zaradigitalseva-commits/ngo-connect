# NGO Connect

A separate bilingual (Hindi/English) NGO management platform starter. This repository is independent of SchoolConnect.

## Features in this starter
- Responsive NGO Connect dashboard UI in Hindi and English
- NGO registration form UI and overview cards for members, donations, expenses, events, reports and certificates
- Firebase integration scaffold using environment variables
- Firestore security rules starter
- Image compression helper for small profile images saved as data URLs (keep each image small; Firestore documents have a 1 MiB limit)

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and fill in your **new NGO Connect Firebase project** configuration.
4. Run `npm run dev`.

## Firebase setup
Create a separate Firebase project for NGO Connect. Enable Authentication (Google and/or Email/Password) and Firestore. Do not use SchoolConnect's Firebase project. Update Firestore rules after reviewing the role model; do not deploy with open rules.

## Deployment
Import this repository into a separate Vercel project named `ngo-connect`. Add the same `VITE_FIREBASE_*` environment variables in Vercel.

## Important
This is the initial frontend/scaffold, not a production-ready financial or access-control system. UPI verification, subscription activation, admin authorization, and protected NGO data operations must be completed and tested before real use. Never store UPI PINs, passwords, or bank credentials.