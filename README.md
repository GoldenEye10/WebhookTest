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
- npm (Node Package Manager)

### Step 1: Clone the Repository

Clone the repository to your local machine using the following command:

```bash
git clone https://github.com/GoldenEye10/WebhookTest.git
```

###Step 2: Navigate to the Project Folder

Once you’ve cloned the repository, change to the project directory:
cd WebhookTest

###Step 3: Install Dependencies

Run the following command to install the required dependencies:
```bash
npm install express
npm install body-parser
npm intall pg
```

###Step 4: Set Up PostgreSQL Database Connection

Create a .env file in the root of the project and define your PostgreSQL database connection parameters:

```bash
DB_USER=your-database-user
DB_HOST=your-database-host
DB_DATABASE=your-database-name
DB_PASSWORD=your-database-password
DB_PORT=5432

PORT= ....(8000 or any port you want it to run)
```

###Step 5: Start the Application

Run the following command to start the application:
```bash
npm start
```
The application will listen for incoming webhooks on port specified in PORT of .env file

##How It Works

    1. Webhook Endpoint:
        Listens on /webhook.
        Parses incoming payload and identifies the type of experience (professional or youth).

    2. Professional Learning:
        Collects relevant details like themes, locations, and programs.
        Inserts data into corresponding database tables.
        Calls various helper functions (Invoice, getThemes, etc.) for processing.

   3. Youth Experience:
        Similar to professional learning but uses different workflows to handle school-related data.

   4. Duplicate Prevention:
        Tracks processed event IDs in-memory to avoid reprocessing.

   5.  Database Transaction:
        Ensures atomicity for each webhook event using BEGIN and COMMIT.

##Database Interaction

This application interacts with multiple database tables:

    Invoices: Stores invoice details.
    Themes: Associates the booking with specific themes.
    Locations: Tracks booking locations.
    Programs: Maps programs to bookings.
    Contacts: Saves customer contact details.
    ProfessionalLearningClasses: Stores data for professional learning classes.
    YouthExperienceClasses: Stores data for youth experience bookings.

    Note: Ensure the database schema matches the expected structure.
