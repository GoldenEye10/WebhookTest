const express = require('express');
const bodyParser = require('body-parser');
//const mysql = require('mysql2'); 
//const sql = require('mssql'); // Import the mssql module
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

let latestWebhookData = {};
let allQuestions = [];
let webhookJSON = {};
let individualWebhook = {};
// Handle Xola webhook
app.post('/webhook', async(req, res) => {
    console.log('Webhook received:');
   // console.log(req.body); // Log the entire webhook payload
   //console.log(JSON.stringify(req.body, null, 2));
   webhookJSON = req.body;
    // Collect all experiences (names) from the array of items
    const notes = req.body.data.notes.map(note => note?.text ?? null);

     allQuestions = [];
     individualWebhook = [];
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
    const Questions3 = allQuestions.length > 2 ? allQuestions[2]?.Questions ?? 0 : 0;


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
        Questions3: Questions3, // array of questions
    };

    //console.log('Stored webhook data:', latestWebhookData);
    console.log('Stored webhook data:', JSON.stringify(latestWebhookData, null, 2));

    const specifiedValues = [
        "professional learning workshop (1-2 hours)",
        "professional learning outdoors - half day",
        "professional learning outdoors - half day x 2 (am + pm)",
        "professional learning outdoors - full day"
      ];
     //start calling function to insert data
    
    // Start checking for specified values in experiences
    const hasSpecifiedValues = latestWebhookData.Experiences.some(experience =>
        specifiedValues.includes(experience.toLowerCase())
    );
    
    if (hasSpecifiedValues) {
        const client = await pool.connect();
    
        try {
            await client.query('BEGIN');








            // for prabincpaws schema

            /**
            
            // Insert into the Invoices table
            const invoiceId = await newInvoice(client, latestWebhookData);
            console.log('Invoice ID:', invoiceId);
            
            // Insert into the Bookings table using the invoiceId
            const bookingId = await newBookings(client, latestWebhookData, invoiceId);
            console.log('Booking ID:', bookingId);
            
            // Insert into the Sessions table using the bookingId
            const sessionId = await newSessionPL(client, latestWebhookData, bookingId);
            console.log('Session ID:', sessionId);

            const professionalLearningId = await newProfessionalLearning(client, latestWebhookData, sessionId);
            console.log('professionalLearning ID:', professionalLearningId);
*/



            let schoolId = null; 
            
            const invoiceId = await Invoice(client, latestWebhookData);
            console.log(' Professional invoice ID:', invoiceId); 
            
            // Insert into the classes table using the schoolID, sessionID
            const organizationId = await getOrganizationId(client, latestWebhookData);
            console.log('Organization ID:', organizationId);

                        // check themes
            const themeId = await getThemes(client, latestWebhookData);
            console.log('Theme ID:', themeId);
            
                        // check location
            const locationId = await getLocations(client, latestWebhookData);
            console.log('Location ID:', locationId);
            
                        // check location
            const programId = await getPrograms(client, latestWebhookData);
            console.log('Program ID:', programId);

            // Insert into the contacts table using the organizationId
            const contactId = await Contacts(client, latestWebhookData, schoolId, organizationId);
            console.log('Contact ID:', contactId);


            // Insert into the bookings table
            const bookingId = await Booking(client, latestWebhookData, invoiceId, contactId);
            console.log('Booking ID:', bookingId);


            const classId = await ProfClasses(client, latestWebhookData, bookingId, programId, themeId, locationId);
            console.log('Class ID:', classId);


            const professionalClassId = await ProfessionalLearningClasses(client, latestWebhookData, classId, organizationId);
            console.log('professional ID:', professionalClassId);

            /**
            let index;
            while ((index = latestWebhookData.Experiences.findIndex(experience => 
                specifiedValues.includes(experience.toLowerCase()))) !== -1) {
    
                // Log the found experience
                console.log(`The experiences array contains one of the specified values at index ${index}:`, latestWebhookData.Experiences[index]);
            

                // Create the individualWebhook object for the matched index
                const individualWebhook = {
                    eventName: req.body.eventName ?? null,
                    id: req.body.data.id ?? null,
                    paymentMethod: req.body.data.adjustments[0]?.meta?.payment?.method ?? null,
                    customerName: req.body.data.customerName ?? null,
                    customerEmail: req.body.data.customerEmail ?? null,
                    phone: req.body.data.phone ?? null,
                    amount: latestWebhookData.amount,
                    ExperienceID: latestWebhookData.ExperiencesID[index],
                    Experience: latestWebhookData.Experiences[index],
                    Demographic: latestWebhookData.Demographics[index],
                    Quantity: latestWebhookData.Quantity[index],
                    arrivalDate: latestWebhookData.arrivalDate[index],
                    notes: latestWebhookData.notes[index],
                    addon1: latestWebhookData.addons1[index],
                    addon2: latestWebhookData.addons2[index],
                    Questions1: allQuestions[index]
                };

                
                console.log("Individual(organizational) webhook data created:", individualWebhook);
    
    
                // Remove elements at the specified index from each array in latestWebhookData
                latestWebhookData.amountArr.splice(index, 1);
                latestWebhookData.ExperiencesID.splice(index, 1);
                latestWebhookData.Experiences.splice(index, 1);
                latestWebhookData.Demographics.splice(index, 1);
                latestWebhookData.Quantity.splice(index, 1);
                latestWebhookData.arrivalDate.splice(index, 1);
                latestWebhookData.notes.splice(index, 1);
                latestWebhookData.addons1.splice(index, 1);
                latestWebhookData.addons2.splice(index, 1);
                allQuestions.splice(index, 1);


            }
 */
    
            // Commit the transaction if everything went well
            await client.query('COMMIT');
        } catch (error) {
            console.error('Error during transaction:', error);
            await client.query('ROLLBACK'); // Roll back in case of any error
        } finally {
            client.release(); // Release the client back to the pool
        }
    } else {

        console.log('youth experience detected')
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            let organizationId = null;

            
            //saltccorn schema

             // Insert into the classes table using the schoolID, sessionID
            const invoiceId = await Invoice(client, latestWebhookData);
            console.log('invoice ID:', invoiceId); 

            // Insert into the classes table using the schoolID, sessionID
            const schoolId = await getSchoolId(client, latestWebhookData);
            console.log('School ID:', schoolId);

            // check themes
            const themeId = await getThemes(client, latestWebhookData);
            console.log('Theme ID:', themeId);

            // check location
            const locationId = await getLocations(client, latestWebhookData);
            console.log('Location ID:', locationId);

            // check location
            const programId = await getPrograms(client, latestWebhookData);
            console.log('Program ID:', programId);


             // Insert into the classes table using the schoolID, sessionID
            const contactId = await Contacts(client, latestWebhookData, schoolId, organizationId);
            console.log('Contact ID:', contactId);


            // Insert into the bookings table
            const bookingId = await Booking(client, latestWebhookData, invoiceId, contactId);
            console.log('Booking ID:', bookingId);

            // create class
            const classId = await Classes(client, latestWebhookData, bookingId, programId, themeId, locationId);
            console.log('Class ID:', classId);


            const youthClassId = await YouthExperienceClasses(client, latestWebhookData, classId, schoolId);
            console.log('Youth Class ID:', youthClassId);
            
            // youth experience for prabincpaws
             /**
            // Insert into the Invoices table
            const invoiceId = await newInvoice(client, latestWebhookData);
            console.log('Invoice ID:', invoiceId);
            
            // Insert into the Bookings table using the invoiceId
            const bookingId = await newBookings(client, latestWebhookData, invoiceId);
            console.log('Booking ID:', bookingId);
            
            // Insert into the Sessions table using the bookingId
            const sessionId = await newSession(client, latestWebhookData, bookingId);
            console.log('Session ID:', sessionId);


           
            if(latestWebhookData.eventName === 'order.update'){

            // Insert into the Sessions table using the bookingId
            const schoolId = await newSchool(client, latestWebhookData);
            console.log('School ID:', schoolId);
            
            
            
            // Insert into the Sessions table using the bookingId
            const youthExperienceId = await newYouthExperience(client, latestWebhookData, sessionId, schoolId);
            console.log('youth Experience ID:', youthExperienceId);

            // Insert into the teacher table using the schoolID
            const teacherId = await newTeacher(client, latestWebhookData, schoolId);
            console.log('Teacher ID:', teacherId);

            
            // Insert into the classes table using the schoolID, sessionID
            const classId = await newClass(client, latestWebhookData, schoolId, sessionId);
            console.log('Class ID:', classId);


            // Insert into the classes table using the schoolID, sessionID
            const classTeacherId = await newClassTeacher(client, classId, teacherId);
            console.log('ClasTeacher ID:', classId);
            }
            
 */


        

    
            await client.query('COMMIT');
        } catch (error) {
            console.error('Error during transaction:', error);
            await client.query('ROLLBACK'); // Roll back in case of any error
        } finally {
            client.release(); // Release the client back to the pool
        }
    }
    });

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
                //first loop through number of items in cart
                // then loop through quantity

                // Loop through the bookings to insert multiple rows
                for (let i = 0; i < latestWebhookData.ExperiencesID.length; i++) {
                    for(let j=0; j< latestWebhookData.Quantity[i]; j++){

                        const actualAmount = latestWebhookData.amountArr[i]/latestWebhookData.Quantity[i];
                    const insertQuery = `
                        INSERT INTO prabinsaltcorn.XolaBooking (
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
            UPDATE prabinsaltcorn.xolabooking 
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
                UPDATE prabinsaltcorn.xolabooking 
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

        if (experienceIDs.length > 2 && (latestWebhookData.Questions2.length> 2) ) {
            console.log("Second if condition met: experienceIDs.length > 2 and latestWebhookData.Questions2.length > 2");
            const updateQuery2 = `
                UPDATE prabinsaltcorn.xolabooking 
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
                experienceIDs[2] || null, // ExperienceID[1]
                latestWebhookData.Questions3 && latestWebhookData.Questions3.length > 1 ? latestWebhookData.Questions3[2] : null, // Grades
                latestWebhookData.Questions3 && latestWebhookData.Questions3.length > 4 ? latestWebhookData.Questions3[4] : null, // SchoolName
                latestWebhookData.Questions3 && latestWebhookData.Questions3.length > 3 ? latestWebhookData.Questions3[0] : null, // SchoolBoard
                latestWebhookData.Questions3 && latestWebhookData.Questions3.length > 2 ? latestWebhookData.Questions3[3] : null, // NumStudents
                latestWebhookData.arrivalDate ? latestWebhookData.arrivalDate[1] : null, // ArrivalDate
                currentDate, // UpdatedDate
                latestWebhookData.Questions2 && latestWebhookData.Questions3.length > 0 ? latestWebhookData.Questions3[1] : null, // ArrivalTime
                false, // Paid (default false)
                latestWebhookData.id || null, // XolaBookingID
                experienceIDs[2] || null // ExperienceID[1]
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


// Function to insert data into the Invoices table
const newInvoice = async (client, data) => {
    let invoiceId = null; // Define invoiceId outside the try block
  
    try {
      // Check if the event is 'order.create'
      if (data.eventName !== 'order.create') {
        console.log("Event is not 'order.create'; skipping insertion.");
        return ;
      }
  
      const insertQuery = `
        INSERT INTO prabincpaws.Invoices (
          InvoiceNumber, Amount, DateSent, isPaid, PaymentMethod, Notes, lastUpdated
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING ID
      `;
  
      const result = await client.query(insertQuery, [
        null,                  // Replace with actual invoice number if available
        data.amount,          // Amount for the invoice
        null,        // Date sent for the invoice
        data.isPaid || false, // Payment status (default to false)
        data.paymentMethod,    // Payment method for the invoice
        null     // Notes (allow null if not provided)
      ]);
  
      // Check if the insertion returned a new ID
      if (result.rows.length > 0) {
        invoiceId = result.rows[0].id; // Use uppercase 'ID'
        console.log(`New invoice inserted with ID: ${invoiceId}`);
      } else {
        console.error('Failed to insert new invoice: No ID returned.');
      }
    } catch (error) {
      console.error('Error processing invoice:', error);
    }
  
    return invoiceId; // Return the invoice ID
  };
  

  // Function to insert or update bookings in the Bookings table
const newBookings = async (client, data, invoiceId) => {
    try {
      // Ensure invoiceId is logged for debugging
      console.log("Provided invoice ID:", invoiceId);
  
      // Check if the event is 'order.create' or 'order.update'
      if (data.eventName === 'order.create') {
        // Insert a new booking
        const insertQuery = `
          INSERT INTO prabincpaws.Bookings (
            XolaBookingID, ExperienceID, InvoiceID, contactName, contactEmail, contactPhone, lastUpdated
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING ID
        `;
  
        const result = await client.query(insertQuery, [
          data.id,    // XolaBookingID for the new booking
          data.ExperiencesID[0],                  // ExperienceID placeholder (replace if needed)
          invoiceId,             // Existing invoice ID
          data.customerName,     // Contact name
          data.customerEmail,    // Contact email
          data.phone             // Contact phone
        ]);
  
        const bookingId = result.rows[0]?.id; // Retrieve the newly created booking ID
        console.log(`New booking created with ID: ${bookingId}`);
        return bookingId; // Return booking ID for 'order.create'
  
      } else if (data.eventName === 'order.update') {
        
        // Update an existing booking
        const updateQuery = `
          UPDATE prabincpaws.Bookings
          SET 
            contactName = $1,
            contactEmail = $2,
            contactPhone = $3,
            lastUpdated = NOW()
          WHERE XolaBookingID = $4
          RETURNING ID
        `;
  
        const result = await client.query(updateQuery, [
          data.customerName,     // Updated customer name
          data.customerEmail,    // Updated customer email
          data.phone,            // Updated customer phone
          data.id     // XolaBookingID to find the correct booking
        ]);
  
        if (result.rows.length > 0) {
          const bookingId = result.rows[0].id; // Retrieve the updated booking ID
          console.log(`Booking updated with ID: ${bookingId}`);
          return bookingId; // Return booking ID for 'order.update'
        } else {
          console.error('No booking found to update for XolaBookingID:', data.xolaBookingID);
          return null; // Return null if no booking was updated
        }
      } else {
        console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
        return null;
      }
    } catch (error) {
      console.error('Error processing booking:', error);
      return null;
    }
  };


  // Function to insert or update sessions in the Sessions table
  const newSession = async (client, data, bookingId) => {
    try {
        console.log("Calling newSession function with booking ID:", bookingId);

        const sessionIds = []; // Array to store all created/updated session IDs

        for (let i = 0; i < data.ExperiencesID.length; i++) {
            // Handle order.create
            if (data.eventName === 'order.create') {
                for (let j = 0; j < data.Quantity[i]; j++) {
                    const programLookupQuery = `
                        SELECT ID FROM prabincpaws.Programs
                        WHERE name = $1
                    `;

                    const programResult = await client.query(programLookupQuery, [data.Experiences[i]]);
                    if (programResult.rows.length === 0) {
                        throw new Error(`Program not found for experience: ${data.Experiences[i]}`);
                    }
                    const programId = programResult.rows[0].id;

                    const insertQuery = `
                        INSERT INTO prabincpaws.Sessions (
                            BookingID, ProgramID, Theme, Location, Date, StartTime, EndTime, Notes, ExperienceId
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING ID
                    `;

                    const result = await client.query(insertQuery, [
                        bookingId,
                        programId,
                        data.addons1[i] || null,
                        data.addons2[i] || null,
                        data.arrivalDate[i],
                        null,
                        null,
                        data.notes[0] || null,
                        data.ExperiencesID[i]
                    ]);

                    const sessionId = result.rows[0]?.id;
                    if (sessionId) {
                        console.log(`New session created with ID: ${sessionId}`);
                        sessionIds.push(sessionId); // Store the session ID in the array
                    }
                }
            }
            // Handle order.update
            else if (data.eventName === 'order.update') {
                // Select all existing session IDs for the bookingId and ExperienceId
                const selectQuery = `
                    SELECT ID FROM prabincpaws.Sessions
                    WHERE BookingID = $1 AND ExperienceId = $2
                `;

                const selectResult = await client.query(selectQuery, [bookingId, data.ExperiencesID[i]]);
                const existingSessionIds = selectResult.rows.map(row => row.id); // Extract session IDs

                // Update each existing session one at a time
                for (const sessionId of existingSessionIds) {
                    const updateQuery = `
                        UPDATE prabincpaws.Sessions
                        SET 
                            Theme = $1,
                            Location = $2,
                            Date = $3,
                            Notes = $4
                        WHERE ID = $5
                        RETURNING ID
                    `;

                    const result = await client.query(updateQuery, [
                        data.addons1[i],
                        data.addons2[i],
                        data.arrivalDate[i],
                        data.notes[i] || null,
                        sessionId // Update each specific session by ID
                    ]);

                    if (result.rows.length > 0) {
                        const updatedSessionId = result.rows[0].id;
                        console.log(`Session updated with ID: ${updatedSessionId}`);
                        sessionIds.push(updatedSessionId); // Store the updated session ID in the array
                    } else {
                        console.error('No session found to update for BookingID:', bookingId, 'and ExperienceId:', data.ExperiencesID[i]);
                    }
                }
            } else {
                console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
            }
        }
        return sessionIds; // Return the array of session IDs after all iterations
    } catch (error) {
        console.error('Error processing session:', error);
        return null;
    }
};

  

  // Function to insert or update sessions in the Sessions table
  const newSessionPL = async (client, data, bookingId) => {
    try {
      console.log("Calling newSession function with booking ID:", bookingId);
  
      const sessionIds = []; // Array to store all created/updated session IDs
  
      for (let i = 0; i < data.ExperiencesID.length; i++) {
          if (data.eventName === 'order.create') {
            const programLookupQuery = `
              SELECT ID FROM prabincpaws.Programs
              WHERE name = $1
            `;
  
            const programResult = await client.query(programLookupQuery, [data.Experiences[i]]);
            if (programResult.rows.length === 0) {
              throw new Error(`Program not found for experience: ${data.Experiences[i]}`);
            }
            const programId = programResult.rows[0].id;
  
            const insertQuery = `
              INSERT INTO prabincpaws.Sessions (
                BookingID, ProgramID, Theme, Location, Date, StartTime, EndTime, Notes, ExperienceId
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING ID
            `;
  
            const result = await client.query(insertQuery, [
              bookingId,
              programId,
              data.addons1[i] || null,
              data.addons2[i] || null,
              data.arrivalDate[i],
              null,
              null,
              data.notes[0] || null,
              data.ExperiencesID[i]
            ]);
  
            const sessionId = result.rows[0]?.id;
            if (sessionId) {
              console.log(`New session created with ID: ${sessionId}`);
              sessionIds.push(sessionId); // Store the session ID in the array
            }
          } else if (data.eventName === 'order.update') {
            const updateQuery = `
              UPDATE prabincpaws.Sessions
              SET 
                Theme = $1,
                Location = $2,
                Date = $3,
                Notes = $4
              WHERE BookingID = $5 AND ExperienceId = $6
              RETURNING ID
            `;
  
            const result = await client.query(updateQuery, [
              data.addons1[i],
              data.addons2[i],
              data.arrivalDate[i],
              data.notes[i] || null,
              bookingId,
              data.ExperiencesID[i]
            ]);
  
            if (result.rows.length > 0) {
              const sessionId = result.rows[0].id;
              console.log(`Session updated with ID: ${sessionId}`);
              sessionIds.push(sessionId); // Store the session ID in the array
            } else {
              console.error('No session found to update for BookingID:', bookingId, 'and ExperienceId:', data.ExperiencesID[i]);
            }
          } else {
            console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
          }
        }
      return sessionIds; // Return the array of session IDs after all iterations
    } catch (error) {
      console.error('Error processing session:', error);
      return null;
    }
  };
  
  const newProfessionalLearning = async (client, data, sessionIds) => {
    const professionalLearningIds = []; // Array to store IDs of inserted/updated rows

    try {
        console.log("Calling newProfessionalLearning function with session IDs:", sessionIds);

        for (let i = 0; i < data.ExperiencesID.length; i++) {
            const sessionId = sessionIds[i]; // Use each sessionId based on index

            if (data.eventName === 'order.create') {
                const insertQuery = `
                    INSERT INTO prabincpaws.ProfessionalLearning (
                        SessionID, NumberofParticipants, Organization, MeetingTime, MeetingLocation, SpecialNeeds, OtherDetails
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING ID
                `;

                const result = await client.query(insertQuery, [
                    sessionId,
                    data.Quantity[i] || null,
                    null, // Organization
                    null, // Meeting Time
                    null, // Meeting Location
                    null, // Special Needs
                    null  // Other Details
                ]);

                const professionalLearningId = result.rows[0]?.id;
                console.log(`New professional learning created with ID: ${professionalLearningId}`);
                professionalLearningIds.push(professionalLearningId);

            } else if (data.eventName === 'order.update') {
                const updateQuery = `
                    UPDATE prabincpaws.ProfessionalLearning
                    SET 
                        NumberofParticipants = $1,
                        Organization = $2,
                        MeetingTime = $3,
                        MeetingLocation = $4,
                        SpecialNeeds = $5,
                        OtherDetails = $6
                    WHERE SessionID = $7
                    RETURNING ID
                `;

                const questions = i === 0 ? data.Questions1 : i === 1 ? data.Questions2 : data.Questions3;


                const result = await client.query(updateQuery, [
                    data.Quantity[i] || null,   // Number of Participants
                    questions[0] || null,       // Organization
                    questions[1] || null,       // Meeting Time
                    null,                       // Meeting Location
                    questions[3] || null,       // Special Needs
                    questions[2] || null,       // Other Details
                    sessionId                   // SessionID to find the correct entry
                ]);

                if (result.rows.length > 0) {
                    const professionalLearningId = result.rows[0].id;
                    console.log(`Professional learning updated with ID: ${professionalLearningId}`);
                    professionalLearningIds.push(professionalLearningId);
                } else {
                    console.error('No professional learning found to update for SessionID:', sessionId);
                }
            } else {
                console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
            }
        }

        return professionalLearningIds;

    } catch (error) {
        console.error('Error processing professional learning:', error);
        return null;
    }
};

const newSchool = async (client, data) => {

     // Prepare the school name by trimming whitespace and converting to lowercase
     const schoolName = data.Questions1[1].trim().toLowerCase();

    // First, check if the school already exists
    const checkSchoolQuery = `
        SELECT ID FROM prabincpaws.Schools 
        WHERE Name = $1
    `;
    
    const result = await client.query(checkSchoolQuery, [schoolName]);

    // If the school exists, return the existing ID
    if (result.rows.length > 0) {
        console.log(`School found with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
    } else {
        // If not found, insert the new school
        const insertSchoolQuery = `
            INSERT INTO prabincpaws.Schools (Name, SchoolBoard, Grades) 
            VALUES ($1, $2, $3) 
            RETURNING ID
        `;
        
        const insertResult = await client.query(insertSchoolQuery, [
            data.Questions1[1],
            data.Questions1[0],
            data.Questions1[4]
        ]);
        const newSchoolId = insertResult.rows[0].id;
        console.log(`New school created with ID: ${newSchoolId}`);
        return newSchoolId;
    }
};

async function newYouthExperience(client, data, sessionIds, schoolId) {
    console.log('handleYouthExperience function is being called with ExperiencesID:', data.ExperiencesID, 'and schoolId:', schoolId);

    try {
        if (data.eventName === 'order.update') {
            const youthExperienceIds = []; // Array to store IDs of inserted/updated youth experiences

            let sessionIndex = 0; // Initialize a session index to keep track of sessionIds

            for (let i = 0; i < data.ExperiencesID.length; i++) {

                // Dynamically select the correct Questions array
                const questions = i === 0 ? data.Questions1 : i === 1 ? data.Questions2 : data.Questions3;
                const gradesArray = questions[2].split(','); // Split the selected Questions array's grades field by commas

                console.log(gradesArray);

                for (let j = 0; j < data.Quantity[i]; j++) { // Repeat based on the Quantity for the current experience ID
                    if (sessionIndex >= sessionIds.length) {
                        console.log("Warning: Insufficient sessionIds for the number of experiences and quantities.");
                        break; // Break out if there aren't enough sessionIds
                    }

                    const sessionId = sessionIds[sessionIndex]; // Get the current session ID
                    

                    // Retrieve the record from YouthExperience table based on sessionId and schoolId
                    const getYouthExperienceQuery = `
                        SELECT ID FROM prabincpaws.YouthExperience 
                        WHERE SessionID = $1 AND SchoolID = $2 
                        LIMIT 1;
                    `;
                    const result = await client.query(getYouthExperienceQuery, [sessionId, schoolId]);

                    console.log('Sesion id being used is ' + sessionId)
                    sessionIndex++; // Increment the session index for the next iteration

                    if (result.rows.length > 0) {
                        const youthExperienceId = result.rows[0].id;
                        console.log(`Found YouthExperience ID for 'order.update': ${youthExperienceId}`);
                        console.log('grades inserted ' + gradesArray[j]);
                        youthExperienceIds.push(youthExperienceId); // Add to the array
                    } else {
                        console.log('No matching YouthExperience found for the provided SessionID and SchoolID.');

                        // Insert a new record if none exists
                        const insertYouthExperienceQuery = `
                            INSERT INTO prabincpaws.YouthExperience 
                            (SessionID, SchoolID, NumberofClasses, Grades, OtherDetails) 
                            VALUES ($1, $2, $3, $4, $5) 
                            RETURNING ID;
                        `;
                        const insertResult = await client.query(insertYouthExperienceQuery, [
                            sessionId,
                            schoolId,
                            data.Quantity[i],                          // Class number or repetition count within Quantity
                            gradesArray[j] || null,         // Use the grade for the current experience ID
                            null                            // Other Details (e.g., school board or other information)
                        ]);

                        const newYouthExperienceId = insertResult.rows[0].id;
                        console.log(`New YouthExperience created with ID: ${newYouthExperienceId}`);
                        youthExperienceIds.push(newYouthExperienceId); // Add to the array
                    }

                }
            }

            return youthExperienceIds; // Return the array of IDs
        } else {
            console.log('Event is not order.update; no action taken.');
            return null; // Optional: return null if event name doesn't match
        }
    } catch (error) {
        console.error('Error while handling YouthExperience data:', error.message || error);
        throw error; // Rethrow the error to be handled by the caller
    }
}


async function newTeacher(client, data, schoolId) {

    console.log('newTeacher function is being called with schoolId ' + schoolId);


        // Validate customer name
    if (!data.customerName) {
        throw new Error("Customer name is required.");
    }
    
        const nameParts = data.customerName.split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    try {
        // Check if the teacher already exists in the database
        const existingTeacherQuery = `
            SELECT ID FROM prabincpaws.Teachers 
            WHERE FirstName = $1 AND LastName = $2
        `;
        const existingTeacherResult = await client.query(existingTeacherQuery, [firstName, lastName]);

        // If the teacher exists, return their ID
        if (existingTeacherResult.rows.length > 0) {
            const teacherId = existingTeacherResult.rows[0].id;
            console.log(`Teacher exists. Teacher ID: ${teacherId}`);
            return teacherId;
        }

        // If the teacher does not exist, insert a new teacher record
        const insertTeacherQuery = `
            INSERT INTO prabincpaws.Teachers (SchoolID, Title, FirstName, LastName, Email, Phone)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID
        `;
        const insertResult = await client.query(insertTeacherQuery, [
            schoolId,
            null,
            firstName,
            lastName,
            data.customerEmail,
            data.phone
        ]);

        const newTeacherId = insertResult.rows[0].id;
        console.log(`New teacher inserted. Teacher ID: ${newTeacherId}`);
        return newTeacherId;

    } catch (error) {
        console.error('Error while handling teacher data:', error);
        throw error; // Rethrow the error to be handled by the caller
    }
}

async function newClass(client, data, schoolId, sessionId) {
    console.log(`newClass function is being called with schoolId: ${schoolId} and sessionId: ${sessionId}`);

    try {
        if (data.eventName === 'order.update') {
            // Check if a class exists for the given SchoolID and SessionID
            const getClassBySessionAndSchoolQuery = `
                SELECT ID FROM prabincpaws.Classes 
                WHERE SchoolID = $1 AND SessionID = $2 
                LIMIT 1;
            `;
            const getClassValues = [schoolId, sessionId];
            const result = await client.query(getClassBySessionAndSchoolQuery, getClassValues);

            if (result.rows.length > 0) {
                const classId = result.rows[0].id;
                console.log(`Found class ID for 'order.update': ${classId}`);
                return classId;
            } else {
                console.log('No matching class found for the provided SchoolID and SessionID. Inserting new class record.');

                // Insert a new class record if no match is found
                const currentYear = new Date().getFullYear();
                const insertClassQuery = `
                    INSERT INTO prabincpaws.Classes (SchoolID, Grade, NumberofStudents, AcademicYear, EnvironmentalAction, Notes, SessionID)
                    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ID;
                `;
                const insertResult = await client.query(insertClassQuery, [
                    schoolId,
                    data.Questions1[2],      // Assuming Questions1[2] is Grade
                    data.Questions1[3],      // Assuming Questions1[3] is NumberofStudents
                    currentYear,             // AcademicYear set to the current year
                    false,                   // EnvironmentalAction set to false
                    null,                    // Notes set to null
                    sessionId
                ]);

                const newClassId = insertResult.rows[0].id;
                console.log(`New class created. Class ID: ${newClassId}`);
                return newClassId;
            }
        } else {
            console.log('Event is not order.update; no action taken.');
            return null;  // Optional: return null if the event name is not order.update
        }
    } catch (error) {
        console.error('Error while handling class data:', error.message || error);
        throw error; // Rethrow the error to be handled by the caller
    }
}



async function newClassTeacher(client, classId, teacherId) {
    console.log('Inserting or retrieving classTeachers ID for Class ID:', classId, 'Teacher ID:', teacherId);

    try {
        // Query to check if the combination of classId and teacherId already exists
        const checkClassTeacherQuery = `
            SELECT ID FROM prabincpaws.classTeachers 
            WHERE ClassID = $1 AND TeacherID = $2
            LIMIT 1;
        `;
        const checkResult = await client.query(checkClassTeacherQuery, [classId, teacherId]);

        if (checkResult.rows.length > 0) {
            // If an entry exists, return the existing classTeachers ID
            const existingClassTeacherId = checkResult.rows[0].id;
            console.log(`Found existing classTeachers ID: ${existingClassTeacherId}`);
            return existingClassTeacherId;
        } else {
            // If no entry exists, insert a new record
            const insertClassTeacherQuery = `
                INSERT INTO prabincpaws.classTeachers (ClassID, TeacherID)
                VALUES ($1, $2) RETURNING ID;
            `;
            const insertResult = await client.query(insertClassTeacherQuery, [classId, teacherId]);
            const newClassTeacherId = insertResult.rows[0].id;
            console.log(`New classTeachers entry created with ID: ${newClassTeacherId}`);
            return newClassTeacherId;
        }
    } catch (error) {
        console.error('Error while inserting or retrieving classTeachers data:', error);
        throw error;
    }
}



//For saltcorn schema
// new nov 7
const Invoice = async (client, data) => {
    let invoiceId = null; // Initialize invoiceId as null
    
    try {
  
      // Step 1: Check if the invoice already exists using XolaBookingID
      const checkInvoiceQuery = `
        SELECT ID FROM saltcorn.invoices
        WHERE XolaBookingID = $1
      `;
      
      const invoiceResult = await client.query(checkInvoiceQuery, [data.id]);
  
      // If the invoice exists, return the existing ID
      if (invoiceResult.rows.length > 0) {
        invoiceId = invoiceResult.rows[0].id;
        console.log(`Invoice found with ID: ${invoiceId}`);
        return invoiceId;
      } else {
        // Step 2: If the invoice doesn't exist, insert a new row and return the new ID
        const insertQuery = `
          INSERT INTO saltcorn.invoices (
            XolaBookingID, InvoiceNumber, Amount, InvoiceDate, paymentType, PaymentMethod, Notes, lastUpdated, isPaid, isDeleted
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
          RETURNING ID
        `;
        
        const result = await client.query(insertQuery, [
          data.id,              // XolaBookingID
          null,                 // InvoiceNumber (default to null)
          data.amount,          // Amount for the invoice
          null,                 // InvoiceDate (use actual date or null)
          null,                 // PaymentType (default to null)
          data.paymentMethod,   // PaymentMethod
          data.notes || null,   // Notes (default to null if not provided)
          false,                // isPaid (default to false)
          false                 // isDeleted (default to false)
        ]);
  
        // Check if the insertion returned a new ID
        if (result.rows.length > 0) {
          invoiceId = result.rows[0].id;
          console.log(`New invoice inserted with ID: ${invoiceId}`);
        } else {
          console.error('Failed to insert new invoice: No ID returned.');
        }
      }
    } catch (error) {
      console.error('Error processing invoice:', error);
    }
    
    return invoiceId; // Return the invoice ID (either existing or newly created)
  };
  


  const getOrganizationId = async (client, data) => {
    let organizationId = null;
  
    try {
        // Check if data.Questions1 and data.Questions1[0] are defined to prevent TypeError
        const organizationName = data.Questions1 && data.Questions1[0]
            ? data.Questions1[0].trim().toLowerCase()
            : null;

        // If organizationName is null or empty, log an error and return null
        if (!organizationName) {
            console.error("Error: organization name is missing or undefined.");
            return organizationId;
        }

        if (data.eventName === 'order.create') {
            // If the event is 'order.create', return null as no organization is associated yet
            console.log("Event is 'order.create'; returning null for organizationId.");
            return organizationId;
        }
  
        if (data.eventName === 'order.update') {
            // If the event is 'order.update', look for the organization by name
            console.log("Calling getOrganizationID with name:", organizationName);
            
            const organizationQuery = `
                SELECT id FROM saltcorn.organizations WHERE name = $1;
            `;
  
            const result = await client.query(organizationQuery, [organizationName]);
  
            if (result.rows.length > 0) {
                // If the organization exists, return the existing organizationId
                organizationId = result.rows[0].id;
                console.log(`Organization found. Returning existing organizationId: ${organizationId}`);
            } else {
                // If the organization does not exist, insert a new organization and return the new organizationId
                const insertQuery = `
                    INSERT INTO saltcorn.organizations (name, isActive, isDeleted)
                    VALUES ($1, $2, $3)
                    RETURNING id;
                `;
  
                const insertResult = await client.query(insertQuery, [
                    organizationName, // organization name
                    true,             // isActive
                    false             // isDeleted
                ]);
                
                organizationId = insertResult.rows[0].id;
                console.log(`Organization not found. New organization created with ID: ${organizationId}`);
            }
        }
    } catch (error) {
        console.error("Error processing organization:", error);
    }
  
    return organizationId; // Return the organizationId (either existing or newly created)
};


const getSchoolId = async (client, data) => {
    let schoolId = null; // Initialize schoolId as null
    
    try {
      if (data.eventName === 'order.create') {
        // If the event is 'order.create', return null as no school is associated yet
        console.log("Event is 'order.create'; returning null for schoolId.");
        return schoolId;  // Return null
      }
    
      if (data.eventName === 'order.update') {
        // Prepare the school name by trimming whitespace and converting to lowercase
        const schoolName = data.Questions1[1].trim().toLowerCase();
        const schoolBoardName = data.Questions1[0].trim().toLowerCase(); // School board name
          
        // Step 1: Look up the schoolBoardId by the school board name
        const checkSchoolBoardQuery = `
          SELECT id FROM saltcorn.SchoolBoards
          WHERE LOWER(name) = $1
        `;
        const schoolBoardResult = await client.query(checkSchoolBoardQuery, [schoolBoardName]);
  
        // If the school board doesn't exist, return null or handle the error
        if (schoolBoardResult.rows.length === 0) {
          console.error(`School board '${schoolBoardName}' not found.`);
          return null;
        }
  
        const schoolBoardId = schoolBoardResult.rows[0].id; // Extract the schoolBoardId
        console.log(`School board found with ID: ${schoolBoardId}`);
  
        // Step 2: Now, check if the school already exists using the schoolBoardId and school name
        const checkSchoolQuery = `
          SELECT ID FROM saltcorn.Schools 
          WHERE LOWER(Name) = $1 AND SchoolBoardId = $2
        `;
    
        const result = await client.query(checkSchoolQuery, [schoolName, schoolBoardId]);
    
        // If the school exists, return the existing ID
        if (result.rows.length > 0) {
          schoolId = result.rows[0].id;
          console.log(`School found with ID: ${schoolId}`);
          return schoolId;
        } else {
          // Step 3: If the school doesn't exist, insert the new school and return the new ID
          const insertSchoolQuery = `
            INSERT INTO saltcorn.Schools (Name, SchoolBoardId, Grades) 
            VALUES ($1, $2, $3) 
            RETURNING ID
          `;
          
          const insertResult = await client.query(insertSchoolQuery, [
            schoolName,         // School name
            schoolBoardId,      // School board ID
            data.Questions1[4]  // Grades
          ]);
    
          schoolId = insertResult.rows[0].id;
          console.log(`New school created with ID: ${schoolId}`);
          return schoolId;
        }
      }
    } catch (error) {
      console.error("Error processing school:", error);
    }
    
    return schoolId; // Return the schoolId (either existing or newly created)
  };

 
  const Contacts = async (client, data, schoolId, organizationId) => {
    let contactId = null; // Initialize contactId as null

    const nameParts = data.customerName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    try {
        // Step 1: Check if the contact already exists using XolaBookingID
        const checkContactQuery = `
            SELECT ID, schoolId FROM saltcorn.Contacts
            WHERE XolaBookingID = $1
        `;
        
        const contactResult = await client.query(checkContactQuery, [data.id]);

        // If the contact exists, update the schoolId if necessary
        if (contactResult.rows.length > 0) {
            contactId = contactResult.rows[0].id;
            console.log(`Contact found with ID: ${contactId}`);

            // Check if the current schoolId is different from the new one
            if (contactResult.rows[0].schoolId !== schoolId) {
                const updateSchoolQuery = `
                    UPDATE saltcorn.Contacts
                    SET schoolId = $1
                    WHERE ID = $2
                    RETURNING ID
                `;

                const updateResult = await client.query(updateSchoolQuery, [schoolId, contactId]);

                if (updateResult.rows.length > 0) {
                    console.log(`Updated schoolId for contact with ID: ${contactId}`);
                } else {
                    console.error(`Failed to update schoolId for contact with ID: ${contactId}`);
                }
            }

            return contactId;
        } else {
            // Step 2: If the contact doesn't exist, insert a new row and return the new ID
            const insertContactQuery = `
                INSERT INTO saltcorn.Contacts 
                (XolaBookingID, FirstName, LastName, Email, phone, isTeacher, isActive, schoolId, organizationId)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING ID
            `;
            
            const insertResult = await client.query(insertContactQuery, [
                data.id,              // XolaBookingID
                firstName,            // FirstName
                lastName,             // LastName
                data.customerEmail,   // Email 
                data.phone || null,   // PhoneNumber (nullable)
                true,                 // isTeacher (default as needed)
                true,                 // isActive (default as needed)
                schoolId,             // schoolId (nullable)
                organizationId        // organizationId (nullable)
            ]);
            
            contactId = insertResult.rows[0].id;
            console.log(`New contact created with ID: ${contactId}`);
            return contactId;
        }
    } catch (error) {
        console.error("Error processing contact:", error);
    }

    return contactId;  // Return the contactId (either existing or newly created)
};

  
  


const Booking = async (client, data, invoiceId, contactId ) => {
    let bookingId = null;  // Initialize bookingId as null
  
    try {

        console.log("Booking function is being called with contact ID: " + contactId)
      // Step 1: Check if the booking already exists using XolaBookingID
      const checkBookingQuery = `
        SELECT ID FROM saltcorn.Bookings
        WHERE XolaBookingID = $1
      `;
      
      const bookingResult = await client.query(checkBookingQuery, [data.id]);
  
      // If the booking exists, return the existing ID
      if (bookingResult.rows.length > 0) {
        bookingId = bookingResult.rows[0].id;
        console.log(`Booking found with ID: ${bookingId}`);
        return bookingId;
      } else {
        // Step 2: If the booking doesn't exist, insert a new row and return the new ID
        const insertBookingQuery = `
          INSERT INTO saltcorn.Bookings (
            XolaBookingID, ExperienceID, InvoiceID, ContactID, NumberofClasses, lastUpdated, isDeleted
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), $6) 
          RETURNING ID
        `;
        
        const insertResult = await client.query(insertBookingQuery, [
          data.id,         // XolaBookingID
          data.ExperiencesID[0],          // ExperienceID
          invoiceId,      // InvoiceID (nullable)
          contactId,      // ContactID (nullable)
          data.Quantity[0],        // Number of Classes
          false
        ]);
        
        bookingId = insertResult.rows[0].id;
        console.log(`New booking created with ID: ${bookingId}`);
        return bookingId;
      }
    } catch (error) {
      console.error("Error processing booking:", error);
    }
  
    return bookingId;  // Return the bookingId (either existing or newly created)
  };
  
  const getThemes = async (client, data) => {
    const themeIds = []; // Array to store all theme IDs

    try {
        for (let i = 0; i < data.ExperiencesID.length; i++) {
            const themeName = data.addons1[i] ? data.addons1[i].trim().toLowerCase() : null;

            if (!themeName) {
                console.log(`Theme name missing or invalid for ExperienceID at index ${i}. Skipping this entry.`);
                continue; // Skip this iteration if themeName is null or invalid
            }

            // Step 1: Check if the theme already exists using the theme name
            const checkThemeQuery = `
                SELECT ID FROM saltcorn.Themes
                WHERE LOWER(Name) = $1
            `;
            
            const themeResult = await client.query(checkThemeQuery, [themeName]);

            // If the theme exists, retrieve the existing ID
            let themeId;
            if (themeResult.rows.length > 0) {
                themeId = themeResult.rows[0].id;
                console.log(`Theme found with ID: ${themeId}`);
            } else {
                // Step 2: If the theme doesn't exist, insert a new row and retrieve the new ID
                const insertThemeQuery = `
                    INSERT INTO saltcorn.Themes (Name, isActive)
                    VALUES ($1, $2)
                    RETURNING ID
                `;

                const insertResult = await client.query(insertThemeQuery, [themeName, true]);
                themeId = insertResult.rows[0].id;
                console.log(`New theme created with ID: ${themeId}`);
            }

            // Add the theme ID to the themeIds array
            themeIds.push(themeId);
        }
    } catch (error) {
        console.error("Error processing theme:", error);
    }

    return themeIds;  // Return array of theme IDs
};



const getLocations = async (client, data) => {
  const locationIds = []; // Array to store all location IDs

  try {
      for (let i = 0; i < data.ExperiencesID.length; i++) {
          // Check if addons2[i] exists and is a non-empty string
          const locationName = data.addons2[i] ? data.addons2[i].trim().toLowerCase() : null;

          if (!locationName) {
              console.log(`Location name missing or invalid for ExperienceID at index ${i}. Skipping this entry.`);
              continue; // Skip this iteration if locationName is null or invalid
          }

          // Step 1: Check if the location already exists using the location name
          const checkLocationQuery = `
              SELECT ID FROM saltcorn.Locations
              WHERE LOWER(Name) = $1
          `;
          
          const locationResult = await client.query(checkLocationQuery, [locationName]);

          // If the location exists, retrieve the existing ID
          let locationId;
          if (locationResult.rows.length > 0) {
              locationId = locationResult.rows[0].id;
              console.log(`Location found with ID: ${locationId}`);
          } else {
              // Step 2: If the location doesn't exist, insert a new row and retrieve the new ID
              const insertLocationQuery = `
                  INSERT INTO saltcorn.Locations (Name, isActive)
                  VALUES ($1, $2)
                  RETURNING ID
              `;

              const insertResult = await client.query(insertLocationQuery, [locationName, true]);
              locationId = insertResult.rows[0].id;
              console.log(`New location created with ID: ${locationId}`);
          }

          // Add the location ID to the locationIds array
          locationIds.push(locationId);
      }
  } catch (error) {
      console.error("Error processing location:", error);
  }

  return locationIds;  // Return array of location IDs
};




const getPrograms = async (client, data) => {
  const programIds = []; // Array to store all program IDs

  try {
      for (let i = 0; i < data.ExperiencesID.length; i++) {
          const programName = data.Experiences[i] ? data.Experiences[i].trim().toLowerCase() : null;

          if (!programName) {
              console.log(`Program name missing or invalid for ExperienceID at index ${i}. Skipping this entry.`);
              continue; // Skip this iteration if programName is null or invalid
          }

          // Step 1: Check if the program already exists using the program name
          const checkProgramQuery = `
              SELECT ID FROM saltcorn.Programs
              WHERE LOWER(Name) = $1
          `;
          
          const programResult = await client.query(checkProgramQuery, [programName]);

          // If the program exists, retrieve the existing ID
          let programId;
          if (programResult.rows.length > 0) {
              programId = programResult.rows[0].id;
              console.log(`Program found with ID: ${programId}`);
          } else {
              // Step 2: If the program doesn't exist, insert a new row and retrieve the new ID
              const insertProgramQuery = `
                  INSERT INTO saltcorn.Programs (Name)
                  VALUES ($1)
                  RETURNING ID
              `;

              const insertResult = await client.query(insertProgramQuery, [programName]);
              programId = insertResult.rows[0].id;
              console.log(`New program created with ID: ${programId}`);
          }

          // Add the program ID to the programIds array
          programIds.push(programId);
      }
  } catch (error) {
      console.error("Error processing program:", error);
  }

  return programIds;  // Return array of program IDs
};




const Classes = async (client, data, bookingId, programIds, themeIds, locationIds) => {
  const classIds = []; // Array to store created or updated class IDs

  try {
      // If the event is 'order.create'
      if (data.eventName === 'order.create') {
          // Loop over each experience and its quantity
          for (let i = 0; i < data.ExperiencesID.length; i++) {
              for (let j = 0; j < data.Quantity[i]; j++) {
                  // Prepare the insert query for saltcorn.Classes table
                  const insertClassQuery = `
                      INSERT INTO saltcorn.Classes (
                          BookingID, ProgramID, ThemeID, LocationID, Date, StartTime, EndTime, isYouthExperience, isProfessionalLearning, Notes
                      )
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                      RETURNING ID
                  `;

                  // Use the correct index for programIds, themeIds, and locationIds arrays
                  const insertResult = await client.query(insertClassQuery, [
                      bookingId,                 // BookingID 
                      programIds[i],             // ProgramID
                      themeIds[i],               // ThemeID 
                      locationIds[i],            // LocationID 
                      data.arrivalDate[i],       // Date
                      null,                      // StartTime
                      null,                      // EndTime
                      null,                      // isYouthExperience
                      null,                      // isProfessionalLearning
                      data.notes[0]             // Notes (by index)
                  ]);

                  // Add the created class ID to the array if it was successfully inserted
                  if (insertResult.rows.length > 0) {
                      const classId = insertResult.rows[0].id;
                      classIds.push(classId);
                      console.log(`New class created with ID: ${classId}`);
                  } else {
                      console.error('Failed to insert new class: No ID returned.');
                  }
              }
          }
      } 

      // If the event is 'order.update'
      else if (data.eventName === 'order.update') {
          // Lookup all classes with the same BookingID
          const selectClassesQuery = `
              SELECT ID FROM saltcorn.Classes
              WHERE BookingID = $1
          `;

          const selectResult = await client.query(selectClassesQuery, [bookingId]);

          if (selectResult.rows.length > 0) {
              // If classes are found, gather all the class IDs for the given BookingID
              for (const row of selectResult.rows) {
                  classIds.push(row.id);
              }

              console.log(`Found ${selectResult.rows.length} class(es) with BookingID: ${bookingId}`);
          } else {
              console.log(`No classes found with BookingID: ${bookingId}`);
          }
      } else {
          console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
      }

      return classIds; // Return the array of created or updated class IDs
  } catch (error) {
      console.error("Error processing class creation or update:", error);
      return null;
  }
};

const YouthExperienceClasses = async (client, data, classIds, schoolId) => {
  const youthExperienceClassIds = []; // Array to store created or retrieved YouthExperienceClass IDs

  try {
      // Get the current year as a date in YYYY-01-01 format for AcademicYear
      const currentYearDate = `${new Date().getFullYear()}`;
      let classIndex = 0; // Start the classIndex at 0

      if (data.eventName === 'order.create') {
          // Loop over each experience and its quantity
          for (let i = 0; i < data.ExperiencesID.length; i++) {
              const questions = i === 0 ? data.Questions1 : i === 1 ? data.Questions2 : data.Questions3;

              // Check if questions and Quantity are defined
              if (!questions || !Array.isArray(questions) || data.Quantity[i] === undefined) {
                  console.log(`Questions or quantity for experience at index ${i} is missing or undefined. Skipping.`);
                  continue;
              }

              const quantity = data.Quantity[i] || 0;

              for (let j = 0; j < quantity; j++) {
                  console.log('classIndex: ' + classIndex);
                  if (classIndex >= classIds.length) {
                      console.error(`classIds is out of bounds for experience index ${i}. Skipping.`);
                      continue;
                  }

                  const insertYouthClassQuery = `
                      INSERT INTO saltcorn.YouthExperienceClasses (ClassID)
                      VALUES ($1)
                      RETURNING ID
                  `;

                  const insertResult = await client.query(insertYouthClassQuery, [
                      classIds[classIndex]
                  ]);

                  classIndex++;

                  if (insertResult.rows.length > 0) {
                      const youthExperienceClassId = insertResult.rows[0].id;
                      youthExperienceClassIds.push(youthExperienceClassId);
                      console.log(`New YouthExperienceClass created with ID: ${youthExperienceClassId}`);
                  } else {
                      console.error('Failed to insert new YouthExperienceClass: No ID returned.');
                  }
              }
          }
          return youthExperienceClassIds;
      } 
      
      else if (data.eventName === 'order.update') {
          for (let i = 0; i < data.ExperiencesID.length; i++) {
              const questions = i === 0 ? data.Questions1 : i === 1 ? data.Questions2 : data.Questions3;

              if (!questions || !Array.isArray(questions) || data.Quantity[i] === undefined) {
                  console.log(`Questions or quantity for experience at index ${i} is missing or undefined. Skipping.`);
                  continue;
              }

              const gradesArray = questions[2] ? questions[2].split(',') : [];
              const studentNum = questions[4] ? questions[4].split(',') : [];
              const quantity = data.Quantity[i] || 0;

              for (let j = 0; j < quantity; j++) {
                  console.log('classIndex update: ' + classIndex);
                  if (classIndex >= classIds.length) {
                      console.error(`classIds is out of bounds for experience index ${i}. Skipping.`);
                      continue;
                  }

                  const selectQuery = `
                      SELECT ID FROM saltcorn.YouthExperienceClasses
                      WHERE ClassID = $1
                  `;

                  const selectResult = await client.query(selectQuery, [classIds[classIndex]]);

                  if (selectResult.rows.length > 0) {
                      const youthClassId = selectResult.rows[0].id;
                      const updateQuery = `
                          UPDATE saltcorn.YouthExperienceClasses
                          SET 
                              SchoolID = $1,
                              NumberofStudents = $2,
                              Grades = $3,
                              AcademicYear = $4,
                              EnvironmentalAction = $5,
                              OtherDetails = $6
                          WHERE ID = $7
                          RETURNING ID
                      `;

                      const updateResult = await client.query(updateQuery, [
                          schoolId,
                          studentNum[j],
                          gradesArray[j],
                          currentYearDate,
                          false,
                          `Schedule list:${questions[5]} Teacher list: ${questions[3]}` || null,
                          youthClassId
                      ]);

                      classIndex++;

                      if (updateResult.rows.length > 0) {
                          console.log(`YouthExperienceClass updated with ID: ${youthClassId}`);
                          youthExperienceClassIds.push(youthClassId);
                      } else {
                          console.error(`Failed to update YouthExperienceClass with ID: ${youthClassId}`);
                      }
                  } else {
                      console.log(`No existing YouthExperienceClass records found for ClassID: ${classIds[classIndex]}. Skipping update.`);
                  }
              }
          }
          return youthExperienceClassIds;
      } 

      else {
          console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
          return null;
      }
  } catch (error) {
      console.error("Error processing YouthExperienceClass creation/update:", error);
  }

  return youthExperienceClassIds;
};









const ProfessionalLearningClasses = async (client, data, classIds, organizationId) => {
  const professionalLearningClassIds = []; // Array to store created or retrieved ProfessionalLearningClass IDs

  try {
      if (data.eventName === 'order.create') {
          // Loop over each experience and its quantity
          for (let i = 0; i < data.ExperiencesID.length; i++) {
              // Ensure that classId exists for the current index
              if (!classIds[i]) {
                  console.error(`No valid ClassID found for index ${i}. Skipping.`);
                  continue;
              }

              // Ensure that quantity is defined and is a valid number
              const quantity = data.Quantity[i] || 0;
              if (quantity <= 0) {
                  console.error(`Invalid or missing quantity for experience at index ${i}. Skipping.`);
                  continue;
              }

              // Prepare the insert query for saltcorn.ProfessionalLearningClasses table
              const insertProfessionalLearningClassQuery = `
                  INSERT INTO saltcorn.ProfessionalLearningClasses (
                      ClassID, OrganizationID, NumberofParticipants
                  )
                  VALUES ($1, $2, $3)
                  RETURNING ID
              `;

              // Execute the insert query once per experience
              const insertResult = await client.query(insertProfessionalLearningClassQuery, [
                  classIds[i],                          // ClassID from classes array
                  organizationId,                       // OrganizationID
                  quantity                               // NumberofParticipants
              ]);

              // If insert was successful, store the ProfessionalLearningClass ID
              if (insertResult.rows.length > 0) {
                  const professionalLearningClassId = insertResult.rows[0].id;
                  professionalLearningClassIds.push(professionalLearningClassId);
                  console.log(`New ProfessionalLearningClass created with ID: ${professionalLearningClassId}`);
              } else {
                  console.error('Failed to insert new ProfessionalLearningClass: No ID returned.');
              }
          }
          return professionalLearningClassIds; // Return array of new IDs after all inserts
      } else if (data.eventName === 'order.update') {
          // For each classId, check for existing ProfessionalLearningClass records and update them
          for (let i = 0; i < classIds.length; i++) {
              const questions = i === 0 ? data.Questions1 : i === 1 ? data.Questions2 : data.Questions3;
              const selectQuery = `
                  SELECT ID FROM saltcorn.ProfessionalLearningClasses
                  WHERE ClassID = $1
              `;

              const selectResult = await client.query(selectQuery, [classIds[i]]);
              const existingProfessionalClassIds = selectResult.rows.map(row => row.id); // Extract existing IDs

              // If records exist, update them
              if (existingProfessionalClassIds.length > 0) {
                  for (const professionalClassId of existingProfessionalClassIds) {
                      const updateQuery = `
                          UPDATE saltcorn.ProfessionalLearningClasses
                          SET 
                              OrganizationID = $1,
                              MeetingTime = $2,
                              SpecialNeeds = $3,
                              OtherDetails = $4
                          WHERE ID = $5
                          RETURNING ID
                      `;

                      const updateResult = await client.query(updateQuery, [
                          organizationId,                             // OrganizationID
                          questions[1] || null,                       // MeetingTime
                          questions[3] || null,                       // SpecialNeeds
                          questions[2] || null,                       // OtherDetails
                          professionalClassId                         // Target record ID for update
                      ]);

                      if (updateResult.rows.length > 0) {
                          console.log(`ProfessionalLearningClass updated with ID: ${professionalClassId}`);
                          professionalLearningClassIds.push(professionalClassId); // Store updated ID
                      } else {
                          console.error(`Failed to update ProfessionalLearningClass with ID: ${professionalClassId}`);
                      }
                  }
              } else {
                  console.log(`No existing ProfessionalLearningClass records found for ClassID: ${classIds[i]}. Skipping update.`);
              }
          }
          return professionalLearningClassIds; // Return array of IDs after updates

      } else {
          console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
          return null;
      }
  } catch (error) {
      console.error("Error processing ProfessionalLearningClass creation/update:", error);
  }

  return professionalLearningClassIds; // Return the array of IDs (created or updated)
};



const ProfClasses = async (client, data, bookingId, programIds, themeIds, locationIds) => {
  const classIds = []; // Array to store created or updated class IDs

  try {
      // If the event is 'order.create'
      if (data.eventName === 'order.create') {
          // Loop over each experience
          for (let i = 0; i < data.ExperiencesID.length; i++) {
              // Prepare the insert query for saltcorn.Classes table
              const insertClassQuery = `
                  INSERT INTO saltcorn.Classes (
                      BookingID, ProgramID, ThemeID, LocationID, Date, StartTime, EndTime, isYouthExperience, isProfessionalLearning, Notes
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                  RETURNING ID
              `;

              // Use the correct index for programIds, themeIds, and locationIds arrays
              const insertResult = await client.query(insertClassQuery, [
                  bookingId,                 // BookingID 
                  programIds[i],             // ProgramID
                  themeIds[i],               // ThemeID 
                  locationIds[i],            // LocationID 
                  data.arrivalDate[i],       // Date
                  null,                      // StartTime
                  null,                      // EndTime
                  null,                      // isYouthExperience
                  true,                      // isProfessionalLearning (since this is for professional classes)
                  data.notes[i]             // Notes (by index)
              ]);

              // Add the created class ID to the array if it was successfully inserted
              if (insertResult.rows.length > 0) {
                  const classId = insertResult.rows[0].id;
                  classIds.push(classId);
                  console.log(`New professional class created with ID: ${classId}`);
              } else {
                  console.error('Failed to insert new professional class: No ID returned.');
              }
          }
      } 

      // If the event is 'order.update'
      else if (data.eventName === 'order.update') {
          // Lookup all classes with the same BookingID
          const selectClassesQuery = `
              SELECT ID FROM saltcorn.Classes
              WHERE BookingID = $1
          `;

          const selectResult = await client.query(selectClassesQuery, [bookingId]);

          if (selectResult.rows.length > 0) {
              // If classes are found, gather all the class IDs for the given BookingID
              for (const row of selectResult.rows) {
                  classIds.push(row.id);
              }

              console.log(`Found ${selectResult.rows.length} professional class(es) with BookingID: ${bookingId}`);
          } else {
              console.log(`No professional classes found with BookingID: ${bookingId}`);
          }
      } else {
          console.log("Event is neither 'order.create' nor 'order.update'; skipping operation.");
      }

      return classIds; // Return the array of created or updated class IDs
  } catch (error) {
      console.error("Error processing professional class creation or update:", error);
      return null;
  }
};



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