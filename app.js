const express = require('express');
const bodyParser = require('body-parser');
//const mysql = require('mysql2'); 
const sql = require('mssql'); // Import the mssql module
const app = express();
const PORT = process.env.PORT || 3004;
const { Pool } = require('pg');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


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

// Variable to store the latest webhook data
let latestWebhookData = {};
let allQuestions = [];
let webhookJSON = {}
// Handle Xola webhook
app.post('/webhook', async(req, res) => {
    console.log('Webhook received:');
   // console.log(req.body); // Log the entire webhook payload
   console.log(JSON.stringify(req.body, null, 2));
   webhookJSON = req.body;

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
    const amountArray = [];
    

     // Loop through each item in the `items` array and collect values
     req.body.data.items.forEach(item => {
        experiences.push(item?.name ?? null); // Collect experiences
        experiencesID.push(item?.id ?? null); // collect id for each experience
        bookedDate.push(item?.arrival?? null); // Collect arrivalDatetime for each item
        quantity.push(item?.quantity?? null); // select the quantity
        demographic.push(item?.demographics?.[0]. quantity?? null); 
        amountArray.push(item?. amount ?? null);
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
        amountArr: amountArray,
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
        if (latestWebhookData.eventName === 'order.create' || latestWebhookData.eventName === 'order.update') {
            await insertData3(latestWebhookData);
           // const schoolId = await insertSchool(pool, latestWebhookData); 
            //const teacherId = await insertTeacher(pool, latestWebhookData);
            
           // console.log("Inserted School ID:", schoolId);
            //console.log("Inserted Teacher ID:", teacherId);
            return res.status(200).send('Webhook received and data inserted in PostgreSQL for order.create');
        }

        if(latestWebhookData.eventName === 'order.update'){
          //  const schoolId = await insertSchool(pool, latestWebhookData); 
          //  const teacherId = await insertTeacher(pool, latestWebhookData);
            
          //  console.log("Inserted School ID:", schoolId);
          //  console.log("Inserted Teacher ID:", teacherId);
        }

        // Handle order.cancel case
        else if (latestWebhookData.eventName === 'order.cancel') {
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
                //first loop through number of classes

               

                  //  console.log(latestWebhookData.Quantity[j]);

                // Loop through the bookings to insert multiple rows
                for (let i = 0; i < latestWebhookData.ExperiencesID.length; i++) {
                    for(let j=0; j< latestWebhookData.Quantity[i]; j++){

                        const actualAmount = latestWebhookData.amountArr[i]/latestWebhookData.Quantity[i];
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
                        actualAmount || 0, // Amount
                        latestWebhookData.ExperiencesID[i] || null, // ExperienceID
                        latestWebhookData.Experiences[i] || null, // Experience
                        latestWebhookData.Quantity[i] || null, // Quantity
                        null, // Grades
                        null , // SchoolName
                        null, // SchoolBoard
                        null, // Address
                        null, // NumStudents
                        latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[i] : null, // ArrivalDate
                        currentDate, // CreatedDate
                        currentDate, // UpdatedDate
                        null, // ArrivalTime
                        latestWebhookData.notes && latestWebhookData.notes.length > 0 ? latestWebhookData.notes.join(", ") : null, // Note
                        latestWebhookData.addons1 && latestWebhookData.addons1.length > 0 ? latestWebhookData.addons1[i] : null, // Theme
                        latestWebhookData.addons2 && latestWebhookData.addons2.length > 0 ? latestWebhookData.addons2[i] : null, // Location
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
            }
            } else if (latestWebhookData.eventName === 'order.update') {
                // Loop through the bookings to update multiple rows
                const experienceIDs = latestWebhookData.ExperiencesID; // Get all Experience IDs
                const updateQueries = []; // Store queries to execute later

    // Construct different update queries based on the number of Experience IDs
    if (experienceIDs.length > 0) {
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
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[2] : null, // Grades
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[4] : null, // SchoolName
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[0] : null, // SchoolBoard
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[3] : null, // NumStudents
            latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[0] : null, // ArrivalDate
            currentDate, // UpdatedDate
            latestWebhookData.Questions1 && latestWebhookData.Questions1.length > 0 ? latestWebhookData.Questions1[1] : null, // ArrivalTime
            false, // Paid (default false)
            latestWebhookData.id || null, // XolaBookingID
            experienceIDs[0] || null, // ExperienceID[0]
            
        ]));
             }
        // If there's a second ExperienceID, add another update query
    if (experienceIDs.length > 1 && (latestWebhookData.Questions2.length> 1) ) {
            console.log("Second if condition met: experienceIDs.length > 1 and latestWebhookData.Questions2.length > 1");
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
                latestWebhookData.Questions2 && latestWebhookData.Questions2.length > 1 ? latestWebhookData.Questions2[2] : null, // Grades
                latestWebhookData.Questions2 && latestWebhookData.Questions2.length > 4 ? latestWebhookData.Questions2[4] : null, // SchoolName
                latestWebhookData.Questions2 && latestWebhookData.Questions2.length > 3 ? latestWebhookData.Questions2[0] : null, // SchoolBoard
                latestWebhookData.Questions2 && latestWebhookData.Questions2.length > 2 ? latestWebhookData.Questions2[3] : null, // NumStudents
                latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[1] : null, // ArrivalDate
                currentDate, // UpdatedDate
                latestWebhookData.Questions2 && latestWebhookData.Questions2.length > 0 ? latestWebhookData.Questions2[1] : null, // ArrivalTime
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

//postgre table
   // Function to insert a school into the database


   /**
async function insertSchool(pool, data) {
    // Check if the school already exists
    console.log("insert school being called");
    const existingSchoolQuery = `
        SELECT SchoolID 
        FROM PrabinTable.Schools 
        WHERE School = $1 `;

    const existingSchoolResult = await pool.query(existingSchoolQuery, [
        data.Questions1[4],  // School Name
        
    ]);

    // If the school exists, return the existing SchoolID
    if (existingSchoolResult.rows.length > 0) {
        console.log("Data already in database")
        return existingSchoolResult.rows[0].schoolid;  // Return existing SchoolID
        
    }

    // Insert the new school if it does not exist
    const query = `
        INSERT INTO PrabinTable.Schools (School, Board, Category, Region, Rural, HighNeeds, Grades, ContactInfo, Notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING SchoolID`;
    
    const result = await pool.query(query, [
        data.Questions1[4],  // School Name
        data.Questions1[0],  // School Board
        null,                 // Category (can be modified as needed)
        null,                 // Region (can be modified as needed)
        null,                 // Rural (can be modified as needed)
        null,                 // HighNeeds (can be modified as needed)
        data.Questions1[2],  // Grades
        null,                 // ContactInfo (JSONB, can be modified as needed)
        null                  // Notes (can be modified as needed)
    ]);
    
    return result.rows[0].schoolid;  // Return the inserted school ID
}
   
async function insertTeacher(pool, data) {
    // Ensure customerName is valid before proceeding
    if (!data.customerName) {
        throw new Error("Customer name is required.");
    }

    console.log("Customer Name:", data.customerName);
    console.log("Customer Email:", data.customerEmail);

    const nameParts = data.customerName.split(" ");
    const firstName = nameParts[0]; // First part as FirstName
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null; // Join remaining parts as LastName

    // Check if the teacher already exists
    const existingTeacherQuery = `
        SELECT TeacherID 
        FROM PrabinTable.Teachers 
        WHERE FirstName = $1 AND LastName = $2`;

    const existingTeacherResult = await pool.query(existingTeacherQuery, [
        firstName, // FirstName
        lastName   // LastName
    ]);

    // If the teacher exists, return the existing TeacherID
    if (existingTeacherResult.rows.length > 0) {
        console.log("Teacher already exists");
        return existingTeacherResult.rows[0].teacherid;  // Return existing TeacherID
    }

    // If the teacher does not exist, insert the new teacher
    const insertQuery = `
        INSERT INTO PrabinTable.Teachers (Email, LastName, FirstName, Title, DateCreated, DateUpdated, IsDeleted)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), FALSE)
        RETURNING TeacherID`;

    const result = await pool.query(insertQuery, [
        data.customerEmail || null, // Email
        lastName || null,           // LastName
        firstName,                  // FirstName
        null                         // Title (can be modified as needed)
    ]);

    console.log("Data inserted successfully, TeacherID:", result.rows[0].teacherid);
    
    return result.rows[0].teacherid;  // Return the inserted TeacherID
}
*/
    
     /**
    async function insertClass(client, data, schoolId) {
        const query = `
            INSERT INTO PrabinTable.Classes (NumberOfStudents, EnvironmentalAction, CYear, ClassNotes, SchoolID, DateCreated, DateUpdated, IsDeleted)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), FALSE)
            RETURNING ClassID`;
        
        const result = await client.query(query, [
            data.Questions1[3],              // Number of Students
            false,                            // Environmental Action (can be modified as needed)
            null,                             // CYear (can be modified as needed)
            null,                             // Class Notes (can be modified as needed)
            schoolId                          // SchoolID (FK)
        ]);
        
        return result.rows[0].classid;  // Return the inserted class ID
    }
    
    async function insertBooking(client, data, teacherId, classId) {
        const query = `
            INSERT INTO PrabinTable.ProgramsDelivered (ProgramID, ProgramDate, StartTime, EndTime, InstructorID, PaymentType, Notes, DateCreated, DateUpdated, IsDeleted)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), FALSE)`;
        
        await client.query(query, [
            data.ExperiencesID[0] || null,     // ProgramID (assuming it's the first experience ID)
            data.arrivalDate ? data.arrivalDate[0] : null,  // ProgramDate
            data.Questions1[1] || null,       // StartTime (can be modified as needed)
            null,                              // EndTime (can be modified as needed)
            teacherId,                        // InstructorID (FK)
            data.paymentMethod || null,        // PaymentType
            null                               // Notes (can be modified as needed)
        ]);
        
        console.log(`Booking inserted for ${data.id}`);
    }
        */ 
// Handle GET request to the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the webhook geda!');
});


// Route to display the latest webhook data
app.get('/latest', (req, res) => {
    res.send(`
        <h1>Latest Webhook Data</h1>
        <pre>${JSON.stringify(webhookJSON, null, 2)}</pre>
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