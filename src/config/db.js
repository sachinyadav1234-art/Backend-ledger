const mongoose = require("mongoose")



function connectToDB() {
    if (!process.env.MONGO_URI) {
        console.error("CRITICAL ERROR: MONGO_URI environment variable is missing!");
        process.exit(1);
    }

    return mongoose.connect(process.env.MONGO_URI, { retryWrites: false })
        .then(() => {
            console.log("server is connected to DB")
        })
        .catch(err => {
            console.log("Error connecting to DB:", err.message || err)
            process.exit(1)
        })

}


module.exports = connectToDB