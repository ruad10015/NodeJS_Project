import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim:true,
    unique:[true,"This User already exists"]
  },
  password: {
    type: String,
    required: true,
    minLength: ["8","Password must be minumum 8 characters"],
    trim:true
  },
});

export const User = mongoose.model("User", userSchema);