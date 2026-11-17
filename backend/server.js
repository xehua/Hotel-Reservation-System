/* ==========================================
   LUMA HOTEL - BACKEND SERVER

   This file connects our React website to
   the MySQL database.

   It handles customer accounts, sign-in,
   room searches, availability, and hotel
   reservations.

   ----------------------------------------------------------
   THE TWO KINDS OF CUSTOMER

   We support two types of visitor on purpose:

   1. A ONE-TIME GUEST books a room and never
      signs in. Their name and email are typed
      into the booking form and saved as a
      guest record with account_id = NULL.

   2. A FREQUENT VISITOR creates an account.
      When they are signed in, the booking form
      is pre-filled and the guest record is
      linked to their account.

   Guests.account_id is the single nullable
   column that lets both paths share one
   booking system.
========================================== */

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/* Loads the database settings from .env
   so we don't put passwords directly in code. */

dotenv.config();

const app = express();
const PORT = 5001;

/* Allows our React frontend to communicate
   with this backend server.

   Falls back to Vite's default port so a
   teammate can clone the project and run it
   without editing anything. */

const CLIENT_ORIGIN =
    process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
    cors({
        origin: CLIENT_ORIGIN,
        credentials: true
    })
);

/* Allows the backend to read JSON data
   sent from the website's forms. */

app.use(express.json({ limit: "16kb" }));


/* ==========================================
   MYSQL DATABASE CONNECTION

   Creates a pool of connections so different
   guests can use the website at the same time.
========================================== */

const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "hotel_reservation",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000,
    dateStrings: true
});


/* ==========================================
   INPUT VALIDATION

   These functions help us check information
   before saving anything to the database.
========================================== */

/* Custom error used when a guest enters
   missing or incorrect information. */

class InputError extends Error {
    constructor(message) {
        super(message);
        this.status = 400;
    }
}

/* Removes extra spaces from text fields. */

function cleanText(value) {
    return typeof value === "string"
        ? value.trim()
        : "";
}

/* Makes emails lowercase so different
   capitalization doesn't create duplicates. */

function cleanEmail(value) {
    return cleanText(value).toLowerCase();
}

/* Checks whether a value is a real date
   written in YYYY-MM-DD format. */

function parseDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        throw new InputError(
            "Please enter a valid date."
        );
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        throw new InputError(
            "Please enter a valid date."
        );
    }

    return date;
}

/* Checks the stay dates and calculates
   how many nights the guest selected. */

function getStayNights(checkIn, checkOut) {
    const start = parseDate(checkIn);
    const end = parseDate(checkOut);

    const nights = Math.round(
        (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (nights < 1) {
        throw new InputError(
            "Check-out must be after check-in."
        );
    }

    if (nights > 365) {
        throw new InputError(
            "A reservation cannot exceed 365 nights."
        );
    }

    return nights;
}

/* Calculates the total price using cents
   to avoid problems with decimal rounding. */

function calculateTotal(price, nights) {
    const cents = Math.round(Number(price) * 100);

    if (!Number.isSafeInteger(cents) || cents < 0) {
        throw new Error("Invalid room price.");
    }

    return Number(
        ((cents * nights) / 100).toFixed(2)
    );
}

/* Checks that a room ID is a positive number. */

function validateRoomId(value) {
    const roomId = Number(value);

    if (!Number.isSafeInteger(roomId) || roomId < 1) {
        throw new InputError(
            "Please select a valid room."
        );
    }

    return roomId;
}

/* Wraps async routes so errors are passed
   to our main error handler. */

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next))
            .catch(next);
    };
}

/* Only lets admins through.

   401 if nobody is signed in, 403 if the account
   is not an admin. Checked on the SERVER, not in
   React - anyone can type /admin in the address
   bar, so hiding the page protects nothing. */
async function requireAdmin(req, res, next) {
    try {
        const account = await getCurrentAccount(req);

        if (!account) {
            return res.status(401).json({
                error: "Please sign in."
            });
        }

        if (!account.is_admin) {
            return res.status(403).json({
                error: "Admins only."
            });
        }

        next();
    } catch (error) {
        next(error);
    }
}

/* ==========================================
   SESSIONS

   A session is how the server remembers that
   someone is signed in.

   We create a random token when they log in and
   store it in a cookie in their browser. On each
   request, the browser sends the cookie back and
   we look the token up to find out who they are.

   Only a SHA-256 hash of the token is kept in
   MySQL, so somebody reading the database
   cannot use the stored values to sign in.

   (This is a simple teaching version. A real
   hotel would also use HTTPS, rotate tokens,
   and add expiry cleanup - see the note on
   the sessions table below.)
========================================== */

const SESSION_COOKIE = "luma_session";

/* How long a sign-in lasts: 7 days. */

const SESSION_DAYS = 7;

/* Turns a token into the hash we store.
   SHA-256 is fine here because the token is
   already long and random - unlike a password,
   it doesn't need slow hashing. */

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

/* Reads the session cookie from the request.

   We parse the cookie header by hand so the
   project doesn't need another dependency. */

function readSessionToken(req) {
    const header = req.headers.cookie;

    if (!header) {
        return null;
    }

    for (const part of header.split(";")) {
        const [name, ...rest] = part.trim().split("=");

        if (name === SESSION_COOKIE) {
            return decodeURIComponent(rest.join("="));
        }
    }

    return null;
}

/* Sets the session cookie on the response.

   httpOnly  - JavaScript in the browser cannot
               read it, so an XSS bug can't steal it.
   sameSite  - "lax" stops other websites from
               making signed-in requests for the user.
   secure    - only sent over HTTPS. Off on
               localhost because we use http there. */

function setSessionCookie(res, token) {
    const maxAge = SESSION_DAYS * 24 * 60 * 60;

    const parts = [
        `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
        "Path=/",
        `Max-Age=${maxAge}`,
        "HttpOnly",
        "SameSite=Lax"
    ];

    if (process.env.NODE_ENV === "production") {
        parts.push("Secure");
    }

    res.setHeader("Set-Cookie", parts.join("; "));
}

/* Clears the cookie when someone signs out. */

function clearSessionCookie(res) {
    res.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
}

/* Creates a new session for an account and
   returns the token to put in the cookie. */

async function createSession(accountId) {
    const token = crypto.randomBytes(32).toString("hex");

    await pool.execute(
        `INSERT INTO Sessions (account_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [accountId, hashToken(token), SESSION_DAYS]
    );

    return token;
}

/* Finds the signed-in account for a request.

   Returns the account row, or null when nobody
   is signed in (no cookie, unknown token, or an
   expired session).

   Every route that needs to know "who is this?"
   calls this function. */

async function getCurrentAccount(req) {
    const token = readSessionToken(req);

    if (!token) {
        return null;
    }

    const [rows] = await pool.execute(
        `SELECT a.account_id,
                a.first_name,
                a.last_name,
                a.phone,
                a.email,
                a.is_admin
         FROM Sessions s
         JOIN Accounts a ON a.account_id = s.account_id
         WHERE s.token_hash = ?
           AND s.expires_at > NOW()
         LIMIT 1`,
        [hashToken(token)]
    );

    return rows.length > 0 ? rows[0] : null;
}

/* Sends the signed-in account to the frontend
   in a shape the forms can use directly. */

function publicAccount(account) {
    return {
        account_id: account.account_id,
        first_name: account.first_name,
        last_name: account.last_name,
        phone: account.phone,
        email: account.email,
        is_admin: Boolean(account.is_admin)
    };
}

/* ==========================================
   TEST BACKEND CONNECTION

   This route helps us confirm that the
   Node.js server is running correctly.
========================================== */

app.get("/api/health", (req, res) => {
    res.json({
        message: "LUMA Hotel backend is running!"
    });
});


/* ==========================================
   TEST MYSQL CONNECTION

   This route checks whether the backend
   can actually communicate with MySQL.
========================================== */

app.get(
    "/api/db-health",
    asyncRoute(async (req, res) => {
        await pool.query("SELECT 1");

        res.json({
            message: "MySQL connection successful!"
        });
    })
);


/* ==========================================
   CREATE CUSTOMER ACCOUNT

   This route receives registration details,
   checks for duplicates, hashes the password,
   and saves the account in MySQL.
========================================== */

app.post(
    "/api/accounts",
    asyncRoute(async (req, res) => {

        /* Gets the information entered on
           the Create Account page. */

        const firstName = cleanText(req.body.first_name);
        const lastName = cleanText(req.body.last_name);
        const phone = cleanText(req.body.phone);
        const email = cleanEmail(req.body.email);
        const password = req.body.password;
        const confirmPassword = req.body.confirm_password;

        /* Makes sure the required fields
           are not empty. */

        if (
            !firstName ||
            !lastName ||
            !email ||
            typeof password !== "string"
        ) {
            throw new InputError(
                "Please complete all required fields."
            );
        }

        /* Checks the length of the customer's name. */

        if (
            firstName.length > 100 ||
            lastName.length > 100
        ) {
            throw new InputError(
                "The name entered is too long."
            );
        }

        if (phone.length > 30) {
            throw new InputError(
                "The phone number is too long."
            );
        }

        /* Checks that the email has a valid format. */

        if (
            email.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            throw new InputError(
                "Please enter a valid email address."
            );
        }

        /* Requires a reasonably strong password. */

        if (password.length < 8) {
            throw new InputError(
                "Your password must have at least 8 characters."
            );
        }

        if (Buffer.byteLength(password, "utf8") > 72) {
            throw new InputError(
                "Your password is too long."
            );
        }

        /* If the frontend sends a confirmation
           password, it must match. */

        if (
            confirmPassword !== undefined &&
            password !== confirmPassword
        ) {
            throw new InputError(
                "Passwords do not match."
            );
        }

        /* Checks whether the email already
           exists before creating an account. */

        const [existingAccounts] = await pool.execute(
            `SELECT account_id
             FROM Accounts
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        if (existingAccounts.length > 0) {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        /* Hashes the password so the real
           password is never stored in MySQL. */

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        /* Saves the new account.
           The UNIQUE email rule in MySQL
           also protects against duplicates. */

        let result;

        try {
            [result] = await pool.execute(
                `INSERT INTO Accounts
                 (first_name, last_name, phone, email, password_hash)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    firstName,
                    lastName,
                    phone || null,
                    email,
                    passwordHash
                ]
            );
        } catch (error) {

            /* MySQL error 1062 means the
               email is already registered. */

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    error: "An account with this email already exists."
                });
            }

            throw error;
        }

        /* Sends a success message back
           to the Create Account page. */

        res.status(201).json({
            message: "Account created successfully!",
            account_id: result.insertId
        });
    })
);

/* ==========================================
   SIGN IN

   Checks the email and password against the
   stored hash, then starts a session.

   The same message is returned whether the
   email is unknown or the password is wrong.
   That stops somebody using this form to find
   out which emails have accounts.
========================================== */

app.post(
    "/api/login",
    asyncRoute(async (req, res) => {

        const email = cleanEmail(req.body.email);
        const password = req.body.password;

        if (!email || typeof password !== "string") {
            throw new InputError(
                "Please enter your email and password."
            );
        }

        /* Looks for the account by email. */

        const [accounts] = await pool.execute(
            `SELECT account_id,
                    first_name,
                    last_name,
                    phone,
                    email,
                    password_hash,
                    is_admin
             FROM Accounts
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        /* One shared message for both failures. */

        const WRONG_DETAILS = {
            error: "That email and password do not match."
        };

        if (accounts.length === 0) {
            return res.status(401).json(WRONG_DETAILS);
        }

        const account = accounts[0];

        /* Compares the typed password with the
           hash saved when the account was made. */

        const passwordMatches = await bcrypt.compare(
            password,
            account.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json(WRONG_DETAILS);
        }

        /* Starts the session and sends the
           cookie back with the response. */

        const token = await createSession(account.account_id);

        setSessionCookie(res, token);

        res.json({
            message: "Signed in successfully!",
            account: publicAccount(account)
        });
    })
);


/* ==========================================
   SIGN OUT

   Deletes the session from MySQL and clears
   the cookie. Safe to call when not signed in.
========================================== */

app.post(
    "/api/logout",
    asyncRoute(async (req, res) => {
        const token = readSessionToken(req);

        if (token) {
            await pool.execute(
                `DELETE FROM Sessions WHERE token_hash = ?`,
                [hashToken(token)]
            );
        }

        clearSessionCookie(res);

        res.json({
            message: "Signed out."
        });
    })
);


/* ==========================================
   WHO IS SIGNED IN

   The booking page calls this on load so it
   can pre-fill the form for account holders.

   Returns account: null when nobody is signed
   in - that is a normal answer, not an error,
   because most visitors book without an account.
========================================== */

app.get(
    "/api/me",
    asyncRoute(async (req, res) => {
        const account = await getCurrentAccount(req);

        res.json({
            account: account ? publicAccount(account) : null
        });
    })
);


/* ==========================================
   VIEW HOTEL ROOMS

   Gets all rooms from MySQL, including
   their room numbers, types, and prices.
========================================== */

app.get(
    "/api/rooms",
    asyncRoute(async (req, res) => {
        const [rooms] = await pool.query(
            `SELECT
                room_id,
                room_number,
                room_type,
                price,
                status
             FROM Rooms
             ORDER BY price, room_number`
        );

        res.json({ rooms });
    })
);


/* ==========================================
   SEARCH AVAILABLE ROOMS

   Checks which rooms are free during
   the dates selected by the guest.

   A room is unavailable if it already has
   a non-cancelled overlapping reservation.
========================================== */

app.get(
    "/api/availability",
    asyncRoute(async (req, res) => {
        const checkIn = req.query.check_in;
        const checkOut = req.query.check_out;

        const nights = getStayNights(
            checkIn,
            checkOut
        );

        /* Finds rooms marked Available that
           have no conflicting reservations. */

        const [rooms] = await pool.execute(
            `SELECT
                r.room_id,
                r.room_number,
                r.room_type,
                r.price,
                r.status
             FROM Rooms r
             WHERE r.status = 'Available'
               AND NOT EXISTS (
                   SELECT 1
                   FROM Reservations b
                   WHERE b.room_id = r.room_id
                     AND b.status <> 'Cancelled'
                     AND b.check_in < ?
                     AND b.check_out > ?
               )
             ORDER BY r.price, r.room_number`,
            [checkOut, checkIn]
        );

        /* Adds the total cost for the
           selected number of nights. */

        const availableRooms = rooms.map((room) => ({
            ...room,
            total_price: calculateTotal(
                room.price,
                nights
            )
        }));

        res.json({
            check_in: checkIn,
            check_out: checkOut,
            nights,
            rooms: availableRooms
        });
    })
);


/* ==========================================
   CREATE A HOTEL RESERVATION

   Saves a guest and reservation in MySQL.

   A transaction and room lock help prevent
   two people from booking the same room
   for overlapping dates.

   This route works signed out AND signed in:

   - Signed out: the name and email typed into
     the form are used, and account_id is NULL.
   - Signed in: the details are trusted from
     the account, and account_id is set, so the
     booking shows up under "My Reservations".
========================================== */

app.post(
    "/api/reservations",
    asyncRoute(async (req, res) => {

        /* Finds out whether anyone is signed in
           before reading the form.

           This is the only place the two booking
           paths differ. */

        const account = await getCurrentAccount(req);

        /* Gets the guest information and
           room selection from the website.

           When the guest is signed in we take the
           name and email from their ACCOUNT, not
           from the form. That way a typo in the
           form cannot save a wrong email against
           someone else's account. */

        const firstName = account
            ? account.first_name
            : cleanText(req.body.first_name);

        const lastName = account
            ? account.last_name
            : cleanText(req.body.last_name);

        const email = account
            ? account.email
            : cleanEmail(req.body.email);

        /* The phone number is optional, so a
           signed-in guest may still type one. */

        const phone = cleanText(req.body.phone);

        const roomId = validateRoomId(req.body.room_id);

        const checkIn = req.body.check_in;
        const checkOut = req.body.check_out;

        /* Checks the required guest information. */

        if (
            !firstName ||
            !lastName ||
            !email
        ) {
            throw new InputError(
                "Please enter your name and email."
            );
        }

        if (
            firstName.length > 100 ||
            lastName.length > 100 ||
            email.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            throw new InputError(
                "Please enter valid guest information."
            );
        }

        const nights = getStayNights(
            checkIn,
            checkOut
        );

        /* Gets a database connection so all
           reservation steps use one transaction. */

        const connection = await pool.getConnection();

        let transactionStarted = false;

        try {

            /* Checks that our tables support
               transactions and row locking. */

            const [tableInfo] = await connection.query(
                `SELECT TABLE_NAME, ENGINE
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME IN ('Rooms', 'Guests', 'Reservations')`
            );

            if (
                tableInfo.length !== 3 ||
                tableInfo.some(
                    (table) =>
                        table.ENGINE.toUpperCase() !== "INNODB"
                )
            ) {
                throw new Error(
                    "Hotel tables must use InnoDB."
                );
            }

            /* Starts the transaction. */

            await connection.beginTransaction();
            transactionStarted = true;

            /* Locks the selected room while
               checking and saving the booking.

               FOR UPDATE means a second guest
               trying to book this same room waits
               here until we finish. */

            const [selectedRooms] = await connection.execute(
                `SELECT
                    room_id,
                    room_number,
                    room_type,
                    price,
                    status
                 FROM Rooms
                 WHERE room_id = ?
                 FOR UPDATE`,
                [roomId]
            );

            if (selectedRooms.length === 0) {
                throw new InputError(
                    "The selected room does not exist."
                );
            }

            const room = selectedRooms[0];

            if (room.status !== "Available") {
                return await rollbackAndRespond(
                    connection,
                    res,
                    409,
                    "This room is currently unavailable."
                );
            }

            /* Checks for reservations that overlap
               the dates the guest selected.

               The two date tests are the standard
               way to find overlapping stays: an
               existing booking clashes if it starts
               before our check-out AND ends after
               our check-in. */

            const [conflicts] = await connection.execute(
                `SELECT reservation_id
                 FROM Reservations
                 WHERE room_id = ?
                   AND status <> 'Cancelled'
                   AND check_in < ?
                   AND check_out > ?
                 LIMIT 1`,
                [roomId, checkOut, checkIn]
            );

            if (conflicts.length > 0) {
                return await rollbackAndRespond(
                    connection,
                    res,
                    409,
                    "This room is already booked for those dates."
                );
            }

            /* Calculates the reservation price. */

            const totalPrice = calculateTotal(
                room.price,
                nights
            );

            /* Saves the guest information.

               account_id is the account's ID for a
               signed-in guest, or NULL for a
               one-time guest. */

            const [guestResult] = await connection.execute(
                `INSERT INTO Guests
                 (first_name, last_name, email, phone, account_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    firstName,
                    lastName,
                    email,
                    phone || null,
                    account ? account.account_id : null
                ]
            );

            /* Saves the reservation using the
               guest ID and selected room ID. */

            const [reservationResult] =
                await connection.execute(
                    `INSERT INTO Reservations
                     (guest_id, room_id, check_in, check_out,
                      total_price, status)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        guestResult.insertId,
                        roomId,
                        checkIn,
                        checkOut,
                        totalPrice,
                        "Confirmed"
                    ]
                );

            /* Saves both records together. */

            await connection.commit();
            transactionStarted = false;

            /* Sends the reservation details
               back to the booking page. */

            res.status(201).json({
                message: "Reservation confirmed!",
                reservation_id: reservationResult.insertId,
                room_id: roomId,
                room_number: room.room_number,
                room_type: room.room_type,
                check_in: checkIn,
                check_out: checkOut,
                nights,
                total_price: totalPrice,
                signed_in: Boolean(account)
            });

        } catch (error) {

            /* If something goes wrong, undo
               any unfinished database changes. */

            if (transactionStarted) {
                await connection.rollback();
            }

            throw error;

        } finally {

            /* Releases the connection so another
               guest can use it afterward. */

            connection.release();
        }
    })
);


/* ==========================================
   MY RESERVATIONS

   Lists the bookings that belong to the
   signed-in account.

   Guests join through account_id, which is
   NULL for one-time bookings - so a signed-out
   visitor asking here gets a 401, not an empty
   list pretending they have no bookings.
========================================== */

app.get(
    "/api/my-reservations",
    asyncRoute(async (req, res) => {
        const account = await getCurrentAccount(req);

        if (!account) {
            return res.status(401).json({
                error: "Please sign in to see your reservations."
            });
        }

        const [reservations] = await pool.execute(
            `SELECT
                b.reservation_id,
                b.check_in,
                b.check_out,
                b.total_price,
                b.status,
                r.room_number,
                r.room_type,
                r.price AS price_per_night
             FROM Reservations b
             JOIN Guests g ON g.guest_id = b.guest_id
             JOIN Rooms r ON r.room_id = b.room_id
             WHERE g.account_id = ?
             ORDER BY b.check_in DESC`,
            [account.account_id]
        );

        res.json({ reservations });
    })
);


/* Sends an error response after undoing
   an unsuccessful reservation transaction. */

async function rollbackAndRespond(
    connection,
    res,
    status,
    message
) {
    await connection.rollback();

    return res.status(status).json({
        error: message
    });
}

/* ==========================================
   ADMIN - ALL ACCOUNTS

   Every registered account.
   password_hash is deliberately NOT selected,
   so the hash never reaches a browser.
========================================== */

app.get(
    "/api/admin/accounts",
    requireAdmin,
    asyncRoute(async (req, res) => {
        const [accounts] = await pool.query(
            `SELECT account_id,
                    first_name,
                    last_name,
                    phone,
                    email,
                    is_admin,
                    created_at
             FROM Accounts
             ORDER BY created_at DESC`
        );

        res.json({ accounts });
    })
);


/* ==========================================
   ADMIN - ALL GUESTS
========================================== */

app.get(
    "/api/admin/guests",
    requireAdmin,
    asyncRoute(async (req, res) => {
        const [guests] = await pool.query(
            `SELECT g.guest_id,
                    g.first_name,
                    g.last_name,
                    g.email,
                    g.phone,
                    g.account_id,
                    COUNT(b.reservation_id) AS booking_count
             FROM Guests g
             LEFT JOIN Reservations b ON b.guest_id = g.guest_id
             GROUP BY g.guest_id,
                      g.first_name,
                      g.last_name,
                      g.email,
                      g.phone,
                      g.account_id
             ORDER BY g.guest_id DESC`
        );

        res.json({ guests });
    })
);

/* ==========================================
   ADMIN - ALL RESERVATIONS

   DATEDIFF gives the number of nights, so the
   frontend does not have to work it out.
========================================== */

app.get(
    "/api/admin/reservations",
    requireAdmin,
    asyncRoute(async (req, res) => {
        const [reservations] = await pool.query(
            `SELECT b.reservation_id,
                    b.check_in,
                    b.check_out,
                    DATEDIFF(b.check_out, b.check_in) AS nights,
                    b.total_price,
                    b.status,
                    r.room_number,
                    r.room_type,
                    g.first_name,
                    g.last_name,
                    g.email,
                    g.account_id
             FROM Reservations b
             JOIN Guests g ON g.guest_id = b.guest_id
             JOIN Rooms r ON r.room_id = b.room_id
             ORDER BY b.check_in DESC`
        );

        res.json({ reservations });
    })
);

/* ==========================================
   ERROR HANDLING

   This section sends helpful messages when
   information is invalid or MySQL has a problem.
========================================== */

app.use((error, req, res, next) => {

    /* Handles incorrect JSON sent by the frontend. */

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "Invalid request data."
        });
    }

    /* Handles requests that are too large. */

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            error: "Request data is too large."
        });
    }

    /* Handles missing or incorrect form information. */

    if (error instanceof InputError) {
        return res.status(error.status).json({
            error: error.message
        });
    }

    /* Logs database errors in the terminal
       without exposing database details to guests. */

    console.error(
        "Backend error:",
        error.code || error.message
    );

    /* Sends a general error message
       if the database request fails. */

    res.status(503).json({
        error: "The hotel service is temporarily unavailable. Please try again."
    });
});


/* ==========================================
   START THE SERVER

   Runs our backend on port 5001.
   The React frontend runs separately on 5173.
========================================== */

app.listen(PORT, "127.0.0.1", () => {
    console.log(
        `LUMA Hotel backend running at http://localhost:${PORT}`
    );
});
