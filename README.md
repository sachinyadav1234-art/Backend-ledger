# 📊 Backend Ledger Service & API Playground

Welcome to the **Backend Ledger Service**, a robust, banking-grade double-entry financial core built using Node.js, Express, and MongoDB.

This project can be tested and demonstrated in two ways:
1. **Interactive Web Dashboard**: A built-in browser-based playground served directly at `http://localhost:3000/`.
2. **Postman Collection**: A complete Postman collection pre-configured with automation scripts and environment variables.

---

## 🚀 How to Run the Backend Service

Follow these steps to spin up the service:

### 1. Install Dependencies
Open your terminal in the project root folder and install the package dependencies:
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
A `.env.example` file can be configured like this:
```env
MONGO_URI=mongodb://localhost:27017/backend_ledger
JWT_SECRET=your_jwt_secret_here
```
*Make sure your local MongoDB instance is running at `mongodb://localhost:27017` or update the `MONGO_URI` to point to your MongoDB Atlas cluster.*

### 3. Run the Development Server
Launch the server with automatic hot-reloading (powered by `nodemon`):
```bash
npm run dev
```
The server will boot up and bind to **Port 3000** (e.g., `http://localhost:3000`).

---

## 📭 Testing Through Postman

A pre-configured Postman Collection is provided in the project root: **[Ledger_Service.postman_collection.json](file:///c:/Users/ASUS/OneDrive/Desktop/BACKEND-LEDGER/Ledger_Service.postman_collection.json)**.

### How to Import & Use:

1. **Import the Collection**:
   - Open Postman.
   - Click the **Import** button in the top-left corner.
   - Drag and drop or select the `Ledger_Service.postman_collection.json` file from this project folder.

2. **Run the Request Sequence**:
   - **Register User / Login User**: Run the request. A Postman Test script will automatically capture the response `token` and store it in your Collection variables as `{{token}}`. You don't need to copy-paste it!
   - **Create Account**: Run this request. The script will save the returned Account ID as `{{accountId1}}` on the first call, and `{{accountId2}}` on the second call.
   - **Get Account Balance**: Run this to dynamically calculate the balance of `{{accountId1}}`.
   - **Transfer Funds**: Run this to make a transfer from `{{accountId1}}` to `{{accountId2}}`. The body uses Postman's built-in `{{$randomUUID}}` variable to automatically generate unique idempotency keys for each request.

---

## 🖥️ Alternative: Showcase via the Interactive Web UI

If an interviewer wants a visual demo, you can open your web browser and navigate to:
```url
http://localhost:3000/
```
The website provides a dark-themed GUI playground allowing you to register, log in, create accounts, copy IDs, generate idempotency keys, and view pretty-printed JSON logs.

---

## 🏛️ Key Financial Architecture Highlighted

This project is built to mirror production financial ledgers. Key architectural aspects to highlight:

1. **Double-Entry Bookkeeping**: Balances are calculated dynamically by summing historical ledger rows (debits and credits) instead of storing a static column.
2. **Immutable Ledgers**: Ledger rows are strictly read-only and cannot be updated or deleted.
3. **Idempotency Shielding**: Prevents double-spend and double-deductions during client timeouts or retry attempts via unique transaction keys.
4. **10-Step Transaction Lifecycle**: Uses MongoDB sessions (`startSession` / `commitTransaction`) to ensure that transfers either succeed completely or roll back atomically.
