# TrustPass — Environment Setup

This document explains how to prepare the local development environment for TrustPass.

The goal is to allow a new developer to clone the repository, install the required software and dependencies, configure PostgreSQL and environment variables, initialize Prisma, and run both the backend and frontend successfully.

---

# Table of Contents

1. [Required Software](#1-required-software)
2. [Recommended Versions](#2-recommended-versions)
3. [Verify Installations](#3-verify-installations)
4. [Clone the Repository](#4-clone-the-repository)
5. [Switch to the Development Branch](#5-switch-to-the-development-branch)
6. [Project Directory](#6-project-directory)
7. [PostgreSQL Setup](#7-postgresql-setup)
8. [Create the TrustPass Database](#8-create-the-trustpass-database)
9. [Backend Environment Variables](#9-backend-environment-variables)
10. [Frontend Environment Variables](#10-frontend-environment-variables)
11. [Install Backend Dependencies](#11-install-backend-dependencies)
12. [Install Frontend Dependencies](#12-install-frontend-dependencies)
13. [Initialize Prisma](#13-initialize-prisma)
14. [Create the Admin Account](#14-create-the-admin-account)
15. [Run the Backend](#15-run-the-backend)
16. [Run the Frontend](#16-run-the-frontend)
17. [Verify the Backend](#17-verify-the-backend)
18. [Verify the Database Connection](#18-verify-the-database-connection)
19. [Build the Backend](#19-build-the-backend)
20. [Terminal Setup](#20-terminal-setup)
21. [Environment Variables Summary](#21-environment-variables-summary)
22. [Security Rules](#22-security-rules)
23. [Common Problems](#23-common-problems)
24. [Fresh Setup Checklist](#24-fresh-setup-checklist)

---

# 1. Required Software

The following software is required to run TrustPass locally:

- Git
- Node.js
- npm
- PostgreSQL

The project also uses:

- Prisma
- React
- Vite
- TypeScript
- Express

These project dependencies are installed using `npm install` and do not need to be installed globally.

---

# 2. Recommended Versions

The following versions have been tested during development:

```text
Node.js:    v24.20.0
PostgreSQL: 18

3. Verify Installations

Open PowerShell or another terminal.

Check Git
git --version

Git should return an installed version.

Check Node.js
node --version

Expected development version:

v24.20.0
Check npm
npm --version

npm should be available with the Node.js installation.

Check PostgreSQL

PostgreSQL can be verified using the PostgreSQL tools or pgAdmin.

The TrustPass development database uses:

Host:     localhost
Port:     5432
Database: trustpass
User:     postgres

Make sure the PostgreSQL server is running before attempting to connect from TrustPass.

4. Clone the Repository

Clone the TrustPass repository:

git clone https://github.com/claraharb/TrustPass.git

Move into the repository:

cd TrustPass
5. Switch to the Development Branch

TrustPass development is currently performed on:

develop

Switch to the branch:

git checkout develop

Pull the latest changes:

git pull origin develop

Verify the current branch:

git branch

The active branch should be:

* develop

6. Project Directory

After cloning, the repository should contain:

TrustPass/
│
├── doc/
│
├── trustpassBackend/
│
├── trustpassFrontend/
│
└── .gitignore

The backend and frontend are separate Node.js applications.

7. PostgreSQL Setup

TrustPass uses PostgreSQL as its relational database.

PostgreSQL must be installed and running locally.

The default development configuration is:

Host:     localhost
Port:     5432
User:     postgres
Database: trustpass

The PostgreSQL password is local to each developer's machine.

It must not be shared through Git or stored in the repository.

8. Create the TrustPass Database

Create a PostgreSQL database named:

trustpass

This can be done through pgAdmin or another PostgreSQL database management tool.

The resulting connection should be:

postgresql://postgres:<PASSWORD>@localhost:5432/trustpass

Replace <PASSWORD> with the password of the local PostgreSQL postgres user.

9. Backend Environment Variables

The backend requires a local .env file.

Create:

TrustPass/trustpassBackend/.env

Use the following structure:

PORT=5000

DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/trustpass"

JWT_SECRET="YOUR_JWT_SECRET"

Replace:

YOUR_POSTGRES_PASSWORD

with the local PostgreSQL password.

Replace:

YOUR_JWT_SECRET

with a secure secret used for signing JWT authentication tokens.

Example

A developer's local .env may look like:

PORT=5000

DATABASE_URL="postgresql://postgres:********@localhost:5432/trustpass"

JWT_SECRET="********"

The real password and JWT secret must never be committed.

10. Frontend Environment Variables

The frontend also requires a local .env file.

Create:

TrustPass/trustpassFrontend/.env

Add:

VITE_API_URL=http://localhost:5000/api/v1

This tells the frontend where the TrustPass backend API is running.

11. Install Backend Dependencies

Open a terminal and navigate to the backend:

cd TrustPass\trustpassBackend

Install dependencies:

npm install

This installs the dependencies defined in:

trustpassBackend/package.json

The backend uses packages including:

Express
CORS
dotenv
Prisma
PostgreSQL adapter
pg
bcryptjs
JSON Web Token
Zod
TypeScript
tsx
12. Install Frontend Dependencies

Open a second terminal.

Navigate to:

cd TrustPass\trustpassFrontend

Install dependencies:

npm install

The frontend dependencies are defined in:

trustpassFrontend/package.json
13. Initialize Prisma

Prisma is used as the ORM for the TrustPass PostgreSQL database.

Navigate to:

cd TrustPass\trustpassBackend

Make sure the backend .env exists before running Prisma commands.

Apply Database Migrations

Run:

npx prisma migrate dev

This applies the existing database migrations to the local PostgreSQL database.

The migration creates the TrustPass database tables defined by the Prisma schema.

Generate Prisma Client

Run:

npx prisma generate

The generated Prisma Client is placed inside:

trustpassBackend/src/generated/

This directory is generated automatically and is ignored by Git.

14. Create the Admin Account

TrustPass contains a seed script for creating the initial administrator account.

The script is located at:

trustpassBackend/prisma/seed.ts

Run:

npx tsx prisma/seed.ts

The script creates the initial admin account.

The seed uses an upsert, meaning it can safely be executed again without creating duplicate records for the same admin email.

The development admin credentials are defined inside the seed script.

15. Run the Backend

Navigate to:

cd TrustPass\trustpassBackend

Start the backend:

npm run dev

The backend runs on:

http://localhost:5000

The backend entry point is:

src/server.ts

The Express application is defined in:

src/app.ts

16. Run the Frontend

Open a second terminal.

Navigate to:

cd TrustPass\trustpassFrontend

Start the frontend:

npm run dev

Vite will display the local development URL in the terminal.

The frontend communicates with the backend using:

VITE_API_URL=http://localhost:5000/api/v1

17. Verify the Backend

With the backend running, open:

http://localhost:5000/api/v1/health

The expected response is similar to:

{
  "status": "ok",
  "service": "trustpass-backend",
  "database": "connected",
  "message": "TrustPass backend is running"
}

The health endpoint verifies both:

The backend is running.
The PostgreSQL database is reachable.
18. Verify the Database Connection

The health endpoint performs a database query:

SELECT 1

If the database connection is successful, the response contains:

"database": "connected"

If it returns:

"database": "disconnected"

check:

PostgreSQL is running.
The database trustpass exists.
The PostgreSQL username is correct.
The PostgreSQL password is correct.
Port 5432 is correct.
The DATABASE_URL in .env is correct.
19. Build the Backend

The backend should be compiled before committing major changes.

Navigate to:

TrustPass/trustpassBackend

Run:

npm run build

This runs the TypeScript compiler:

tsc

A successful build should finish without TypeScript errors.

20. Terminal Setup

During development, it is recommended to use two terminals.

Terminal 1 — Backend
cd TrustPass\trustpassBackend
npm run dev

Keep this terminal running.

Terminal 2 — Frontend
cd TrustPass\trustpassFrontend
npm run dev

Keep this terminal running as well.

The development setup is therefore:

Terminal 1
    |
    v
Backend
localhost:5000
    |
    v
PostgreSQL
localhost:5432


Terminal 2
    |
    v
Frontend
Vite development server
    |
    v
Backend API
localhost:5000
21. Environment Variables Summary
Backend

File:

trustpassBackend/.env

Variables:

Variable	Purpose
PORT	Backend server port
DATABASE_URL	PostgreSQL connection string
JWT_SECRET	Secret used to sign JWT tokens

Example structure:

PORT=5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/trustpass"
JWT_SECRET="YOUR_JWT_SECRET"
Frontend

File:

trustpassFrontend/.env

Variable:

Variable	Purpose
VITE_API_URL	Backend API base URL

Example:

VITE_API_URL=http://localhost:5000/api/v1