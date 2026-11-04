# 🌿 ShobujShathi – Backend API

ShobujShathi is a community-driven social development platform. This repository contains the backend REST API responsible for event management, volunteer participation, database operations, and secure authentication.

## 🚀 Live API

**Backend URL:** `https://shobujsathi-backend.vercel.app`

**Health Check:** `https://shobujsathi-backend.vercel.app/api/health`

## ✨ Key Features

* **RESTful API:** Provides structured API endpoints for frontend communication.
* **Event Management:** Create, retrieve, update, and delete social development events.
* **Event Joining:** Allows authenticated users to join community events.
* **Participation Management:** View joined events and cancel participation.
* **JWT Authentication:** Protects private API routes using Better Auth JWT verification.
* **User Authorization:** Ensures users can manage only their own events and participation.
* **MongoDB Integration:** Stores event information and volunteer participation data.
* **Duplicate Prevention:** Prevents users from joining the same event multiple times.
* **API Security:** Includes CORS configuration, Helmet security headers, and rate limiting.
* **Input Validation:** Validates incoming data before database operations.

## 🛠️ Technologies Used

* Node.js
* Express.js
* MongoDB
* Better Auth JWT
* jose
* CORS
* Helmet
* express-rate-limit
* dotenv

## 📁 Project Structure

## 🔗 API Endpoints

### Event APIs

| Method | Endpoint                | Description       |
| ------ | ----------------------- | ----------------- |
| GET    | `/api/events`           | Get all events    |
| GET    | `/api/events/:id`       | Get event details |
| GET    | `/api/events/my-events` | Get user's events |
| POST   | `/api/events`           | Create an event   |
| PUT    | `/api/events/:id`       | Update an event   |
| DELETE | `/api/events/:id`       | Delete an event   |

### Participation APIs

| Method | Endpoint              | Description          |
| ------ | --------------------- | -------------------- |
| POST   | `/api/joins`          | Join an event        |
| GET    | `/api/joins`          | Get joined events    |
| DELETE | `/api/joins/:eventId` | Cancel participation |

**Note:** Protected endpoints require a valid authentication token.

## 📦 Installation & Setup

### 1. Clone the Repository


git clone YOUR_SERVER_GITHUB_REPOSITORY_URL


### 2. Navigate to the Project Directory


cd shobuj-sathi-server


### 3. Install Dependencies


npm install


### 4. Configure Environment Variables

Create a `.env` file in the root directory.


PORT=8000
CLIENT_URL=http://localhost:3000
MONGODB_URL=your_mongodb_connection_string
BETTER_AUTH_URL=http://localhost:3000


### 5. Run the Development Server


npm run dev

The backend server will run at:

`http://localhost:8000`

## 🌐 Deployment

The backend can be deployed using **Render**.

* Build Command: `npm install`
* Start Command: `npm start`
* Configure the required environment variables in Render.
* Update `CLIENT_URL` and `BETTER_AUTH_URL` with the appropriate production URLs.

## 🎯 Project Purpose

The purpose of this backend is to provide a secure and reliable API for ShobujShathi, connecting event organizers and volunteers while making community service activities easier to manage.



**ShobujShathi – Together, We Make a Difference.** 🌱
