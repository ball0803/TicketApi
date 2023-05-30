const express = require("express");
const { Pool } = require("pg");
const app = express();
const cors = require('cors');
const allowedOrigins = ['http://localhost:3000', 'https://example.com'];
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

const port = process.env.PORT || 3000
const convertToBoolean = (value) => {
  if (typeof value === 'string') {
    const lowercasedValue = value.toLowerCase();
    if (lowercasedValue === 'true' || lowercasedValue === '1') {
      return true;
    } else if (lowercasedValue === 'false' || lowercasedValue === '0') {
      return false;
    }
  }
  return Boolean(value);
};

app.use(express.json())
app.use(cors({
  origin: function(origin, callback){
    // Check if origin is in allowedOrigins
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not ' +
                  'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.listen(port, ()=>{
    console.log("server is listening on port", port);
})

// Routes
app.get('/', (req, res) => {
  res.json({ info: 'E Ticket api' })
})
app.get("/ping", (req, res)=>{
    pool.query('SELECT $1::text as message', ['Hello world!'], (err1, res1)=>{
        // console.log(res1.rows[0].message) // Hello world!
        res.status(200).send({info: "Hello World!"})
    })
})

app.get("/categories", (req, res)=>{
    pool.query("SELECT * FROM Categories;", (err1, res1)=>{
        if(err1){
            throw err1
        }
        res.status(200).send(res1.rows)
    })
})

app.get("/event_types", (req, res)=>{
    pool.query("SELECT * FROM EventType;", (err, res1)=>{
        if(err){
            throw err
        }
        res.status(200).send(res1.rows)
    })
})
app.post("/create_user", (req, res)=>{
    const {f_name, l_name, gender, email, tel, DOB} = req.body
    pool.query(`INSERT INTO users( f_name, l_name, gender, email, tel, DOB, user_role) VALUES ('${f_name}','${l_name}','${gender}','${email}','${tel}', '${DOB}', 'User') RETURNING user_id;`, (err, cres)=>{
        if(err){
            res.status(500).send("failed to create user")
            throw err
        }
        res.status(200).send("Succesfully create user")
    })
})

app.put("/update_user_role/:user_id", (req, res) => {
  const { user_id } = req.params;
  const { user_role } = req.body;

  pool.query(
    `UPDATE Users SET user_role='${user_role}' WHERE user_id=${user_id}`,
    (err, result) => {
      if (err) {
        console.error('Error executing query', err);
        res.status(500).send('Failed to update user role');
        return;
      }

      if (result.rowCount === 0) {
        res.status(404).send('User not found');
        return;
      }

      res.status(200).send(`Successfully updated user role to ${user_role}`);
    }
  );
});

app.put("/update_user/:user_id", (req, res) => {
  const userId = req.params.user_id;
  const { f_name, l_name, gender, email, tel, DOB } = req.body;
  const updateFields = [];
  if (f_name) {
    updateFields.push(`f_name = '${f_name}'`);
  }
  if (l_name) {
    updateFields.push(`l_name = '${l_name}'`);
  }
  if (gender) {
    updateFields.push(`gender = '${gender}'`);
  }
  if (email) {
    updateFields.push(`email = '${email}'`);
  }
  if (tel) {
    updateFields.push(`tel = '${tel}'`);
  }
  if (DOB) {
    updateFields.push(`DOB = '${DOB}'`);
  }

  if (updateFields.length === 0) {
    res.status(400).send("No fields to update");
    return;
  }

  const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE user_id = '${userId}'`;

  pool.query(updateQuery, (err, result) => {
    if (err) {
      res.status(500).send("Failed to update user");
      throw err;
    }

    if (result.rowCount === 0) {
      res.status(404).send("User not found");
    } else {
      res.status(200).send("Successfully updated user");
    }
  });
});

app.post("/create_user_payment", (req, res)=>{
    const {user_id, card_id, payment_name, payment_method, prompt_pay, expired_date} = req.body
    let query = "SELECT * FROM paymentInfo pi JOIN UserPayment up ON pi.payment_info_id=up.payment_info_id"
    if(payment_method == "Credit Card"){
        query += ` WHERE up.user_id=${user_id} AND pi.card_id='${card_id}';`
    }
    if(payment_method == "Prompt Pay"){
        query += ` WHERE up.user_id=${user_id} AND pi.prompt_pay='${prompt_pay}';`
    }
    // console.log(query)
    pool.query(query, (err1, res1)=>{
        if (err1) {
            console.error('Error executing query ', err1);
            res.status(500).send('Failed to find payment information');
            return;
        }
        if(res1.rowCount > 0){
            res.status(201).send('Payment already exist')
        }else{
            pool.query(
                `INSERT INTO paymentInfo(card_id, payment_name, payment_method, prompt_pay, expired_date) VALUES ($1, $2, $3, $4, $5) RETURNING payment_info_id`,
                [card_id, payment_name, payment_method, prompt_pay, expired_date],
                (err, result) => {
                    if (err) {
                        console.error('Error executing query', err);
                        res.status(500).send('Failed to create payment information');
                        return;
                    }
            
                    const paymentInfoId = result.rows[0].payment_info_id;
            
                    pool.query(
                    `INSERT INTO UserPayment(payment_info_id, user_id) VALUES ($1, $2)`,
                    [paymentInfoId, user_id],
                    (err) => {
                        if (err) {
                        console.error('Error executing query', err);
                        res.status(500).send('Failed to connect user payment');
                        return;
                        }
        
                        res.status(200).send('Successfully create user payment');
                    }
                );
                }
            );
        }
    })
})

app.delete("/delete_user_payment", (req, res)=>{
    const {payment_info_id} = req.query
    pool.query(`DELETE FROM paymentInfo WHERE payment_info_id=${payment_info_id};`, 
        (err1, res1)=>{
            if (err1) {
                console.error('Error executing query err1', err1);
                res.status(500).send('Fail to Delete payment information');
                return;
            }
            res.status(200).send('Sucessfully delete payment information')
        }
    )
})

app.get("/get_user_payment", (req, res)=>{
    const {user_id} = req.query
    pool.query(`SELECT * FROM PaymentInfo p JOIN UserPayment u ON p.payment_info_id=u.payment_info_id WHERE user_id=${user_id}`, (err1, res1)=>{
        if(err1){
            console.error('Error executing query')
            res.status(500).send('Failed to find user payment')
            return;
        }
        res.status(200).send(res1.rows);
    })
})
app.get("/get_user",(req, res)=>{
    const {email, exact} = req.query
    let query = "SELECT * FROM Users"
    if(email !== undefined){
        if(exact !== undefined){
            if(convertToBoolean(exact)){
                query += ` WHERE email='${email}'`
            }else{
                query += ` WHERE email LIKE '%${email}%'`
            }
        }else{
            query += ` WHERE email LIKE '%${email}%'`
        }
    }
    query += ";"
    // console.error(query)
    pool.query(query, (err1, res1)=>{
        if(err1){
            console.error('Error executing query', err1)
            res.status(500).send('Failed to find user')
            return;
        }
        res.status(200).send(res1.rows)
    })
    
})
app.post("/add_member", (req, res)=>{
    const {user_id, organize_id} = req.body
    pool.query(`SELECT * FROM Member WHERE user_id=${user_id} AND organize_id=${organize_id};`, (err1, res1)=>{
        if(err1){
            console.error('Error executing query', err1)
            res.status(500).send('Failed to find member')
            return;
        }
        if(res1.rowCount > 0){
            res.status(500).send('Failed to add this member already exist')
            return;
        }
        pool.query(`INSERT INTO Member(organize_id, user_id, role) VALUES ($1, $2, $3)`, [organize_id, user_id, 'Manager'], (err2, res2)=>{
            if(err2){
                console.error('Error executing query', err2)
                res.status(500).send('Failed to add member')
                return;
            }
            res.status(200).send('Succesfully add member')
        })
    })
})

app.delete("/delete_member", (req, res) => {
  const { user_id, organize_id } = req.query;
  pool.query(
    `DELETE FROM Member WHERE user_id = $1 AND organize_id = $2`,
    [user_id, organize_id],
    (err, result) => {
      if (err) {
        console.error('Error executing query', err);
        res.status(500).send('Failed to delete member');
        return;
      }

      if (result.rowCount === 0) {
        res.status(404).send('Member not found');
        return;
      }

      res.status(200).send('Successfully deleted member');
    }
  );
});

app.get("/get_member", (req, res)=>{
    const {organize_id} = req.query
    pool.query(`SELECT * FROM Users u JOIN Member m ON u.user_id= m.user_id WHERE m.organize_id=${organize_id};`, (err1, res1)=>{
        if(err1){
            console.error('Error executing query', err1)
            res.status(500).send('Failed to find member')
            return;
        }
        res.status(200).send(res1.rows)
    })
})
app.post("/create_organize", (req, res)=>{
    const {user_id, name, tel, website, payment_info_id} = req.body
    if(payment_info_id !== undefined){
            let query = `INSERT INTO Organize(name, payment_info_id`
            let values = `VALUES ('${name}', ${payment_info_id}`
            if(tel !== undefined){
                query += ', tel'
                values += `, '${tel}'`
            }
            if(website !== undefined){
                query += ', website'
                values += `, '${website}'`
            }
            query += ')'+values+') RETURNING organize_id;'
            pool.query(query, (err2, res2)=>{
                if(err2){
                    console.error('Error executing query', err2)
                    res.status(500).send('Failed to create organize')
                    return;
                }
                pool.query(`INSERT INTO Member(organize_id, user_id, role) VALUES ($1, $2, $3)`, [res2.rows[0].organize_id, user_id, 'Owner'], (err3, res3)=>{
                    if(err3){
                        console.error('Error executing query', err3)
                        res.status(500).send('Failed to create member')
                        return;
                    }
                    res.status(200).send(`Successfully created orgainze`);
                })
            })
    }else{
        pool.query(`SELECT payment_info_id FROM UserPayment WHERE user_id=${user_id}`, (err1, res1)=>{
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
            pool.query(query, (err2, res2)=>{
                if(err2){
                    console.error('Error executing query', err2)
                    res.status(500).send('Failed to create organize')
                    return;
                }
                pool.query(`INSERT INTO Member(organize_id, user_id, role) VALUES ($1, $2, $3)`, [res2.rows[0].organize_id, user_id, 'Owner'], (err3, res3)=>{
                    if(err3){
                        console.error('Error executing query', err3)
                        res.status(500).send('Failed to create member')
                        return;
                    }
                    res.status(200).send(`Successfully created orgainze`);
                })
            })
        })
    }
})


app.get("/payment_info_id", (req, res)=>{
    const {card_id, payment_name, payment_method, promp_pay, expired_date} = req.query
    if(card_id){
        pool.query(`SELECT payment_info_id FROM paymentInfo 
                        WHERE card_id=${card_id};`, (err1, res1)=>{
            if(err1){
                res.status(500).send("failed to search")
                throw err1
                }
                res.status(200).send(res1.rows)
        })
    }else{
        pool.query(`SELECT payment_info_id FROM paymentInfo 
                        WHERE promp_pay=${promp_pay};`, (err1, res1)=>{
            if(err1){
                res.status(500).send("failed to search")
                throw err1
                }
            else{
                res.status(200).send(res1)
            }
        })

    }

})
app.post("/createorganize", (req, res)=>{
    const {f_name, l_name, gender, email, tel, DOB} = req.body
    pool.query(`INSERT INTO users( f_name, l_name, gender, email, tel, DOB) VALUES ('${f_name}','${l_name}','${gender}','${email}','${tel}', '${DOB}');`, (err, cres)=>{
         if(err){
            console.error('Error connecting to database', err);
            res.status(500).send("failed to create user")
            throw err
        }
        res.status(200).send("Succesfully create user")
    })
})

app.post("/create_event", (req, res)=>{
    const {categories_id, organize_id, event_name, event_startdate, event_enddate, location, email, tel, website, event_description, poster, event_type_id, payment_info_id} = req.body
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
        pool.query(`SELECT payment_info_id FROM Organize WHERE organize_id=${organize_id}`, (err1, res1)=>{
            if(err1){
                console.error('Error executing query err1', err1)
                res.status(500).send('Failed to find payment')
                return;
            }
            query = query+', payment_info_id) '+values+`, ${res1.rows[0].payment_info_id}) RETURNING event_id;`
            // console.log(query)
            pool.query(query, (err2, res2)=>{
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
                pool.query(cquery, (err4, res4)=>{
                    if(err4){
                        console.error('error executing query', err4)
                        res.status(500).send('failed to create event')
                        return;
                    }
                    res.status(200).send('Succesfully create event')
                    return;
                })
                // }
            })
        })
    }else{
        query += ', payment_info_id'
        values += `, '${payment_info_id}'`
        query += query+') '+values+') RETURNING event_id;'
        pool.query(query, (err3, res3)=>{
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
                pool.query(cquery, (err5, res5)=>{
                    if(err5){
                        console.error('error executing query', err5)
                        res.status(500).send('failed to create event')
                        return;
                    }
                    res.status(200).send('Succesfully create event')
                    return;
                })

        })
    }
})

app.get("/get_organize_event", async(req, res)=>{
    const {organize_id} = req.query
    pool.query(`SELECT * FROM Event WHERE organize_id=${organize_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find event')
            return;
        }
        res.status(200).send(res1.rows)
    })
})

app.post("/create_seat_type", (req, res)=>{
    const {event_id, seat_type, price, quantity_limit, sale_startdate, sale_enddate, seat_type_description} = req.body
    pool.query("INSERT INTO SeatType(event_id, seat_type, price, quantity_limit, sale_startdate, sale_enddate, seat_type_description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING seat_type_id;",
        [event_id, seat_type, price, quantity_limit, sale_startdate, sale_enddate, seat_type_description], (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to create seat type')
            return;
        }
        res.status(200).send("Successfully create seat type "+res1.rows[0].seat_type_id)
        })
})

app.get("/get_event_seat_type", (req, res)=>{
    const {event_id} = req.query
    pool.query(`SELECT * FROM SeatType WHERE event_id=${event_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find seat type')
            return;
        }
        res.status(200).send(res1.rows)
    })
})

app.post("/create_seat_type_no", (req, res)=>{
    const {seat_type_id, seat_row, seat_start, seat_end} = req.body
    pool.query("INSERT INTO SeatTypeNo(seat_type_id, seat_row, seat_start, seat_end) VALUES ($1, $2, $3, $4)", [seat_type_id, seat_row, seat_start, seat_end], (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to create seat type no')
            return;
        }
        res.status(200).send("Successfully create seat type")
    })
})

app.post("/create_event_voucher", (req, res)=>{
    const {expire_date, voucher_code, event_id, amount, usage_limit} = req.body
    pool.query("INSERT INTO Voucher(expire_date, voucher_code, event_id, amount, usage_limit) VALUES ($1, $2, $3, $4, $5)", [expire_date, voucher_code, event_id, amount, usage_limit], (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to create voucher')
            return;
        }
        res.status(200).send("Successfully create voucher")
    })
})
app.get("/check_follow_event", (req, res)=>{
    const {user_id, event_id} = req.query
    pool.query(`SELECT * FROM FollowedEvent WHERE event_id=${event_id} AND user_id=${user_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find follow event')
            return;
        }
        res.status(200).send(res1.rowCount !== 0)
    })
})
app.post("/follow_event", (req, res)=>{
    const {event_id, user_id} = req.body
    pool.query("INSERT INTO FollowedEvent(user_id, event_id) VALUES ($1, $2)", [user_id, event_id], (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to follow event')
            return;
        }
        res.status(200).send("Successfully follow event")
    })
})

app.delete("/follow_event", (req, res)=>{
    const {event_id, user_id} = req.query
    pool.query(`DELETE FROM FollowedEvent WHERE user_id=${user_id} AND event_id=${event_id}`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to unfollow event')
            return;
        }
        res.status(200).send("Successfully unfollow event")
    })
})

app.get("/get_event_follower", (req, res)=>{
    const {event_id} = req.query
    pool.query(`SELECT COUNT(*) AS Number_of_follower FROM FollowedEvent WHERE event_id=${event_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find event follower')
            return;
        }
        res.status(200).send(res1.rows)
    })
})

app.get("/get_user_followed_event", (req, res)=>{
    const {user_id} = req.query
    pool.query(`SELECT * FROM Event e JOIN FollowedEvent f ON e.event_id=f.event_id WHERE f.user_id=${user_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find event followed')
            return;
        }
        res.status(200).send(res1.rows)
    })
})

app.get("/get_available_seat", (req, res)=>{
    const {event_id} = req.query
    pool.query(`SELECT STN.seat_type_id, seat_row, seat_start, seat_end FROM SeatTypeNo STN JOIN SeatType ST ON STN.seat_type_id=ST.seat_type_id WHERE ST.event_id=${event_id}`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find seat type no')
            return;
        }
        pool.query(`SELECT seat_type_id, seat_no, isrefund FROM ETicket e JOIN Payment p ON e.booking_id=p.booking_id JOIN Booking b ON b.booking_id=p.booking_id WHERE b.event_id=${event_id}`, (err2, res2)=>{
            if(err2){
                console.error('error executing query err2: ', err2)
                res.status(500).send('Failed to find bougth seat no')
                return;
            }
            let seat_no = {}
            res1.rows.forEach((row)=>{
                if(!seat_no[row.seat_type_id]){
                    seat_no[row.seat_type_id] = []
                }
                for(let i = row.seat_start; i<=row.seat_end; i++){
                    seat_no[row.seat_type_id].push(`${row.seat_row}${i.toString().padStart(row.seat_end.toString().length, '0')}`)
                }
            })
            console.log(seat_no, res1, res2)
            // let unavailable_seat = res2.rows.map((obj)=>obj.seat_no)
            let unavailable_seat = {}
            for(let i = 0; i<res2.rowCount; i++){
                const seat = res2.rows[i]
                if(!seat.isrefund){
                    if(!unavailable_seat[seat.seat_type_id]){
                        unavailable_seat[seat.seat_type_id] = [];
                    }
                    unavailable_seat[seat.seat_type_id].push(seat.seat_no)
                }
            }
            // console.log(seat_no, unavailable_seat)
            for(const key in unavailable_seat){
                if(key in seat_no){
                    for(const elem of unavailable_seat[key]){
                        const index = seat_no[key].indexOf(elem)
                        if(index !== -1){
                            seat_no[key].splice(index, 1)
                        }
                    }
                    if(seat_no[key].length === 0){
                        delete seat_no[key]
                    }
                }
            }
            // let available_seat = seat_no.filter((value)=> !unavailable_seat.includes(value))
            res.status(200).send({"available_seat": seat_no})
            
        })
        
    })
})

app.get("/get_seat", (req, res)=>{
    const {event_id} = req.query
    pool.query(`SELECT STN.seat_type_id, seat_row, seat_start, seat_end FROM SeatTypeNo STN JOIN SeatType ST ON STN.seat_type_id=ST.seat_type_id WHERE ST.event_id=${event_id}`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find seat type no')
            return;
        }
            let seat_no = {}
            res1.rows.forEach((row)=>{
                if(!seat_no[row.seat_row]){
                    seat_no[row.seat_row] = []
                }
                for(let i = row.seat_start; i<=row.seat_end; i++){
                    seat_no[row.seat_row].push(`${row.seat_row}${i.toString().padStart(row.seat_end.toString().length, '0')}`)
                }
            })
            res.status(200).send(Object.values(seat_no).sort())
    })
})

app.post("/create_booking", (req, res)=>{
    const {user_id, payment_info_id, event_id, quantity, voucher_id, tickets} = req.body
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    let query = "INSERT INTO Booking(booking_date, user_id, payment_info_id, event_id, quantity"
    let values = "VALUES ($1, $2, $3, $4, $5"
    let format = [formattedDate, user_id, payment_info_id, event_id, quantity]
    if(voucher_id !== undefined){
        query += ", voucher_id"
        values += ", $6"
        format.push(voucher_id)
    }
    query += ") "+values+") RETURNING booking_id;"
    
    pool.query(query, format, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to create booking')
            return;
        }
        let ticket_query = "INSERT INTO ETicket(booking_id, ticket_date, refundable, seat_no, seat_type_id)"
        let ticket_value = " VALUES " + tickets.map((ticket)=>{
            return `(${res1.rows[0].booking_id}, '${ticket.ticket_date}', '${ticket.refundable}', '${ticket.seat_no}', ${ticket.seat_type_id})`
        }).join(', ') + ";"
        pool.query(ticket_query+ticket_value, (err2, res2)=>{
            if(err2){
                console.error('error executing query err2: ', err2)
                res.status(500).send('Failed to create booking ticket')
                return;
            }
            res.status(200).send({info: "Succesfully create booking", booking_id: res1.rows[0].booking_id})
            
        })
    })
    
})

app.get("/get_event", (req, res)=>{
    const {event_id, event_name, event_type_id, categories_id} = req.query
    let query = "SELECT e.*, et.event_type, COUNT(*) AS follower FROM Event e LEFT JOIN FollowedEvent fe ON fe.event_id=e.event_id JOIN EventType et ON e.event_type_id=et.event_type_id"
    let value = []
    if(event_id !== undefined){
        value.push(`e.event_id=${event_id}`)
    }
    if(event_name !== undefined){
        value.push(`event_name LIKE '%${event_name}%'`)
    }
    if(event_type_id !== undefined){
        value.push(`e.event_type_id=${event_type_id}`)
    }
    if(categories_id !== undefined){
        query += ' JOIN CategoriesView cv ON e.event_id=cv.event_id'
        value.push(`categories_id IN (${JSON.parse(categories_id).join(', ')})`)
    }
    if(value.length !== 0){
        query = query +" WHERE " + value.join(" AND ") + " GROUP BY e.event_id, et.event_type"
    }else{
        query = query + " GROUP BY e.event_id, et.event_type"
    }

    if(categories_id !== undefined){
        query += ` HAVING COUNT(DISTINCT cv.categories_id)=${JSON.parse(categories_id).length};`
    }else{
        query += ";"
    }
    // console.log(query)
    pool.query(query, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find event')
            return;
        }
        if(res1.rowCount > 0){
            pool.query(`SELECT cv.event_id, c.categories_name FROM CategoriesView cv JOIN Categories c ON c.categories_id=cv.categories_id WHERE cv.event_id IN (${res1.rows.map((row)=>row.event_id).join(', ')});`, (err2, res2)=>{
                if(err2){
                    console.error('error executing query err2 ', err2)
                    res.status(500).send('Failed to find categories')
                    return;
                }
                const event_categories = res2.rows.reduce((acc, { event_id, categories_name }) => {
                if (!acc[event_id]) {
                    acc[event_id] = [];
                }
                acc[event_id].push(categories_name);
                return acc;
                }, {});
                res1.rows.forEach(item=>{
                    item.categories = event_categories[item.event_id] || []
                })
                res.status(200).send(res1.rows)
            })
        }else{
            res.status(200).send(res1.rows)
        }
    })
})

app.get("/get_user_organize", (req, res)=>{
    const {user_id} = req.query
    pool.query(`SELECT o.*, m.role FROM Organize o JOIN Member m ON o.organize_id=m.organize_id WHERE m.user_id=${user_id};`, (err1, res1)=>{
        if(err1){
            // console.log(query)
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to organization')
            return;
        }
        res.status(200).send(res1.rows)
    })
})

app.get("/validate_voucher", (req, res)=>{
    const {voucher_code, event_id} = req.query
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    pool.query(`SELECT * FROM Voucher WHERE voucher_code='${voucher_code}';`, (err1, res1)=>{
        if(err1){
            // console.log(`SELECT * FROM Voucher WHERE voucher_code='${voucher_code}';`)
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find voucher')
            return;
        }
        if(res1.rowCount === 0 || res1.rows[0].event_id.toString() !== event_id){
            res.status(404).send({voucher_is_valid: false, info: 'Not found this voucher code'})
            return;
        }
        if(res1.rows[0].status){
            res.status(500).send({voucher_is_valid: false, info: 'This voucher already closed'})
            return;
        }
        if(res1.rows[0].expire_date <= formattedDate ){
            res.status(500).send({voucher_is_valid: false, info: 'This voucher already expired'})
            return;
        }
        if(res1.rows[0].usage_limit <= 0){
            res.status(500).send({voucher_is_valid: false, info: 'This voucher already reach the usage limit'})
            return;
        }
        res.status(200).send({voucher_is_valid: true, amount: res1.rows[0].amount, voucher_id: res1.rows[0].voucher_id, info: 'Successfully find this voucher'})

    })
})
// TO DO 
// get event voucher
app.get("/event_voucher", (req, res)=>{
    const {event_id} = req.query
    pool.query(`SELECT * FROM Voucher WHERE event_id=${event_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find voucher')
            return;
        }
        res.status(200).send(res1.rows)
    })
})
// get user booking
app.get("/user_booking", (req, res) => {
  const { user_id } = req.query;

  pool.query(`SELECT b.* FROM Booking b LEFT JOIN Payment p ON b.booking_id=p.booking_id  WHERE user_id=${user_id} AND p.booking_id IS NULL;`, (err1, res1) => {
    if (err1) {
      console.error('error executing query err1: ', err1);
      res.status(500).send('Failed to find voucher');
      return;
    }

    if (res1.rowCount == 0) {
      res.status(200).send(res1.rows);
    } else {
      pool.query(`SELECT et.*, st.seat_type, st.price FROM ETicket et JOIN SeatType st ON et.seat_type_id=st.seat_type_id WHERE booking_id IN (${res1.rows.map((item) => item.booking_id).join(', ')});`, (err2, res2) => {
        let booking_ticket = {};
        res2.rows.forEach((row) => {
          if (!booking_ticket[row.booking_id]) {
            booking_ticket[row.booking_id] = [];
          }
          booking_ticket[row.booking_id].push(row);
        });

        Promise.all(res1.rows.map(async (row) => {
          row.total_price = 0;
          booking_ticket[row.booking_id].forEach((ticket) => {
            row.total_price += parseFloat(ticket.price) * 1.07;
            if (ticket.refundable) {
              row.total_price += parseFloat(ticket.price) * 1.07 * 0.3;
            }
          });

          if (row.voucher_id != null) {
            const voucherQuery = `SELECT amount FROM Voucher WHERE voucher_id=${row.voucher_id};`;
            const voucherResult = await pool.query(voucherQuery);
            if (voucherResult.rowCount != 0) {
              const voucherAmount = parseFloat(voucherResult.rows[0].amount);
              row.total_price -= voucherAmount;
            }
          }

          row.ticket = booking_ticket[row.booking_id];
          return row;
        }))
          .then((updatedRows) => {
            res.status(200).send(updatedRows);
          })
          .catch((error) => {
            console.error('Error executing queries: ', error);
            res.status(500).send('Failed to retrieve booking information');
          });
      });
    }
  });
});

// get event type name
app.get("/event_type_name", (req, res)=>{
    const { event_type_id } = req.query

    pool.query(`SELECT * FROM EventType WHERE event_type_id=${event_type_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find event type name')
            return;
        }
        res.status(200).send(res1.rows[0])

    })
})
// get category name
app.get("/category_name", (req, res)=>{
    const {categories_id} = req.query
    pool.query(`SELECT * FROM Categories WHERE categories_id IN (${JSON.parse(categories_id).join(', ')})`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find cateogories')
            return;
        }
        res.status(200).send(res1.rows)
    })
})
// get payment_info
app.get("/payment_info", (req, res)=>{
    const {payment_info_id} = req.query

    pool.query(`SELECT * FROM paymentInfo WHERE payment_info_id=${payment_info_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to payment infomation')
            return;
        }
        res.status(200).send(res1.rows[0])
    })

})

// confirm payment
app.post("/confirm_payment", (req, res)=>{
    const {payment_info_id, amount, booking_id} = req.body
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    pool.query(`INSERT INTO Payment(payment_info_id, payment_date, amount, booking_id) VALUES ($1, $2, $3, $4);`, [payment_info_id, formattedDate, amount, booking_id], (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed transaction')
            return;
        }
        res.status(200).send("Succesfully made transaction")
    })
})
// refund
// get user ticket
app.get("/user_ticket", (req, res)=>{
    const {user_id} = req.query
    pool.query(`SELECT et.*, st.event_id, st.price, st.seat_type FROM ETicket et JOIN Booking b ON et.booking_id=b.booking_id JOIN Payment p ON p.booking_id=b.booking_id JOIN SeatType st ON et.seat_type_id=st.seat_type_id WHERE b.user_id=${user_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find user ticket')
            return;
        }
        res.status(200).send(res1.rows)
    })
})

app.get("/event_transaction", (req, res)=>{
    const {event_id} = req.query
    pool.query(
        `SELECT u.f_name, u.l_name, s.price, p.payment_date, e.isRefund 
        FROM Users u 
        JOIN Booking b ON u.user_id=b.user_id 
        JOIN Eticket e ON b.booking_id=e.booking_id
        JOIN Payment p ON p.booking_id=b.booking_id
        JOIN SeatType s ON s.seat_type_id=e.seat_type_id
        WHERE b.event_id=${event_id};
        `,
        (err1, res1)=>{
            if(err1){
                console.error('error executing query err1: ', err1)
                res.status(500).send('Failed to find transaction')
                return;
            }
            res.status(200).send(res1.rows)
    })
})

app.get("/event_age_distribute", (req, res)=>{
    const {event_id} = req.query
    const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const dob = new Date(dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
    };
    pool.query(
        `SELECT DISTINCT u.user_id, u.dob  
        FROM Users u 
        JOIN Booking b ON u.user_id=b.user_id 
        JOIN Payment p ON p.booking_id=b.booking_id
        WHERE b.event_id=${event_id}
        `,
        (err1, res1)=>{
            if(err1){
                console.error('error executing query err1: ', err1)
                res.status(500).send('Failed to find user')
                return;
            }

            const ageFrequencies = {};

            res1.rows.forEach((user) => {
                const age = calculateAge(user.dob);
                if (age in ageFrequencies) {
                    ageFrequencies[age]++;
                } else {
                    ageFrequencies[age] = 1;
                }
            });

            const ageFrequencyArray = Object.entries(ageFrequencies).map(([age, frequency]) => ({
                age: parseInt(age),
                frequency,
            }));

            res.status(200).send(ageFrequencyArray)
        })
})

app.get("/event_gender_distribute", (req, res)=>{
    const { event_id } = req.query
    pool.query(
        `SELECT u.gender, COUNT(DISTINCT u.user_id) AS gender_count
        FROM Users u
        JOIN Booking b ON u.user_id = b.user_id
        JOIN Payment p ON p.booking_id = b.booking_id
        WHERE b.event_id = ${event_id}
        GROUP BY u.gender;
        `, (err1, res1)=>{
            if(err1){
                console.error('error executing query err1: ', err1)
                res.status(500).send('Failed to find user')
                return;
            }
            res.status(200).send(res1.rows)
        }
    )
})

app.get("/get_event_sale", (req, res)=>{
    pool.query(`
        SELECT e.*, 
        SUM(CASE WHEN et.isRefund = true THEN s.price ELSE 0 END) AS total_refund,
        SUM(CASE WHEN et.isRefund = false THEN s.price ELSE 0 END) AS total_sale
        FROM Event e
        JOIN Booking b ON e.event_id = b.event_id
        JOIN Eticket et ON b.booking_id = et.booking_id
        JOIN Payment p ON p.booking_id = b.booking_id
        JOIN SeatType s ON s.seat_type_id = et.seat_type_id
        GROUP BY e.event_id;
    `,(err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find event')
            return;
        }
        res.status(200).send(res1.rows)
    })
})

app.put("/use_ticket/:ticket_id", (req, res)=>{
    const {ticket_id} = req.params
    const currentDate = new Date();

    // console.log(`SELECT * FROM ETicket WHERE ticket_id=${ticket_id};`)
    pool.query(`SELECT * FROM ETicket WHERE ticket_id=${ticket_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find ticket')
            return;
        }
        if(res1.rowCount === 0){
            res.status(404).send('Ticket Not Founded')
            return;
        }
        if(new Date(res1.rows[0].ticket_date) > currentDate ){
            res.status(403).send('The ticket date has expired. Cannot proceed with the ticket.')
            return;
        }
        if(res1.rows[0].isrefund){
            res.status(403).send('The ticket is already refunded. Cannot proceed with the ticket.')
            return;
        }
        if(res1.rows[0].ischeckin){
            res.status(403).send('The ticket is already used. Cannot proceed with the ticket.')
            return;
        }
        pool.query(`UPDATE Eticket SET isCheckIn=True WHERE ticket_id=${ticket_id};`, (err2, res2)=>{
            if(err2){
                console.error('error executing query err1: ', err2)
                res.status(500).send('Failed to find ticket')
                return;
            }
            res.status(200).send('Successfully use ticket')
        })
    })
})

app.put("/refund_ticket/:ticket_id", (req, res)=>{
    const { ticket_id } = req.params
    // console.log(`SELECT * FROM ETicket WHERE ticket_id=${ticket_id};`)
    pool.query(`SELECT * FROM ETicket WHERE ticket_id=${ticket_id};`, (err1, res1)=>{
        if(err1){
            console.error('error executing query err1: ', err1)
            res.status(500).send('Failed to find ticket')
            return;
        }
        if(res1.rowCount === 0){
            res.status(404).send('Ticket Not Founded')
            return;
        }
        if(res1.rows[0].ischeckIn){
            res.status(403).send('The ticket is already used. Cannot refund the ticket.')
            return;
        }
        if(res1.rows[0].isrefund){
            res.status(403).send('The ticket is already refunded. Cannot refund the ticket.')
            return;
        }
        if(!res1.rows[0].refundable){
            res.status(403).send("The ticket isn't refundable. Cannot refund the ticket.")
            return;
        }
        pool.query(`UPDATE Eticket SET isRefund=True WHERE ticket_id=${ticket_id};`, (err2, res2)=>{
            if(err2){
                console.error('error executing query err1: ', err2)
                res.status(500).send('Failed to find ticket')
                return;
            }
            res.status(200).send('Successfully refund ticket')
        })
    })
})