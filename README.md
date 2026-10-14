# IntellMeet
### AI-Powered Meeting and Collaboration Platform

IntellMeet is a web-based meeting and collaboration platform designed
to improve communication and productivity for remote and hybrid teams.

## Features

- User registration and authentication
- Meeting management and admission controls
- Real-time collaboration using Socket.io
- Meeting dashboard and history
- Team workspaces
- Password reset and email functionality
- AI-assisted meeting workflows

Video conferencing, screen sharing, transcription, AI summaries, and
action-item extraction should be described as implemented features
where verified in the application.

## Technology Stack

### Frontend
- React 19
- Vite
- React Router
- Axios
- Socket.io Client

### Backend
- Node.js
- Express 5
- MongoDB and Mongoose
- Socket.io
- JWT and bcryptjs
- Google GenAI SDK
- SendGrid and Nodemailer

## Project Structure

    IntellMeet/
    ├── client/     Frontend application
    ├── server/     Backend application
    ├── README.md
    └── IntellMeet_Progress.pdf

## Prerequisites

- Node.js and npm
- A MongoDB connection
- Required environment variables for enabled services

## Local Setup

### 1. Clone the repository

    git clone https://github.com/vishnuyellaboina/IntellMeet.git
    cd IntellMeet

### 2. Configure and start the backend

    cd server
    npm install

Create a local .env file using the variable names expected by the
backend source code. Configure database, authentication, email, and
AI credentials as required. Never commit real credentials.

Start the backend in development mode:

    npm run dev

For production mode:

    npm start

### 3. Configure and start the frontend

Open a second terminal:

    cd F:\IntellMeet\client
    npm install

Configure the frontend environment variables required by the source
code, including the appropriate backend API URL.

Start the development server:

    npm run dev

Create a production build:

    npm run build

## Deployment

Frontend: Vercel
Backend: Render

Add the verified public frontend and backend URLs before submission.

## Security

- Do not commit .env files, API keys, database credentials, or JWT secrets.
- Configure secrets through local environment files and deployment settings.
- Review authentication, authorization, and CORS settings before release.

## Project Objective

IntellMeet aims to improve meeting productivity by combining
collaboration tools with AI-assisted meeting workflows.

## License

Add a license if the project is intended for distribution under
specific open-source terms.
