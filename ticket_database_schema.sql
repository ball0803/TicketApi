CREATE DATABASE Ticket_Database;
CREATE TABLE Users(
	user_id SERIAL NOT NULL PRIMARY KEY,
	f_name varchar(100) NOT NULL,
	l_name varchar(100) NOT NULL,
	gender varchar(10) NOT NULL,
	email varchar(30) NOT NULL,
	tel varchar(10) NOT NULL,
	DOB timestamp NOT NULL,
	user_role varchar(20) NOT NULL
);

CREATE TABLE PaymentInfo(
	payment_info_id SERIAL NOT NULL PRIMARY KEY,
	card_id int,
	payment_name varchar(100),
	payment_method varchar(100) NOT NULL,
	promp_pay int DEFAULT NULL,
	expired_date timestamp
);

CREATE TABLE Event (
	event_id SERIAL NOT NULL PRIMARY KEY,
	organize_id int NOT NULL,
	event_name varchar(100) NOT NULL,
	event_startdate timestamp NOT NULL,
	event_enddate timestamp NOT NULL,
	location varchar(200) NOT NULL,
	email varchar(30) DEFAULT NULL,
	tel varchar(10) DEFAULT NULL,
	website text DEFAULT NULL,
	approved bool NOT NULL DEFAULT FALSE,
	payment_info_id int DEFAULT NULL,
	event_description text NOT NULL,
	poster varchar(700) DEFAULT NULL,
	event_type_id int NOT NULL,
	CONSTRAINT paymentInfo
		FOREIGN KEY(payment_info_id) 
			REFERENCES paymentinfo(payment_info_id) 
			ON DELETE SET NULL 
			ON UPDATE CASCADE
);

CREATE TABLE Categories(
	categories_id SERIAL NOT NULL PRIMARY KEY,
	categories_name varchar(100)
);

CREATE TABLE CategoriesView(
    event_id int NOT NULL,
    categories_id int NOT NULL,
    CONSTRAINT fk_event
        FOREIGN KEY(event_id)
            REFERENCES event(event_id) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE,
    CONSTRAINT fk_categories
        FOREIGN KEY(categories_id) 
            REFERENCES categories(categories_id) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE
);


CREATE TABLE Organize(
	organize_id SERIAL NOT NULL PRIMARY KEY,
	name varchar(100) NOT NULL,
	tel varchar(10),
	website text,
	payment_info_id int,
	CONSTRAINT paymentInfo
		FOREIGN KEY(payment_info_id) 
			REFERENCES paymentinfo(payment_info_id) 
			ON DELETE SET NULL 
			ON UPDATE CASCADE
);

CREATE TABLE Member(
	organize_id int NOT NULL,
	user_id int NOT NULL,
	role varchar(20) NOT NULL,
	CONSTRAINT fk_users
		FOREIGN KEY(user_id)
			REFERENCES users(user_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	CONSTRAINT fk_organize
		FOREIGN KEY(organize_id)
			REFERENCES Organize(organize_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);

CREATE TABLE UserPayment(
	payment_info_id int NOT NULL,
	user_id int NOT NULL,
	CONSTRAINT fk_paymentInfo
		FOREIGN KEY(payment_info_id)
			REFERENCES PaymentInfo(payment_info_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	CONSTRAINT fk_user
		FOREIGN KEY(user_id)
			REFERENCES	users(user_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);

CREATE TABLE Voucher(
	voucher_id SERIAL NOT NULL PRIMARY KEY,
	expire_date timestamp NOT NULL,
	voucher_code varchar(10) NOT NULL,
	event_id int NOT NULL,
	amount decimal(20, 2) NOT NULL,
	status boolean NOT NULL DEFAULT FALSE,
	usage_limit int NOT NULL,
	CONSTRAINT fk_event
		FOREIGN KEY(event_id)
			REFERENCES Event(event_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);

CREATE TABLE Booking(
	booking_id SERIAL NOT NULL PRIMARY KEY,
	booking_date timestamp NOT NULL,
	user_id int NOT NULL,
	payment_info_id int NOT NULL,
	event_id int NOT NULL,
	quantity int NOT NULL,
	voucher_id int,
	CONSTRAINT fk_user
		FOREIGN KEY(user_id)
			REFERENCES users(user_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	CONSTRAINT fk_payment
		FOREIGN KEY(payment_info_id)
			REFERENCES paymentInfo(payment_info_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	CONSTRAINT fk_event
		FOREIGN KEY(event_id)
			REFERENCES event(event_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	CONSTRAINT fk_voucher_id
	FOREIGN KEY(voucher_id)
		REFERENCES voucher(voucher_id)
		ON DELETE SET NULL
		ON UPDATE CASCADE
);

CREATE TABLE EventType(
	event_type_id SERIAL NOT NULL PRIMARY KEY,
	event_type varchar NOT NULL
);

CREATE TABLE SeatType(
	seat_type_id SERIAL NOT NULL PRIMARY KEY,
	event_id int NOT NULL,
	seat_type varchar NOT NULL,
	price decimal(20, 2) NOT NULL,
	quantity_limit int NOT NULL,
	sale_startdate timestamp NOT NULL,
	sale_enddate timestamp NOT NULL,
	seat_type_description text NOT NULL,
	CONSTRAINT fk_event
		FOREIGN KEY(event_id)
			REFERENCES event(event_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);

CREATE TABLE SeatTypeNo(
	seat_type_id int NOT NULL,
	seat_row varchar NOT NULL,
	seat_start int NOT NULL,
	seat_end int NOT NULL,
	CONSTRAINT fk_seat_type
		FOREIGN KEY(seat_type_id)
			REFERENCES SeatType(seat_type_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);

CREATE TABLE Payment(
	payment_id SERIAL NOT NULL PRIMARY KEY,
	payment_info_id int NOT NULL,
	payment_date timestamp NOT NULL,
	amount int NOT NULL,
	booking_id int NOT NULL,
	CONSTRAINT fk_paymnt_info
		FOREIGN KEY(payment_info_id)
			REFERENCES paymentInfo(payment_info_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	CONSTRAINT fk_booking
	FOREIGN KEY(booking_id)
		REFERENCES Booking(booking_id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE
);

CREATE TABLE ETicket(
	ticket_id Serial NOT NULL PRIMARY KEY,
	booking_id int NOT NULL,
	ticket_date timestamp NOT NULL,
	isCheckin boolean NOT NULL DEFAULT FALSE,
	isRefund boolean NOT NULL DEFAULT FALSE,
	refundable boolean NOT NULL DEFAULT FALSE,
	seat_no varchar(100) NOT NULL,
	seat_type_id int NOT NULL,
	CONSTRAINT fk_booking
	FOREIGN KEY(booking_id)
		REFERENCES Booking(booking_id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE,
	CONSTRAINT fk_seat_type
	FOREIGN KEY(seat_type_id)
		REFERENCES seatType(seat_type_id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE
);

CREATE TABLE FollowedEvent(
	user_id int NOT NULL,
	event_id int NOT NULL,
	CONSTRAINT fk_event
		FOREIGN KEY(event_id)
			REFERENCES event(event_id) 
			ON DELETE CASCADE 
			ON UPDATE CASCADE,
	CONSTRAINT fk_users
		FOREIGN KEY(user_id)
			REFERENCES users(user_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);