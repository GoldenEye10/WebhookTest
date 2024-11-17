# Xola Webhook
This application is designed to process incoming webhook data from Xola, a platform for managing bookings and payments. It receives JSON data from Xola's webhook endpoint, processes the booking details, and stores the relevant data in a PostgreSQL database.

## Features

- Handles Xola webhook data for both **professional learning** and **youth experience** events.
- Extracts and processes all necessay details in JSON like experiences, demographics, quantity, notes, name, email, date and add-ons.
- Integrates with a PostgreSQL database to store processed data for further use.
- Provides logic for handling different events and order statuses(Integer such as `order.update`, `order.create` and status of order.

## Technologies Used

- **Node.js** and **Express.js** for the server
- **PostgreSQL** for database storage
- **Body-Parser** for parsing incoming webhook payloads
- **Xola Webhook Integration** to receive booking and event updates

