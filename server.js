require('dotenv').config();
const express = require('express');
const app = express();
const expressLayout = require('express-ejs-layouts');
const userRouter=require('./router/user')
const adminRouter=require('./router/admin')
const connectDB=require('./db/connectDB')
const cookieParser=require('cookie-parser')
const cors=require('cors')
const session=require('express-session')
const MongoStore = require('connect-mongo');
const path=require('path')


const port = process.env.PORT || 3000;

// Static Files
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())



app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.static('public'));

app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/admincss', express.static(path.join(__dirname, 'public/admincss')));

app.use('/img', express.static(path.join(__dirname, 'public/img')));

app.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));

// Setting Views Folder and View Engine
app.set('views', './views');
app.use(expressLayout);
app.set('layout', './layout/user-layout.ejs'); // Default layout for all views
app.set('view engine', 'ejs');

//session


app.use(session({
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/yourdb'
  }),
  secret: 'mysecret',
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));




// Routes

app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  next();
});
app.use('/user',userRouter)
app.use('/admin',adminRouter)

// Start the Server
connectDB()
.then(()=>
{
  console.log("Database connection established succesfully")
  app.listen(port, ()=>console.log(`server running on the port ${port}`));
})
.catch(()=>{
  console.log('Database connection lost',err.message)
})