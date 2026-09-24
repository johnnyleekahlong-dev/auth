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

dotenv.config();
dbConnect(process.env.MONGODB_URI!);

const app = express();
const port = process.env.PORT;

const MongoDBStore = connectMongoDBSession(session);
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI!,
  collection: 'sessions',
});
store.on('error', (err) => console.error('Session store error:', err));

const isProd = process.env.NODE_ENV === 'production';

const corsConfig = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
};

app.set('trust proxy', 1);
app.options('*', cors(corsConfig));
app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: store as session.Store,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 3600000,
      path: '/',
    },
  }),
);

app.use(csrfProtection);

app.get('/', (_, res) => {
  res.json({ message: 'Authentication System' });
});

app.use('/auth', auth);
app.use('/admin', admin);
app.use('/admin/webhooks', webhooks);
app.use('/admin/event-types', eventTypes);

if (!isProd) {
  app.listen(port, () => console.log(`Listening on ${port}`));
}

export default app;
