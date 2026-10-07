import { useState } from "react";

const API = "http://localhost:5001";

export default function BookingForm() {
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [rooms, setRooms] = useState([]);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function searchRooms(event) {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        setRooms([]);

        try {
            const params = new URLSearchParams({
                check_in: checkIn,
                check_out: checkOut,
            });

            const response = await fetch(`${API}/api/availability?${params}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            setRooms(data.rooms);
            if (!data.rooms.length) setMessage("No rooms available.");
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function bookRoom(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        setBusy(true);
        setMessage("");

        try {
            const response = await fetch(`${API}/api/reservations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: fields.get("first_name"),
                    last_name: fields.get("last_name"),
                    email: fields.get("email"),
                    room_id: Number(fields.get("room_id")),
                    check_in: checkIn,
                    check_out: checkOut,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setMessage(
                `Booked! Reservation #${data.reservation_id}. Total: $${data.total_price}`
            );
            setRooms([]);
            form.reset();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section>
            <h2>Find a Room</h2>

            <form onSubmit={searchRooms}>
                <label>
                    Check-in
                    <input type="date" required value={checkIn}
                           disabled={busy}
                           onChange={(e) => {
                               setCheckIn(e.target.value);
                               setRooms([]);
                           }} />
                </label>

                <label>
                    Check-out
                    <input type="date" required value={checkOut}
                           disabled={busy}
                           onChange={(e) => {
                               setCheckOut(e.target.value);
                               setRooms([]);
                           }} />
                </label>

                <button disabled={busy}>Search Rooms</button>
            </form>

            {rooms.length > 0 && (
                <form onSubmit={bookRoom}>
                    <input name="first_name" placeholder="First name"
                           maxLength={50} required />
                    <input name="last_name" placeholder="Last name"
                           maxLength={50} required />
                    <input name="email" type="email" placeholder="Email"
                           maxLength={100} required />

                    <select name="room_id" required>
                        {rooms.map((room) => (
                            <option key={room.room_id} value={room.room_id}>
                                Room {room.room_number} — {room.room_type}
                                {" "}— Total ${room.total_price}
                            </option>
                        ))}
                    </select>

                    <button disabled={busy}>Book Room</button>
                </form>
            )}

            <p role="status">{message}</p>
        </section>
    );
}