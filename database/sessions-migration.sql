/* ==========================================================
   LUMA HOTEL - SESSIONS TABLE
   ==========================================================

   The login routes in server.js need this table to
   remember who is signed in.

   Run this once, after schema.sql:

       mysql -u root -p hotel_reservation < sessions-migration.sql

   Why a separate file: schema.sql was written for a
   fresh database, and this table is the one piece the
   original project was missing. Keeping it separate
   means anyone who has already set up their database
   can add sign-in support without dropping their data.

   ----------------------------------------------------------
   HOW IT WORKS

   When someone signs in, server.js creates a long
   random token and puts it in a cookie in their
   browser. Only the SHA-256 hash of that token is
   stored here. So:

   - the browser holds the real token
   - the database holds a hash it can be checked against
   - someone reading the database cannot sign in as
     the user, because they would need the original
     token, not the hash

   expires_at is checked on every request, so an old
   cookie stops working after 7 days.
   ========================================================== */

USE hotel_reservation;

CREATE TABLE IF NOT EXISTS Sessions (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,

    /* One row per token, so a lookup can never
       match two sessions by accident. */
    UNIQUE KEY uq_sessions_token (token_hash),

    /* Speeds up "delete every session for this
       account", which is how a real system signs
       a user out everywhere. */
    INDEX idx_sessions_account (account_id),

    CONSTRAINT fk_sessions_account
        FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

/* ==========================================================
   HOUSEKEEPING

   Expired rows are harmless - getCurrentAccount()
   ignores them - but they would pile up forever.

   Run this by hand every so often:

       DELETE FROM Sessions WHERE expires_at < NOW();

   A production system would do this on a timer
   instead of by hand.

   The database has to be InnoDB for the login
   flow to work at all: the session lookup joins
   Accounts, and Sessions is written on every
   sign-in.
   ========================================================== */

/* ------ CHECK ------ */

SELECT 'Sessions table ready:' AS check_name;
SHOW COLUMNS FROM Sessions;
