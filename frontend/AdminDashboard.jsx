/* ==========================================
   FILE: AdminDashboard.jsx

   LUMA HOTEL - ADMIN DASHBOARD

   Shows hotel staff the customer information
   and every booking in the system.

   ----------------------------------------------------------
   IMPORTANT: THIS PAGE IS NOT THE SECURITY

   Hiding this page from normal customers does
   nothing on its own. Anyone can type the URL.

   The real protection is in server.js: every
   /api/admin/... route checks that the signed-in
   account has is_admin = TRUE, and returns 403
   if it does not.

   So this page picks up a 403 and shows
   "Admins only" - it never receives the data at
   all.
========================================== */

import { useEffect, useState } from "react";
import "./AdminDashboard.css";

/* The address of our backend server. */

const API = "http://localhost:5001";

export default function AdminDashboard() {

    /* The three lists this page shows. */

    const [accounts, setAccounts] = useState([]);
    const [guests, setGuests] = useState([]);
    const [reservations, setReservations] = useState([]);

    /* Which section the admin is looking at. */

    const [tab, setTab] = useState("reservations");

    /* Loading and error state. */

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    /* Signs the admin out and returns to the homepage. */

    async function handleLogout() {
        try {
            const response = await fetch(`${API}/api/logout`, {
                method: "POST",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Logout failed.");
            }

            // Return to the homepage after signing out.
            window.location.href = "/";
        } catch (error) {
            setError("Could not sign out. Please try again.");
        }
    }

    /* ======================================
       LOAD THE DATA

       Runs once when the page opens.

       We load all three lists together so
       switching tabs is instant.

       The summary endpoint also tells us who
       we are signed in as, so we can name the
       admin at the top of the page.
    ====================================== */

    const [summary, setSummary] = useState(null);

    useEffect(() => {

        let cancelled = false;

        async function loadDashboard() {
            try {
                setLoading(true);
                setError("");

                /* credentials: "include" sends the
                   session cookie, which is how the
                   backend knows who we are and
                   whether we are an admin. */

                const [accountsRes, guestsRes, reservationsRes] =
                    await Promise.all([
                        fetch(`${API}/api/admin/accounts`, {
                            credentials: "include"
                        }),
                        fetch(`${API}/api/admin/guests`, {
                            credentials: "include"
                        }),
                        fetch(`${API}/api/admin/reservations`, {
                            credentials: "include"
                        })
                    ]);

                /* Check whether the admin is 
                allowed to access the dashboard */
                if (
                    accountsRes.status === 401 ||
                    accountsRes.status === 403
                ) {
                    throw new Error("You do not have permission to access this dashboard.");
                }

                /* If the backend refused us, every one
                   of those came back 403 or 401.
                   We only need to read one of them. */

                if (!accountsRes.ok) {
                    const data = await accountsRes.json();

                    if (!cancelled) {
                        setError(
                            data.error ||
                            "You do not have access to this page."
                        );
                        setLoading(false);
                    }

                    return;
                }

                const accountsData = await accountsRes.json();
                const guestsData = await guestsRes.json();
                const reservationsData = await reservationsRes.json();

                if (!cancelled) {
                    setAccounts(accountsData.accounts || []);
                    setGuests(guestsData.guests || []);
                    setReservations(reservationsData.reservations || []);

                    /* The backend sends the admin's own
                       details so the header can greet them. */

                    setSummary(accountsData.viewer || null);

                    setLoading(false);
                }

            } catch (fetchError) {

                console.error("Admin dashboard error:", fetchError);

                if (!cancelled) {
                    setError(
                        "Could not connect to the server. Please try again."
                    );
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };

    }, []);


    /* ======================================
       A SMALL HELPERS SECTION

       These keep the table markup below from
       getting repetitive.
    ====================================== */

    /* Formats a date the way we want to read
       it, without the time part MySQL adds. */

    function formatDate(value) {
        if (!value) return "-";

        /* MySQL gives us "2026-12-20" because
           dateStrings is on. If a timestamp
           sneaks through, take the date part. */

        return String(value).slice(0, 10);
    }

    /* Formats a price with two decimal places. */

    function formatPrice(value) {
        const number = Number(value);
        return Number.isNaN(number) ? "-" : `$${number.toFixed(2)}`;
    }


    /* ======================================
       PAGE STATES
    ====================================== */

    if (loading) {
        return (
            <section className="luma-admin">
                <h1>Admin Dashboard</h1>
                <p>Loading customer information...</p>
            </section>
        );
    }

    /* If the backend refused us, we say so and
       offer nothing else. No data was sent. */

    if (error) {
        return (
            <section className="luma-admin">
                <h1>Admin Dashboard</h1>

                <p role="alert" style={{ color: "#b33a3a" }}>
                    {error}
                </p>

                <p>
                    <a href="/">Back to home</a>
                    {" | "}
                    <a href="/sign-in">Sign in as an admin</a>
                </p>
            </section>
        );
    }


    /* ======================================
       THE DASHBOARD
    ====================================== */

    return (
        <section className="luma-admin">

            <h1>Admin Dashboard</h1>
            <button
                className="luma-admin-logout"
                onClick={handleLogout}
            >
                LOG OUT
            </button>

            <p>
                Signed in as{" "}
                <strong>
                    {summary
                        ? `${summary.first_name} ${summary.last_name}`
                        : "an admin"}
                </strong>
                .{" "}
                <a href="/">Back to home</a>
            </p>

            {/* Quick counts, so an admin can see
                the size of the system at a glance. */}

            <div className="luma-admin-counters">
                <p><strong>{reservations.length}</strong> reservations</p>
                <p><strong>{guests.length}</strong> guests</p>
                <p><strong>{accounts.length}</strong> accounts</p>
            </div>

            {/* ---------- Tabs ---------- */}

            <div className="luma-admin-tabs">
                <button
                    type="button"
                    onClick={() => setTab("reservations")}
                >
                    Reservations
                </button>

                <button
                    type="button"
                    onClick={() => setTab("guests")}
                >
                    Guests
                </button>

                <button
                    type="button"
                    onClick={() => setTab("accounts")}
                >
                    Accounts
                </button>
            </div>


            {/* ==================================
                RESERVATIONS TAB
            ================================== */}

            {tab === "reservations" && (
                <div className="luma-admin-table-wrap">
                    <h2>All Reservations</h2>

                    {reservations.length === 0 ? (
                        <p>No reservations yet.</p>
                    ) : (
                        <table className="luma-admin-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Guest</th>
                                    <th>Email</th>
                                    <th>Room</th>
                                    <th>Type</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Nights</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Account</th>
                                </tr>
                            </thead>

                            <tbody>
                                {reservations.map((row) => (
                                    <tr key={row.reservation_id}>
                                        <td>{row.reservation_id}</td>

                                        <td>
                                            {row.first_name} {row.last_name}
                                        </td>

                                        <td>{row.email}</td>

                                        <td>{row.room_number}</td>

                                        <td>{row.room_type}</td>

                                        <td>{formatDate(row.check_in)}</td>

                                        <td>{formatDate(row.check_out)}</td>

                                        <td>{row.nights}</td>

                                        <td>{formatPrice(row.total_price)}</td>

                                        <td>{row.status}</td>

                                        {/* Tells staff whether this
                                            booking came from a
                                            signed-in customer or a
                                            one-time guest. */}

                                        <td>
                                            {row.account_id
                                                ? `#${row.account_id}`
                                                : "Guest"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}


            {/* ==================================
                GUESTS TAB

                Every guest record, including the
                one-time visitors who never made
                an account.
            ================================== */}

            {tab === "guests" && (
                <div className="luma-admin-table-wrap">
                    <h2>All Guests</h2>

                    {guests.length === 0 ? (
                        <p>No guest records yet.</p>
                    ) : (
                        <table className="luma-admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Account</th>
                                    <th>Bookings</th>
                                </tr>
                            </thead>

                            <tbody>
                                {guests.map((row) => (
                                    <tr key={row.guest_id}>
                                        <td>{row.guest_id}</td>

                                        <td>
                                            {row.first_name} {row.last_name}
                                        </td>

                                        <td>{row.email}</td>

                                        <td>{row.phone || "-"}</td>

                                        <td>
                                            {row.account_id
                                                ? `#${row.account_id}`
                                                : "Guest"}
                                        </td>

                                        <td>{row.booking_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}


            {/* ==================================
                ACCOUNTS TAB

                NOTE: there is no password column.

                The backend never sends password_hash,
                so it cannot appear here even by
                accident.
            ================================== */}

            {tab === "accounts" && (
                <div className="luma-admin-table-wrap">
                    <h2>All Accounts</h2>

                    {accounts.length === 0 ? (
                        <p>No accounts yet.</p>
                    ) : (
                        <table className="luma-admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Joined</th>
                                    <th>Bookings</th>
                                    <th>Role</th>
                                </tr>
                            </thead>

                            <tbody>
                                {accounts.map((row) => (
                                    <tr key={row.account_id}>
                                        <td>{row.account_id}</td>

                                        <td>
                                            {row.first_name} {row.last_name}
                                        </td>

                                        <td>{row.email}</td>

                                        <td>{row.phone || "-"}</td>

                                        <td>{formatDate(row.created_at)}</td>

                                        <td>{row.booking_count}</td>

                                        <td>
                                            {row.is_admin ? "Admin" : "Customer"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

        </section>
    );
}
