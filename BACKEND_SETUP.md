# Permanent Backend Setup

This project now supports two modes:

- Demo mode: open `index.html` with `file:///`; changes are saved in browser `localStorage`.
- Backend mode: run `npm start`; changes are saved through the Node.js API into MongoDB.

## 1. Configure MongoDB

Create a `.env` file in the project root:

```env
PORT=3000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER.mongodb.net/bhagirathi_academy
JWT_SECRET=replace-this-with-a-long-random-secret
```

For local MongoDB, use:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/bhagirathi_academy
JWT_SECRET=replace-this-with-a-long-random-secret
```

Important: without `MONGODB_URI`, the app uses an embedded development database and data resets when the server stops.

## 2. Run the Backend

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000/
http://localhost:3000/admin-login.html
```

Admin login:

```text
Username: ADMIN-001
Password: password123
```

## 3. What Saves Permanently

When running through `http://localhost:3000`, these dashboard changes are saved to MongoDB:

- Public website content
- Student records
- Teacher profiles
- Public showcase cards
- Class PDF metadata
- Parent login credentials

Parent credentials are hashed in MongoDB. The parent portal only receives the child record linked to that generated credential.

## 4. Real-Time Sync

The backend uses Socket.IO WebSockets. When the admin dashboard saves or deletes editable data, the server emits:

```text
public:data-updated
```

The public website listens to this event and refreshes automatically. It also has two fallbacks:

- BroadcastChannel/localStorage sync for demo tabs in the same browser
- Short polling every 5 seconds when WebSockets are unavailable

Real-time multi-device sync requires opening the site through the Node server, not `file:///`.

## 5. API Routes

Public website reads:

```text
GET /api/public/siteContent
GET /api/public/teachers
GET /api/public/showcase
```

Admin saves:

```text
PUT /api/admin/data/siteContent
PUT /api/admin/data/students
PUT /api/admin/data/teachers
PUT /api/admin/data/showcase
```

Parent access:

```text
POST /api/admin/parent-credentials
POST /api/parents/login
```

All admin save routes require the JWT token returned from:

```text
POST /api/auth/login
```
