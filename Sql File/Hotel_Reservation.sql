CREATE TABLE Guests (
    guest_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20)
);

CREATE TABLE Rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Available'
);

CREATE TABLE Reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'Confirmed',

    FOREIGN KEY (guest_id) REFERENCES Guests(guest_id),
    FOREIGN KEY (room_id) REFERENCES Rooms(room_id)
);


INSERT INTO Rooms (room_number, room_type, price, status)
VALUES

-- 20 Standard Rooms
('101', 'Standard Room', 100.00, 'Available'),
('102', 'Standard Room', 100.00, 'Available'),
('103', 'Standard Room', 100.00, 'Available'),
('104', 'Standard Room', 100.00, 'Available'),
('105', 'Standard Room', 100.00, 'Available'),
('106', 'Standard Room', 100.00, 'Available'),
('107', 'Standard Room', 100.00, 'Available'),
('108', 'Standard Room', 100.00, 'Available'),
('109', 'Standard Room', 100.00, 'Available'),
('110', 'Standard Room', 100.00, 'Available'),
('111', 'Standard Room', 100.00, 'Available'),
('112', 'Standard Room', 100.00, 'Available'),
('113', 'Standard Room', 100.00, 'Available'),
('114', 'Standard Room', 100.00, 'Available'),
('115', 'Standard Room', 100.00, 'Available'),
('116', 'Standard Room', 100.00, 'Available'),
('117', 'Standard Room', 100.00, 'Available'),
('118', 'Standard Room', 100.00, 'Available'),
('119', 'Standard Room', 100.00, 'Available'),
('120', 'Standard Room', 100.00, 'Available'),

-- 20 Deluxe Rooms
('201', 'Deluxe Room', 175.00, 'Available'),
('202', 'Deluxe Room', 175.00, 'Available'),
('203', 'Deluxe Room', 175.00, 'Available'),
('204', 'Deluxe Room', 175.00, 'Available'),
('205', 'Deluxe Room', 175.00, 'Available'),
('206', 'Deluxe Room', 175.00, 'Available'),
('207', 'Deluxe Room', 175.00, 'Available'),
('208', 'Deluxe Room', 175.00, 'Available'),
('209', 'Deluxe Room', 175.00, 'Available'),
('210', 'Deluxe Room', 175.00, 'Available'),
('211', 'Deluxe Room', 175.00, 'Available'),
('212', 'Deluxe Room', 175.00, 'Available'),
('213', 'Deluxe Room', 175.00, 'Available'),
('214', 'Deluxe Room', 175.00, 'Available'),
('215', 'Deluxe Room', 175.00, 'Available'),
('216', 'Deluxe Room', 175.00, 'Available'),
('217', 'Deluxe Room', 175.00, 'Available'),
('218', 'Deluxe Room', 175.00, 'Available'),
('219', 'Deluxe Room', 175.00, 'Available'),
('220', 'Deluxe Room', 175.00, 'Available'),

-- 10 Premium Suites
('301', 'Premium Suite', 300.00, 'Available'),
('302', 'Premium Suite', 300.00, 'Available'),
('303', 'Premium Suite', 300.00, 'Available'),
('304', 'Premium Suite', 300.00, 'Available'),
('305', 'Premium Suite', 300.00, 'Available'),
('306', 'Premium Suite', 300.00, 'Available'),
('307', 'Premium Suite', 300.00, 'Available'),
('308', 'Premium Suite', 300.00, 'Available'),
('309', 'Premium Suite', 300.00, 'Available'),
('310', 'Premium Suite', 300.00, 'Available');


INSERT INTO Guests (first_name, last_name, email, phone)
VALUES
('Michael', 'Brown', 'michael.brown@gmail.com', '+1-214-555-1013'),
('Sarah', 'Johnson', 'sarah.johnson@gmail.com', '+1-404-555-1014'),
('Carlos', 'Garcia', 'carlos.garcia@gmail.com', '+1-305-555-1015'),
('Fatima', 'Hassan', 'fatima.hassan@gmail.com', '+971-50-555-1016'),
('William', 'Davis', 'william.davis@gmail.com', '+1-615-555-1017'),
('Emma', 'Miller', 'emma.miller@gmail.com', '+1-312-555-1018'),
('Mohamed', 'Ahmed', 'mohamed.ahmed@gmail.com', '+20-10-5555-1019'),
('Isabella', 'Lopez', 'isabella.lopez@gmail.com', '+1-702-555-1020'),

('Ethan', 'Moore', 'ethan.moore@gmail.com', '+1-206-555-1021'),
('Sara', 'Khan', 'sara.khan@gmail.com', '+92-300-555-1022'),
('Noah', 'Clark', 'noah.clark@gmail.com', '+1-617-555-1023'),
('Zainab', 'Abdi', 'zainab.abdi@gmail.com', '+252-61-555-1024'),
('Lucas', 'Martin', 'lucas.martin@gmail.com', '+33-6-55-55-1025'),
('Charlotte', 'White', 'charlotte.white@gmail.com', '+1-303-555-1026'),
('Yusuf', 'Ibrahim', 'yusuf.ibrahim@gmail.com', '+966-50-555-1027'),
('Amelia', 'Harris', 'amelia.harris@gmail.com', '+1-901-555-1028'),

('Henry', 'Thompson', 'henry.thompson@gmail.com', '+1-713-555-1029'),
('Nora', 'Ali', 'nora.ali@gmail.com', '+44-20-7946-1030'),
('Alexander', 'Lewis', 'alexander.lewis@gmail.com', '+1-407-555-1031'),
('Sofia', 'Walker', 'sofia.walker@gmail.com', '+1-602-555-1032'),
('Abdullah', 'Omar', 'abdullah.omar@gmail.com', '+971-55-555-1033'),
('Grace', 'Hall', 'grace.hall@gmail.com', '+1-503-555-1034'),
('Benjamin', 'Allen', 'benjamin.allen@gmail.com', '+1-512-555-1035'),
('Hana', 'Farah', 'hana.farah@gmail.com', '+252-63-555-1036'),

('Samuel', 'Young', 'samuel.young@gmail.com', '+1-313-555-1037'),
('Chloe', 'King', 'chloe.king@gmail.com', '+1-646-555-1038'),
('Ali', 'Rahman', 'ali.rahman@gmail.com', '+971-52-555-1039'),
('Victoria', 'Scott', 'victoria.scott@gmail.com', '+1-919-555-1040'),
('Daniel', 'Green', 'daniel.green@gmail.com', '+1-615-555-1041'),
('Aisha', 'Mohamed', 'aisha.mohamed@gmail.com', '+254-712-555-1042'),
('Matthew', 'Baker', 'matthew.baker@gmail.com', '+1-504-555-1043'),
('Layla', 'Saleh', 'layla.saleh@gmail.com', '+962-79-555-1044'),

('Joseph', 'Adams', 'joseph.adams@gmail.com', '+1-808-555-1045'),
('Maya', 'Nelson', 'maya.nelson@gmail.com', '+1-615-555-1046'),
('Hassan', 'Yusuf', 'hassan.yusuf@gmail.com', '+252-61-555-1047'),
('Elizabeth', 'Carter', 'elizabeth.carter@gmail.com', '+1-415-555-1048'),
('Andrew', 'Mitchell', 'andrew.mitchell@gmail.com', '+1-469-555-1049'),
('Maryam', 'Abbas', 'maryam.abbas@gmail.com', '+971-54-555-1050'),
('Christopher', 'Perez', 'christopher.perez@gmail.com', '+1-305-555-1051'),
('Natalie', 'Roberts', 'natalie.roberts@gmail.com', '+1-615-555-1052'),

('Ryan', 'Turner', 'ryan.turner@gmail.com', '+1-720-555-1053'),
('Salma', 'Nur', 'salma.nur@gmail.com', '+252-63-555-1054'),
('Jonathan', 'Phillips', 'jonathan.phillips@gmail.com', '+1-202-555-1055'),
('Lily', 'Campbell', 'lily.campbell@gmail.com', '+1-617-555-1056'),
('Khalid', 'Mahmoud', 'khalid.mahmoud@gmail.com', '+20-11-5555-1057'),
('Rachel', 'Parker', 'rachel.parker@gmail.com', '+1-615-555-1058'),
('Nathan', 'Evans', 'nathan.evans@gmail.com', '+1-314-555-1059'),
('Samira', 'Ismail', 'samira.ismail@gmail.com', '+252-61-555-1060');


USE hotel_reservation;

SHOW TABLES;

SELECT * FROM Rooms;

SELECT * FROM Guests;

SELECT * FROM Reservations;

CREATE DATABASE IF NOT EXISTS hotel_reservation;
USE hotel_reservation;

SELECT * FROM hotel_reservation.Rooms;

