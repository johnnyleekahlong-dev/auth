import express from 'express';
import dotenv from 'dotenv';
import { dbConnect } from './db';
import auth from './routes';
import cors from 'cors';
import session from 'express-session';
import connectMongoDBSession from 'connect-mongodb-session';
import { register } from './controllers/auth';
import cookieParser from 'cookie-parser';

dotenv.config();
dbConnect(process.env.MONGODB_URI!!);
console.log({ NODE_ENV: process.env.NODE_ENV });

const app = express();
const port = process.env.PORT;
const MongoDBStore = connectMongoDBSession(session);
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI!!,
  collection: 'sessions',
});

const corsConfig = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

app.set('trust proxy', 1); // trust first proxy
app.options('', cors(corsConfig));
app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET!!,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: process.env.NODE_ENV === 'production' ? true : false, // Set to true if using HTTPS
      maxAge: 3600000, // 1 hour
      sameSite: 'none',
      path: '/',
    },
  })
);
app.get('/', (req, res) => {
  res.json({
    message: 'Authentication System',
  });
});
app.use('/auth', auth);
app.listen(port, async () => {
  console.log(`Auth server is running on port: ${port}`);
});

export default app;
