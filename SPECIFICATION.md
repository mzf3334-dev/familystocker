# Family Stock Checker - PWA Specification

## 1. Project Overview
A Progressive Web Application (PWA) designed to help families track food inventory and expiry dates. The app uses the device camera for OCR (Optical Character Recognition) to speed up data entry and syncs data in real-time between family members.

**Target Platforms:**
-   **Android:** Chrome (Installable as PWA)
-   **iOS:** Safari (Add to Home Screen, iOS 16.4+)

## 2. Architecture & Tech Stack
*   **Frontend:** React.js (Vite)
*   **Language:** TypeScript
*   **UI Framework:** Tailwind CSS (for responsive mobile design)
*   **OCR Engine:** Tesseract.js (Client-side, runs in browser)
*   **Backend / Database:** Firebase Firestore (NoSQL)
*   **Authentication:** Firebase Auth (Google Sign-In)
*   **Hosting:** Firebase Hosting

## 3. Free Tier Strategy (Firebase Spark Plan)
To ensure the application remains free to operate:
*   **Database:** Uses Firestore Free Tier (1 GiB storage, 50k reads/day).
*   **Images:** We will **NOT** save the full images of products to the cloud (to save storage). We only extract text and save the data.
*   **Notifications:** Instead of a paid backend server sending Push Notifications, we will use **Native Calendar Integration**. The app will generate a calendar event on the user's phone, which handles the alarm/reminder for free.

## 4. Functional Requirements

### 4.1. User Authentication & Family Sharing
*   **Sign Up/Login:** Users sign in using their Google Account.
*   **Create Family:** A user can create a new "Family Group".
*   **Join Family:** A user can join an existing family by entering a unique **Family ID** (shared by the creator).
*   **Data Isolation:** Users can only see inventory items belonging to their `familyId`.

### 4.2. Inventory Management (CRUD)
*   **View List:** Display items sorted by "Days until Expiry" (Ascending).
    *   *Visual Cues:*
        *   🔴 Red background: Expired or expires < 3 days.
        *   🟡 Yellow background: Expires in < 7 days.
        *   🟢 Green background: Good condition.
*   **Add Item:** Manual entry form.
*   **Edit/Delete:** Modify details or remove items (consumed/thrown away).

### 4.3. OCR Scanner (Camera Feature)
*   **Input:** User takes a photo or selects from the gallery.
*   **Processing:** Tesseract.js processes the image locally.
*   **Extraction Targets:**
    *   **English Text:** For Product Name.
    *   **Chinese Text:** For Product Name (Traditional/Simplified).
    *   **Dates:** Regex patterns to find `YYYY/MM/DD`, `DD/MM/YYYY`, `EXP`, `BB`.
*   **Review:** The user is presented with the extracted text to confirm/edit before saving.

### 4.4. Reminders & Notifications
*   **In-App Dashboard:** A "Dashboard" view showing a summary: "3 items expiring this week".
*   **Calendar Export:**
    *   When saving an item, the user can check "Set Reminder".
    *   The app triggers the device's native calendar (Google Calendar / iOS Calendar) to create an all-day event 7 days before the expiry date.
    *   *Benefit:* The phone handles the alarm even if the app is closed.

## 5. Data Model (Firestore)

### Collection: `families`
```json
{
  "id": "family_123",
  "name": "Mo Family",
  "members": ["user_uid_1", "user_uid_2"]
}
```

### Collection: `inventory`
```json
{
  "id": "item_abc",
  "familyId": "family_123",
  "name": "Oat Milk",
  "chineseName": "燕麦奶",
  "expiryDate": "2025-12-31", // ISO String
  "category": "Dairy",
  "addedBy": "user_uid_1",
  "createdAt": "2025-01-01T10:00:00Z"
}
```

## 6. UI/UX Flow
1.  **Login Screen:** "Sign in with Google".
2.  **Onboarding:** "Create Family" or "Join Family".
3.  **Home (Inventory List):** Search bar at top, FAB (Floating Action Button) "+" to add.
4.  **Add Item Screen:**
    *   Button: "📷 Scan Label"
    *   Fields: Name, Chinese Name, Expiry Date.
    *   Button: "Save & Add to Calendar".
5.  **Settings:** View Family ID (to share), Sign Out.
