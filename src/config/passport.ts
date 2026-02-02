import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { prisma } from './db';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: "http://localhost:5000/api/auth/google/callback"
},
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
            const email = profile.emails?.[0].value;

            if (!email) {
                return done(new Error('No email found in Google profile'));
            }

            // Check if user exists
            let user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                // Create new user if not exists
                user = await prisma.user.create({
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

        } catch (error) {
            return done(error as Error);
        }
    }
));

export default passport;
