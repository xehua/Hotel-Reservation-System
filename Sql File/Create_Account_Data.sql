
/* Selects the database used by our hotel website. */
USE hotel_reservation;

/* Creates a table to store customer accounts.
   The UNIQUE rule prevents two accounts
   from using the same email address. */

CREATE TABLE IF NOT EXISTS Accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* Shows the account table so we can
   make sure it was created correctly. */

DESCRIBE Accounts;
