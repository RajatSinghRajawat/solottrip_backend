const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../Common/Emailsendr');


exports.ChekEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        console.log(user,"mmmm");
        if (user?.status == 'true') {
            return res.status(200).json({status:0 , passwordStaus:user.password ? true : false, message: "Email available" });
        }
        res.status(200).json({status:1 , message: "Email Not available" });
    } catch (error) {
        console.error(error);
        res.status(500).json({status:11 , message: "Error checking email", error });
    }
};

// exports.sendEmail = async (req, res) => {
//     try {
//         const { email } = req.body;
//         const otp = Math.floor(100000 + Math.random() * 900000);

//         const subject = 'Your Solo Trip OTP Verification Code';
//         const text = `Your OTP for Solo Trip account verification is: ${otp}`;
//         const html = `
//             <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
//                 <h2 style="color: #3498db;">Welcome to Solo Trip! 🏞️</h2>
//                 <p style="font-size: 18px;">Your One-Time Password (OTP) for account verification is:</p>
//                 <h1 style="color: #e74c3c;">${otp}</h1>
//                 <p style="font-size: 16px;">Please enter this code to complete your verification. The OTP is valid for 10 minutes.</p>
//                 <hr style="margin: 20px 0;">
//                 <p style="font-size: 14px; color: #7f8c8d;">If you did not request this, please ignore this email.</p>
//                 <p style="font-size: 14px; color: #7f8c8d;">Happy Travels! 🌍<br>— The Solo Trip Team</p>
//             </div>
//         `;
//         sendEmail(
//             email,
//             subject,
//             text,
//             html
//         ).catch(console.error);
//         const user = await User.findOne({ email });
//         if(!user){
//             await User.insertOne({
//                 Otp: otp,
//                 email
//             })
//         }else{
//             await User.updateOne({ email }, { Otp: otp });
//         }
//         res.status(200).json({ message: "Email sent successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Error logging in", error });
//     }
// };



exports.sendEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Hash the OTP before storing it (for security)
        const hashedOtp = await bcrypt.hash(otp.toString(), 10);

        // Email Content
        const subject = "Your Solo Trip OTP Verification Code";
        const text = `Your OTP for Solo Trip account verification is: ${otp}`;
        const html = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <h2 style="color: #3498db;">Welcome to Solo Trip! 🏞️</h2>
                <p style="font-size: 18px;">Your One-Time Password (OTP) for account verification is:</p>
                <h1 style="color: #e74c3c;">${otp}</h1>
                <p style="font-size: 16px;">Please enter this code to complete your verification. The OTP is valid for 10 minutes.</p>
                <hr style="margin: 20px 0;">
                <p style="font-size: 14px; color: #7f8c8d;">If you did not request this, please ignore this email.</p>
                <p style="font-size: 14px; color: #7f8c8d;">Happy Travels! 🌍<br>— The Solo Trip Team</p>
            </div>
        `;

        // Send the email
        await sendEmail(email, subject, text, html);

        // Upsert (Insert if user doesn't exist, Update if user exists)
        await User.findOneAndUpdate(
            { email },
            { $set: { otp: hashedOtp, otpCreatedAt: new Date() } },
            { upsert: true, new: true }
        );

        // Response
        res.status(200).json({ message: "Email sent successfully" });

    } catch (error) {
        console.error("Error sending OTP email:", error);
        res.status(500).json({ message: "Error sending OTP email", error: error.message });
    }
};




exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });
        console.log(req.body , "body");
        
        console.log(user,"kk");
        if (!user) return res.status(404).json({ status:0 ,message: "User not found" });
        if (user.Otp != otp) return res.status(400).json({ status:0 ,message: "Invalid OTP" });
        user.status = true;
        await user.save();
        res.status(200).json({ status:1 ,message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ status:11 ,message: "Error verifying OTP", error });
    }
};

exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found. Please verify OTP first." });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate JWT Token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "tew", { expiresIn: '1d' });

        // Update user data
        user.password = hashedPassword;
        user.token = token;
        await user.save();

        res.status(201).json({ message: "User registered successfully", token, user });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Error registering user", error });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: "Login successful", token, user });
    } catch (error) {
        res.status(500).json({ message: "Error logging in", error });
    }
};

exports.updateUser = async (req, res) => {
    try {
        // Destructure fields from req.body
        const {
            name,
            password,
            textarea,
            committingName,
            location,
            country,
            city,
            travelStyle,
            budgetRange,
            foodPreference,
            hiking
        } = req.body;

        let updatedData = {
            name,
            textarea,
            committingName,
            location,
            country,
            city,
            travelStyle,
            budgetRange,
            foodPreference,
            hiking
        };
        // updatedData = Object.fromEntries(
        //     Object.entries(updatedData).filter(([_, value]) => value !== undefined)
        // );

        if (password) {
            updatedData.password = await bcrypt.hash(password, 10);
        }
        if (req.file) {
            updatedData.img = req.file.filename;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user", error });
    }
};
    
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ message: "User fetched successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error });
    }
};
