require("dotenv").config();
const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const accountModel = require("../models/account.model");

async function seedSystemUser() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("CRITICAL ERROR: MONGO_URI environment variable is missing!");
            process.exit(1);
        }

        const email = process.env.SYSTEM_USER_EMAIL || "system@ledger.com";
        const password = process.env.SYSTEM_USER_PASSWORD || "SystemPassword123!";
        const name = process.env.SYSTEM_USER_NAME || "System User";

        await mongoose.connect(process.env.MONGO_URI, { retryWrites: false });
        console.log("Connected to MongoDB for system user seeding...");

        let systemUser = await userModel.findOne({ email }).select("+systemUser");

        if (!systemUser) {
            systemUser = await userModel.create({
                email,
                password,
                name,
                systemUser: true
            });
            console.log(`System User created successfully with email: ${systemUser.email}`);
        } else {
            console.log(`System User already exists with email: ${systemUser.email}`);
        }

        let systemAccount = await accountModel.findOne({ user: systemUser._id });

        if (!systemAccount) {
            systemAccount = await accountModel.create({
                user: systemUser._id
            });
            console.log(`System User Account created successfully with ID: ${systemAccount._id}`);
        } else {
            console.log(`System User Account already exists with ID: ${systemAccount._id}`);
        }

        console.log("System User setup completed successfully.");
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Error seeding system user:", error.message || error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seedSystemUser();
