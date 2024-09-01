import express from 'express';
import dotenv from 'dotenv';
import { dbConnect } from './db';
import auth from './routes';
import cors from 'cors';
import session from 'express-session';
import connectMongoDBSession from 'connect-mongodb-session';
import { register } from './controllers/auth';

dotenv.config();
dbConnect(process.env.MONGODB_URI!!);

const app = express();
const port = process.env.PORT;
const MongoDBStore = connectMongoDBSession(session);
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI!!,
  collection: 'sessions',
});

const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

app.options('', cors(corsConfig));
app.use(cors(corsConfig));

app.use(
  session({
    store,
    secret: process.env.SESSION_SECRET!!,
    resave: false, // for every request to server to create a new session even the same user set to false
    saveUninitialized: false, // not saving if there's no changes in session
  })
);

app.use(express.json());
// app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({
    message: 'Hello World',
  });
});
app.get('/register', (req, res) => {
  res.json({ message: 'register' });
});
app.post('/register', register);
app.use('/auth', auth);

app.listen(port, async () => {
  console.log(`Auth server is running on port: ${port}`);
});

export default app;
