/* ==========================================================
   LUMA HOTEL - DATABASE SCHEMA
   ==========================================================

   Run this file FIRST, once, on a fresh MySQL server.
   It creates the database, all four tables, and the
   starting room list.

   From a terminal:
   
       mysql -u root -p < schema.sql
   Or paste the whole file into MySQL Workbench and run it.

   ----------------------------------------------------------
   HOW ACCOUNTS AND GUESTS RELATE
   ----------------------------------------------------------

   There are two kinds of customer here, on purpose:

   1. A GUEST is anyone who books a room. Every reservation
      has a guest record. Guests never need a password.

   2. An ACCOUNT is optional. A frequent visitor can create
      one so their details are remembered and they don't
      retype them every time.

   Guests.account_id is NULL for a one-time booking, and
   points at the account when a signed-in customer books.
   That one nullable column is what makes both paths work.

   ========================================================== */

CREATE DATABASE IF NOT EXISTS hotel_reservation
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE hotel_reservation;

/* ----------------------------------------------------------
   ACCOUNTS - optional, holds login details
   ---------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS Accounts (
    account_id    INT AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(30)  NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

/* ----------------------------------------------------------
   GUESTS - who actually booked the room

   account_id is NULL for a one-time guest and set for a
   signed-in account holder. ON DELETE SET NULL means
   deleting an account keeps the booking history.
   ---------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS Guests (
    guest_id   INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    phone      VARCHAR(30)  NULL,
    account_id INT          NULL,
    INDEX idx_guests_email (email),
    INDEX idx_guests_account (account_id),
    CONSTRAINT fk_guests_account
        FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

/* ----------------------------------------------------------
   ROOMS

   status is an ENUM so a typo like 'available' cannot be
   stored. server.js compares against 'Available' exactly.
   ---------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS Rooms (
    room_id     INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10)  NOT NULL,
    room_type   VARCHAR(50)  NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    status      ENUM('Available','Occupied','Maintenance')
                NOT NULL DEFAULT 'Available',
    UNIQUE KEY uq_rooms_number (room_number),
    INDEX idx_rooms_status (status)
) ENGINE=InnoDB;

/* ----------------------------------------------------------
   RESERVATIONS

   status is an ENUM so 'Cancelled' is always spelled the
   same way - the availability query depends on it.

   idx_res_availability is the important one: the search
   query filters on room_id plus the two dates, and without
   this index MySQL scans every reservation on every search.
   ---------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS Reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id       INT NOT NULL,
    room_id        INT NOT NULL,
    check_in       DATE NOT NULL,
    check_out      DATE NOT NULL,
    total_price    DECIMAL(10,2) NOT NULL,
    status         ENUM('Confirmed','Cancelled','Completed')
                   NOT NULL DEFAULT 'Confirmed',
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_res_availability (room_id, check_in, check_out),
    INDEX idx_res_guest (guest_id),
    CONSTRAINT fk_res_guest
        FOREIGN KEY (guest_id) REFERENCES Guests(guest_id),
    CONSTRAINT fk_res_room
        FOREIGN KEY (room_id) REFERENCES Rooms(room_id),
    CONSTRAINT chk_res_dates CHECK (check_out > check_in)
) ENGINE=InnoDB;

/* ==========================================================
   STARTING ROOM LIST - 50 rooms
   ========================================================== */

INSERT INTO Rooms (room_number, room_type, price, status) VALUES
/* 20 Standard Rooms */
('101','Standard Room',100.00,'Available'),
('102','Standard Room',100.00,'Available'),
('103','Standard Room',100.00,'Available'),
('104','Standard Room',100.00,'Available'),
('105','Standard Room',100.00,'Available'),
('106','Standard Room',100.00,'Available'),
('107','Standard Room',100.00,'Available'),
('108','Standard Room',100.00,'Available'),
('109','Standard Room',100.00,'Available'),
('110','Standard Room',100.00,'Available'),
('111','Standard Room',100.00,'Available'),
('112','Standard Room',100.00,'Available'),
('113','Standard Room',100.00,'Available'),
('114','Standard Room',100.00,'Available'),
('115','Standard Room',100.00,'Available'),
('116','Standard Room',100.00,'Available'),
('117','Standard Room',100.00,'Available'),
('118','Standard Room',100.00,'Available'),
('119','Standard Room',100.00,'Available'),
('120','Standard Room',100.00,'Available'),
/* 20 Deluxe Rooms */
('201','Deluxe Room',175.00,'Available'),
('202','Deluxe Room',175.00,'Available'),
('203','Deluxe Room',175.00,'Available'),
('204','Deluxe Room',175.00,'Available'),
('205','Deluxe Room',175.00,'Available'),
('206','Deluxe Room',175.00,'Available'),
('207','Deluxe Room',175.00,'Available'),
('208','Deluxe Room',175.00,'Available'),
('209','Deluxe Room',175.00,'Available'),
('210','Deluxe Room',175.00,'Available'),
('211','Deluxe Room',175.00,'Available'),
('212','Deluxe Room',175.00,'Available'),
('213','Deluxe Room',175.00,'Available'),
('214','Deluxe Room',175.00,'Available'),
('215','Deluxe Room',175.00,'Available'),
('216','Deluxe Room',175.00,'Available'),
('217','Deluxe Room',175.00,'Available'),
('218','Deluxe Room',175.00,'Available'),
('219','Deluxe Room',175.00,'Available'),
('220','Deluxe Room',175.00,'Available'),
/* 10 Premium Suites */
('301','Premium Suite',300.00,'Available'),
('302','Premium Suite',300.00,'Available'),
('303','Premium Suite',300.00,'Available'),
('304','Premium Suite',300.00,'Available'),
('305','Premium Suite',300.00,'Available'),
('306','Premium Suite',300.00,'Available'),
('307','Premium Suite',300.00,'Available'),
('308','Premium Suite',300.00,'Available'),
('309','Premium Suite',300.00,'Available'),
('310','Premium Suite',300.00,'Available');

/* ==========================================================
   SAMPLE CUSTOMERS

   Two account holders with a saved profile, and two
   one-time guests with no account at all - so both paths
   have something to demo.

   The password hash below is for the word 'password123'.
   ========================================================== */

INSERT INTO Accounts (first_name, last_name, phone, email, password_hash) VALUES
('Amelia', 'Hart',  '+1-312-555-0101', 'amelia.hart@example.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyDPHqXz0d1kKq'),
('Daniel', 'Okafor','+1-404-555-0102', 'daniel.okafor@example.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyDPHqXz0d1kKq');

/* One-time guest - no account */
INSERT INTO Guests (first_name, last_name, email, phone, account_id) VALUES
('Michael','Brown','michael.brown@example.com','+1-214-555-1013', NULL),
('Sara',  'Khan', 'sara.khan@example.com',   '+1-206-555-1021', NULL);

/* The two account holders, linked to their Accounts rows.
   LAST_INSERT_ID() trick avoids hardcoding ids. */
INSERT INTO Guests (first_name, last_name, email, phone, account_id)
SELECT first_name, last_name, email, phone, account_id
FROM Accounts;

/* A reservation for each, so the booking list isn't empty */
INSERT INTO Reservations (guest_id, room_id, check_in, check_out, total_price, status)
VALUES
(1, 1, '2026-12-20', '2026-12-23', 300.00, 'Confirmed'),
(3, 21, '2027-01-05', '2027-01-08', 525.00, 'Confirmed');

/* ==========================================================
   CHECKS - run these to confirm setup worked
   ========================================================== */

SELECT 'Tables created:' AS check_name;
SHOW TABLES;

SELECT 'Room count per type:' AS check_name;
SELECT room_type, COUNT(*) AS rooms, MIN(price) AS price
FROM Rooms GROUP BY room_type ORDER BY room_type;

SELECT 'Storage engine (must be InnoDB):' AS check_name;
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hotel_reservation';
