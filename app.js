const express = require('express');
const bodyParser = require('body-parser');
//const mysql = require('mysql2'); 
const sql = require('mssql'); // Import the mssql module
const app = express();
const PORT = process.env.PORT || 3004;
const { Pool } = require('pg');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Variable to store the latest webhook data
let latestWebhookData = {};
let allQuestions = [];
// Handle Xola webhook
app.post('/webhook', async(req, res) => {
    console.log('Webhook received:');
   // console.log(req.body); // Log the entire webhook payload
   console.log(JSON.stringify(req.body, null, 2));

    // Collect all experiences (names) from the array of items
   // const experiences = req.body.data.items.map(item => item?.name ?? null);
    const notes = req.body.data.notes.map(note => note?.text ?? null);

     allQuestions = [];
// Initialize arrays to store multiple values
    const experiences = [];
    const experiencesID = [];
    const bookedDate = [];
    const quantity = [];
    const demographic = [];
    const notesArray = [];
    const addons1Array = [];
    const addons2Array = [];
    

     // Loop through each item in the `items` array and collect values
     req.body.data.items.forEach(item => {
        experiences.push(item?.name ?? null); // Collect experiences
        experiencesID.push(item?.id ?? null); // collect id for each experience
        bookedDate.push(item?.arrival?? null); // Collect arrivalDatetime for each item
        quantity.push(item?.quantity?? null); // select the quantity
        demographic.push(item?.demographics?.[0]. quantity?? null); 
        addons1Array.push(item?.addOns?.[0]?.configuration?.name ?? null); // Collect Addons1 name
        addons2Array.push(item?.addOns?.[1]?.configuration?.name ?? null); // Collect Addons2 name
            // Check if guestsData exists and is an array
    
        let questionArray = [];
            if (Array.isArray(item?.guestsData)) {
        item.guestsData.forEach(guest => {
            // Check if fields exist and is an array
            if (Array.isArray(guest?.fields)) {
                guest.fields.forEach(field => {
                    // Push each field's value if it exists, otherwise push null
                    questionArray.push(field?.value ?? null);
                });
            }
        });
    }
    else{
        questionArray.push(null);
    }

    allQuestions.push({ Questions: questionArray });
    });


// Access Questions1 and Questions2
    const Questions1 = allQuestions[0]?.Questions ?? null;
    const Questions2 = allQuestions.length > 1 ? allQuestions[1]?.Questions ?? 0 : 0;


    req.body.data.notes.forEach(note => {
        notesArray.push(note?.text ?? null);
    });


// Store the received data
    latestWebhookData = {
        eventName: req.body.eventName ?? null,
        id: req.body.data.id ?? null,
        paymentMethod: req.body.data.adjustments[0]?.meta?.payment?.method ?? null,
        customerName: req.body.data.customerName ?? null,
        customerEmail: req.body.data.customerEmail ?? null,
        phone: req.body.data.phone ?? null,
        amount: req.body.data.amount ?? null,
        ExperiencesID: experiencesID,
        Experiences: experiences,
        Demographics: demographic, // Array of all experiences
        Quantity: quantity,
        arrivalDate: bookedDate, // Array of all createdAt times
        notes: notesArray, // Array of all notes
        addons1: addons1Array, // Array of all Addons1 names
        addons2: addons2Array, // Array of all Addons2 names
        Questions1: Questions1,
        Questions2: Questions2, // array of questions
    };

    //console.log('Stored webhook data:', latestWebhookData);
    console.log('Stored webhook data:', JSON.stringify(latestWebhookData, null, 2));

   
    try {
        // Handle order.create and order.update cases
        if (latestWebhookData.eventName === 'order.create') {
            await insertData3(latestWebhookData);
            return res.status(200).send('Webhook received and data inserted in PostgreSQL for order.create');
        }

        if (latestWebhookData.eventName === 'order.update') {
            await insertData3(latestWebhookData); // Assuming you want to call insertData3 for updates as well
            await insertData5(latestWebhookData); // Call insertData5 as needed
            return res.status(200).send('Webhook received and data updated in PostgreSQL for order.update');
        }

        // Handle order.cancel case
        if (latestWebhookData.eventName === 'order.cancel') {
            console.log("Cancel order received");
            return res.status(200).send('Webhook received for order.cancel');
        }

        // Handle unrecognized event names
        return res.status(400).send('Unrecognized event name');
        
    } catch (error) {
        console.error('Error processing webhook:', error);
        return res.status(500).send('An error occurred while processing the webhook');
    }
 
    });

    

    //insert intp mssql actual tables
async function insertData2(latestWebhookData) { // Accept booking as a parameter
        try {
            // Database configuration
            const config = {
                user: 'Prabin', 
                password: 'T00664996@mytru.ca', 
                server: 'siralex.database.windows.net', 
                database: 'cpaws-sql-test', 
                options: {
                    encrypt: true, // Change this as per your setup
                },
            };
    
            // Connect to the database
            await sql.connect(config);
            const request = new sql.Request();


            //insert into actual tables

            //fist we split the name we got into first and last name
            const nameParts = latestWebhookData.customerName.split(" ");
            const fname = nameParts[0];
            const lname = nameParts[1];

            //Select the table using that name to see if that person already exists in Teachers table
            const query = `
            SELECT * FROM Teachers
            WHERE FirstName = @firstName AND LastName = @lastName
            `;

            request.input('firstName', sql.NVarChar, fname);
            request.input('lastName', sql.NVarChar, lname);

            console.log(fname);
            console.log(lname);
            const result = await request.query(query);
            let TeacherID;
            let SchooldID;

            /**
            // Start of inserting into booking and customer table
            const nameParts = latestWebhookData.customerName.split(" ");
            const fname = nameParts[0];
            const lname = nameParts[1];

            const query = `
            SELECT * FROM Customers
            WHERE first_name = @firstName AND last_name = @lastName
            `;

            // Set the input parameters
            request.input('firstName', sql.NVarChar, fname);
            request.input('lastName', sql.NVarChar, lname);

            console.log(fname);
            console.log(lname);
            const result = await request.query(query);
            let customerID;

            if (result.recordset.length > 0) {
                console.log('Customer exists. CustomerID:', result.recordset[0].customer_id);
                customerID = result.recordset[0].customer_id

            
            } else {
                console.log('Customer does not exist.');

                const insertQuery = `
                INSERT INTO Customers (first_name, last_name, email, phone, xolabookingid)
                VALUES (@firstName, @lastName, @Email, @Phone, @XolaBookingID);
                SELECT SCOPE_IDENTITY() AS customer_id; 
                `;


                request.input('Email', sql.NVarChar, latestWebhookData.customerEmail);
                request.input('Phone', sql.NVarChar, latestWebhookData.phone);
                request.input('XolaBookingID', sql.NVarChar, latestWebhookData.id);

                const insertResult = await request.query(insertQuery);
                customerID = insertResult.recordset[0].customer_id

                console.log('New customer inserted successfully.');
            }
            
                    // Insert into the Booking table with customer_id
            const bookingQuery = `
            INSERT INTO Booking(CustomerID)
            VALUES (@CustomerId)
            `;

            request.input('CustomerId', sql.Int, customerID);
            console.log(customerID);
            await request.query(bookingQuery);



 */

            // Start of inserting into actual tables
            /**
            // for Teachers
            const maxIdResult = await request.query('SELECT MAX(ID) AS maxId FROM Teachers');
            const maxId = maxIdResult.recordset[0].maxId || 0; // If no records, maxId will be 0
            const newId = maxId + 1;
            const nameParts = latestWebhookData.customerName.split(" ");
            const fname = nameParts[0];
            const lname = nameParts[1];
            let date_created = new Date().toISOString().slice(0, 19).replace('T', ' ');
            //For Billing
            // Step 1: Query the maximum ID from the table
            const maxBillIDResult = await request.query('SELECT MAX(ID) AS maxBillId FROM Billing');
            const maxBillId = maxBillIDResult.recordset[0].maxBillId || 0; // If no records, maxId will be 0
            const newBillId = maxBillId + 1;
      
            const insertQuery = `
              INSERT INTO Teachers 
              (ID, LastName, FirstName, TitleID, Email, DateCreated, Dateupdated, IsDeleted) 
              VALUES 
              (@ID, @LastName, @FirstName, Null, @Email, @Datecreated, Null, Null)
            `;
            
            //const totalAmt = latestWebhookData.AddonsPrice + latestWebhookData.Addons2Price + latestWebhookData.amount;
         //   const BillingInsert = `
         //   INSERT INTO Billing
          //  (ID, DateInvoiceSent, Cost, InvoiceNumber, Paid, DateCreated, DateUpdated, IsDeleted)
          //  VALUES
           // (@BillID, NULL, @cost, NULL, NULL, @Datecreated, NULL, NULL)`

           
            // Set the input parameters
            request.input('ID', sql.Int, newId);
            request.input('LastName', sql.NVarChar(50), lname);
            request.input('FirstName', sql.NVarChar(50), fname);
            request.input('Email', sql.NVarChar(50), latestWebhookData.customerEmail);
            request.input('Datecreated', sql.DateTime2(7), date_created);

            //Billing
            request.input('BillID', sql.Int, newBillId);
            request.input('cost', sql.Float, latestWebhookData.amount);
    
            // Execute the insert query
            const result = await request.query(insertQuery);
            const result1 = await request.query(BillingInsert);
    
            console.log('Data inserted successfully 2:', result);
            console.log('Billing Data inserted successfully 2:', result1);  */


        } catch (err) {
            console.error('Error inserting data:', err);
        }
    }


    // for postgres single table
    async function insertData3(latestWebhookData) {
        // PostgreSQL database configuration
        const pool = new Pool({
            user: 'cpawssadb',
            host: '164.90.150.233',
            database: 'cpawsdb', 
            password: 'cpaws@edu24',  
            port: 5432, 
            ssl: {
                rejectUnauthorized: false 
            }
        });
    
        const client = await pool.connect();    
   
        try {
            const currentDate = new Date().toISOString().split('T')[0];
            const arrivalDate = latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[0] : null;
            const fiscalYear = arrivalDate ? new Date(arrivalDate).getFullYear() : null;
    
            if (latestWebhookData.eventName === 'order.create') {
                // Loop through the bookings to insert multiple rows
                for (let i = 0; i < latestWebhookData.ExperiencesID.length; i++) {
                    const insertQuery = `
                        INSERT INTO saltcorn.XolaBooking (
                            EventName, 
                            XolaBookingID, 
                            PaymentMethod, 
                            CustomerFirstName, 
                            CustomerLastName, 
                            CustomerEmail, 
                            Phone, 
                            Invoice, 
                            Amount, 
                            ExperienceID, 
                            Experience, 
                            Quantity, 
                            Grades, 
                            SchoolName, 
                            SchoolBoard, 
                            Address, 
                            NumStudents, 
                            ArrivalDate, 
                            CreatedDate, 
                            UpdatedDate, 
                            ArrivalTime, 
                            Note, 
                            Theme, 
                            Location, 
                            Paid, 
                            Fiscal, 
                            InXola, 
                            Project, 
                            Funder, 
                            Subsidy, 
                            DepositNotes
                        ) 
                        VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, 
                            $10, $11, $12, $13, $14, $15, $16, 
                            $17, $18, $19, $20, $21, $22, $23, 
                            $24, $25, $26, $27, $28, $29, $30, 
                            $31)`;
    
                    await client.query(insertQuery, [
                        latestWebhookData.eventName || null, // EventName
                        latestWebhookData.id || null, // XolaBookingID
                        latestWebhookData.paymentMethod || null, // PaymentMethod
                        latestWebhookData.customerName ? latestWebhookData.customerName.split(" ")[0] : null, // CustomerFirstName
                        latestWebhookData.customerName ? latestWebhookData.customerName.split(" ")[1] : null, // CustomerLastName
                        latestWebhookData.customerEmail || null, // CustomerEmail
                        latestWebhookData.phone || null, // Phone
                        null, // Invoice#
                        latestWebhookData.amount || 0, // Amount
                        latestWebhookData.ExperiencesID[i] || null, // ExperienceID
                        latestWebhookData.Experiences[i] || null, // Experience
                        latestWebhookData.Quantity[i] || null, // Quantity
                        latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 1 ? latestWebhookData.Questions1[1] : null, // Grades
                        latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 4 ? latestWebhookData.Questions1[4] : null, // SchoolName
                        latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 3 ? latestWebhookData.Questions1[3] : null, // SchoolBoard
                        null, // Address
                        latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 2 ? latestWebhookData.Questions1[2] : null, // NumStudents
                        latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[0] : null, // ArrivalDate
                        currentDate, // CreatedDate
                        currentDate, // UpdatedDate
                        latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[0] : null, // ArrivalTime
                        latestWebhookData.notes && latestWebhookData.notes.length > 0 ? latestWebhookData.notes.join(", ") : null, // Note
                        latestWebhookData.addons1 && latestWebhookData.addons1.length > 0 ? latestWebhookData.addons1[0] : null, // Theme
                        latestWebhookData.addons2 && latestWebhookData.addons2.length > 0 ? latestWebhookData.addons2[0] : null, // Location
                        false, // Paid (default false)
                        fiscalYear, // Fiscal
                        true, // InXola (default true)
                        "909 Education General", // Project
                        "Program Funds", // Funder
                        null, // Subsidy
                        null // DepositNotes
                    ]);
    
                    console.log(`Data inserted successfully for order.create: ${latestWebhookData.id}, ExperienceID: ${latestWebhookData.ExperiencesID[i]}`);
                }
            } else if (latestWebhookData.eventName === 'order.update') {
                // Loop through the bookings to update multiple rows
                const experienceIDs = latestWebhookData.ExperiencesID; // Get all Experience IDs
                const updateQueries = []; // Store queries to execute later

    // Construct different update queries based on the number of Experience IDs
    if (experienceIDs.length > 0 && (latestWebhookData.Questions2.length < 2)) {
        const updateQuery1 = `
            UPDATE saltcorn.XolaBooking 
            SET 
                EventName = $1,
                PaymentMethod = $2,
                ExperienceID = $3,
                Grades = $4,
                SchoolName = $5,
                SchoolBoard = $6,
                NumStudents = $7,
                ArrivalDate = $8,
                UpdatedDate = $9,
                ArrivalTime = $10,
                Paid = $11
            WHERE XolaBookingID = $12 AND ExperienceID = $13`;

        // Add first update query
        updateQueries.push(client.query(updateQuery1, [
            latestWebhookData.eventName || null,
            latestWebhookData.paymentMethod || null,
            experienceIDs[0] || null, // ExperienceID[0]
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[1] : null, // Grades
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 4 ? latestWebhookData.Questions1[4] : null, // SchoolName
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 3 ? latestWebhookData.Questions1[3] : null, // SchoolBoard
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 2 ? latestWebhookData.Questions1[2] : null, // NumStudents
            latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[0] : null, // ArrivalDate
            currentDate, // UpdatedDate
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[0] : null, // ArrivalTime
            false, // Paid (default false)
            latestWebhookData.id || null, // XolaBookingID
            experienceIDs[0] || null, // ExperienceID[0]
            
        ]));
    }

    else if(experienceIDs.length > 0 && latestWebhookData.Questions2 == 0) {
        const updateQuery3 = `
            UPDATE saltcorn.XolaBooking 
            SET 
                EventName = $1,
                PaymentMethod = $2,
                ExperienceID = $3,
                Grades = $4,
                SchoolName = $5,
                SchoolBoard = $6,
                NumStudents = $7,
                ArrivalDate = $8,
                UpdatedDate = $9,
                ArrivalTime = $10,
                Paid = $11
            WHERE XolaBookingID = $12 AND ExperienceID = $13`;

        // Add first update query
        updateQueries.push(client.query(updateQuery3, [
            latestWebhookData.eventName || null,
            latestWebhookData.paymentMethod || null,
            experienceIDs[0] || null, // ExperienceID[0]
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[1] : null, // Grades
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 4 ? latestWebhookData.Questions1[4] : null, // SchoolName
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 3 ? latestWebhookData.Questions1[3] : null, // SchoolBoard
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 2 ? latestWebhookData.Questions1[2] : null, // NumStudents
            latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[0] : null, // ArrivalDate
            currentDate, // UpdatedDate
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[0] : null, // ArrivalTime
            false, // Paid (default false)
            latestWebhookData.id || null, // XolaBookingID
            experienceIDs[0] || null, // ExperienceID[0]
           
        ]));
    }
        // If there's a second ExperienceID, add another update query
        else if (experienceIDs.length > 1 && latestWebhookData.Questions2.length>1) {
            const updateQuery2 = `
                UPDATE saltcorn.XolaBooking 
                SET 
                    EventName = $1,
                    PaymentMethod = $2,
                    ExperienceID = $3,
                    Grades = $4,
                    SchoolName = $5,
                    SchoolBoard = $6,
                    NumStudents = $7,
                    ArrivalDate = $8,
                    UpdatedDate = $9,
                    ArrivalTime = $10,
                    Paid = $11
                WHERE XolaBookingID = $12 AND ExperienceID = $13`;

            updateQueries.push(client.query(updateQuery2, [
                latestWebhookData.eventName || null,
                latestWebhookData.paymentMethod || null,
                experienceIDs[1] || null, // ExperienceID[1]
                latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 1 ? latestWebhookData.Questions2[1] : null, // Grades
                latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 4 ? latestWebhookData.Questions2[4] : null, // SchoolName
                latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 3 ? latestWebhookData.Questions2[3] : null, // SchoolBoard
                latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 2 ? latestWebhookData.Questions2[2] : null, // NumStudents
                latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[0] : null, // ArrivalDate
                currentDate, // UpdatedDate
                latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[0] : null, // ArrivalTime
                false, // Paid (default false)
                latestWebhookData.id || null, // XolaBookingID
                experienceIDs[1] || null // ExperienceID[1]
            ]));
        }

        // Execute all update queries in parallel
        await Promise.all(updateQueries);

        console.log(`Data updated successfully for order.update: ${latestWebhookData.id}, ExperienceIDs: ${experienceIDs}`);
    }
        } catch (error) {
            console.error('Error inserting/updating data:', error);
        } finally {
            client.release();
        }
    }
        

//ms sql
async function insertData5(latestWebhookData) {
    let pool;
        try {
            // Database configuration
            const config = {
                user: 'Prabin', 
                password: 'T00664996@mytru.ca', 
                server: 'siralex.database.windows.net', 
                database: 'cpaws-sql-test', 
                options: {
                    encrypt: true, // Use encryption if needed
                    trustServerCertificate: true, 
                },
            };

            pool = await sql.connect(config);

                    // Check if the booking already exists
        const checkQuery = `
        SELECT COUNT(*) AS count
        FROM XolaBooking
        WHERE XolaBookingID = @XolaBookingID
          AND ExperienceID = @ExperienceID;
        `;

        const checkRequest = pool.request()
            .input('XolaBookingID', sql.VarChar(100), latestWebhookData.id)
            .input('ExperienceID', sql.VarChar(50), latestWebhookData.ExperiencesID[0]); // Adjust if needed

            const checkResult = await checkRequest.query(checkQuery);

            if (checkResult.recordset[0].count > 0) {
                console.log('Booking already exists. Not inserting.');
                return; // Exit if the booking already exists
            }

            // Insert statement
            const insertQuery = `
                INSERT INTO XolaBooking (
                    EventName,
                    XolaBookingID,
                    PaymentMethod,
                    CustomerFirstName,
                    CustomerLastName,
                    CustomerEmail,
                    Phone,
                    Invoice#,
                    Amount,
                    ExperienceID,
                    Experience,
                    Quantity,
                    Grades,
                    SchoolName,
                    SchoolBoard,
                    Address,
                    NumStudents,
                    ArrivalDate,
                    CreatedDate,
                    UpdatedDate,
                    ArrivalTime,
                    Note,
                    Theme,
                    Location,
                    Paid,
                    Fiscal,
                    InXola,
                    Project,
                    Funder,
                    Subsidy,
                    DepostitNotes
                ) VALUES (
                    @EventName,
                    @XolaBookingID,
                    @PaymentMethod,
                    @CustomerFirstName,
                    @CustomerLastName,
                    @CustomerEmail,
                    @Phone,
                    @Invoice,
                    @Amount,
                    @ExperienceID,
                    @Experience,
                    @Quantity,
                    @Grades,
                    @SchoolName,
                    @SchoolBoard,
                    @Address,
                    @NumStudents,
                    @ArrivalDate,
                    @CreatedDate,
                    @UpdatedDate,
                    @ArrivalTime,
                    @Note,
                    @Theme,
                    @Location,
                    @Paid,
                    @Fiscal,
                    @InXola,
                    @Project,
                    @Funder,
                    @Subsidy,
                    @DepositNotes

                );
            `;
    
            // Prepare the request
// Prepare the insert request
    const request = pool.request()
        .input('EventName', sql.VarChar(50), latestWebhookData.eventName)
        .input('XolaBookingID', sql.VarChar(100), latestWebhookData.id)
        .input('PaymentMethod', sql.VarChar(50), latestWebhookData.paymentMethod)
        .input('CustomerFirstName', sql.VarChar(50), latestWebhookData.customerName?.split(" ")[0] || null) // First name
        .input('CustomerLastName', sql.VarChar(50), latestWebhookData.customerName?.split(" ")[1] || null) // Last name
        .input('CustomerEmail', sql.VarChar(30), latestWebhookData.customerEmail)
        .input('Phone', sql.VarChar(20), latestWebhookData.phone)
        .input('Invoice', sql.Int, null) 
        .input('Amount', sql.Decimal(18, 2), latestWebhookData.amount)
        .input('ExperienceID', sql.VarChar(50), latestWebhookData.ExperiencesID && latestWebhookData.ExperiencesID.length > 0 ? latestWebhookData.ExperiencesID[0] : null) // Check for ExperiencesID
        .input('Experience', sql.VarChar(99), latestWebhookData.Experiences && latestWebhookData.Experiences.length > 0 ? latestWebhookData.Experiences[0] : null) 
        .input('Quantity', sql.Int, latestWebhookData.Quantity && latestWebhookData.Quantity.length > 0 ? latestWebhookData.Quantity[0] : null) 
        .input('Grades', sql.VarChar(49), latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 1 ? latestWebhookData.Questions1[1] : null) 
        .input('SchoolName', sql.VarChar(99), latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 4 ? latestWebhookData.Questions1[4] : null)
        .input('ArrivalDate', sql.Date, latestWebhookData.arrivalDate && latestWebhookData.arrivalDate.length > 0 ? latestWebhookData.arrivalDate[0] : null) 
        .input('CreatedDate', sql.Date, new Date()) // Set to current date
        .input('UpdatedDate', sql.Date, new Date()) // Set to current date
        .input('ArrivalTime', sql.VarChar(10), latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[0] : null) 
        .input('Note', sql.VarChar(sql.MAX), latestWebhookData.notes && latestWebhookData.notes.length > 0 ? latestWebhookData.notes.join(", ") : null) 
        .input('Theme', sql.VarChar(100), latestWebhookData.addons1 && latestWebhookData.addons1.length > 0 ? latestWebhookData.addons1[0] : null) 
        .input('Location', sql.VarChar(100), latestWebhookData.addons2 && latestWebhookData.addons2.length > 0 ? latestWebhookData.addons2[0] : null)
        .input('Paid', sql.Bit, 0) 
        .input('Fiscal', sql.Int, latestWebhookData.arrivalDate && latestWebhookData.arrivalDate.length > 0 
            ? new Date(latestWebhookData.arrivalDate[0]).getFullYear() : null) 
        .input('InXola', sql.Bit, 1)
        .input('Project', sql.VarChar(50), "909 Education General")
        .input('Funder', sql.VarChar(50), "Program Funds")
        .input('Subsidy', sql.VarChar(50), null)
        .input('DepositNotes', sql.VarChar(50), null)
        .input('NumStudents', sql.Int,  latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 2 ? latestWebhookData.Questions1[2] : null)
        .input('SchoolBoard', sql.VarChar(20),  latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 3 ? latestWebhookData.Questions1[3] : null)
        .input('Address', sql.VarChar(50), null);
       

            // Execute the insert
            const result = await request.query(insertQuery);
    
            console.log('Insert successful:', result);
        } catch (err) {
            console.error('Error inserting booking:', err);
        } finally {
                    // Close the database connection
        if (pool) {
            await pool.close();
        }
            
        }
    }

 
// Handle GET request to the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the webhook geda!');
});

// Route to display the latest webhook data
app.get('/latest', (req, res) => {
    res.send(`
        <h1>Latest Webhook Data</h1>
        <p><strong>Event Name:</strong> ${latestWebhookData.eventName || 'N/A'}</p>
        <p><strong>Customer Name:</strong> ${latestWebhookData.customerName || 'N/A'}</p>
        <p><strong>Customer Email:</strong> ${latestWebhookData.customerEmail || 'N/A'}</p>
        <p><strong>Phone:</strong> ${latestWebhookData.phone || 'N/A'}</p>
        <p><strong>Amount:</strong> $${latestWebhookData.amount || 0}</p>
        <p><strong>Created At:</strong> ${latestWebhookData.createdAt || 'N/A'}</p>
        <p><strong>Experience:</strong> ${latestWebhookData.Experience || 'N/A'}</p>
        <p><a href="/">Back to Home</a></p>
    `);
});

// Error handling for unhandled routes
app.use((req, res) => {
    console.log(`Unhandled request: ${req.method} ${req.originalUrl}`);
    res.status(404).send('404 Not Found');
});

// Start the server

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

});