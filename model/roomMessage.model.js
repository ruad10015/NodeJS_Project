import mongoose from "mongoose";

const roomMessageSchema = mongoose.Schema({
  room: {
    type: String,
    required: true,
    trim:true
  },  
  from: {
    type: String,
    required: true,
    trim:true
  },
  message: {
    type: String,
    required: true,
    trim:true
  },
  timestamp:{
    type:Date,
    default:Date.now
  }
});

export const RoomMessage = mongoose.model("RoomMessage", roomMessageSchema);