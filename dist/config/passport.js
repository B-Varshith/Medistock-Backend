"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const db_1 = require("./db");
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: "http://localhost:5000/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0].value;
        if (!email) {
            return done(new Error('No email found in Google profile'));
        }
        // Check if user exists
        let user = await db_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            // Create new user if not exists
            user = await db_1.prisma.user.create({
                data: {
                    name: profile.displayName || 'Google User',
                    email: email,
                    oauthProvider: 'GOOGLE',
                    // password: null, // Prisma handles optional as undefined/null, best to omit or use undefined
                    role: 'OWNER'
                }
            });
        }
        return done(null, user);
    }
    catch (error) {
        return done(error);
    }
}));
exports.default = passport_1.default;
