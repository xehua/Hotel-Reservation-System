
/* ==========================================
   LUMA HOTEL - BACKEND SERVER

   This file connects our React website to
   the MySQL database.

   It handles customer accounts, room searches,
   availability, and hotel reservations.
========================================== */

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

/* Loads the database settings from .env
   so we don't put passwords directly in code. */

dotenv.config();

const app = express();
const PORT = 5001;

/* Allows our React frontend to communicate
   with this backend server. */

app.use(
    cors({
        origin: "http://localhost:5173"
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
========================================== */

app.post(
    "/api/reservations",
    asyncRoute(async (req, res) => {

        /* Gets the guest information and
           room selection from the website. */

        const firstName = cleanText(req.body.first_name);
        const lastName = cleanText(req.body.last_name);
        const email = cleanEmail(req.body.email);

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
               checking and saving the booking. */

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
               the dates the guest selected. */

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

            /* Saves the guest information. */

            const [guestResult] = await connection.execute(
                `INSERT INTO Guests
                 (first_name, last_name, email)
                 VALUES (?, ?, ?)`,
                [firstName, lastName, email]
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
                total_price: totalPrice
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
