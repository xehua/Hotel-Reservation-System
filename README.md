# LUMA Hotel

A hotel booking website with a React frontend and a Node.js + MySQL backend.
Guests can check room availability and reserve a room without creating an
account. Customers who stay often can create an account so their details are
filled in for them on their next booking.

---

## What's in the project

```
LUMA-Hotel-Project/
├── backend/                Node.js + Express API
│   ├── server.js           All API routes
│   ├── .env                Your database password (NOT committed)
│   └── package.json
├── database/               Database setup files
│   ├── schema.sql          Run this first
│   └── sessions-migration.sql   Allows sign-in
│   └── admin-migration.sql 
└── frontend/               React + Vite website
    ├── main.jsx            Entry point
    ├── AdminDashboard.jsx  Admin dashboard and data tables
    ├── AdminDashboard.css  Administrator dashboard styling
    ├── App.jsx             Homepage + page routing
    ├── App.css             All styling
    ├── BookingPage.jsx     Booking page shell
    ├── BookingForm.jsx     Availability search + reservation
    ├── CreateAccount.jsx   Account registration
    ├── SignIn.jsx          Customer sign-in
    └── package.json
```

---

## Requirements

- **Node.js** 20 or newer - https://nodejs.org
- **MySQL** 8 or newer - https://dev.mysql.com/downloads/

Check what you have:

```bash
node --version
mysql --version
```

---

## Setup

### 1. Create the database

Run this from the **project root** (the folder holding `backend`, `database`
and `frontend`).

```bash
mysql -u root -p < database/schema.sql
```

Enter your MySQL password when prompted. This creates the
`hotel_reservation` database, all four tables, 50 rooms, and a few sample
customers.

Then add the sign-in table:

```bash
mysql -u root -p hotel_reservation < database/sessions-migration.sql
```

Run this migration after schema.sql and sessions-migration.sql:

```bash
mysql -u root -p hotel_reservation < database/admin-migration.sql
```

This migration adds the is_admin column to the Accounts table. 
It allows the application to distinguish administrators from regular customers.
It also creates or promotes the administrator account.

**Windows note.** PowerShell does not support the `<` symbol, so those two
commands fail there with *"The '<' operator is reserved for future use."*
Use one of these instead:

```powershell
# PowerShell
Get-Content database/schema.sql -Raw | mysql -u root -p
```

```cmd
:: Command Prompt
mysql -u root -p < database\schema.sql
```

Or open **MySQL Workbench**, connect to your server, then *File → Open SQL
Script*, pick the file, and click the lightning bolt. Repeat for
`sessions-migration.sql` & `admin-migration.sql`.

**Verify it worked.** The script prints a check at the end. If you want to
confirm by hand:

```sql
USE hotel_reservation;
SHOW TABLES;                 -- should list 5 tables
SELECT COUNT(*) FROM Rooms;  -- should be 50
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hotel_reservation';   -- every row must say InnoDB
```

Every table must be **InnoDB**. The booking route uses transactions and row
locking, which only InnoDB supports.

### 2. Create the backend `.env` file

In the `backend` folder, create a file named `.env`:

```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=hotel_reservation
DB_PORT=3306
CLIENT_ORIGIN=http://localhost:5173
```

Rules that matter, because they are easy to get wrong:

- **No spaces after the `=`.** `CLIENT_ORIGIN= http://...` becomes a value
  with a leading space and the browser rejects it.
- **No quotes around values.** dotenv does not strip them, so
  `DB_PASSWORD="1234"` sends the quote characters to MySQL.
- **Make sure the file is really named `.env`.** Windows hides file
  extensions, so saving in Notepad can produce `.env.txt`. Turn on
  *View → File name extensions* in File Explorer to check.
- **`CLIENT_ORIGIN` must match the port the frontend runs on.** The browser
  blocks every API call with a CORS error if it does not.

`.env` is gitignored, so every teammate creates their own. Never commit it.

### 3. Install dependencies

Two folders, two installs:

```bash
cd backend
npm install

cd frontend
npm install
```

### 4. Start the backend

```bash
cd backend
npm start
```

You should see:

```
LUMA Hotel backend running at http://localhost:5001
```

Verify it in a browser:

- http://localhost:5001/api/health - should say the backend is running
- http://localhost:5001/api/db-health - should say the MySQL connection works

If `/api/health` works but `/api/db-health` fails, the problem is step 1 or
step 2 - check the password in `.env` and confirm the database exists.

**Leave this terminal running.** The backend must stay up for the site to
work.

### 5. Start the frontend

**Open a second terminal.** The backend keeps running in the first one.

```bash
cd frontend
npm run dev
```

Vite prints the address to open:

```
  ➜  Local:   http://localhost:5173/
```

Open that address. If it shows a port other than 5173, close whatever is
using 5173 and restart - the backend only allows 5173 by default.

---

## API routes

| Method | Route | What it does |
|---|---|---|
| GET | `/api/health` | Is the server up |
| GET | `/api/db-health` | Can it reach MySQL |
| POST | `/api/accounts` | Register an account |
| POST | `/api/login` | Sign in |
| POST | `/api/logout` | Sign out |
| GET | `/api/me` | Who is signed in |
| GET | `/api/rooms` | Every room |
| GET | `/api/availability?check_in=&check_out=` | Rooms free for those dates |
| POST | `/api/reservations` | Book a room |
| GET | `/api/my-reservations` | Bookings for the signed-in account |
| GET | `/api/admin/accounts` | Returns registered customer accounts info |
| GET | `/api/admin/guests` | Returns all guest records (account or not) |
| GET | `/api/admin/reservations` | Returns all hotel reservations |

Security: Customers cannot access administrator data simply by visiting /admin. 
The backend independently checks administrator permissions and returns an error 
if the account is not authorized.

Dates are `YYYY-MM-DD`. Availability is a half-open range: a booking from the
20th to the 23rd frees the room again on the 23rd.

---

## Booking without an account

Booking works signed out. The reservation form collects the guest's name and
email directly, and the booking is saved with no account attached. This is
the default path and it must keep working.

Signing in is optional. When a customer is signed in, the booking form is
pre-filled from their account and the reservation is linked to it.

The database supports both with one nullable column, `Guests.account_id`:

- `NULL` - a one-time guest
- an account ID - a signed-in customer

---

## How to try it

1. Open http://localhost:5173/booking - the bar should say *"Booking as a
   guest."*
2. Search dates, pick a room, and book with your own name and email. You get
   a confirmation number.
3. Go to http://localhost:5173/create-account and register.
4. Go to http://localhost:5173/sign-in and sign in with those details. You
   should see a green confirmation message.
5. Back at /booking, the bar now says *"Signed in as [your name]"* and the
   booking form is already filled in. Book a room without typing anything.

---

## Troubleshooting

**`ERROR 1046: No database selected`** - you ran the table statements before
creating the database. Run the whole `schema.sql` from the top.

**`ERROR 1049: Unknown database 'hotel_reservation'`** - step 1 didn't run.
Run `schema.sql` first.

**`ERROR 1045: Access denied`** - wrong password in the `.env` file, or the
wrong MySQL user.

**`ERROR 1062: Duplicate entry`** - you ran `schema.sql` on a database that
already has data. Harmless; the tables and rooms are already there. Only drop
the database and re-run if you want to start over:

```sql
DROP DATABASE IF EXISTS hotel_reservation;
```

**`'mysql' is not recognized`** - MySQL is not on your PATH. Either use the
full path:

```cmd
"C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe" -u root -p
```

or use MySQL Workbench instead. The version folder differs per machine - run
`dir "C:\Program Files\MySQL" /b` to find yours.

**`'npm start'` says it cannot find package.json** - you are in the wrong
folder. `npm start` must run inside `backend/`, and `npm run dev` inside
`frontend/`. Run `dir package.json` to check where you are.

**`ECONNREFUSED` to port 3306** - MySQL isn't running. Start it:

```bash
# macOS
brew services start mysql

# Windows - open Services and start "MySQL80"
# Linux
sudo systemctl start mysql
```

**White blank page with no content** - React crashed. Press F12, open the
Console tab, and read the red error. A common one is a version mismatch:

```
Incompatible React versions: react and react-dom must have the exact same version
```

Fix it with `npm install react@<version> react-dom@<version>` using the same
number for both.

**"Could not connect to the server"** - the backend is not running, or was
not restarted after you edited `.env` (it is only read at startup). Check the
first terminal.

**CORS error mentioning `Access-Control-Allow-Origin`** - `CLIENT_ORIGIN` in
`.env` does not match the address shown in your browser, or the value has
stray characters in it. It should read exactly
`CLIENT_ORIGIN=http://localhost:5173`. Restart the backend after fixing it.

**"No rooms available for those dates"** - either every room of that type is
booked, or the database is empty. Check `SELECT COUNT(*) FROM Rooms;`.

**`Cannot GET /`** - not an error. Every route lives under `/api/`, so the
root address has nothing to show.

---

## Notes

- Room photos are loaded from Unsplash at runtime, so they need an internet
  connection.
- Passwords are hashed with bcrypt before storage and never saved in plain
  text.
- All SQL uses parameterised queries, so form input can't be injected into a
  query.
- Sign-in uses a session token stored in a cookie. Only a SHA-256 hash of the
  token is kept in the database, so the stored value cannot be used to sign
  in.
- Two terminals, two servers: the backend on 5001 and the frontend on 5173.
  Both must be running at the same time.
