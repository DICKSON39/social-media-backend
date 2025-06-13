import express, {NextFunction,Response,Request} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from "./config/db.config";
import morgan from "morgan";
import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import commentsRoutes from './routes/comments.routes'
import usersRoutes from "./routes/users.routes";
import countryRoutes from "./routes/country.routes";





dotenv.config();

const  app = express();



app.use(express.json());
app.use(morgan("dev"))


const allowedOrigins = ["https://campus-connect-mu-two.vercel.app",
    "http://localhost:4200","https://campus-connect-mu-two.vercel.app"];

app.use(
    cors({
        origin: (origin: string | undefined, callback: Function) => {
            console.log("🌍 Incoming Origin:", origin);
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

app.use((req:Request, res:Response, next:NextFunction)=> {
    console.log(`[REQUEST] ${req.method} ${req.url}`)

    next();

})

//Routes
app.use('/api/auth/v1',authRoutes)
app.use('/api/auth/v1',postRoutes)
app.use('/api/comment',commentsRoutes);
app.use('/api/users',usersRoutes);
app.use('/api/country',countryRoutes);





const port = process.env.PORT;

const testDB = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Database connected! Time:',);
        client.release(); // very important to release the client
    } catch (err) {
        console.error('Database connection failed:', err);
    }

}

testDB();

app.get('/', (req, res) => {
    console.log("Hello world")

})


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});






