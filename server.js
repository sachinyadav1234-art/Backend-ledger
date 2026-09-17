require("dotenv").config();

const app = require("./src/app");
const connectToDB = require("./src/config/db");

connectToDB()
    .then(() => {
        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    })
    .catch((err) => {
        console.error("Failed to start server:", err.message || err);
    });