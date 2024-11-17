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

## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL

### Step 1: Clone the Repository

Clone the repository to your local machine using the following command:

```bash
git clone https://github.com/GoldenEye10/WebhookTest.git


Step 2: Navigate to the Project Folder

Once you’ve cloned the repository, change to the project directory:
cd WebhookTest

Step 3: Install Dependencies

Run the following command to install the required dependencies:
npm install

Step 4: Set Up PostgreSQL Database Connection

Create a .env file in the root of the project and define your PostgreSQL database connection parameters:
DB_USER=your-database-user
DB_HOST=your-database-host
DB_DATABASE=your-database-name
DB_PASSWORD=your-database-password
DB_PORT=5432

Step 5: Start the Application

Run the following command to start the application:
npm start

The application will listen for incoming webhooks on port 3004 or the port specified in your environment variables.
