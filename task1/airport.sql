
-- COS216 Homework Assignment – Task 1
-- Author: [Stephen] [Molife] [u25368037]


-- ─── Airports ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ha_airports (
    id        INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(120) NOT NULL,
    iata_code CHAR(3)      NOT NULL UNIQUE,
    city      VARCHAR(80)  NOT NULL,
    country   VARCHAR(80)  NOT NULL,
    latitude  DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL
);

-- ─── HA Flights ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ha_flights (
    id                  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    flight_number       VARCHAR(10)   NOT NULL UNIQUE,
    origin_airport_id   INT           NOT NULL,
    destination_airport_id INT        NOT NULL,
    departure_time      DATETIME      NOT NULL,
    flight_duration_hours DECIMAL(5,2) NOT NULL,
    status              ENUM('Scheduled','Boarding','In Flight','Landed') NOT NULL DEFAULT 'Scheduled',
    current_latitude    DECIMAL(9,6)  DEFAULT NULL,
    current_longitude   DECIMAL(9,6)  DEFAULT NULL,
    dispatched_at       DATETIME      DEFAULT NULL,
    FOREIGN KEY (origin_airport_id)      REFERENCES ha_airports(id),
    FOREIGN KEY (destination_airport_id) REFERENCES ha_airports(id)
);

-- ─── Passenger Flights (join table) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ha_passenger_flights (
    id                  INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    passenger_id        INT         NOT NULL,
    flight_id           INT         NOT NULL,
    seat_number         VARCHAR(5)  DEFAULT NULL,
    boarding_confirmed  TINYINT(1)  NOT NULL DEFAULT 0,
    confirmed_at        DATETIME    DEFAULT NULL,
    FOREIGN KEY (passenger_id) REFERENCES users(id),
    FOREIGN KEY (flight_id)    REFERENCES ha_flights(id)
);


-- SEED DATA – 10 airports

INSERT INTO ha_airports (name, iata_code, city, country, latitude, longitude) VALUES
('O.R. Tambo International Airport',        'JNB', 'Johannesburg', 'South Africa',  -26.133694,  28.242317),
('Cape Town International Airport',         'CPT', 'Cape Town',    'South Africa',  -33.964806,  18.601667),
('Heathrow Airport',                        'LHR', 'London',       'United Kingdom', 51.477500,  -0.461389),
('John F. Kennedy International Airport',   'JFK', 'New York',     'USA',            40.639722, -73.778889),
('Dubai International Airport',             'DXB', 'Dubai',        'UAE',            25.252778,  55.364444),
('Sydney Kingsford Smith Airport',          'SYD', 'Sydney',       'Australia',     -33.946110, 151.177222),
('Frankfurt Airport',                       'FRA', 'Frankfurt',    'Germany',        50.033333,   8.570556),
('Singapore Changi Airport',                'SIN', 'Singapore',    'Singapore',       1.359167, 103.989444),
('Nairobi Jomo Kenyatta International',     'NBO', 'Nairobi',      'Kenya',          -1.319167,  36.925833),
('São Paulo–Guarulhos International',       'GRU', 'São Paulo',    'Brazil',         -23.432075, -46.469511);


-- SEED DATA – 10 flights  (origin/destination use the ids inserted above)
-- We reference them by iata_code subquery so order doesn't matter

INSERT INTO ha_flights
    (flight_number, origin_airport_id, destination_airport_id, departure_time, flight_duration_hours, status, current_latitude, current_longitude)
VALUES
-- SA203  JNB → LHR  (~11 h)
('SA203',
 (SELECT id FROM ha_airports WHERE iata_code='JNB'),
 (SELECT id FROM ha_airports WHERE iata_code='LHR'),
 '2026-05-20 08:00:00', 11.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='JNB'),
 (SELECT longitude FROM ha_airports WHERE iata_code='JNB')),

-- SA301  CPT → DXB  (~9 h)
('SA301',
 (SELECT id FROM ha_airports WHERE iata_code='CPT'),
 (SELECT id FROM ha_airports WHERE iata_code='DXB'),
 '2026-05-20 10:30:00', 9.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='CPT'),
 (SELECT longitude FROM ha_airports WHERE iata_code='CPT')),

-- EK761  DXB → SYD  (~14 h)
('EK761',
 (SELECT id FROM ha_airports WHERE iata_code='DXB'),
 (SELECT id FROM ha_airports WHERE iata_code='SYD'),
 '2026-05-20 14:00:00', 14.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='DXB'),
 (SELECT longitude FROM ha_airports WHERE iata_code='DXB')),

-- BA117  LHR → JFK  (~7 h)
('BA117',
 (SELECT id FROM ha_airports WHERE iata_code='LHR'),
 (SELECT id FROM ha_airports WHERE iata_code='JFK'),
 '2026-05-20 09:15:00', 7.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='LHR'),
 (SELECT longitude FROM ha_airports WHERE iata_code='LHR')),

-- SQ318  SIN → FRA  (~13 h)
('SQ318',
 (SELECT id FROM ha_airports WHERE iata_code='SIN'),
 (SELECT id FROM ha_airports WHERE iata_code='FRA'),
 '2026-05-21 00:05:00', 13.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='SIN'),
 (SELECT longitude FROM ha_airports WHERE iata_code='SIN')),

-- KQ100  NBO → JNB  (~3 h)
('KQ100',
 (SELECT id FROM ha_airports WHERE iata_code='NBO'),
 (SELECT id FROM ha_airports WHERE iata_code='JNB'),
 '2026-05-21 07:00:00', 3.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='NBO'),
 (SELECT longitude FROM ha_airports WHERE iata_code='NBO')),

-- LA800  GRU → LHR  (~12 h)
('LA800',
 (SELECT id FROM ha_airports WHERE iata_code='GRU'),
 (SELECT id FROM ha_airports WHERE iata_code='LHR'),
 '2026-05-21 22:00:00', 12.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='GRU'),
 (SELECT longitude FROM ha_airports WHERE iata_code='GRU')),

-- QF001  SYD → DXB  (~14 h)
('QF001',
 (SELECT id FROM ha_airports WHERE iata_code='SYD'),
 (SELECT id FROM ha_airports WHERE iata_code='DXB'),
 '2026-05-22 16:00:00', 14.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='SYD'),
 (SELECT longitude FROM ha_airports WHERE iata_code='SYD')),

-- LH570  FRA → JFK  (~9 h)
('LH570',
 (SELECT id FROM ha_airports WHERE iata_code='FRA'),
 (SELECT id FROM ha_airports WHERE iata_code='JFK'),
 '2026-05-22 11:00:00', 9.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='FRA'),
 (SELECT longitude FROM ha_airports WHERE iata_code='FRA')),

-- AA290  JFK → CPT  (~16 h)
('AA290',
 (SELECT id FROM ha_airports WHERE iata_code='JFK'),
 (SELECT id FROM ha_airports WHERE iata_code='CPT'),
 '2026-05-23 18:30:00', 16.00, 'Scheduled',
 (SELECT latitude FROM ha_airports WHERE iata_code='JFK'),
 (SELECT longitude FROM ha_airports WHERE iata_code='JFK'));


-- SEED – link existing passengers to flights for testing.

INSERT INTO ha_passenger_flights (passenger_id, flight_id, seat_number)
VALUES
 ((SELECT id FROM users WHERE email='iceman@gmail.com'), (SELECT id FROM ha_flights WHERE flight_number='SA203'), '14A'),
 ((SELECT id FROM users WHERE email='iceman@gmail.com'), (SELECT id FROM ha_flights WHERE flight_number='KQ100'), '3B');