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
const methodOverride = require('method-override');
const nocache=require("nocache")
const passport=require("passport")
const Razorpay = require('razorpay');
const mongoose=require('mongoose')



//port
let port = process.env.PORT || 8000;


app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(methodOverride('_method'));
app.use(nocache());


// Static Files
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.static('public'));

app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/admincss', express.static(path.join(__dirname, 'public/admincss')));
app.use('/usercss', express.static(path.join(__dirname, 'public/usercss')));
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
    mongoUrl: 'mongodb://localhost:27017/adminDB'
  }),
  secret: process.env.SESSION_SECRET||'mysecret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

//razor pay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Routes

app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  next();
});


app.use('/user',userRouter)
app.use('/admin',adminRouter)
app.get('/', (req, res) => {
  res.redirect('/user/home');
});


// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});



const startServer = async () => {
  try {
    await connectDB(); // Using your existing connectDB function
    console.log("Database connection established successfully");
    
    let server;
    
    // Handle graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Received kill signal, shutting down gracefully');
      
      if (server) {
        server.close(async () => {
          console.log('Closed out remaining connections');
          
          try {
            await mongoose.connection.close(false); // Using await instead of callback
            console.log('MongoDB connection closed');
            process.exit(0);
          } catch (error) {
            console.error('Error closing MongoDB connection:', error);
            process.exit(1);
          }
        });
    
        // Force shutdown after 10 seconds
        setTimeout(() => {
          console.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start server after DB connection
    server = app.listen(port, () => console.log(`Server running on port ${port}`));

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}`);
        port += 1;
        server = app.listen(port, () => console.log(`Server running on port ${port}`));
      } else {
        console.error('Server error:', error);
      }
    });

  } catch (err) {
    console.log('Server startup failed:', err.message);
    process.exit(1);
  }
};

// Call the function
startServer();