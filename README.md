<div align="center">
  <img src="https://i.ibb.co/6y4GbsT/SafeMOM-Logo.png" alt="SafeMOM Logo" width="200" style="border-radius:20px;"/>
  <h1>SafeMOM 🤰💙</h1>
  <p><strong>The Advanced Maternity Care & Monitoring Platform</strong></p>
  <p>Empowering mothers, equipping doctors, engaging partners, and supporting ASHA workers with real-time AI-driven health tracking.</p>
</div>

<hr />

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Features](#-core-features)
3. [User Roles & Dashboards](#-user-roles--dashboards)
4. [Technical Architecture](#%EF%B8%8F-technical-architecture)
5. [Key Components (Frontend)](#%E2%9C%A8-key-components-frontend)
6. [Backend API & Database](#%EF%B8%8F-backend-api--database)
7. [Installation & Setup](#-installation--setup)
8. [Environment Variables](#-environment-variables)
9. [Future Roadmap](#-future-roadmap)

---

## 🌟 Project Overview
**SafeMOM** is a comprehensive, multi-tenant web application designed to track, analyze, and manage maternal health during pregnancy. By bridging the communication gap between expectant mothers, their partners, doctors, and ASHA (Accredited Social Health Activist) workers, SafeMOM ensures that critical health data is monitored in real-time.

At the heart of the platform is an **AI-powered Chatbot** (powered by Google Gemini) that interacts with mothers, assesses risks from their symptoms, and automatically escalates high-risk cases to healthcare providers. The platform also boasts real-time vital tracking (Heart Rate, Blood Pressure, SpO2), pregnancy timeline planning, and live location mapping for emergency situations.

---

## 🚀 Core Features

- **🤖 AI Risk Assessment Bot:** An intelligent chatbot that mothers can converse with to report symptoms. It uses Natural Language Processing to categorize patient risk (Low, Medium, High).
- **💓 Real-Time Vitals Tracking:** Interactive, visually stunning charts displaying Heart Rate, Blood Pressure, SpO2, Daily Steps, and HRV trends over the gestation period.
- **🚨 Automated Alerts & Escalations:** If the AI detects a high-risk symptom (e.g., preeclampsia, heavy bleeding), immediate notifications are triggered for linked doctors and ASHA workers.
- **🧑‍🤝‍🧑 Multi-Role Ecosystem:** Dedicated, customized interfaces and access levels for Mothers, Doctors, Partners, and ASHA Workers.
- **🗺️ Nearby Hospital & Live Location:** Integrated Leaflet maps to locate the mother in real-time and find the nearest maternity hospitals in case of an emergency.
- **📅 Interactive Pregnancy Calendar:** A visually rich, month-by-month calendar highlighting the 40-week gestation period.
- **🔗 Account Linking System:** Secure invitation/linking system to bind a Mother's account to her Doctor, her Partner, and her ASHA worker so they can monitor her profile simultaneously.
- **🎨 Premium UI/UX:** Built with Tailwind CSS, Framer Motion, and shadcn/ui. Features a modern dark aesthetic with glowing orbs, frosted glass components (glassmorphism), and dynamic micro-animations.

---

## 👥 User Roles & Dashboards

SafeMOM supports four distinct user roles, each with a specialized dashboard:

### 1. 🤰 Mother (Patient)
- **Primary Dashboard:** Allows the mother to log vitals, chat with the AI Bot to report symptoms, and view her real-time risk status.
- **Insights:** Views customized pregnancy journey timelines, historical vital trends, and educational/health tips.
- **Profile:** Manages medical history (blood group, chronic conditions, pregnancy count).

### 2. 🩺 Doctor (Clinician)
- **My Patients List:** A triage-focused dashboard displaying all linked patients, **sorted automatically by AI risk priority (High → Medium → Low)**. Includes dynamic summary cards with glow effects.
- **Patient Details View:** Deep-dive into a specific mother's profile. Views full chat history, vital charts, profile views, and can set/update the official pregnancy start date.
- **Actionable Controls:** Can schedule appointments, unlink patients, and review AI risk justifications.

### 3. 🤝 ASHA Worker (Community Health Worker)
- Similar to the Doctor's view but tailored for community outreach.
- Designed to help ASHA workers track multiple mothers in their locale, ensuring rural and community-level maternal care is never missed.

### 4. ❤️ Partner (Husband)
- **Monitoring Dashboard:** Read-only access to their spouse's vitals, pregnancy timeline, and appointments.
- **Peace of Mind:** Real-time visibility into the mother's risk status without overwhelming them with clinical configuration options.

---

## 🛠️ Technical Architecture

### Frontend Stack (Client)
- **React 18** (Vite bundler) for fast, optimized rendering.
- **TypeScript** for strict type safety and structured interfaces.
- **Tailwind CSS + shadcn/ui** for rapid, accessible, and stunning component design.
- **Framer Motion** for fluid page transitions and component animations.
- **Recharts** for interactive vital trend data visualization.
- **React Router Dom** for client-side routing and protected routes.
- **Leaflet & React-Leaflet** for interactive mapping functionality.
- **Socket.io-client** for real-time WebSocket communication (Push Notifications).

### Backend Stack (Server)
- **Node.js & Express.js** providing a robust REST API infrastructure.
- **MongoDB & Mongoose** as the NoSQL database for flexible document storage (Users, Chat History, View Logs).
- **Google Generative AI (Gemini SDK)** for backend AI symptom analysis.
- **JSON Web Tokens (JWT) & bcrypt** for secure, stateless authentication and password hashing.
- **Nodemailer** for email verification flows.

---

## ✨ Key Components (Frontend)

*   `MotherDashboard.tsx`: The crux of the mother's experience, housing the AI Chat interface, live vitals, and emergency map.
*   `DoctorPatientList.tsx`: The triage center for doctors, featuring risk-based sorting, robust filtering, unlinking capabilities, and a SafeMOM signature glowing aesthetic.
*   `PatientDetails.tsx`: The detailed analytical view for clinicians, featuring `VitalsTrends.tsx` charts, `MaternalReportDisplay.tsx`, and `PregnancyCalendar.tsx`.
*   `AIChatbot.tsx`: The interface talking to the `/api/chat` backend, intelligently parsing user symptoms and returning medical guidelines.
*   `LiveVitals.tsx / VitalsTrends.tsx`: Dynamic charts mapping mock or real-time data against the gestation weeks.

---

## ⚙️ Backend API & Database

The backend follows an MVC-like structure located in the `/server` directory:

### Models (Mongoose)
- `User.js`: Schema for all roles (Mother, Doctor, ASHA, Partner). Handles distinct fields conditionally (e.g., `gestationWeek`, `appointments`).
- `PatientLink.js`: Relational linking between Clinicians (Doctor/ASHA) and Mothers.
- `PartnerLink.js`: Relational linking between Partners and Mothers.
- `ChatHistory.js`: Stores AI interactions linked to a specific mother.
- `ProfileView.js`: Audit log capturing when a doctor or partner views a mother's profile.

### Routes (Express)
- `/api/auth/*`: Registration, Login, Email Verification, Password Reset.
- `/api/patient/*`: Patient linking, unlinking, profile view tracking, and updating pregnancy data.
- `/api/partner/*`: Partner linking and data fetching.
- `/api/chat/*`: AI bot messaging, analyzing symptoms, extracting risk levels, and saving history.

---

## 💻 Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (Local or Atlas URI)
- Google Gemini API Key

### 1. Clone & Install Dependencies
First, install the client-side dependencies:
```bash
git clone <repository-url>
cd SafeMom
npm install
```

### 2. Setup the Server Environment
Navigate to the server folder and install dependencies:
```bash
cd server
npm install
```

### 3. Start the Development Servers
Create a split terminal or run these in two different windows:

**Terminal 1 (Backend API):**
```bash
cd server
npm start
```
*Note: Ensure your MongoDB is running locally or your Atlas URI is verified.*

**Terminal 2 (Frontend React App):**
```bash
# From the project root
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔐 Environment Variables

You must set up environment variables for both the Client and Server.

### Server (`server/.env`)
Create a `.env` file in the `/server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/safemom
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Client (`.env.local`)
Create a `.env.local` file in the root directory:
```env
VITE_API_URL=http://localhost:5000/api
# If integrating maps API keys later, place them here.
```

---

## 🔭 Future Roadmap
- **Wearable Device Integration:** Connect with smartwatches (Apple Watch, Fitbit, custom IoT rings) to pipe actual HR and SpO2 data directly into the `LiveVitalsSection`.
- **Telemedicine Call Integration:** Implement WebRTC allowing Doctors to launch a secure video call immediately directly from the `PatientDetails` page if risk is High.
- **Multilingual Support:** Localize the AI Chatbot and UI to support rural languages via the ASHA worker interfaces.
- **Offline Mode:** PWA capabilities for ASHA workers in remote villages to log patient data offline and sync when an internet connection is established.

---

<p align="center">
  Made with ❤️ for Maternal Healthcare.
</p>
