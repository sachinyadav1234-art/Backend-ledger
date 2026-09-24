require("dotenv").config();
const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const connectToDB = require("../config/db");

async function seedSystemUser() {
    try {
        await connectToDB();
        console.log("Connected to DB...");

        const systemEmail = process.env.SYSTEM_USER_EMAIL || "system@backendledger.local";
        const systemPassword = process.env.SYSTEM_USER_PASSWORD || "SystemPassword#123";

        let systemUser = await userModel.findOne({ email: systemEmail }).select("+systemUser");

        if (!systemUser) {
            systemUser = await userModel.create({
                name: "System Admin",
                email: systemEmail,
                password: systemPassword,
                systemUser: true
            });
            console.log("✓ System user created successfully.");
        } else {
            console.log("✓ System user already exists.");
        }

        const token = jwt.sign(
            { userId: systemUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        console.log("\n==========================================");
        console.log("SYSTEM USER CREDENTIALS:");
        console.log("------------------------------------------");
        console.log(`Email:       ${systemEmail}`);
        console.log(`Password:    ${systemPassword}`);
        console.log(`User ID:     ${systemUser._id}`);
        console.log(`System Auth Token (Bearer Token):`);
        console.log(token);
        console.log("==========================================\n");

        process.exit(0);
    } catch (err) {
        console.error("Failed to seed system user:", err.message || err);
        process.exit(1);
    }
}

seedSystemUser();
