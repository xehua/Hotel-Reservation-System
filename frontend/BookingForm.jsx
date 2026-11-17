/* ==========================================
   FILE: BookingForm.jsx

   LUMA HOTEL - BOOKING PAGE

   Guests search for a free room, pick one,
   and complete a reservation.

   THIS PAGE SUPPORTS BOTH KINDS OF CUSTOMER:

   - Signed OUT: the guest types their name
     and email into the reservation form.
     That is the default and it must keep
     working.

   - Signed IN: we look up the account when
     the page loads and fill the form in, so
     a returning customer types nothing.

   The only thing that changes is where the
   name and email come from.
========================================== */

import { useState, useEffect } from "react";
import SignIn from "./SignIn.jsx";

/* The address of our backend server. */

const API = "http://localhost:5001";

/* Room types shown in the browser.

   IMPORTANT: these names must match the
   room_type column in the Rooms table
   EXACTLY. The filter further down compares
   them with ===, so "Deluxe room" with a
   lowercase r would silently show zero
   available rooms.

   The prices here are only used for the
   "from $X / night" label. The real price
   always comes from MySQL and is calculated
   by the backend. */

const roomTypes = [

    {
        name: "Standard Room",
        price: 100,
        image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32",
        description: "A comfortable and inviting room for a relaxing stay.",
        features: ["Free Wi-Fi", "Comfortable Bed", "Air Conditioning"]
    },

    {
        name: "Deluxe Room",
        price: 175,
        image: "https://images.unsplash.com/photo-1590490360182-c33d57733427",
        description: "A spacious room with elegant finishes and extra comfort.",
        features: ["Free Wi-Fi", "Spacious Room", "Premium Comfort"]
    },
    {
        name: "Premium Suite",
        price: 300,
        image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
        description: "A luxurious suite for an unforgettable stay.",
        features: ["Free Wi-Fi", "Luxury Suite", "Extra Space"]
    }
];

export default function BookingForm() {

    /* ---------- Search and room state ---------- */

    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [rooms, setRooms] = useState([]);
    const [searched, setSearched] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomFilter, setRoomFilter] = useState("All Rooms");
    const [sortBy, setSortBy] = useState("recommended");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    /* ---------- Account state ----------

       account is null when nobody is signed in.

       checkingAccount starts as true so the
       form does not flash empty fields for a
       signed-in customer before their details
       arrive. */

    const [account, setAccount] = useState(null);
    const [checkingAccount, setCheckingAccount] = useState(true);

    /* The guest's own fields for the
       reservation form.

       When someone is signed in these are
       filled from their account. */

    const [guestFirstName, setGuestFirstName] = useState("");
    const [guestLastName, setGuestLastName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestPhone, setGuestPhone] = useState("");


    /* ======================================
       WHO IS SIGNED IN?

       Runs once when the page first loads.

       /api/me answers with account: null when
       nobody is signed in, which is a normal
       answer and not an error.

       credentials: "include" is required on
       every call that needs the session
       cookie, otherwise the browser does not
       send it and nobody ever looks signed in.
    ====================================== */

    useEffect(() => {

        let cancelled = false;

        async function loadAccount() {
            try {
                const response = await fetch(`${API}/api/me`, {
                    credentials: "include"
                });

                const data = await response.json();

                if (cancelled) {
                    return;
                }

                if (data.account) {
                    fillFromAccount(data.account);
                }

            } catch (error) {

                /* The backend may be offline. The
                   page still works: the guest just
                   types their details by hand. */

                console.error("Could not check account:", error);

            } finally {

                if (!cancelled) {
                    setCheckingAccount(false);
                }
            }
        }

        loadAccount();

        /* Stops us setting state after the
           component has gone away. */

        return () => {
            cancelled = true;
        };

    }, []);


    /* ======================================
       FILL THE FORM FROM AN ACCOUNT

       Used when the page loads already
       signed in, and again right after a
       successful sign-in.
    ====================================== */

    function fillFromAccount(person) {

        setAccount(person);

        setGuestFirstName(person.first_name || "");
        setGuestLastName(person.last_name || "");
        setGuestEmail(person.email || "");
        setGuestPhone(person.phone || "");
    }


    /* ======================================
       SIGN OUT

       Clears the cookie on the backend and
       empties the form again, so the next
       person at this computer types their
       own details.
    ====================================== */

    async function handleSignOut() {
        try {
            await fetch(`${API}/api/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error("Sign out error:", error);
        }

        setAccount(null);
        setGuestFirstName("");
        setGuestLastName("");
        setGuestEmail("");
        setGuestPhone("");
    }


    /* The earliest date a guest can pick:
       today, in the guest's own timezone.

       Using the timezone offset avoids the
       "yesterday" bug you get from a plain
       toISOString() on a machine behind UTC. */

    const today = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    function resetSearch() {
        setRooms([]);
        setSearched(false);
        setSelectedRoom(null);
        setMessage("");
    }


    /* ======================================
       SEARCH FOR FREE ROOMS

       Asks the backend which rooms are free
       between the chosen dates.
    ====================================== */

    async function searchRooms(event) {
        event.preventDefault();

        if (checkOut <= checkIn) {
            setMessage("Check-out must be after check-in.");
            return;
        }

        setBusy(true);
        setMessage("");
        setRooms([]);
        setSearched(false);
        setSelectedRoom(null);

        try {
            const params = new URLSearchParams({
                check_in: checkIn,
                check_out: checkOut
            });

            const response = await fetch(
                `${API}/api/availability?${params}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to search rooms.");
            }

            setRooms(data.rooms || []);
            setSearched(true);

            if (!data.rooms?.length) {
                setMessage("No rooms available for those dates.");
            }
        } catch (error) {
            setMessage(error.message || "Unable to connect to the server.");
        } finally {
            setBusy(false);
        }
    }


    /* ======================================
       BOOK THE SELECTED ROOM

       When the guest is signed in, the
       backend takes their name and email
       from the ACCOUNT rather than from the
       form - so a typo here cannot save a
       wrong email against their account.

       We still send them so a signed-out
       guest works exactly as before.
    ====================================== */

    async function bookRoom(event) {
        event.preventDefault();

        if (!selectedRoom) return;

        setBusy(true);
        setMessage("");

        try {
            const response = await fetch(`${API}/api/reservations`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    first_name: guestFirstName,
                    last_name: guestLastName,
                    email: guestEmail,
                    phone: guestPhone,
                    room_id: selectedRoom.room_id,
                    check_in: checkIn,
                    check_out: checkOut
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Reservation failed.");
            }

            setMessage(
                `Reservation confirmed! Confirmation #${data.reservation_id}. Total: $${data.total_price}`
            );

            setSelectedRoom(null);
            setRooms([]);
            setSearched(false);

        } catch (error) {
            setMessage(error.message || "Unable to complete reservation.");
        } finally {
            setBusy(false);
        }
    }


    /* ======================================
       WHICH ROOM CARDS TO SHOW

       Filtering and sorting only affect how
       the cards are listed. Availability
       still comes from the database.
    ====================================== */

    let displayedTypes = roomTypes.filter(
        (type) =>
            roomFilter === "All Rooms" ||
            type.name === roomFilter
    );

    if (sortBy === "low") {
        displayedTypes = [...displayedTypes].sort(
            (a, b) => a.price - b.price
        );
    }

    if (sortBy === "high") {
        displayedTypes = [...displayedTypes].sort(
            (a, b) => b.price - a.price
        );
    }


    return (
        <section className="luma-room-browser">

            {/* ==================================
                WHO IS BOOKING?

                Signed in  - a short greeting and
                             a sign out link.
                Signed out - a collapsible sign
                             in box, so the form is
                             still there for someone
                             who does want an account.
            ================================== */}

            <div className="luma-account-bar">

                {checkingAccount ? (
                    <p>Checking your account...</p>
                ) : account ? (
                    <p>
                        Signed in as{" "}
                        <strong>
                            {account.first_name} {account.last_name}
                        </strong>
                        . Your details are filled in below.
                        {" "}
                        <button
                            type="button"
                            className="luma-link-button"
                            onClick={handleSignOut}
                        >
                            Sign out
                        </button>
                    </p>
                ) : (
                    <p>
                        Booking as a guest.{" "}
                        <a href="/sign-in">Sign in</a>{" "}
                        to save your details for next time.
                    </p>
                )}

            </div>

            <div className="luma-search-panel">
                <h2>Find Your Perfect Room</h2>

                <form className="luma-date-form" onSubmit={searchRooms}>
                    <label>
                        CHECK-IN
                        <input
                            type="date"
                            required
                            min={today}
                            value={checkIn}
                            disabled={busy}
                            onChange={(e) => {
                                setCheckIn(e.target.value);
                                resetSearch();
                            }}
                        />
                    </label>

                    <label>
                        CHECK-OUT
                        <input
                            type="date"
                            required
                            min={checkIn || today}
                            value={checkOut}
                            disabled={busy}
                            onChange={(e) => {
                                setCheckOut(e.target.value);
                                resetSearch();
                            }}
                        />
                    </label>

                    <button type="submit" disabled={busy}>
                        {busy ? "SEARCHING..." : "SEARCH ROOMS"}
                    </button>
                </form>
            </div>

            <div className="luma-browser-heading">
                <p className="section-label">DISCOVER YOUR SPACE</p>
                <h2>Explore Rooms & Suites</h2>
                <p>Browse our rooms and find your perfect stay.</p>
            </div>

            <div className="luma-room-filters">
                <label>
                    Room Type
                    <select
                        value={roomFilter}
                        onChange={(e) => setRoomFilter(e.target.value)}
                    >
                        <option>All Rooms</option>
                        <option>Standard Room</option>
                        <option>Deluxe Room</option>
                        <option>Premium Suite</option>
                    </select>
                </label>

                <label>
                    Sort By
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="recommended">Recommended</option>
                        <option value="low">Price: Low to High</option>
                        <option value="high">Price: High to Low</option>
                    </select>
                </label>
            </div>

            <div className="luma-available-grid">
                {displayedTypes.map((type) => {

                    /* Compares the card's name with the
                       room_type the database sent back.
                       These must match exactly. */

                    const availableRooms = rooms.filter(
                        (room) => room.room_type === type.name
                    );

                    const firstAvailable = availableRooms[0];

                    return (
                        <article className="luma-available-card" key={type.name}>
                            <img src={type.image} alt={type.name} />

                            <div className="luma-available-info">
                                <p className="luma-card-label">
                                    THE LUMA EXPERIENCE
                                </p>

                                <h3>{type.name}</h3>
                                <p className="luma-room-description">
                                    {type.description}
                                </p>

                                <div className="luma-room-features">
                                    {type.features.map((feature) => (
                                        <span key={feature}>{feature}</span>
                                    ))}
                                </div>

                                <div className="luma-price-row">
                                    <strong>${type.price}</strong>
                                    <span> / night</span>
                                </div>

                                {searched ? (
                                    <>
                                        <p className="luma-availability">
                                            {availableRooms.length > 0
                                                ? `${availableRooms.length} rooms available`
                                                : "No rooms available"}
                                        </p>

                                        {firstAvailable && (
                                            <p className="luma-total-price">
                                                Total stay: ${firstAvailable.total_price}
                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            disabled={busy || !firstAvailable}
                                            onClick={() => {
                                                setSelectedRoom(firstAvailable);
                                                setMessage("");
                                                setTimeout(() => {
                                                    document
                                                        .querySelector(".luma-reservation-panel")
                                                        ?.scrollIntoView({ behavior: "smooth" });
                                                }, 50);
                                            }}
                                        >
                                            {firstAvailable
                                                ? "SELECT ROOM"
                                                : "UNAVAILABLE"}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            document
                                                .querySelector(".luma-search-panel")
                                                ?.scrollIntoView({ behavior: "smooth" });
                                        }}
                                    >
                                        CHECK AVAILABILITY
                                    </button>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>

            {selectedRoom && (
                <div className="luma-reservation-panel">
                    <h2>Complete Your Reservation</h2>

                    <p>
                        {selectedRoom.room_type} — Room{" "}
                        {selectedRoom.room_number}
                    </p>

                    <p>
                        Check-in: {checkIn} | Check-out: {checkOut}
                    </p>

                    <h3>Total: ${selectedRoom.total_price}</h3>

                    {/* A signed-in customer has a
                        shortcut: their details are
                        already saved. */}

                    {account && (
                        <p className="luma-account-note">
                            Booking with your saved details for{" "}
                            <strong>{account.email}</strong>.
                        </p>
                    )}

                    <form onSubmit={bookRoom}>
                        <input
                            name="first_name"
                            placeholder="First Name"
                            value={guestFirstName}
                            onChange={(e) => setGuestFirstName(e.target.value)}
                            required
                        />

                        <input
                            name="last_name"
                            placeholder="Last Name"
                            value={guestLastName}
                            onChange={(e) => setGuestLastName(e.target.value)}
                            required
                        />

                        <input
                            name="email"
                            type="email"
                            placeholder="Email Address"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            required
                        />

                        <input
                            name="phone"
                            type="tel"
                            placeholder="Phone Number (Optional)"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                        />

                        <button type="submit" disabled={busy}>
                            {busy
                                ? "PROCESSING..."
                                : "CONFIRM RESERVATION"}
                        </button>

                        <button
                            type="button"
                            className="luma-cancel-button"
                            onClick={() => setSelectedRoom(null)}
                            disabled={busy}
                        >
                            CANCEL
                        </button>
                    </form>
                </div>
            )}

            {message && (
                <p className="luma-booking-message" role="status">
                    {message}
                </p>
            )}
        </section>
    );
}
