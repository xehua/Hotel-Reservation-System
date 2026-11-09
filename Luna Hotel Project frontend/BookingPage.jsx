
import BookingForm from "./BookingForm.jsx";
import "./App.css";

export default function BookingPage() {
    return (
        <main className="booking-page">

            {/* Navigation */}
            <nav className="booking-navbar">
                <a href="/" className="luma-logo">
                    LUMA
                </a>

                <a href="/" className="back-home">
                    ← BACK TO HOME
                </a>
            </nav>

            {/* Booking Content */}
            <div className="booking-page-content">

                <p className="section-label">
                    THE LUMA EXPERIENCE
                </p>

                <h1>Reserve Your Stay</h1>

                <p className="booking-description">
                    Your next unforgettable stay begins here.
                    Select your check-in and check-out dates
                    to find the perfect room at LUMA Hotel.
                </p>

                <BookingForm />

            </div>

            {/* Footer */}
            <footer className="booking-footer">
                <p>
                    © 2026 LUMA Hotel. All rights reserved.
                </p>
            </footer>

        </main>
    );
}
