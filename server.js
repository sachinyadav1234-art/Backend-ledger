require("dotenv").config()

const app = require("./src/app")
const connectToDB = require("./src/config/db")
const seedSystemUser = require("./src/scripts/seedSystemUser")

connectToDB().then(async () => {
    try {
        await seedSystemUser();
    } catch (err) {
        console.error("Failed to seed system user on startup:", err.message || err);
    }
});

app.listen(3000, () => {
    console.log("Server is running on port 3000")
})