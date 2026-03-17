<div align="center">
  <img src="https://i.ibb.co/6y4GbsT/SafeMOM-Logo.png" alt="SafeMOM Logo" width="200" style="border-radius:20px;"/>
  <h1>SafeMOM 🤰💙</h1>
  <p><strong>SAFE MATERNAL ONGOING MONITORING BAND</strong></p>
  <p>AI-Driven IoT-Based Maternal Health Monitoring and Preventive Care Platform</p>
  <p><em>Empowering mothers, equipping doctors, engaging partners, and supporting ASHA workers with real-time AI-driven health tracking.</em></p>

  [![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_SafeMOM-7c3aed?style=for-the-badge)](https://safe-mom-xi.vercel.app/)

  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
  ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
  ![ESP32](https://img.shields.io/badge/ESP32-IoT-red?style=flat)
  ![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI-blue?style=flat&logo=google&logoColor=white)
</div>

<hr />

## 📖 Table of Contents

1. [Project Overview](#-project-overview)
2. [Live Demo](#-live-demo)
3. [Demo Accounts](#-demo-accounts)
4. [Problem Statement](#-problem-statement)
5. [Objectives](#-objectives)
6. [System Architecture](#%EF%B8%8F-system-architecture)
7. [Hardware Components](#-hardware-components)
8. [Software Architecture](#-software-architecture)
9. [User Roles & Dashboards](#-user-roles--dashboards)
10. [Key Components (Frontend)](#-key-components-frontend)
11. [Backend API & Database](#%EF%B8%8F-backend-api--database)
12. [System Workflow](#-system-workflow)
13. [Installation & Setup](#-installation--setup)
14. [Environment Variables](#-environment-variables)
15. [Future Roadmap](#-future-roadmap)

---

## 🌐 Live Demo

> **Try SafeMOM now → [https://safe-mom-xi.vercel.app/](https://safe-mom-xi.vercel.app/)**

Use the demo accounts below to explore the platform across all four user roles.

---

## 🔑 Demo Accounts

The following pre-verified accounts are automatically seeded when the server starts. Use them to explore the platform:

| Role | Name | Email | Password |
|------|------|-------|----------|
| 🩺 **Doctor** | Dr. Clinician | `doctor@safemom.com` | `doctor123` |
| 🤝 **ASHA Worker** | Rani Devi | `asha@safemom.com` | `asha123` |
| 🤰 **Mother** | Priya Sharma | `priya@safemom.com` | `priya123` |
| ❤️ **Partner** | Arjun Sharma | `partner@safemom.com` | `partner123` |

> **Mother Profile Details:** Age 28 · Gestation Week 24 · Blood Group B+ · First Pregnancy · No chronic conditions · No medications

---

## 🌟 Project Overview

**SafeMOM** (Safe Maternal Ongoing Monitoring Band) is a comprehensive, AI-driven IoT-based maternal healthcare monitoring and preventive care platform. It continuously monitors critical maternal physiological parameters — heart rate, HRV, SpO₂, stress levels, body temperature, step count, and GPS location — using wearable biomedical sensors connected to an ESP32 microcontroller.

At the heart of the platform is an **AI-powered Chatbot** (powered by Google Gemini) that interacts with mothers, assesses risks from their symptoms, and automatically escalates high-risk cases to healthcare providers. The platform also provides a **real-time monitoring dashboard**, **machine learning-based blood pressure prediction**, **automated risk alerts via email**, and **live location mapping** for emergency situations.

SafeMOM directly supports **United Nations Sustainable Development Goal 3** (Good Health and Well-being), particularly **Target 3.1**, which focuses on reducing maternal mortality and improving maternal healthcare accessibility.

---

## 🚩 Problem Statement

Maternal mortality remains a critical public health challenge in rural India, where nearly **65–70%** of maternal deaths occur due to delayed detection of life-threatening pregnancy complications. Over **70%** of these deaths are preventable with timely monitoring and early medical intervention.

Key challenges include:
- Limited healthcare infrastructure in rural regions
- Unstable internet connectivity
- Shortage of medical professionals
- Delayed emergency response

SafeMOM bridges this gap by enabling **continuous monitoring, early risk detection, and timely healthcare intervention** through wearable IoT sensors, intelligent data analysis, and automated alert systems.

---

## 🎯 Objectives

- Develop a **wearable maternal healthcare monitoring device** for continuous tracking of vital signs
- Monitor physiological parameters: Heart Rate, HRV, SpO₂, Stress, Temperature, Step Count, Location
- Integrate biomedical sensors (MAX30102, GSR, DS18B20, GPS, MPU6050) with the **ESP32 microcontroller**
- Enable **real-time IoT data transmission** to a cloud server
- Implement a **machine learning model** for non-invasive blood pressure prediction using PPG signals
- Develop an **AI-powered chatbot** for symptom analysis and healthcare guidance
- Design a **risk assessment engine** (Low / Medium / High / Risky)
- Build a **web-based monitoring dashboard** for doctors, ASHA workers, and family members
- Implement **automated email alerts** for high-risk situations
- Enable **GPS-based emergency location tracking** and nearby hospital identification
- Support **preventive maternal healthcare** through early detection of pregnancy-related complications

---

## 🏗️ System Architecture

The SafeMOM architecture is organized into **three major layers**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │   SafeMOM    │ │   Doctor     │ │  ASHA    │ │   Partner     │  │
│  │  Dashboard   │ │  Interface   │ │ Worker   │ │  Monitoring   │  │
│  └──────────────┘ └──────────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Alert & Notification System                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                      PROCESSING LAYER                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐   │
│  │  Backend    │ │  MongoDB   │ │    ML      │ │  AI Chatbot    │   │
│  │  Server     │ │  Database  │ │  Module    │ │   Engine       │   │
│  │ (Node.js)  │ │            │ │  (BP Est.) │ │  (Gemini)      │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Risk Assessment Engine                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                       SENSING LAYER                                 │
│  ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────┐ ┌─────────┐          │
│  │ MAX30102 │ │ GSR  │ │ DS18B20  │ │ GPS  │ │ MPU6050 │          │
│  │ (PPG)    │ │Sensor│ │ (Temp)   │ │Module│ │ (Accel) │          │
│  └────┬─────┘ └──┬───┘ └────┬─────┘ └──┬───┘ └────┬────┘          │
│       └──────────┴──────────┴───────────┴──────────┘               │
│                    ┌──────────────┐                                  │
│                    │    ESP32     │ ──── Wi-Fi ──→ Cloud Server      │
│                    └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Sensing Layer
Wearable biomedical sensors connected to the **ESP32 microcontroller** that continuously collect physiological signals and transmit data via Wi-Fi.

### Processing Layer
Cloud-based backend (Node.js + Express.js) that receives sensor data, runs ML prediction models, processes AI chatbot interactions, and performs risk assessment.

### Application Layer
Web dashboard and notification interfaces for doctors, ASHA workers, partners, and mothers — with automated email alerts for critical situations.

---

## 🔧 Hardware Components

| S.No | Sensor Module | Purpose | Approx. Cost (INR) |
|------|--------------|---------|---------------------|
| 1 | **MAX30102** PPG Sensor | Heart Rate, HRV, SpO₂ | ₹149 |
| 2 | **DS18B20** Temperature Sensor | Body Temperature | ₹70 |
| 3 | **MPU6050** Accelerometer & Gyroscope | Step Count & Activity Tracking | ₹173 |
| 4 | **NEO-6M** GPS Module | Real-time Location Tracking | ₹400 |
| 5 | **GSR** Sensor | Stress Level (Skin Conductance) | ₹1,525 |
| 6 | **ESP32** Dev Kit | Central Microcontroller & Wi-Fi | ₹379 |

> *Prices are approximate and referenced from the RobuCraze online electronics store.*

---

## 💻 Software Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Vite | Responsive web dashboard |
| **Styling** | Tailwind CSS, shadcn/ui, Framer Motion | Premium UI with glassmorphism & animations |
| **Charts** | Recharts | Interactive vital trend visualization |
| **Maps** | Leaflet & React-Leaflet | Hospital locator & live location |
| **Backend** | Node.js, Express.js | REST API server |
| **Database** | MongoDB, Mongoose | NoSQL document storage |
| **AI/NLP** | Google Gemini SDK | Symptom chatbot & risk analysis |
| **ML Model** | Regression-based BP Prediction | Non-invasive blood pressure estimation |
| **Auth** | JWT, bcrypt | Secure stateless authentication |
| **Email** | Resend / Nodemailer | Risk alert notifications |
| **Real-time** | Socket.io | WebSocket push notifications |
| **IoT Device** | ESP32 (Arduino/C++) | Sensor data acquisition & Wi-Fi transmission |
| **Communication** | REST API (HTTP/JSON) | ESP32 ↔ Cloud data exchange |

### Frontend Web Dashboard
- Real-time visualization of physiological parameters (HR, SpO₂, HRV, Temperature, Stress)
- Interactive graphs and historical health trends
- ML-predicted blood pressure values and risk-level indicators
- AI-powered chatbot interface for pregnant women

### Backend Application Server
- **RESTful APIs** receive continuous sensor data from the ESP32 over Wi-Fi
- **Risk Assessment Logic** evaluates vitals and AI symptom assessments against clinical thresholds
- **Alert Orchestration** dispatches automatic risk reports and email alerts

### Database System (MongoDB)
- **Patient Profiles & Health Records** — demographics, medical history, linked providers
- **Telemetry Data Logs** — time-series physiological data from wearable sensors
- **Interaction Records** — AI chatbot conversation histories for risk trend analysis

### Machine Learning & AI Engines
- **Blood Pressure Prediction Model** — regression-based algorithm using PPG features (pulse amplitude, pulse width, HR, HRV, GSR)
- **NLP Chatbot Engine** — Google Gemini-powered natural language processing for symptom evaluation and healthcare guidance

---

## 👥 User Roles & Dashboards

SafeMOM supports **four distinct user roles**, each with a specialized interface:

### 1. 🤰 Mother (Patient)
- Log vitals and chat with the AI Bot to report symptoms
- View real-time risk status, pregnancy journey timeline, and health tips
- Manage medical history (blood group, chronic conditions, pregnancy count)

### 2. 🩺 Doctor (Clinician)
- **My Patients List** — triage dashboard sorted by AI risk priority (High → Medium → Low)
- **Patient Details View** — full chat history, vital charts, profile data, and pregnancy start date management
- Schedule appointments, unlink patients, and review AI risk justifications

### 3. 🤝 ASHA Worker (Community Health Worker)
- Similar to the Doctor's view but tailored for community outreach
- Track multiple mothers in rural areas and assist doctors in risk identification

### 4. ❤️ Partner (Husband)
- Read-only access to spouse's vitals, pregnancy timeline, and appointments
- Real-time visibility into the mother's risk status

---

## ✨ Key Components (Frontend)

| Component | Description |
|-----------|-------------|
| `MotherDashboard.tsx` | Mother's primary experience — AI Chat, live vitals, emergency map |
| `DoctorPatientList.tsx` | Triage center with risk-based sorting, filtering, and patient management |
| `PatientDetails.tsx` | Clinician's analytical view with `VitalsTrends.tsx`, `MaternalReportDisplay.tsx`, `PregnancyCalendar.tsx` |
| `AIChatbot.tsx` | AI symptom analysis interface connected to `/api/chat` backend |
| `LiveVitals.tsx` / `VitalsTrends.tsx` | Dynamic charts mapping real-time sensor data against gestation weeks |
| `ContactSection.tsx` | Emergency contact and hospital locator |
| `HospitalMapIcon.tsx` | Leaflet map markers for nearby hospitals |

---

## ⚙️ Backend API & Database

The backend follows an MVC-like structure in the `/server` directory:

### Models (Mongoose)

| Model | Description |
|-------|-------------|
| `User.js` | Schema for all roles (Mother, Doctor, ASHA, Partner) with role-specific fields |
| `PatientLink.js` | Relational linking between Clinicians (Doctor/ASHA) and Mothers |
| `PartnerLink.js` | Relational linking between Partners and Mothers |
| `ChatHistory.js` | AI interaction records linked to a specific mother |
| `ProfileView.js` | Audit log for profile access tracking |

### Routes (Express)

| Route | Purpose |
|-------|---------|
| `/api/auth/*` | Registration, Login, Email Verification, Password Reset |
| `/api/patient/*` | Patient linking/unlinking, profile view tracking, pregnancy data updates |
| `/api/partner/*` | Partner linking and data fetching |
| `/api/chat/*` | AI bot messaging, symptom analysis, risk extraction, and history saving |

---

## 🔄 System Workflow

```
 ┌───────────────────┐
 │  Wearable Sensors  │  MAX30102 · GSR · DS18B20 · GPS · MPU6050
 └────────┬──────────┘
          ▼
 ┌───────────────────┐
 │  ESP32 Processing  │  Signal filtering, noise removal, digitization
 └────────┬──────────┘
          ▼  (Wi-Fi / REST API)
 ┌───────────────────┐
 │   Cloud Backend    │  Node.js + Express.js + MongoDB
 └────────┬──────────┘
          ├──────────────────────┐
          ▼                      ▼
 ┌─────────────────┐   ┌──────────────────┐
 │  ML BP Prediction│   │  AI Chatbot       │
 │  (PPG Features)  │   │  (Gemini NLP)     │
 └────────┬────────┘   └────────┬─────────┘
          └──────────┬──────────┘
                     ▼
          ┌──────────────────┐
          │ Risk Assessment   │  Low · Medium · High · Risky
          │     Engine        │
          └────────┬─────────┘
                   ▼
     ┌─────────────┴─────────────┐
     ▼                           ▼
┌──────────────┐       ┌──────────────────┐
│  Dashboard    │       │  Email Alerts     │
│ (Real-time)   │       │ (Doctor, ASHA,    │
│               │       │  Partner)         │
└──────────────┘       └──────────────────┘
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** v18+ recommended
- **MongoDB** instance (Local or Atlas URI)
- **Google Gemini API Key** — [Get it here](https://aistudio.google.com/apikey)

### 1. Clone & Install Frontend Dependencies
```bash
git clone <repository-url>
cd SafeMom
npm install
```

### 2. Install Server Dependencies
```bash
cd server
npm install
```

### 3. Start Development Servers

**Terminal 1 — Backend API:**
```bash
cd server
npm start
```

**Terminal 2 — Frontend React App:**
```bash
# From the project root
npm run dev
```

Visit **http://localhost:5173** in your browser.

> **Quick Start (Windows):** You can also run `start.bat` from the project root to launch both servers simultaneously.

---

## 🔐 Environment Variables

### Server (`server/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/safemom
JWT_SECRET=your_jwt_secret_here
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173

# Email Alerts (Option A: Gmail with App Password)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Email Alerts (Option B: Other SMTP providers)
# SMTP_HOST=smtp-mail.outlook.com
# SMTP_PORT=587
# SMTP_SECURE=false
```

### Client (`.env.local`)

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_URL=http://localhost:5000/api
```

> See `.env.example` for a complete reference.

---

## 🔭 Future Roadmap

- **ABHA Health ID Integration** — Securely store and access maternal health records across healthcare systems via Ayushman Bharat
- **Government Healthcare Collaboration** — Deploy SafeMOM with ASHA workers in rural healthcare programs
- **Smartwatch & Wearable Integration** — Connect with commercial wearables (Apple Watch, Fitbit, custom IoT rings)
- **Telemedicine Support** — WebRTC-based secure video consultations directly from the dashboard
- **Multilingual AI Chatbot** — Support regional languages for improved rural accessibility
- **Offline Data Synchronization** — PWA capabilities for offline data logging and auto-sync
- **Advanced Predictive Analytics** — Additional ML models to detect preeclampsia, anemia, and gestational diabetes at early stages

---

## 🏆 Contribution to SDGs

SafeMOM directly contributes to **United Nations Sustainable Development Goal 3** (Good Health and Well-being), particularly **Target 3.1**, which focuses on reducing the global maternal mortality ratio. By leveraging IoT, AI, and data-driven healthcare analytics, the platform improves maternal healthcare accessibility and safety in underserved regions.

---

<p align="center">
  Made with ❤️ for Maternal Healthcare by <strong>Team Phoenix</strong><br/>
  Department of Electronics and Communication Engineering (ECE)
</p>
