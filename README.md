# Springboot-RBCA-Demo

 ERP RBAC Demo
===============

1. What This App Does
---------------------
This project is a small ERP-style demo application with role-based access control.

It has two parts:
- erp-backend: a Spring Boot REST API
- erp-frontend: a React + Vite single-page application

Main business features:
- User login with JWT authentication
- Role-based access control using ADMIN and USER roles
- User and role management for admins
- Inventory item creation and viewing
- Inventory deletion for admins
- Soft-delete role history so revoked roles can still be audited

Security features:
- Passwords are stored with BCrypt
- JWTs are signed with RSA keys
- Access control is enforced on API endpoints with Spring Security
- User roles are loaded from PostgreSQL on each request instead of being trusted from token claims
- Database password is stored as a Jasypt-encrypted value in config

Default seeded admin account:
- Username: admin@local.test
- Password: password

2. Architecture Overview
------------------------
The system uses a simple client-server architecture.

Frontend:
- React 19
- Vite 8
- Single-page application
- Talks to the backend over HTTP on localhost

Backend:
- Spring Boot 3.2
- Spring Web for REST endpoints
- Spring Security with OAuth2 Resource Server support for JWT validation
- Spring Data JPA for persistence
- Flyway for schema migrations
- Jasypt for encrypted configuration properties

Database:
- PostgreSQL

High-level request flow:
1. User logs in from the React frontend
2. Backend validates credentials against app_users
3. Backend issues a JWT
4. Frontend sends the JWT as a Bearer token on later API calls
5. Backend validates the JWT signature and expiry
6. Backend loads the caller's current roles from PostgreSQL
7. Endpoint authorization rules decide whether the action is allowed

3. Project Structure
--------------------
Top-level folders:
- erp-backend: Java/Spring Boot API and database migrations
- erp-frontend: React UI

Backend packages:
- config: security and Jasypt configuration
- controller: authentication and role-management endpoints
- inventory: inventory entity, repository, and controller
- security: user entity, role entity, repositories, and JWT-to-role converter

Important backend design choices:
- AppUser stores credentials
- UserRole stores role assignments
- InventoryItem stores stock entries
- UserRole uses soft-delete with deleted_at for audit history
- Inventory uses hard delete because items are treated as mutable operational rows

4. Design Principles Used
-------------------------
This project follows a pragmatic monolith design.

Main principles:
- Separation of concerns
  Frontend, API, security, persistence, and database migration responsibilities are split clearly.

- Stateless authentication
  The backend does not keep login sessions in memory. Every request must carry a valid JWT.

- Least privilege
  API endpoints are protected with role checks so users only get access to the actions they need.

- Database-driven authorization
  Roles are loaded from PostgreSQL on every request, so admin changes take effect immediately without waiting for token refresh.

- Incremental schema evolution
  Flyway migration files define the database schema history in a controlled, repeatable way.

- Explicit auditability
  Role removals are soft-deleted so the app can show role history instead of losing that data.

- Simple over clever
  This is intentionally a single deployable backend plus a single frontend rather than a microservice system.

5. Prerequisites
----------------
You will need the following installed on Windows:

Required:
- Java 21
- Node.js 20 or newer
- npm
- PostgreSQL

Recommended:
- Git
- WSL 2
- Podman or Podman Desktop

Notes:
- The backend currently connects to PostgreSQL at [::1]:5433
- The frontend expects the backend at http://localhost:8080
- The backend allows the frontend dev server at http://localhost:5173

6. How To Install WSL 2 On Windows
----------------------------------
WSL is optional for this app, but useful if you want a Linux-like local dev environment or if you want to use Podman more comfortably on Windows.

Fastest method in an elevated PowerShell:
- Run: wsl --install
- Restart Windows if prompted

Then verify installation:
- Run: wsl --status

If needed, set WSL 2 as default:
- Run: wsl --set-default-version 2

To install a Linux distribution manually:
- Open Microsoft Store
- Install Ubuntu
- Launch Ubuntu and complete the first-time username/password setup

Useful WSL commands:
- wsl --status
- wsl -l -v
- wsl --update

7. How To Install Podman On Windows
-----------------------------------
Podman is optional for this app. It is useful if you want to run PostgreSQL in a container instead of installing PostgreSQL directly on Windows.

Option A: Install Podman Desktop
- Download Podman Desktop from the official Podman Desktop site
- Install it
- Enable its WSL-based machine setup when prompted
- Start Podman Desktop and ensure the Podman machine is running

Option B: Install Podman from winget
In PowerShell:
- winget install RedHat.Podman-Desktop

After installation, verify it:
- podman --version

If needed, initialize/start the Podman machine:
- podman machine init
- podman machine start

Check status:
- podman info

8. PostgreSQL Setup
-------------------
You have two main options.

Option A: Install PostgreSQL directly on Windows
- Install PostgreSQL
- Create database: erp_demo_db
- Create user: erp_app_user
- Ensure PostgreSQL is listening on port 5433 and reachable on localhost
- Make sure the password matches the encrypted value already configured in the backend

Option B: Run PostgreSQL with Podman
Example command:
- podman run -d --name erp-postgres -e POSTGRES_DB=erp_demo_db -e POSTGRES_USER=erp_app_user -e POSTGRES_PASSWORD=your_password_here -p 5433:5432 postgres:16

Important:
- If you use your own password, you must update the backend datasource password configuration to match it
- This project currently stores the DB password as a Jasypt-encrypted value in application.yml

9. Backend Configuration
------------------------
Current backend database config:
- URL: jdbc:postgresql://[::1]:5433/erp_demo_db
- Username: erp_app_user
- Password: stored as ENC(...) in application.yml

Relevant config files:
- bootstrap.yml: enables Jasypt decryption settings
- application.yml: datasource and Flyway config
- JasyptConfig.java: defines the encryptor bean used to decrypt ENC(...) values

Important Flyway rule:
- Do not edit old applied migration files after they have been run against a database
- Changing comments or whitespace changes Flyway checksums and can block startup

10. How To Run The Backend
--------------------------
Open PowerShell in:
- C:\Users\jorda\Documents\springboot-workspace\springboot-rbca-demo\erp-backend

Compile:
- .\mvnw.cmd clean compile

Run:
- .\mvnw.cmd spring-boot:run

Expected backend URL:
- http://localhost:8080

11. How To Run The Frontend
---------------------------
Open PowerShell in:
- C:\Users\jorda\Documents\springboot-workspace\springboot-rbca-demo\erp-frontend

Install dependencies:
- npm install

Run dev server:
- npm run dev

Build production assets:
- npm run build

Expected frontend URL:
- http://localhost:5173

12. Main API Areas
------------------
Authentication:
- POST /auth/mock-login
- GET /auth/me
- GET /auth/users

Role management:
- GET /api/roles
- GET /api/roles/history
- POST /api/roles
- DELETE /api/roles/{id}

Inventory:
- GET /api/inventory
- POST /api/inventory
- DELETE /api/inventory/{id}

13. Security Model
------------------
Login flow:
- Credentials are checked against app_users
- If the stored password is BCrypt, BCrypt validation is used
- If the stored password is legacy plain text, the app accepts it once and upgrades it to BCrypt

Authorization flow:
- Spring Security validates the JWT
- PostgresConverter looks up the caller's current roles in PostgreSQL
- Endpoint annotations such as hasRole('ADMIN') decide access

Why roles are not trusted from the JWT:
- If roles were embedded in the token, old tokens would keep stale permissions
- By loading roles from the database on each request, access changes are immediate

14. Database Evolution
----------------------
Flyway migrations currently cover:
- V1: user_roles table
- V2: app_users table
- V3: inventory_items table
- V4: audit columns for role history

15. Operational Notes
---------------------
Known local-development warnings you may see:
- Flyway warning that PostgreSQL 18 is newer than Flyway's tested support range
- Spring warning about open-in-view being enabled by default
- Tomcat native-access warning from the JVM on Windows

These warnings do not necessarily stop the app from running.

16. Summary
-----------
This app is a secure ERP-style demo that combines:
- a React frontend
- a Spring Boot backend
- PostgreSQL persistence
- JWT authentication
- database-backed RBAC
- Flyway-managed schema evolution

It is designed as a small, maintainable monolith with clear boundaries, practical security defaults, and enough structure to demonstrate real-world authentication, authorization, and inventory management workflows.
