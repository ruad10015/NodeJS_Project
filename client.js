require("dotenv").config();
const { User } = require("./model/user.model");
const readline = require("readline");
const { io } = require("socket.io-client");
const { encrypt, decrypt } = require("./encryption");
const mongoose = require("mongoose");
const { RoomMessage } = require("./model/roomMessage.model");
const { PrivateMessage } = require("./model/privateMessage.model");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.error("Error connecting to MONGODB: " + error.message);
    process.exit(1);
  }
};

connectDB();

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var username;
var password;
let mode = null;
let target = null;

socket.on("receive_private_message", ({ from, message }) => {
  const decrypted = decrypt(message);

  console.log(`\n[PRIVATE] ${from}: ${decrypted}`);
  promptInput();
});

socket.on("receive_room_message", ({ from, message }) => {
  const decrypted = decrypt(message);
  console.log(`\n[ROOM] ${from}: ${decrypted}`);
  promptInput();
});

Auth();

function Auth() {
  rl.question("Enter your username: ", (name) => {
    username = name;

    rl.question("Enter your password: ", async (pass) => {
      password = pass;

      try {
        let user = await User.findOne({ username: name, password: pass });

        if (user) {
          socket.emit("login", name);
          chooseMode();
        } else {
          const newUser = new User({
            username: name,
            password: pass,
          });

          try {
            await newUser.save();
            socket.emit("register", name);
            chooseMode();
          } catch (err) {
            if (err.name === "ValidationError") {
              for (let field in err.errors) {
                console.log(
                  `⚠️ Validation error: ${err.errors[field].message}`
                );
              }
            } else if (err.code === 11000) {
              console.log("⚠️ This username already exists.");
            } else {
              console.error("❌ Error saving user:", err.message);
            }

            Auth();
          }
        }
      } catch (error) {
        console.error("❌ Database error:", error.message);
        rl.close();
      }
    });
  });
}

function chooseMode() {
  rl.question(
    "\nChoose chat mode:\n1) Private chat\n2) Room chat\n> ",
    (choice) => {
      if (choice === "1") {
        mode = "private";
        rl.question("Enter username to chat with: ", async (user) => {
          target = user;
          const messages = await PrivateMessage.find({
            from: target,
            to: username,
          });
          for (i = 0; i < messages.length; i++) {
            console.log(
              `\n[PRIVATE] ${messages[i].from}: ${messages[i].message}`
            );
          }
          promptInput();
        });
      } else if (choice === "2") {
        mode = "room";
        rl.question("Enter room name: ", async (room) => {
          target = room;

          const messages = await RoomMessage.find({
            room: room,
          });
          for (i = 0; i < messages.length; i++) {
            console.log(
              `\n[ROOM] ${messages[i].from}: ${messages[i].message}`
            );
          }
          socket.emit("join_room", room);
          promptInput();
        });
      } else {
        console.log("Invalid choice.");
        chooseMode();
      }
    }
  );
}

function promptInput() {
  rl.question(
    `${mode === "private" ? `[${target}]` : `[${target} Room]`} > `,
    (msg) => {
      if (msg.trim().toLowerCase() === "/menu") {
        mode = null;
        target = null;
        chooseMode();
        return;
      }

      if (mode === "private") {
        socket.emit("send_private_message", {
          to: target,
          message: encrypt(msg),
        });
      } else if (mode === "room") {
        socket.emit("send_room_message", {
          room: target,
          message: encrypt(msg),
        });
      }

      promptInput();
    }
  );
}
