
import { useState } from "react";

const API = "http://localhost:5001";

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
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [rooms, setRooms] = useState([]);
    const [searched, setSearched] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomFilter, setRoomFilter] = useState("All Rooms");
    const [sortBy, setSortBy] = useState("recommended");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const today = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    function resetSearch() {
        setRooms([]);
        setSearched(false);
        setSelectedRoom(null);
        setMessage("");
    }

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

    async function bookRoom(event) {
        event.preventDefault();

        if (!selectedRoom) return;

        const fields = new FormData(event.currentTarget);

        setBusy(true);
        setMessage("");

        try {
            const response = await fetch(`${API}/api/reservations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    first_name: fields.get("first_name"),
                    last_name: fields.get("last_name"),
                    email: fields.get("email"),
                    phone: fields.get("phone"),
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

                    <form onSubmit={bookRoom}>
                        <input
                            name="first_name"
                            placeholder="First Name"
                            required
                        />

                        <input
                            name="last_name"
                            placeholder="Last Name"
                            required
                        />

                        <input
                            name="email"
                            type="email"
                            placeholder="Email Address"
                            required
                        />

                        <input
                            name="phone"
                            type="tel"
                            placeholder="Phone Number (Optional)"
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
