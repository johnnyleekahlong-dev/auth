import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { dbConnect } from './db';
import auth from './routes/auth';
import cors from 'cors';
import session from 'express-session';
import { Request, Response, NextFunction } from 'express';
import connectMongoDBSession from 'connect-mongodb-session';

dotenv.config();

const app = express();
const port = process.env.PORT;
const MongoDBStore = connectMongoDBSession(session);
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI!!,
  collection: 'sessions',
});

app.use(
  session({
    store,
    secret: process.env.SESSION_SECRET!!,
    resave: false, // for every request to server to create a new session even the same user set to false
    saveUninitialized: false, // not saving if there's no changes in session
  })
);
// const allowedOrigins = [
//   'http://localhost:3000',
//   process.env.CORS_ALLOWED_ORIGIN,
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (allowedOrigins.includes(origin) || !origin) {
//         callback(null, true);
//       } else {
//         callback(new Error('Not allowed by CORS'));
//       }
//     },
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: true, // Allows all origins
    credentials: true, // Allows credentials (cookies, authorization headers, etc.)
  })
);

app.use(express.json());
// app.use(cookieParser());
app.use('/auth', auth);

app.listen(port, async () => {
  await dbConnect(process.env.MONGODB_URI!!);
  console.log(`Auth server is running on port: ${port}`);
});
