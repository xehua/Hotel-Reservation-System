import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "16kb" }));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
    dateStrings: true,
});

class InputError extends Error {}

// Validate check-in and check-out.
function checkDates(data) {
    const { check_in, check_out } = data;

    function parse(value) {
        if (
            typeof value !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {
            throw new InputError("Use YYYY-MM-DD for dates.");
        }

        const date = new Date(`${value}T00:00:00Z`);

        if (
            !Number.isFinite(date.getTime()) ||
            date.toISOString().slice(0, 10) !== value
        ) {
            throw new InputError("Enter a valid calendar date.");
        }

        return date;
    }

    const start = parse(check_in);
    const end = parse(check_out);

    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    const nights = (end - start) / 86400000;

    if (check_in < today) {
        throw new InputError("Check-in cannot be in the past.");
    }

    if (nights < 1 || nights > 365) {
        throw new InputError("Choose a stay of 1–365 nights.");
    }

    return { check_in, check_out, nights };
}

// Calculate money using integer cents.
function totalPrice(price, nights) {
    const text = String(price);

    if (!/^\d+\.\d{2}$/.test(text)) {
        throw new Error("Invalid database price.");
    }

    const [dollars, cents] = text.split(".");
    const total =
        (BigInt(dollars) * 100n + BigInt(cents)) * BigInt(nights);

    return `${total / 100n}.${String(total % 100n).padStart(2, "0")}`;
}

// Check whether Node is running.
app.get("/api/health", (req, res) => {
    res.json({ message: "Node backend is running!" });
});

// Read your existing rooms.
app.get("/api/rooms", async (req, res) => {
    const [rooms] = await db.execute(`
    SELECT room_id, room_number, room_type, price, status
    FROM Rooms
    ORDER BY price, room_number
  `);

    res.json({ rooms });
});

// Search rooms available for the requested dates.
app.get("/api/availability", async (req, res) => {
    const stay = checkDates(req.query);

    const [rooms] = await db.execute(
        `
    SELECT room_id, room_number, room_type, price
    FROM Rooms
    WHERE status = 'Available'
      AND NOT EXISTS (
        SELECT 1
        FROM Reservations
        WHERE Reservations.room_id = Rooms.room_id
          AND (
            Reservations.status IS NULL
            OR LOWER(Reservations.status)
               NOT IN ('cancelled', 'canceled')
          )
          AND check_in < ?
          AND check_out > ?
      )
    ORDER BY price, room_number
    `,
        [stay.check_out, stay.check_in]
    );

    res.json({
        rooms: rooms.map((room) => ({
            ...room,
            total_price: totalPrice(room.price, stay.nights),
        })),
    });
});

// Save a guest and reservation together.
app.post("/api/reservations", async (req, res) => {
    const data = req.body;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new InputError("Send a JSON object.");
    }

    const stay = checkDates(data);

    if (!Number.isInteger(data.room_id) || data.room_id < 1) {
        throw new InputError("room_id must be a positive integer.");
    }

    for (const field of ["first_name", "last_name"]) {
        if (
            typeof data[field] !== "string" ||
            !data[field].trim() ||
            data[field].trim().length > 50
        ) {
            throw new InputError(`Enter a valid ${field}.`);
        }
    }

    if (
        typeof data.email !== "string" ||
        data.email.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
        throw new InputError("Enter a valid email.");
    }

    if (
        data.phone != null &&
        (typeof data.phone !== "string" || data.phone.length > 20)
    ) {
        throw new InputError("Phone must be 20 characters or fewer.");
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // These tables need InnoDB for transactions and room locks.
        const [tables] = await connection.execute(`
      SELECT ENGINE AS engine
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('Guests', 'Rooms', 'Reservations')
    `);

        if (
            tables.length !== 3 ||
            tables.some((table) => table.engine !== "InnoDB")
        ) {
            throw new InputError("All three tables must use InnoDB.");
        }

        // Lock the room while checking and creating the booking.
        const [rooms] = await connection.execute(
            `
      SELECT price, status
      FROM Rooms
      WHERE room_id = ?
      FOR UPDATE
      `,
            [data.room_id]
        );

        if (!rooms.length) {
            await connection.rollback();
            return res.status(404).json({ error: "Room not found." });
        }

        if (rooms[0].status !== "Available") {
            await connection.rollback();
            return res.status(409).json({ error: "Room unavailable." });
        }

        const [bookings] = await connection.execute(
            `
      SELECT reservation_id
      FROM Reservations
      WHERE room_id = ?
        AND (
          status IS NULL
          OR LOWER(status) NOT IN ('cancelled', 'canceled')
        )
        AND check_in < ?
        AND check_out > ?
      FOR UPDATE
      `,
            [data.room_id, stay.check_out, stay.check_in]
        );

        if (bookings.length) {
            await connection.rollback();
            return res.status(409).json({ error: "Room already booked." });
        }

        const total = totalPrice(rooms[0].price, stay.nights);

        const [guest] = await connection.execute(
            `
      INSERT INTO Guests (first_name, last_name, email, phone)
      VALUES (?, ?, ?, ?)
      `,
            [
                data.first_name.trim(),
                data.last_name.trim(),
                data.email.trim(),
                data.phone?.trim() || null,
            ]
        );

        const [reservation] = await connection.execute(
            `
      INSERT INTO Reservations
      (guest_id, room_id, check_in, check_out, total_price, status)
      VALUES (?, ?, ?, ?, ?, 'Confirmed')
      `,
            [
                guest.insertId,
                data.room_id,
                stay.check_in,
                stay.check_out,
                total,
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: "Reservation created!",
            reservation_id: reservation.insertId,
            total_price: total,
        });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

// Return clear errors without exposing database details.
app.use((error, req, res, next) => {
    if (error instanceof InputError) {
        return res.status(400).json({ error: error.message });
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Invalid JSON." });
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({ error: "Request too large." });
    }

    console.error("Backend error:", error.code || error.name);

    res.status(503).json({
        error: "Check your MySQL connection and imported tables.",
    });
});

app.listen(5001, "127.0.0.1", () => {
    console.log("Backend running at http://localhost:5001");
});