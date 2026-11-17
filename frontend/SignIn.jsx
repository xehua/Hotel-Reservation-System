/* ==========================================
   FILE: SignIn.jsx

   LUMA HOTEL - SIGN IN PAGE

   This page lets a returning customer sign in
   so their details are filled in for them
   when they book a room.

   Signing in is OPTIONAL. A one-time guest
   never needs this page - they can book
   straight from the booking form.

   The layout deliberately matches
   CreateAccount.jsx, so both pages share the
   same "Create-Account" styling in App.css.
========================================== */

import { useState } from "react";

/* The address of our backend server.
   React runs on port 5173, the backend
   runs on port 5001. */

const API = "http://localhost:5001";

export default function SignIn({ onSignedIn }) {

    /* These hold what the customer types. */

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    /* Shows a message when sign-in succeeds
       or fails.

       messageType decides the colour, the
       same way CreateAccount.jsx does it. */

    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    /* Stops the button being clicked twice
       while the server is checking. */

    const [loading, setLoading] = useState(false);


    /* ======================================
       SIGN IN FUNCTION

       Runs when the customer clicks the
       SIGN IN button.

       The backend checks the password and,
       if it matches, sends back a cookie
       that keeps them signed in.
    ====================================== */

    async function handleSubmit(event) {

        /* Stops the page from refreshing. */

        event.preventDefault();

        if (loading) {
            return;
        }

        /* Clears the old message before
           checking the new details. */

        setMessage("");
        setMessageType("");

        /* Basic check before we bother the
           server. The backend checks again. */

        if (!email.trim() || !password) {
            setMessage("Please enter your email and password.");
            setMessageType("error");
            return;
        }

        setLoading(true);

        try {

            const response = await fetch(`${API}/api/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                /* credentials: "include" is ESSENTIAL.

                   Without it the browser throws away
                   the cookie the backend sends back,
                   and the customer is not signed in
                   on the next request. */

                credentials: "include",

                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password: password
                })
            });

            const data = await response.json();

            /* The backend sends the same error
               for a wrong email and a wrong
               password, so we just show it. */

            if (!response.ok) {
                setMessage(
                    data.error ||
                    "Could not sign in. Please try again."
                );
                setMessageType("error");
                return;
            }

            /* SUCCESS.

               This is the part that was missing.
               Before, a successful sign-in showed
               nothing at all, so there was no way
               to tell it had worked.

               We now say so in green, using the
               name the backend sent back. */

            const name = data.account
                ? data.account.first_name
                : "";

            setMessage(
                name
                    ? `Signed in as ${name}. Your details will be filled in when you book.`
                    : "Signed in successfully."
            );

            setMessageType("success");

            /* Clears the password so it is not
               left sitting in the form. */

            setPassword("");

            /* Tells the page above us who signed
               in, so it can update its own state.

               If this page is opened on its own
               the prop is undefined, so we guard
               against that. */

            if (typeof onSignedIn === "function") {
                onSignedIn(data.account);
            }

        } catch (error) {

            console.error("Sign in error:", error);

            setMessage(
                "Could not connect to the server. Please try again."
            );

            setMessageType("error");

        } finally {

            /* Re-enables the button. */

            setLoading(false);
        }
    }


    /* ======================================
       SIGN IN PAGE DESIGN

       The class names match the ones
       CreateAccount.jsx uses, so this page
       picks up the same white card, fonts
       and button styling from App.css.
    ====================================== */

    return (
        <div className="Create-Account">

            <h1>Welcome Back</h1>

            <p>
                Sign in and we will fill in your
                details when you book your next stay.
            </p>

            <form onSubmit={handleSubmit}>

                <label htmlFor="signInEmail">
                    Email Address
                </label>

                <input
                    id="signInEmail"
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

                <label htmlFor="signInPassword">
                    Password
                </label>

                <input
                    id="signInPassword"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                        setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    required
                />

                {/* Shows the message from the backend,
                    green for success and red for an
                    error. Same colours as the create
                    account page. */}

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

                <button type="submit" disabled={loading}>
                    {loading ? "SIGNING IN..." : "SIGN IN"}
                </button>

            </form>

            {/* ---- Links to the other pages ----

                After a successful sign-in the
                customer usually wants the booking
                page, not this one. */}

            {messageType === "success" ? (
                <p>
                    <a href="/booking">Continue to booking</a>
                </p>
            ) : (
                <p>
                    No account yet?{" "}
                    <a href="/create-account">Create one</a>
                </p>
            )}

        </div>
    );
}
