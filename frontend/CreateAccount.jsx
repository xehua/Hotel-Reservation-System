// FILE: CreateAccount.jsx
/* ==========================================
   LUMA HOTEL - CREATE ACCOUNT PAGE

   This page lets guests create an account
   for our hotel website.

   The form sends their information to our
   backend, which saves it in MySQL.

   It also prevents someone from creating
   another account using the same email.
========================================== */

import { useState } from "react";

/* This is the address of our backend server.
   React runs on port 5173, while our
   backend runs on port 5001. */

const API = "http://localhost:5001";

function CreateAccount() {

    /* These variables store the information
       the guest types into the form. */

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    /* This displays messages when an account
       is created or something goes wrong. */

    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    /* This helps prevent someone from clicking
       Create Account multiple times while
       their information is being saved. */

    const [loading, setLoading] = useState(false);


    /* ======================================
       CREATE ACCOUNT FUNCTION

       This function runs when the guest
       clicks the Create Account button.
    ====================================== */

    const handleSubmit = async (event) => {

        /* Prevents the website from refreshing
           when the form is submitted. */

        event.preventDefault();

        if (loading) {
            return;
        }

        /* Clears old messages before checking
           the new information. */

        setMessage("");
        setMessageType("");

        /* Makes sure the guest completed
           all the required fields. */

        if (
            !firstName.trim() ||
            !lastName.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword
        ) {
            setMessage("Please fill out all required fields.");
            setMessageType("error");
            return;
        }

        /* Checks whether the two passwords
           match before sending the form. */

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            setMessageType("error");
            return;
        }

        /* Requires at least 8 characters
           to make the password more secure. */

        if (password.length < 8) {
            setMessage(
                "Password must be at least 8 characters long."
            );
            setMessageType("error");
            return;
        }

        /* Shows that the account is being
           processed by the backend. */

        setLoading(true);

        try {

            /* Sends the guest's information
               to our Node.js backend.

               The backend checks MySQL to
               see if the email already exists. */

            const response = await fetch(
                `${API}/api/accounts`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        phone: phone.trim(),
                        email: email.trim().toLowerCase(),
                        password: password,
                        confirm_password: confirmPassword
                    })
                }
            );

            /* Reads the response sent back
               from our backend server. */

            const data = await response.json();

            /* If MySQL already has this email,
               the backend returns an error.

               We show that error instead of
               telling the guest it worked. */

            if (!response.ok) {
                setMessage(
                    data.error ||
                    "Something went wrong. Please try again."
                );

                setMessageType("error");
                return;
            }

            /* Only shows success after the
               backend confirms that the new
               account was saved in MySQL. */

            setMessage("Account created successfully!");
            setMessageType("success");

            /* Clears the form after a successful
               registration so the guest can
               see that the process finished. */

            setFirstName("");
            setLastName("");
            setPhone("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");

        } catch (error) {

            /* This message appears if the
               backend is not running or
               cannot be reached. */

            console.error(
                "Create account error:",
                error
            );

            setMessage(
                "Could not connect to the server. Please try again."
            );

            setMessageType("error");

        } finally {

            /* Allows the button to be used
               again after the request finishes. */

            setLoading(false);
        }
    };


    /* ======================================
       CREATE ACCOUNT PAGE DESIGN

       This is the actual form guests see
       when they open the account page.
    ====================================== */

    return (
        <div className="Create-Account">

            {/* Main title and short description */}

            <h1>Create Your Account</h1>

            <p>
                Join LUMA Hotel and make your next
                stay even more memorable.
            </p>


            {/* The form runs handleSubmit when
                the guest clicks Create Account. */}

            <form onSubmit={handleSubmit}>

                {/* First name */}

                <label htmlFor="firstName">
                    First Name
                </label>

                <input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(event) =>
                        setFirstName(event.target.value)
                    }
                    autoComplete="given-name"
                    maxLength={100}
                    required
                />


                {/* Last name */}

                <label htmlFor="lastName">
                    Last Name
                </label>

                <input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(event) =>
                        setLastName(event.target.value)
                    }
                    autoComplete="family-name"
                    maxLength={100}
                    required
                />


                {/* Phone number */}

                <label htmlFor="phone">
                    Phone Number
                </label>

                <input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(event) =>
                        setPhone(event.target.value)
                    }
                    autoComplete="tel"
                    maxLength={30}
                />


                {/* Email address

                    This is what MySQL uses
                    to identify duplicate
                    customer accounts. */}

                <label htmlFor="email">
                    Email Address
                </label>

                <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) =>
                        setEmail(event.target.value)
                    }
                    autoComplete="email"
                    maxLength={255}
                    required
                />


                {/* Password

                    The backend hashes this
                    password before saving it
                    in the database. */}

                <label htmlFor="password">
                    Password
                </label>

                <input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) =>
                        setPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                />


                {/* Confirm password */}

                <label htmlFor="confirmPassword">
                    Confirm Password
                </label>

                <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) =>
                        setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                />


                {/* Shows a success or error message
                    depending on the backend response. */}

                {message && (
                    <p
                        role="status"
                        style={{
                            color:
                                messageType === "success"
                                    ? "#54725a"
                                    : "#b33a3a",

                            fontSize: "14px",
                            lineHeight: "1.7",
                            marginTop: "15px"
                        }}
                    >
                        {message}
                    </p>
                )}


                {/* Create Account button

                    It is disabled while the
                    backend is saving the account. */}

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "CREATING ACCOUNT..."
                        : "CREATE ACCOUNT"}
                </button>

            </form>

        </div>
    );
}

export default CreateAccount;
