# 🚚 Trip Meter Log Web App

A responsive web application built with **HTML, CSS, JavaScript, and Firebase** for tracking trip meter logs.  
Supports multiple user roles with secure authentication and real-time Firestore storage.

---

## ✨ Features

- **Username + Password Login** (no email required)
- **User Roles**:
  - **Admin** → Full access, manage users & locations, edit/delete all trip data, export data
  - **User** → Can add and complete trip logs, edit only their own active rows
  - **Viewer** → Read-only access, can view & export data but cannot add/edit/delete
- **Dashboard**:
  - Add new trip log rows
  - Auto-calculate total meters
  - Location selection with scrollable modal
  - Date filter & location search
  - Export to Excel (XLSX)
  - Responsive UI, works on desktop and mobile
- **Admin Panel**:
  - Manage users (create, delete)
  - Manage locations (create, delete)
  - Custom confirm-delete popup for all deletes
- **UI**:
  - Clean responsive design
  - Login page with company logo & password toggle
  - Frozen table headers (like Excel)

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Database**: Firebase Firestore
- **Auth**: Custom (username + password stored in Firestore)
- **Export**: [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs)

## Contact
You can reach me at: info@prasatek.site
