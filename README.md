# Xola Webhook Handler
This application is designed to process incoming webhook data from Xola, a platform for managing bookings and payments. It receives JSON data from Xola's webhook endpoint, processes the booking details, and stores the relevant data in a PostgreSQL database.

## Features

- Handles Xola webhook data for both **professional learning** and **youth experience** events.
- Extracts and processes all necessay details in JSON like experiences, demographics, quantity, notes, name, email, date and add-ons.
- Integrates with a PostgreSQL database to store processed data for further use.
- Provides logic for handling different events and order statuses(Integer such as `order.update`, `order.create` and status of order.

---
## Technologies Used

- **Node.js** and **Express.js** for the server
- **PostgreSQL** for database storage
- **Body-Parser** for parsing incoming webhook payloads
- **Xola Webhook ** to receive booking and event updates

---
## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm (Node Package Manager)

#### Step 1: Clone the Repository

Clone the repository to your local machine using the following command:

```bash
git clone https://github.com/GoldenEye10/WebhookTest.git
```

#### Step 2: Navigate to the Project Folder

Once you’ve cloned the repository, change to the project directory:
cd WebhookTest

#### Step 3: Install Dependencies

Run the following command to install the required dependencies:
```bash
npm install express
npm install body-parser
npm intall pg
```

#### Step 4: Set Up PostgreSQL Database Connection

Create a .env file in the root of the project and define your PostgreSQL database connection parameters:

```bash
DB_USER=your-database-user
DB_HOST=your-database-host
DB_DATABASE=your-database-name
DB_PASSWORD=your-database-password
DB_PORT=5432

PORT= ....(8000 or any port you want it to run)
```

#### Step 5: Start the Application

Run the following command to start the application:
```bash
npm start
```
The application will listen for incoming webhooks on port specified in PORT of .env file

---
## How It Works
1. **Webhook Endpoint**:
    - Listens on `/webhook`.
    - Parses incoming payload and identifies the type of experience (professional or youth).

2. **Professional Learning**:
    - Collects relevant details like themes, locations, and programs.
    - Inserts data into corresponding database tables.
    - Calls various helper functions (e.g., `Invoice`, `getThemes`, etc.) for processing.

3. **Youth Experience**:
    - Similar to professional learning but uses different workflows to handle school-related data.

4. **Duplicate Prevention**:
    - Tracks processed event IDs in memory to avoid reprocessing.

5. **Database Transaction**:
    - Ensures atomicity for each webhook event using `BEGIN` and `COMMIT`.

---

## Database Interaction
This application interacts with multiple database tables:

- **Invoices**: Stores invoice details.
- **Themes**: Associates the booking with specific themes.
- **Locations**: Tracks booking locations.
- **Programs**: Maps programs to bookings.
- **Contacts**: Saves customer contact details.
- **ProfessionalLearningClasses**: Stores data for professional learning classes.
- **YouthExperienceClasses**: Stores data for youth experience bookings.

> **Note**: Ensure the database schema matches the expected structure.
---

## Example Payload
Here is an example JSON payload that the application processes:
```bash
{
  "eventName": "order.update",
  "data": {
    "id": "674a1e2d7bce49752d08ddc9",
    "object": "order",
    "status": "committed",
    "reminders": [],
    "notes": [],
    "source": "checkout",
    "dueNow": 0,
    "trackingData": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    },
    "telemetry": [],
    "customerName": "Prabin Shrestha",
    "customerEmail": "prabin@testtest.test",
    "phone": "9999999999",
    "phoneCanonical": "9999999999",
    "currency": "USD",
    "amount": 210,
    "balance": 0,
    "tags": [
      {
        "id": "Multi-item",
        "system": true
      },
      {
        "id": "asd"
      },
      {
        "id": "test32",
        "system": true,
        "type": "coupon_code"
      }
    ],
    "customerTimezoneName": "America/Vancouver",
    "createdAt": "2024-11-29T20:03:57+00:00",
    "createdBy": {
      "id": "674a1e461b9d8f2d76038afb"
    },
    "updatedAt": "2024-12-04T23:05:33+00:00",
    "conversation": {
      "id": "674a1e471b9d8f2d76038b54"
    },
    "seller": {
      "id": "66fed0e5bc104b5b0e02f07b"
    },
    "organizer": {
      "id": "674a1e461b9d8f2d76038afb"
    },
    "splitPayment": {
      "enabled": false
    },
    "paymentReminders": [],
    "travelers": [
      {
        "id": "674a1e461b9d8f2d76038afb"
      }
    ],
    "items": [
      {
        "id": "674a1e2d7bce49752d08ddca",
        "arrival": "2024-12-16",
        "experience": {
          "id": "671a908096933608b70dd4cd"
        },
        "name": "YOUTH INDOOR - SESSION 1 OF 2",
        "createdAt": "2024-11-29T20:03:57+00:00",
        "updated": "2024-12-04T23:05:33+00:00",
```
---

## Error Handling

The application implements robust error handling to ensure stability:

1. **Invalid Payloads:**
       - Logs the issue and responds with a 400 Bad Request.
2. **Database Errors:**
      -  Rolls back incomplete transactions and responds with a 500 Internal Server Error.
3. **Duplicate Events:**
       - Prevents reprocessing by tracking event IDs in memory.

---
## API Responses
The webhook endpoint provides clear responses to indicate the processing status:

   - 200 OK: The webhook is successfully processed or skipped (duplicate detection).
   - 400 Bad Request: The incoming payload is invalid or malformed.
   - 500 Internal Server Error: An unexpected error occurred during processing.

---
## Customization Options
You can customize the following aspects of the application:

- Specified Values:

    Modify the specifiedValues array to detect professional learning events based on your specific requirements.

- Logging and Debugging:

    Adjust console.log statements or implement a logging library for more advanced tracking.
---

## Testing
You can test the webhook endpoint using a tool like Postman or cURL:
Using Postman:

- Set the URL to http://localhost:8000/webhook.
- Select the POST method.
- Add a JSON payload in the request body.
- Set the Content-Type header to application/json.
- Send the request and verify the response.
