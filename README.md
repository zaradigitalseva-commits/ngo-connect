# SevaOrbit

SevaOrbit is a separate bilingual (Hindi/English) NGO platform built with React, Vite and Firebase. It is independent of SchoolConnect.

## Current features
- Google sign-in through Firebase Authentication.
- Public directory of NGOs whose status is LIVE, ACTIVE or APPROVED.
- NGO registration and manual UPI/UTR review by Super Admin.
- NGO activation only after Super Admin verifies the payment reference and approves the registration.
- NGO Admin portal for Member ID fee and WhatsApp settings, plus review of member ID applications.
- Member ID application and approval flow with a minimal public verification record.
- NGO owner workspace with Firebase-backed create, read, update and delete operations for:
  - Members and volunteers
  - Donations and expenses
  - Programs and events
  - Document/report/certificate links
- Workspace records are scoped by NGO ID and protected by Firestore Rules.
- Responsive Hindi/English interface.

## Firebase setup
1. Use the separate Firebase project `ngo-connect-4cfc0` (do not use SchoolConnect's Firebase project).
2. Enable Google provider in Firebase Authentication.
3. Create the Cloud Firestore database.
4. Configure the `VITE_FIREBASE_*` values in Vercel if the defaults in `src/firebase.ts` are not being used.
5. Review `firestore.rules`, paste the complete rules into Firebase Console → Firestore Database → Rules, and click **Publish**. GitHub changes do not automatically publish Firestore Rules.
6. Add the Super Admin email addresses listed in `src/App.tsx` and `firestore.rules` only if they are intended to control the platform.

## NGO Admin workflow
1. Super Admin reviews the NGO registration and UPI/UTR proof.
2. Super Admin activates the NGO only after checking the payment in the bank/UPI app.
3. NGO owner signs in with the Google account whose UID is stored in the NGO document's `ownerUid`.
4. Open `/ngo-admin` for Member ID fees and applications, or `/ngo-workspace` for members, finances, events and documents.
5. Test each create/edit/delete action using separate test NGOs before storing real financial or personal data.

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Set the `VITE_FIREBASE_*` variables in `.env.local` if needed.
4. Run `npm run dev`.
5. Run `npm run build` to check TypeScript and production compilation.

## Important limitations
- UPI payment is manually verified. Entering a UTR alone is not proof that a payment cleared.
- Document management stores HTTPS links; it does not upload files to Firebase Storage.
- Member ID card printing uses the browser's print dialog.
- A successful Vercel build does not replace end-to-end testing against the live Firebase project.
- Never store UPI PINs, passwords, or bank credentials.
