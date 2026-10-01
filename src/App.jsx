import './App.css'

function App() {
  return (
    <div className="website">

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">LUMA</div>

        <div className="nav-links">
          <a href="#home">HOME</a>
          <a href="#about">ABOUT</a>
          <a href="#rooms">ROOMS</a>
          <a href="#services">SERVICES</a>
          <a href="#contact">CONTACT</a>
        </div>

        <button className="book-button">BOOK NOW</button>
      </nav>


      {/* Hero */}
      <section id="home" className="hero-section">
        <div className="hero-content">

          <p className="small-title">WELCOME TO OUR HOTEL</p>

          <h1>Stay Somewhere<br />Worth Remembering</h1>

          <p>A quiet place to rest, reconnect, and make yourself at home.</p>

          <button className="hero-button">BOOK YOUR STAY</button>
        </div>
      </section>


      {/* About */}
      <section id="about" className="about-section">
        <div className="about-text">
          <p className="section-label">THE LUMA EXPERIENCE</p>

          <h2>A slower way to stay.</h2>

          <p>
            LUMA is designed for guests who value comfort, simplicity,
            and a space that feels like their own.
          </p>
        </div>

        <div className="about-image">
          <img
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945"
            alt="Luxury hotel"
          />
        </div>
      </section>


      {/* Rooms */}
      <section id="rooms" className="rooms-section">
        <p className="section-label">YOUR SPACE</p>

        <h2>Rooms & Suites</h2>

        <div className="room-grid">

          <div className="room-card">
            <img
              src="https://images.unsplash.com/photo-1611892440504-42a792e24d32"
              alt="Deluxe room"
            />

            <div className="room-info">
              <h3>Deluxe Room</h3>
              <p>Comfortable room with everything you need.</p>
              <button>VIEW ROOM</button>
            </div>
          </div>

          <div className="room-card">
            <img
              src="https://images.unsplash.com/photo-1590490360182-c33d57733427"
              alt="Luxury suite"
            />

            <div className="room-info">
              <h3>Luxury Suite</h3>
              <p>A spacious suite designed for a relaxing stay.</p>
              <button>VIEW ROOM</button>
            </div>
          </div>

          <div className="room-card">
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"
              alt="Premium suite"
            />

            <div className="room-info">
              <h3>Premium Suite</h3>
              <p>Extra space and comfort for a special getaway.</p>
              <button>VIEW ROOM</button>
            </div>
          </div>

        </div>
      </section>


      {/* Booking */}
      <section className="booking-section">

        <div className="booking-content">
          <p className="section-label">PLAN YOUR STAY</p>

          <h2>Check Availability</h2>

          <div className="booking-form">

            <div>
              <label>CHECK-IN</label>
              <input type="date" />
            </div>

            <div>
              <label>CHECK-OUT</label>
              <input type="date" />
            </div>

            <div>
              <label>GUESTS</label>
              <input type="number" min="1" defaultValue="2" />
            </div>

            <button>SEARCH ROOMS</button>

          </div>
        </div>

      </section>


      {/* Services */}
      <section id="services" className="services-section">

        <p className="section-label">OUR SERVICES</p>

        <h2>Everything you need.</h2>

        <div className="services-grid">

          <div>
            <h3>01</h3>
            <h4>Free Wi-Fi</h4>
            <p>Stay connected throughout your visit.</p>
          </div>

          <div>
            <h3>02</h3>
            <h4>Breakfast</h4>
            <p>Start your morning with a fresh breakfast.</p>
          </div>

          <div>
            <h3>03</h3>
            <h4>Swimming Pool</h4>
            <p>Relax by the pool and enjoy your stay.</p>
          </div>

          <div>
            <h3>04</h3>
            <h4>Room Service</h4>
            <p>Enjoy convenient service from your room.</p>
          </div>

        </div>

      </section>


      {/* Footer */}
      <footer id="contact">
        <h2>LUMA</h2>

        <p>
          Your home away from home.
        </p>

        <p>
          © 2026 Hotel Name. All rights reserved.
        </p>
      </footer>

    </div>
  )
}

export default App