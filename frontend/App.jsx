// FILE: App.jsx
import "./App.css";
import CreateAccount from "./CreateAccount.jsx";
import BookingPage from "./BookingPage.jsx";
import SignIn from "./SignIn.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import { useState, useEffect } from "react";

function App() {

  const [currentAccount, setCurrentAccount] = useState(null);

  // Checks whether someone is signed in whenever the app loads. 
  // It also means an admin who refreshes the homepage won't lose their dashboard button.
  useEffect(() => {
    async function checkAccount() {
        try {
            const response = await fetch("http://localhost:5001/api/me", {
                credentials: "include"
            });

            const data = await response.json();

            if (response.ok) {
                setCurrentAccount(data.account);
            }
        } catch (error) {
            console.error("Could not check signed-in account:", error);
        }
    }

    checkAccount();
}, []);

  // Separate booking page
  if (window.location.pathname === "/booking") {
    return <BookingPage />;
  }

  // Separate sign-in page
  if (window.location.pathname === "/sign-in") {
    return (
        <main className="account-page">
            <a href="/" className="back-home">← Back to Home</a>

            <SignIn
                onSignedIn={(account) => setCurrentAccount(account)}
            />

        </main>
    );
  }

  // Separate create account page
  if (window.location.pathname === "/create-account") {
    return (
        <main className="account-page">
          <a href="/" className="back-home">
            ← Back to Home
          </a>
          <CreateAccount />
        </main>
    );
  }

  if (window.location.pathname === "/admin") {
    return <AdminDashboard />;
  }

  // Main LUMA Hotel homepage
  return (
      <div className="website">

        {/* Navigation */}
        <nav className="navbar">
          <a href="/" className="luma-logo">
            LUMA
          </a>

          <div className="nav-links">
            <a href="#home">HOME</a>
            <a href="#about">ABOUT</a>
            <a href="#rooms">ROOMS</a>
            <a href="#services">SERVICES</a>
            <a href="#contact">CONTACT</a>
          </div>

          <div className="luma-nav-actions">

            {currentAccount?.is_admin && (
                <a href="/admin" className="luma-admin-button">
                    ADMIN DASHBOARD
                </a>
            )}

            {!currentAccount && (
                <>
                    <a href="/sign-in" className="luma-account-button">
                        SIGN IN
            </a>

                    <a href="/create-account" className="luma-account-button">
                        CREATE ACCOUNT
                    </a>
                </>
            )}  

            <a href="/booking" className="luma-book-button">
                BOOK NOW
            </a>
        </div>
        </nav>

        {/* Hero */}
        <section id="home" className="hero-section">
          <div className="hero-content">
            <p className="small-title">
              WELCOME TO OUR HOTEL
            </p>

            <h1>
              Stay Somewhere
              <br />
              Worth Remembering
            </h1>

            <p>
              A quiet place to rest, reconnect,
              and make yourself at home.
            </p>

            <a href="/booking" className="hero-button">
              BOOK YOUR STAY
            </a>
          </div>
        </section>

        {/* About */}
        <section id="about" className="about-section">
          <div className="about-text">
            <p className="section-label">
              THE LUMA EXPERIENCE
            </p>

            <h2>A slower way to stay.</h2>

            <p>
              LUMA is designed for guests who value
              comfort, simplicity, and a space
              that feels like their own.
            </p>
          </div>

          <div className="about-image">
            <img
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945"
                alt="LUMA Hotel"
            />
          </div>
        </section>

        {/* Rooms */}
        <section id="rooms" className="rooms-section">
          <p className="section-label">
            YOUR SPACE
          </p>

          <h2>Rooms & Suites</h2>

          <div className="room-grid">

            {/* Standard Room */}
            <div className="room-card">
              <img
                  src="https://images.unsplash.com/photo-1611892440504-42a792e24d32"
                  alt="Standard Room"
              />

              <div className="room-info">
                <h3>Standard Room</h3>

                <p>
                  Enjoy a comfortable and relaxing stay
                  with everything you need.
                </p>

                <p>From $100 / night</p>

                <a href="/booking" className="room-button">
                  VIEW ROOM
                </a>
              </div>
            </div>

            {/* Deluxe Room */}
            <div className="room-card">
              <img
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427"
                  alt="Deluxe Room"
              />

              <div className="room-info">
                <h3>Deluxe Room</h3>

                <p>
                  A spacious room with elegant finishes
                  and extra comfort.
                </p>

                <p>From $175 / night</p>

                <a href="/booking" className="room-button">
                  VIEW ROOM
                </a>
              </div>
            </div>

            {/* Premium Suite */}
            <div className="room-card">
              <img
                  src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"
                  alt="Premium Suite"
              />

              <div className="room-info">
                <h3>Premium Suite</h3>

                <p>
                  Experience luxury and additional space
                  for an unforgettable stay.
                </p>

                <p>From $300 / night</p>

                <a href="/booking" className="room-button">
                  VIEW ROOM
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* Booking */}
        <section className="booking-section">
          <div className="booking-content">
            <p className="section-label">
              PLAN YOUR STAY
            </p>

            <h2>Check Availability</h2>

            <p>
              Find the perfect room for your next
              stay at LUMA Hotel.
            </p>

            <a href="/booking" className="hero-button">
              SEARCH AVAILABLE ROOMS
            </a>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="services-section">
          <p className="section-label">
            OUR SERVICES
          </p>

          <h2>Everything you need.</h2>

          <div className="services-grid">

            <div>
              <h3>01</h3>
              <h4>Free Wi-Fi</h4>
              <p>
                Stay connected throughout your visit.
              </p>
            </div>

            <div>
              <h3>02</h3>
              <h4>Breakfast</h4>
              <p>
                Start your morning with a fresh breakfast.
              </p>
            </div>

            <div>
              <h3>03</h3>
              <h4>Swimming Pool</h4>
              <p>
                Relax by the pool and enjoy your stay.
              </p>
            </div>

            <div>
              <h3>04</h3>
              <h4>Room Service</h4>
              <p>
                Enjoy convenient service from your room.
              </p>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer id="contact">
          <h2>LUMA</h2>

          <p>Your home away from home.</p>

          <p>
            © 2026 LUMA Hotel. All rights reserved.
          </p>
        </footer>

      </div>
  );
}

export default App;
