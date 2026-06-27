# VTaiko Tournament Management (vot-web)

A comprehensive, full-stack Content Management System (CMS) and public dashboard designed specifically for Vietnam osu!taiko Tournaments (VOT). 

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

## ✨ Features

### 🎮 Public Dashboard
- **Tournament Overview**: Displays rules (Markdown supported), general information, and status.
- **Mappool Display**: Interactive stage-by-stage mappool viewer with direct osu! beatmap links.
- **Match Schedule**: Real-time tracking of upcoming, active, and completed matches.
- **Player Statistics**: Detailed leaderboards and stage performances (Score, Accuracy, Misses).
- **Staff Roster**: Categorized list of tournament staff (Hosts, Referees, Mappoolers, etc.).

### ⚙️ Admin CMS (Content Management System)
- **Secure Authentication**: Integrated with **osu! OAuth2** (only authorized staff can access).
- **Tournaments Manager**: Full CRUD for multi-tournament support. Customize slugs, status, and accent colors.
- **Mappool Manager**: Add beatmaps via ID and seamlessly reorganize the pool using an intuitive **Drag-and-Drop** interface.
- **Schedule Manager**: Add, edit, and delete 1v1 match schedules and times.
- **Stats Importer**: One-click **Excel (.xlsx) import** for rapid updating of player statistics, plus manual row-editing capabilities.
- **Staff Manager**: Assign roles to any user using their osu! ID or username.

## 🚀 Getting Started

We have configured the project to run immediately out-of-the-box with zero manual configuration required.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NaHieu2005/vot-web.git
   cd vot-web
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```
   *(This automatically installs both frontend and backend dependencies)*

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   *(This automatically generates your `.env` file, initializes the SQLite database, and starts both Vite and Express concurrently).*

### 🌐 Accessing the App
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

> **Note on Initial Admin Access:** The very first user to log in via osu! OAuth will be automatically granted the `ADMIN` role. Subsequent users will be granted the `PLAYER` role by default until promoted by an admin.

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, React Router v7, Lucide React (Icons).
- **Backend**: Node.js, Express.js, Passport.js (osu! OAuth2), JSON Web Tokens (JWT).
- **Database**: SQLite, Prisma ORM.

## 🌍 Sharing the Local Environment
If you need to share your local development environment via a public URL (e.g., using Localtunnel or Pinggy), ensure you update the `FRONTEND_URL` and `OSU_CALLBACK_URL` in `server/.env` to match your public URL, and register the callback URL in your [osu! Developer Settings](https://osu.ppy.sh/home/account/edit#oauth).
