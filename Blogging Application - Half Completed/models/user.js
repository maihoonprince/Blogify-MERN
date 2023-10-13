const { createHmac, randomBytes } = require("crypto");
const { Schema, model } = require("mongoose");
const { createTokenFoUser } = require("../services/authentication");

// Define the user schema
const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    salt: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    profileImageURL: {
        type: String,
        default: "/images/default.png",
    },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
    },
}, 
{ timestamps: true }
);

// Middleware to hash the password and generate a salt before saving
userSchema.pre("save", function (next) {
    const user = this;

    // Check if the password is modified
    if (!user.isModified("password")) return next();

    // Generate a random salt
    const salt = randomBytes(16).toString('hex'); // Use 'hex' encoding

    // Hash the password with the salt using SHA-256
    const hashedPassword = createHmac("sha256", salt).update(user.password).digest("hex");

    // Set the salt and hashed password in the document
    this.salt = salt;
    this.password = hashedPassword;

    next(); // Continue with the save operation
});

// Static method to match password and generate a token
userSchema.statics.matchPasswordAndGenerateToken = async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found");

    const salt = user.salt;
    const hashedPassword = user.password;

    const userProvidedHash = createHmac("sha256", salt).update(password).digest("hex");

    if (hashedPassword !== userProvidedHash) throw new Error("Incorrect Password");

    const token = createTokenFoUser(user);
    return token;
};

// Create the User model based on the schema
const User = model("User", userSchema);

module.exports = User;
