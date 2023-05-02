const express = require("express");
const { Client } = require("pg");
const app = express();
const format = require('pg-format');
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    database: "ticket_database"
})
const port = process.env.PORT || 3000

app.use(express.json())
app.listen(port, ()=>{
    console.log("server is listening on port", port);
})

// Routes
app.get('/', (req, res) => {
  res.json({ info: 'E Ticket api' })
})
app.get("/ping", async(req, res)=>{
    await client.connect()
    const result = await client.query('SELECT $1::text as message', ['Hello world!'])
    console.log(result.rows[0].message) // Hello world!
    await client.end()
})

app.get("/categories", (req, res)=>{
    client.connect()
    client.query("SELECT * FROM Categories;", (err, cres)=>{
        if(err){
            throw err
        }
        // console.log(cres)
        res.status(200).send(cres.rows)
        client.end()
    })
})

app.get("/event_types", (req, res)=>{
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        client.query("SELECT * FROM EventType;", (err, res1)=>{
            if(err){
                throw err
            }
            res.status(200).send(res1.rows)
        })
    })
    client.end()
})
app.post("/create_user", (req, res)=>{
    const {f_name, l_name, gender, email, tel, DOB} = req.body
    client.connect()
    client.query(`INSERT INTO users( f_name, l_name, gender, email, tel, DOB) VALUES ('${f_name}','${l_name}','${gender}','${email}','${tel}', '${DOB}');`, (err, cres)=>{
        if(err){
            res.status(500).send("failed to create user")
            throw err
        }
        res.status(200).send("Succesfully create user")
        client.end()
    })
})
app.post("/create_user_payment", (req, res)=>{
    const {user_id, card_id, payment_name, payment_method, promp_pay, expired_date} = req.body

    client.connect((err) => {
    if (err) {
        console.error('Error connecting to database', err);
        res.status(500).send('Failed to connect to database');
        return;
    }

    client.query(
        `INSERT INTO paymentInfo(card_id, payment_name, payment_method, promp_pay, expired_date) VALUES ($1, $2, $3, $4, $5) RETURNING payment_info_id`,
        [card_id, payment_name, payment_method, promp_pay, expired_date],
        (err, result) => {
        if (err) {
            console.error('Error executing query', err);
            res.status(500).send('Failed to create payment information');
            return;
        }

        const paymentInfoId = result.rows[0].payment_info_id;

        if (card_id) {
            client.query(
            `INSERT INTO UserPayment(payment_info_id, user_id) VALUES ($1, $2)`,
            [paymentInfoId, user_id],
            (err) => {
                if (err) {
                console.error('Error executing query', err);
                res.status(500).send('Failed to connect user payment');
                return;
                }

                res.status(200).send('Successfully create user payment');
                client.end()
            }
            );
        } else {
            client.query(
            `SELECT payment_info_id FROM paymentInfo WHERE payment_name=$1`,
            [payment_name],
            (err, result) => {
                if (err) {
                console.error('Error executing query', err);
                res.status(500).send('Failed to fetch payment information');
                return;
                }

                const paymentInfoId = result.rows[0].payment_info_id;

                client.query(
                `INSERT INTO UserPayment(payment_info_id, user_id) VALUES ($1, $2)`,
                [paymentInfoId, user_id],
                (err) => {
                    if (err) {
                    console.error('Error executing query', err);
                    res.status(500).send('Failed to connect user payment');
                    return;
                    }

                    res.status(200).send('Successfully create user payment');
                    client.end()
                }
                );
            }
            );
        }
        }
    );
    });
})
app.get("/get_user_payment", (req, res)=>{
    const {user_id} = req.query
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }

        client.query(`SELECT * FROM PaymentInfo p JOIN UserPayment u ON p.payment_info_id=u.payment_info_id WHERE user_id=${user_id}`, (err1, res1)=>{
            if(err1){
                console.error('Error executing query')
                res.status(500).send('Failed to find user payment')
                return;
            }
            res.status(200).send(res1.rows);
            client.end()
        })
    })
    
})
app.get("/get_user",(req, res)=>{
    const {email} = req.query
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        client.query(`SELECT * FROM Users WHERE email LIKE '%${email}%';`, (err1, res1)=>{
            if(err1){
                console.error('Error executing query', err1)
                res.status(500).send('Failed to find user')
                return;
            }
            res.status(200).send(res1.rows)
            client.end()
        })
    })
    
})
app.post("/add_member", (req, res)=>{
    const {user_id, organize_id} = req.body
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        client.query(`INSERT INTO Member(organize_id, user_id, role) VALUES ($1, $2, $3)`, [organize_id, user_id, 'Manager'], (err1, res1)=>{
            if(err1){
                console.error('Error executing query', err1)
                res.status(500).send('Failed to add member')
                return;
            }
            res.status(200).send('Succesfully add member')
            client.end()
        })
    })
})
app.get("/get_member", (req, res)=>{
    const {organize_id} = req.body
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        
        client.query(`SELECT * FROM User u JOIN Member m ON u.user_id = m.user_id WHERE m.organize_id = ${organize_id};`, (err1, res1)=>{
            if(err1){
                console.error('Error executing query', err1)
                res.status(500).send('Failed to find member')
                return;
            }
            res.status(200).send(res1.rows)
            client.end()
        })
    })
})
app.post("/create_organize", (req, res)=>{
    const {user_id, name, tel, website} = req.body
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        client.query(`SELECT payment_info_id FROM UserPayment WHERE user_id=${user_id}`, (err1, res1)=>{
            if(err1){
                console.error('Error executing query', err1)
                res.status(500).send('Failed to find user payment')
                return;
            }
            let query = `INSERT INTO Organize(name, payment_info_id`
            let values = `VALUES ('${name}', ${res1.rows[0].payment_info_id}`
            if(tel !== undefined){
                query += ', tel'
                values += `, '${tel}'`
            }
            if(website !== undefined){
                query += ', website'
                values += `, '${website}'`
            }
            query += ')'+values+') RETURNING organize_id;'
            client.query(query, (err2, res2)=>{
                if(err2){
                    console.error('Error executing query', err2)
                    res.status(500).send('Failed to create organize')
                    return;
                }
                client.query(`INSERT INTO Member(organize_id, user_id, role) VALUES ($1, $2, $3)`, [res2.rows[0].organize_id, user_id, 'Owner'], (err3, res3)=>{
                    if(err3){
                        console.error('Error executing query', err3)
                        res.status(500).send('Failed to create member')
                        return;
                    }
                    res.status(200).send(`Successfully created orgainze`);
                    client.end()
                })
            })
        })
    })
})


app.get("/payment_info_id", (req, res)=>{
    const {card_id, payment_name, payment_method, promp_pay, expired_date} = req.query
    client.connect()
    if(card_id){
        client.query(`SELECT payment_info_id FROM paymentInfo 
                        WHERE card_id=${card_id};`, (err1, res1)=>{
            if(err1){
                res.status(500).send("failed to search")
                throw err1
                }
            else{
                res.status(200).send(res1)
            }
            client.end()
        })
    }else{
        client.query(`SELECT payment_info_id FROM paymentInfo 
                        WHERE promp_pay=${promp_pay};`, (err1, res1)=>{
            if(err1){
                res.status(500).send("failed to search")
                throw err1
                }
            else{
                res.status(200).send(res1)
            }
            client.end()
        })

    }

})
app.post("/createorganize", (req, res)=>{
    const {f_name, l_name, gender, email, tel, DOB} = req.body
    client.connect()
    client.query(`INSERT INTO users( f_name, l_name, gender, email, tel, DOB) VALUES ('${f_name}','${l_name}','${gender}','${email}','${tel}', '${DOB}');`, (err, cres)=>{
        if(err){
            res.status(500).send("failed to create user")
            throw err
        }
        res.status(200).send("Succesfully create user")
        client.end()
    })
})

app.post("/create_event", (req, res)=>{
    const {categories_id, organize_id, event_name, event_startdate, event_enddate, location, email, tel, website, event_description, poster, event_type_id, payment_info_id} = req.body
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        let query = 'INSERT INTO Event(organize_id, event_name, event_startdate, event_enddate, location, event_type_id, event_description'
        let values = `VALUES (${organize_id}, '${event_name}', '${event_startdate}', '${event_enddate}', '${location}', ${event_type_id}, '${event_description}'`
        if(email !== undefined){
            query += ', email'
            values += `, '${email}'`
        }
        if(tel !== undefined){
            query += ', tel'
            values += `, '${tel}'`
        }
        if(website !== undefined){
            query += ', website'
            values += `, '${website}'`
        }
        if(poster !== undefined){
            query += ', poster'
            values += `, '${poster}'`
        }
        if(payment_info_id == undefined){
            client.query(`SELECT payment_info_id FROM Organize WHERE organize_id=${organize_id}`, (err1, res1)=>{
                if(err1){
                    console.error('Error executing query err1', err1)
                    res.status(500).send('Failed to find payment')
                    return;
                }
                query = query+', payment_info_id) '+values+`, ${res1.rows[0].payment_info_id}) RETURNING event_id;`
                console.log(query)
                client.query(query, (err2, res2)=>{
                    if(err2){
                        console.error('Error executing query err2', err2)
                        res.status(500).send('Failed to create event')
                        return;
                    }
                    let cquery = "INSERT INTO CategoriesView(event_id, categories_id) VALUES "
                    let cid = categories_id.map((id)=>{
                        return `(${res2.rows[0].event_id}, ${id})`
                    }).join(', ')
                    cquery += cid+";"
                    client.query(cquery, (err4, res4)=>{
                        if(err4){
                            console.error('error executing query', err4)
                            res.status(500).send('failed to create event')
                            return;
                        }
                        res.status(200).send('Succesfully create event')
                        client.end()
                        return;
                    })
                    // }
                })
            })
        }else{
            query += ', payment_info_id'
            values += `, '${payment_info_id}'`
            query += query+') '+values+') RETURNING event_id;'
            client.query(query, (err3, res3)=>{
                if(err3){
                    console.error('Error executing query err3', err3)
                    res.status(500).send('Failed to create event')
                    return;
                }

                    let cquery = "INSERT INTO CategoriesView(event_id, categories_id) VALUES "
                    let cid = categories_id.map((id)=>{
                        return `(${res3.rows[0].event_id}, ${id})`
                    }).join(', ')
                    cquery += cid+";"
                    client.query(cquery, (err5, res5)=>{
                        if(err5){
                            console.error('error executing query', err5)
                            res.status(500).send('failed to create event')
                            return;
                        }
                        res.status(200).send('Succesfully create event')
                        client.end()
                        return;
                    })

            })
        }
    })
})

app.get("/get_organize_event", async(req, res)=>{
    const {organize_id} = req.query
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }else{
            console.log('Connecting to database')
        }
    })
    client.query(`SELECT * FROM Event WHERE organize_id=${organize_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find event')
            return;
        }
        res.status(200).send(res1.rows)
        client.end()
    })
})

app.post("/create_seat_type", (req, res)=>{
    const {event_id, seat_type, price, quantity_limit, sale_startdate, sale_enddate, seat_type_description} = req.body
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        client.query("INSERT INTO SeatType(event_id, seat_type, price, quantity_limit, sale_startdate, sale_enddate, seat_type_description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING seat_type_id;",
         [event_id, seat_type, price, quantity_limit, sale_startdate, sale_enddate, seat_type_description], (err1, res1)=>{
            if(err1){
                console.error('error executing query err1: ', err1)
                res.status(500).send('Failed to create seat type')
                return;
            }
            res.status(200).send("Successfully create seat type "+res1.rows[0].seat_type_id)
            client.end()
         })
    })
})

app.post("/create_seat_type_no", (req, res)=>{
    const {seat_type_id, seat_row, seat_start, seat_end} = req.body
    client.connect((err)=>{
        if(err){
            console.error('Error connecting to database', err);
            res.status(500).send('Failed to connect to database');
            return;
        }
        client.query("INSERT INTO SeatTypeNo(seat_type_id, seat_row, seat_start, seat_end) VALUES ($1, $2, $3, $4)", [seat_type_id, seat_row, seat_start, seat_end], (err1, res1)=>{
            if(err1){
                console.error('error executing query err1: ', err1)
                res.status(500).send('Failed to create seat type no')
                return;
            }
            res.status(200).send("Successfully create seat type")
            client.end()
        })
    })
})
