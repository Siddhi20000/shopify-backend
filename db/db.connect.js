const mongoose= require("mongoose");
require("dotenv").config();
//require("dotenv").config({ path: ".env.grocery" });

const mongoUri= process.env.MONGODB;

const initializeDatabase= async()=>{
    await mongoose.connect(mongoUri).then(()=>{
        console.log("Connected to database");
    })
    .catch((error)=> console.log("Error connecting to databasse", error));
}

module.exports= {initializeDatabase};

