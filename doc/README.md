# TrustPass

TrustPass is a B2B fraud-prevention platform that helps businesses assess the trustworthiness of sensitive user actions before allowing them to proceed.

The platform is designed to use GSMA Open Gateway / CAMARA network capabilities together with a Trust Engine and AI Agent to evaluate risk and return a trust decision.

---

## 1. Project Structure

The project is currently organized into two main applications:

```text
TrustPass/
│
├── doc/
│   ├── README.md
│   └── 02-Environment-Setup.md
│
├── trustpassBackend/
│   ├── prisma/
│   └── src/
│
├── trustpassFrontend/
│   └── src/
│
└── .gitignore

Technology Stack
Backend
Node.js
TypeScript
Express
PostgreSQL
Prisma ORM
JWT
bcryptjs
Zod
pg
Prisma PostgreSQL adapter
Frontend
React
TypeScript
Vite
React Router
Planned TrustPass Technologies

The final project will also integrate:

GSMA Open Gateway
CAMARA APIs
Nokia Network-as-Code
AI Agent
Trust Engine
4. Prerequisites

Before running TrustPass, install the following:

Git
Node.js
npm
PostgreSQL

The currently tested versions are:

Node.js:    v24.20.0
PostgreSQL: 18

Other compatible versions may work, but using the tested versions is recommended.

5. Clone the Repository

Clone the repository:

git clone https://github.com/claraharb/TrustPass.git

Enter the project directory:

cd TrustPass
6. Branch

The main development branch is:

develop

Switch to the development branch:

git checkout develop

Make sure the local branch is up to date:

git pull origin develop

The develop branch is used for ongoing development.

7. Backend Setup

Navigate to the backend:

cd trustpassBackend

Install the backend dependencies:

npm install

The backend package includes the required dependencies for:

Express
PostgreSQL
Prisma
JWT authentication
Password hashing
Validation
TypeScript
8. Frontend Setup

Open a second terminal.

From the project root:

cd trustpassFrontend

Install the frontend dependencies:

npm install

The frontend uses:

React
TypeScript
Vite
React Router
9. Environment Variables

Environment variables must be configured separately for the backend and frontend.

Backend

Create:

trustpassBackend/.env

Use the following structure:

PORT=5000

DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/trustpass"

JWT_SECRET="YOUR_JWT_SECRET"

Replace:

YOUR_POSTGRES_PASSWORD

with the password of the local PostgreSQL postgres user.

Replace:

YOUR_JWT_SECRET

with a secure secret used to sign JWT tokens.

Frontend

Create:

trustpassFrontend/.env

with:

VITE_API_URL=http://localhost:5000/api/v1

The frontend uses this variable to communicate with the backend.

10. Database Setup

TrustPass uses PostgreSQL.

Create a PostgreSQL database named:

trustpass

The expected local database configuration is:

Host:     localhost
Port:     5432
Database: trustpass
User:     postgres

The PostgreSQL password is specific to each developer's local machine and must not be committed to Git.

11. Prisma Setup

Prisma is used as the ORM for the PostgreSQL database.

After configuring the backend .env, navigate to:

trustpassBackend

Run:

npx prisma migrate dev

This applies the database migrations.

Then generate the Prisma Client:

npx prisma generate

The generated Prisma Client is placed in:

trustpassBackend/src/generated/

This directory is ignored by Git because it is generated automatically.

Prisma Configuration

The project uses:

prisma/schema.prisma

and:

prisma.config.ts

The Prisma datasource uses PostgreSQL.

12. Admin Account

The backend contains a seed script:

trustpassBackend/prisma/seed.ts

The seed creates the initial TrustPass administrator.

Run:

npx tsx prisma/seed.ts

The script uses an upsert, so running it again does not create duplicate admin accounts with the same email.

The development admin credentials are defined in the seed script.

For security reasons, production credentials must never be stored directly in the repository.

13. Running the Backend

From:

trustpassBackend

run:

npm run dev

The backend runs on:

http://localhost:5000

The backend entry point is:

src/server.ts

The Express application is defined in:

src/app.ts
14. Running the Frontend

From:

trustpassFrontend

run:

npm run dev

Vite will display the local frontend URL in the terminal.

The frontend communicates with the backend using:

VITE_API_URL

which should point to:

http://localhost:5000/api/v1
15. Health Check

The backend exposes a health endpoint:

GET /api/v1/health

Full URL:

http://localhost:5000/api/v1/health

A successful response looks similar to:

{
  "status": "ok",
  "service": "trustpass-backend",
  "database": "connected",
  "message": "TrustPass backend is running"
}

The endpoint also verifies the PostgreSQL connection.

If the database is unavailable, the endpoint returns an error response indicating that the database is disconnected.

16. Backend Build

To verify that the backend TypeScript code compiles successfully:

npm run build

The command runs:

tsc

A successful build should finish without TypeScript errors.

17. Authentication

TrustPass currently supports two user roles:

CLIENT
ADMIN

Authentication uses:

JWT

Passwords are hashed using:

bcryptjs

Input validation is handled using:

Zod
Client Registration

Endpoint:

POST /api/v1/auth/client/register

The registration process:

Client
  ↓
Registration request
  ↓
Zod validation
  ↓
Check existing email
  ↓
Hash password
  ↓
Store client in PostgreSQL
  ↓
Return registration result

The password is never stored as plaintext.

Client Login

Endpoint:

POST /api/v1/auth/client/login

The login process:

Client
  ↓
Email + password
  ↓
Validate request
  ↓
Find client
  ↓
Check account status
  ↓
Compare password hash
  ↓
Generate JWT
  ↓
Return authentication response

The JWT contains information identifying the authenticated client and its role.

Client Logout

Endpoint:

POST /api/v1/auth/client/logout

The current prototype invalidates the JWT using an in-memory revoked-token store.

After logout, attempting to use the revoked token results in:

401 Unauthorized
Prototype limitation

The current token revocation mechanism is stored in memory.

Therefore, revoked tokens are cleared if the backend restarts.

A production implementation should use a persistent token/session revocation mechanism.

18. Role-Based Access Control

TrustPass implements Role-Based Access Control (RBAC).

Authentication and authorization are separate steps.

Request
   ↓
authenticate()
   ↓
Validate JWT
   ↓
Authenticated?
   ├── No → 401 Unauthorized
   │
   └── Yes
        ↓
authorize()
        ↓
Check role
        ↓
Allowed?
   ├── No → 403 Forbidden
   │
   └── Yes → Continue

The authorization middleware supports:

authorize("CLIENT")

and:

authorize("ADMIN")
Admin Authorization

Admin-only routes use:

authenticate,
authorize("ADMIN")

This means:

The user must have a valid JWT.
The JWT must contain the ADMIN role.
Otherwise, access is rejected.

A client attempting to access an admin-only route receives:

{
  "message": "Access denied"
}

with HTTP status:

403 Forbidden

19. Current API Endpoints
Authentication
Method	Endpoint	Role
POST	/api/v1/auth/client/register	Public
POST	/api/v1/auth/client/login	Public
POST	/api/v1/auth/client/logout	Authenticated
POST	/api/v1/auth/admin/login	Public
Health
Method	Endpoint	Role
GET	/api/v1/health	Public
Current Test Routes
Method	Endpoint	Required Role
GET	/api/v1/client/test	CLIENT
GET	/api/v1/admin/test	ADMIN

These routes are currently used to verify authentication and authorization.

They may be replaced by actual client/admin functionality as development continues.

20. Protected Routes

Protected routes require the JWT to be sent in the HTTP Authorization header.

Format:

Authorization: Bearer <JWT_TOKEN>

Example:

Authorization: Bearer eyJ...

Do not commit real tokens to Git.

Client Protected Route

Example:

GET /api/v1/client/test

Requires:

CLIENT

A valid client token is accepted.

An invalid or missing token is rejected.

An admin token is not intended to access client-only routes when the route requires:

authorize("CLIENT")
Admin Protected Route

Example:

GET /api/v1/admin/test

Requires:

ADMIN

A valid admin token is accepted.

A client token receives:

403 Forbidden
21. Database Models

The TrustPass database currently contains the following models:

Admin
Client
Package
Subscription
ApiKey
ProtectedAction
TrustRequest
RiskSignal
TrustDecision
ApiUsage
FraudEvent
Admin

Stores administrator accounts.

Main information includes:

ID
Name
Email
Password hash
Active status
Created/updated timestamps
Client

Stores businesses using TrustPass.

Main information includes:

ID
Name
Email
Password hash
Active status
Created/updated timestamps
Package

Represents TrustPass subscription packages.

Main information includes:

Package name
Description
Request limit
Price
Duration
Features
Active status
Subscription

Connects clients with packages.

Main information includes:

Client
Package
Start date
End date
Requests used
Payment status
Active status
ApiKey

Stores client API key information.

The actual API key is not stored in plaintext.

The model stores:

Key prefix
Key hash
Status
Client
Usage count
Last used time
Revocation information
ProtectedAction

Represents actions that a client wants TrustPass to protect.

Examples include:

Login
Account Creation
Payment
Password Reset
High-value Transaction
TrustRequest

Represents an individual TrustPass assessment request.

It can contain:

Client
Protected action
Request ID
Phone number
IP address
User agent
Status
Creation time
Completion time
RiskSignal

Stores individual risk/trust signals used during an assessment.

Examples can include:

Network signals
Device information
SIM-related signals
Location signals
Request signals
TrustDecision

Stores the final assessment result.

It contains:

Decision
Trust score
Risk level
Explanation
Creation time
ApiUsage

Tracks API usage by clients.

It contains:

Client
API key
Endpoint
HTTP method
Status code
Request ID
Timestamp
FraudEvent

Stores suspicious or fraudulent activity detected by TrustPass.

It contains:

Client
Trust request
Event type
Severity
Description
Status
Creation time
Resolution time