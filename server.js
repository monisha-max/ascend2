require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 4000; // Changed port to 4000
const dbName = 'TaxCollector'; // Update this with your database name
const session = require('express-session');

app.use(session({
    secret: 'your session secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // set to false for HTTP, true for HTTPS
        httpOnly: true, // recommended for security
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    } 
}));

// Environment variables for security
const mongoUri = 'mongodb+srv://monishakollipara13:lQCoLu5hP6mIuaoj@cluster0.viy9cup.mongodb.net/TaxCollector?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB Atlas
console.log('Server start');
mongoose.connect(`${mongoUri}`, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});
const userTaxDetailsSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grossSalary: Number,
    baseSalary: Number,
    hraReceived: Number,
    rentPaid: Number,
    dearAllowance: Number,
    ltaReceived: Number,
    investment80c: Number,
    section80TTA: Number,
    section80D: Number,
    section80G: Number,
    section24: Number,
    section80CCD1B: Number,
    section80CCD2: Number,
    section80E: Number,
    // ... [add other tax fields as needed] ...
});


console.log('Mongo connect');

const User = mongoose.model('users', userSchema);
const UserTaxDetails = mongoose.model('UserTaxDetails', userTaxDetailsSchema);

console.log('Mongo model');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

console.log('Before login');

app.get('/', (req, res) => {
  res.send(`
    <form action="/login" method="post">
      <input type="radio" name="userType" value="new" id="newUser" checked>New User<br>
      <input type="radio" name="userType" value="existing" id="existingUser">Existing User<br>
      <input type="text" name="username" id="username" placeholder="Username" required>
      <input type="password" name="password" id="password" placeholder="Password" required>
      <button type="submit">Submit</button>
    </form>
  `);
});

app.post('/login', async (req, res) => {
  try {
    console.log(`Inside login`);
    console.log(req.body);
    const { userType, username, password } = req.body;
    if (userType === 'new') {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).send({ message: 'Username is already taken' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword });
      await user.save();
      res.status(201).send({ message: 'User registered successfully' });
    } else {
      const user = await User.findOne({ username });
      if (user && await bcrypt.compare(password, user.password)) {
        //res.send({ message: 'Login successful' });
        req.session.userId =user._id;
        console.log('testuserid',req.session.userId);
        console.log('AFter Session:', req.session);
        res.redirect('/tax-calculation');
        
      } else {
        res.status(401).send({ message: 'Invalid credentials' });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'An error occurred' });
  }
});

// app.get('/', (req, res) => {
//   res.sendFile('login.html', { root: __dirname });
// });
app.get('/tax-calculation', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(403).send({ message: 'Not logged in' });
        }
        
        // Check if there are previous tax details for the user
        const previousTaxDetails = await UserTaxDetails.findOne({ user: userId });
        
        let formFields = '';
        if (previousTaxDetails) {
            // Populate form fields with previous inputs
            formFields = `
                <form action="/calculate-tax" method="post">
                    <input type="number" name="grossSalary" placeholder="Gross Salary" value="${previousTaxDetails.grossSalary}" required><br>
                    <input type="number" name="baseSalary" placeholder="Base Salary" value="${previousTaxDetails.baseSalary}" required><br>
                    <input type="number" name="hraReceived" placeholder="HRA Received" value="${previousTaxDetails.hraReceived || ''}"><br>
                    <input type="number" name="rentPaid" placeholder="Rent Paid" value="${previousTaxDetails.rentPaid || ''}"><br>
                    <input type="number" name="dearAllowance" placeholder="Dear Allowance" value="${previousTaxDetails.dearAllowance || ''}"><br>
                    <input type="number" name="ltaReceived" placeholder="LTA Received" value="${previousTaxDetails.ltaReceived || ''}"><br>
                    <input type="number" name="investment80c" placeholder="Investment under Sec 80C, 80CCC, 80CCD(1)" value="${previousTaxDetails.investment80c || ''}"><br>
                    <input type="number" name="section80TTA" placeholder="Amt under Sec 80TTA" value="${previousTaxDetails.section80TTA || ''}"><br>
                    <input type="number" name="section80D" placeholder="Amt under Sec 80D" value="${previousTaxDetails.section80D || ''}"><br>
                    <input type="number" name="section80G" placeholder="Amt under Sec 80G" value="${previousTaxDetails.section80G || ''}"><br>
                    <input type="number" name="section24" placeholder="Amt under Sec 24" value="${previousTaxDetails.section24 || ''}"><br>
                    <input type="number" name="section80CCD1B" placeholder="Amt under Sec 80CCD(1B)" value="${previousTaxDetails.section80CCD1B || ''}"><br>
                    <input type="number" name="section80CCD2" placeholder="Amt under Sec 80CCD(2)" value="${previousTaxDetails.section80CCD2 || ''}"><br>
                    <input type="number" name="section80E" placeholder="Amt under Sec 80E" value="${previousTaxDetails.section80E || ''}"><br>
                    <button type="submit">Update</button>
                </form>
            `;
        } else {
            // If no previous inputs, show empty form
            formFields = `
                <form action="/calculate-tax" method="post">
                    <input type="number" name="grossSalary" placeholder="Gross Salary" required><br>
                    <input type="number" name="baseSalary" placeholder="Base Salary" required><br>
                    <input type="number" name="hraReceived" placeholder="HRA Received" required><br>
                    <input type="number" name="rentPaid" placeholder="Rent Paid" required><br>
                    <input type="number" name="dearAllowance" placeholder="Dear Allowance" required><br>
                    <input type="number" name="ltaReceived" placeholder="LTA Received" required><br>
                    <input type="number" name="investment80c" placeholder="Investment under Sec 80C, 80CCC, 80CCD(1)" required><br>
                    <input type="number" name="section80TTA" placeholder="Amt under Sec 80TTA" required><br>
                    <input type="number" name="section80D" placeholder="Amt under Sec 80D" required><br>
                    <input type="number" name="section80G" placeholder="Amt under Sec 80G" required><br>
                    <input type="number" name="section24" placeholder="Amt under Sec 24" required><br>
                    <input type="number" name="section80CCD1B" placeholder="Amt under Sec 80CCD(1B)" required><br>
                    <input type="number" name="section80CCD2" placeholder="Amt under Sec 80CCD(2)" required><br>
                    <input type="number" name="section80E" placeholder="Amt under Sec 80E" required><br>
                    <button type="submit">Submit</button>
                </form>
            `;
        }
        
        res.send(formFields);
    } catch (error) {
        console.error("Error fetching previous inputs:", error);
        res.status(500).send({ message: 'An error occurred', errorDetails: error.message });
    }
});

app.post('/calculate-tax', async (req, res) => {
    console.log('Session:', req.session);
    try {
        // Extracting form data
        const {
          grossSalary,
          baseSalary,
          hraReceived,
          rentPaid,
          dearAllowance,
          ltaReceived,
          investment80c,
          section80TTA,
          section80D,
          section80G,
          section24,
          section80CCD1B,
          section80CCD2,
          section80E
        } = req.body;
    
        const userId = req.session.userId;
        if (!userId) {
          return res.status(403).send({ message: 'Not logged in' });
        }
    
        // Check if the user already has tax details
        let taxDetails = await UserTaxDetails.findOne({ user: userId });
    
        // If tax details already exist, update them; otherwise, create a new entry
        if (taxDetails) {
          taxDetails = await UserTaxDetails.findOneAndUpdate(
            { user: userId },
            {
              grossSalary,
              baseSalary,
              hraReceived,
              rentPaid,
              dearAllowance,
              ltaReceived,
              investment80c,
              section80TTA,
              section80D,
              section80G,
              section24,
              section80CCD1B,
              section80CCD2,
              section80E
            },
            { new: true }
          );
        } else {
          taxDetails = new UserTaxDetails({
            user: userId,
            grossSalary,
            baseSalary,
            hraReceived,
            rentPaid,
            dearAllowance,
            ltaReceived,
            investment80c,
            section80TTA,
            section80D,
            section80G,
            section24,
            section80CCD1B,
            section80CCD2,
            section80E
          });
          await taxDetails.save();
        }
    
        res.json({
          message: "Tax details calculated and saved",
          data: taxDetails
        });
      } catch (error) {
        console.error("Error details:", error);
        res.status(500).send({ message: 'An error occurred', errorDetails: error.message });
      }
});
   
  
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
