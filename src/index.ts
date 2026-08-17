import express from 'express';
import dotenv from 'dotenv';
import { dbConnect } from './db';
import auth from './routes';
import admin from './routes/admin';
import webhooks from './routes/webhooks';
import eventTypes from './routes/eventTypes';
import cors from 'cors';
import session from 'express-session';
import connectMongoDBSession from 'connect-mongodb-session';
import cookieParser from 'cookie-parser';
import { csrfProtection } from './middlewares/csrf';
// import { redisClient } from './utils/redis';

dotenv.config();
dbConnect(process.env.MONGODB_URI!!);

// async function initialize() {
//   if (!redisClient.isOpen) {
//     await redisClient.connect();
//   }
// }

// initialize().catch(console.error);

const app = express();
const port = process.env.PORT;
const MongoDBStore = connectMongoDBSession(session);
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI!!,
  collection: 'sessions',
});

const corsConfig = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
};

app.set('trust proxy', 1); // trust first proxy
app.options('', cors(corsConfig));
app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET!!,
//     resave: false,
//     saveUninitialized: false,
//     store,
//     cookie: {
//       secure: process.env.NODE_ENV === 'production' ? true : false, // Set to true if using HTTPS
//       maxAge: 3600000, // 1 hour
//       sameSite: 'none',
//       path: '/',
//     },
//   }),
// );

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store,

    cookie: {
      secure: false,
      maxAge: 3600000,
      // maxAge: 5 * 60 * 1000,
      sameSite: 'lax',
      path: '/',
      httpOnly: true,
    },
  }),
);

app.use(csrfProtection);

app.get('/', (req, res) => {
  res.json({
    message: 'Authentication System',
  });
});

app.use('/auth', auth);
app.use('/admin', admin);
app.use('/admin/webhooks', webhooks);
app.use('/admin/event-types', eventTypes);

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Listening on ${port}`);
  });
}

export default app;
