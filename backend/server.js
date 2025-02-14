const express = require("express");
const WebSocket = require("ws");
const connectDB = require("./config/db");
const Message = require("./models/Message");
const User = require('./models/User');
const fetch = require('node-fetch');
const Likes = require("./models/Likes");
// import {create} from 'kubo-rpc-client';
const fs = require("fs");
const https = require("https");
const axios = require('axios');
const app = express();
const mongoose = require("mongoose");
const PINATA_API_KEY = '938d269e80d74e636354';
const PINATA_API_SECRET = 'e1c7451ef6efea8a999af55ab661e636442997e1e89144c83b43c818bf2c2629';
const EventEmitter = require('events');
class UserEventEmitter extends EventEmitter { }
const userEvents = new UserEventEmitter();
const cors = require('cors');
const allowedOrigins = ['https://debase.pages.dev', 'https://www.debase.app', 'http://localhost:5173'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'This site does not have access to this resource';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/backend.debase.app/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/backend.debase.app/fullchain.pem')
};

const server = https.createServer(options, app).listen(443, "167.71.99.132", () => {
  console.log(`Server running at https://167.71.99.132/`);
});

// Connect to MongoDB
connectDB();

const projectId = '0882917bbbbe443f8d259cf345a90ab7';
const projectSecret = 'lZDmFq8EvlR1vf/H/M3gK0wePTBuE6GyB9nQ1FqX4fJqTgs6fAnqOw';
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

// const ipfs = create({
//   host: 'ipfs.infura.io',
//   port: 5001,
//   protocol: 'https',
//   headers: {
//     authorization: auth
//   }
// });
const { Web3Storage, File } = require('web3.storage');

// Initialize Web3.Storage client
const WEB3_STORAGE_TOKEN = 'z6MkkAGfzzepLAYsr88jVrReJjZ5fUBEzZDzA2HWDJ1wHiEe';
const web3Client = new Web3Storage({ token: WEB3_STORAGE_TOKEN });

const clients = new Map();
const BATCH_SIZE = 10; // Number of messages to batch
let messageBatch = []; // Array to store batched messages

const wss = new WebSocket.Server({ server });

async function unpinFile(cid) {
  try {
    await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    });
    console.log(`Unpinned file with CID: ${cid}`);
  } catch (error) {
    console.error(`Error unpinning file with CID ${cid}:`, error);
  }
}
async function updateUserLevel(user) {
  const { messagesCount, likesCount, currentLevel } = user;

  // Define level-up criteria (example)
  const levelCriteria = [
    { level: 0, messagesRequired: 100, likesRequired: 50 },
    { level: 1, messagesRequired: 500, likesRequired: 200 },
    { level: 2, messagesRequired: 1000, likesRequired: 500 },
    { level: 3, messagesRequired: 2000, likesRequired: 1000 },
    { level: 4, messagesRequired: 5000, likesRequired: 2000 },
    { level: 5, messagesRequired: 10000, likesRequired: 5000 },
    { level: 6, messagesRequired: 20000, likesRequired: 10000 },
    { level: 7, messagesRequired: 50000, likesRequired: 20000 },
    { level: 8, messagesRequired: 100000, likesRequired: 50000 },
    { level: 9, messagesRequired: 200000, likesRequired: 100000 },
    { level: 10, messagesRequired: 9999999999, likesRequired: 9999999999999 },
    // Add more levels as needed
  ];
  let messageContribution = (messagesCount / levelCriteria[currentLevel].messagesRequired) * 60;
  let likeContribution = (likesCount / levelCriteria[currentLevel].likesRequired) * 40;
  // Ensure contributions do not exceed their maximum values
  messageContribution = Math.min(messageContribution, 60);
  likeContribution = Math.min(likeContribution, 40);
  // Set the next level threshold
  user.nextLevelThreshold = messageContribution + likeContribution;
  if (user.nextLevelThreshold !== null) {
    let thresholdPercent = (user.nextLevelThreshold / 100) * 100; // Since total is out of 100
    user.nextLevelThreshold = parseFloat(thresholdPercent.toFixed(1)); // Format to 1 decimal place
  }
  for (let criteria of levelCriteria) {
    if (messagesCount >= criteria.messagesRequired && likesCount >= criteria.likesRequired) {
      if (currentLevel < criteria.level) {
        user.currentLevel = criteria.level;
      }
    }
    switch (currentLevel) {
      case 0:
        user.badge = "VerifiedBadge";
        break;
      case 1:
        user.badge = 'NewbBadge';
        break;
      case 2:
        user.badge = 'HodlerBadge';
        break;
      case 3:
        user.badge = 'ApeBadge';
        break;
      case 4:
        user.badge = 'DegenBadge';
        break;        
      case 5:
        user.badge = 'ChadBadge';
        break;        
      case 6: 
        user.badge = 'DogeBadge';
        break;        
      case 7:
        user.badge = 'MemeBadge';        
        break;
      case 8:
        user.badge = 'BullBadge';
        break;
      case 9:
        user.badge = 'BearBadge';
        break;
      case 10:
        user.badge = 'AdminBadge';
        break;
    }
  }


  await user.save();
}
async function getPinnedFiles() {
  try {
    const response = await axios.get('https://api.pinata.cloud/data/pinList', {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    });
    return response.data.rows; // This will return an array of pinned files
  } catch (error) {
    console.error('Error fetching pinned files:', error);
  }
}


async function managePinning() {
  const pinnedFiles = await getPinnedFiles();

  if (pinnedFiles.length >= 500) {
    // Sort by timestamp or other criteria to find the oldest
    const filesToUnpin = pinnedFiles.sort((a, b) => a.timestamp - b.timestamp).slice(0, 10); // Adjust the number as needed

    for (const file of filesToUnpin) {
      await unpinFile(file.ipfs_pin_hash); // Use the correct property for the CID
    }
  }
}


// IPFS functions
// async function storeMessagesBatch(batch,retries = 5) {
//   // await managePinning(); // Manage pinning before storing new messages
//   try {
//     const batchJSON = JSON.stringify(batch); // Convert batch to JSON
//     const file = new File([batchJSON], 'messages-batch.json', { type: 'application/json' });

//     // Store file using Web3.Storage
//     const cid = await web3Client.put([file]);
//     console.log(`Stored batch of messages on Web3.Storage with CID: ${cid}`);
//     return cid; // Return the CID

//     } catch (error) {
//     if (error.response && error.response.status === 429 && retries > 0) {
//       // const retryAfter = error.response.headers['retry-after'] || 1; // Default to 1 second if not specified
//       retryAfter = 3;
//       console.log(`Store Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
//       await new Promise(resolve => setTimeout(resolve, retryAfter*1000 ));
//       console.log("Retrying...");
//       return storeMessagesBatch(batch, retries - 1);
//     } else {
//       console.error("Error storing message batch on Pinata:", error);
//       throw error;
//     }

//   }
// }

async function storeMessagesBatch(batch, retries = 5) {
  await managePinning(); // Manage pinning before storing new messages
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      { batch },
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET
        }
      }
    );
    console.log(`Stored batch of messages on IPFS with CID: ${response.data.IpfsHash}`);
    return response.data.IpfsHash;
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      // const retryAfter = error.response.headers['retry-after'] || 1; // Default to 1 second if not specified
      retryAfter = 3;
      console.log(`Store Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      console.log("Retrying...");
      return storeMessagesBatch(batch, retries - 1);
    } else {
      console.error("Error storing message batch on Pinata:", error);
      throw error;
    }

  }
}



async function getMessages(cids, retries = 5) {
  try {
    const responses = await Promise.all(
      cids.map(cid => fetch(`https://w3s.link/ipfs/${cid}`).then(res => res.json()))
    );
    return responses; // Return the fetched data
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      // const retryAfter = error.response.headers['retry-after'] || 1; // Default to 1 second if not specified
      retryAfter = 3;
      console.log(`Get Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      console.log("Retrying...");
      return getMessages(cids, retries - 1);
    } else {
      console.error("Error fetching messages from IPFS via IPFS gateway:", error);
      throw error;
    }
  }
}

// async function storeMessage(message) {
//   try {
//     const response = await axios.post(
//       'https://api.pinata.cloud/pinning/pinJSONToIPFS',
//       message,
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           pinata_api_key: PINATA_API_KEY,
//           pinata_secret_api_key: PINATA_API_SECRET
//         }
//       }
//     );
//     console.log("Stored message CID:", response.data.IpfsHash);
//     return response.data.IpfsHash;
//   } catch (error) {
//     console.error("Error storing message on Web3:", error);
//     throw error;
//   }
// }

wss.on('connection', (ws) => {
  const clientId = generateUniqueId();
  clients.set(clientId, ws);
  let fullMessages = [];
  // Create a map to store messages by CID
  const cidMap = new Map();
  // Send existing messages to new client
  Message.find().sort({ timestamp: -1 }).limit(500)
    .then(async existingMessages => {
      existingMessages.forEach(meta => {
        if (!meta.cid) {
          console.error('Missing CID for message:', meta);
          return; // Handle missing CID
        }
        if (!cidMap.has(meta.cid)) {
          cidMap.set(meta.cid, []);
        }
        cidMap.get(meta.cid).push(meta);
      });
      // console.log("cidMap", cidMap);
      // Fetch user information for all messages
      // const usernames = [...new Set(existingMessages.map(msg => msg.username))];
      // const users = await User.find({ username: { $in: usernames } });
      // const userMap = new Map(users.map(user => [user.username, user]));
      // Retrieve messages from IPFS for all unique CIDs
      return getMessages(Array.from(cidMap.keys())); // Return the promise
    })
    .then(async (messageContents) => {
      // console.log("history messageContents", messageContents);
      const cidKeys = Array.from(cidMap.keys());

      // Construct full messages
      for (const [index, content] of messageContents.entries()) {
        const messagesWithSameCid = cidMap.get(cidKeys[index]);

        if (content.batch) {
          for (const message of content.batch) {
            // Fetch likes for this message
            const likesDoc = await Likes.findOne({ messageId: message._id }).lean();
            const likes = likesDoc ? likesDoc.likes : [];

            // Fetch user badge
            const user = await User.findOne({ username: message.username }).select('badge').lean();
            const badge = user ? user.badge : null;

            fullMessages.push({
              _id: message._id,
              username: message.username,
              publicKey: message.publicKey,
              timestamp: message.timestamp,
              read: message.read,
              mentions: message.mentions,
              text: message.text,
              badge: badge,
              likes: likes,
            });
          }
        } else {
          console.error(`No batch found for CID: ${cidKeys[index]}`);
        }
      }
    })
    .then(async () => {
      // Process batched messages
      let reversedMessageBatch = messageBatch.slice().reverse();

      // Add likes and badges to batched messages
      for (const message of reversedMessageBatch) {
        // Fetch likes for this message
        const likesDoc = await Likes.findOne({ messageId: message._id }).lean();
        const likes = likesDoc ? likesDoc.likes : [];

        // Fetch user badge
        const user = await User.findOne({ username: message.username }).select('badge').lean();
        const badge = user ? user.badge : null;

        message.likes = likes;
        message.badge = badge;
      }

      // Combine batched messages with full messages
      fullMessages = [...reversedMessageBatch, ...fullMessages];

      // Send full messages to the client
      ws.send(JSON.stringify({ type: 'history', messages: fullMessages }));

      // Clear the message batch
      // messageBatch = [];
    })
    .catch(error => {
      console.error('Error retrieving or sending messages:', error);
    });


  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    // if (!data.username || !data.text || !data.publicKey) {
    //   console.error('Invalid message format');
    //   return;
    // }
    console.log('Received message:', data);
    if (data.type == 'message') {
      handleNewMessage(data);
    }

    if (data.type == 'like') handleLike(data);

  });
  async function handleLike(data) {
    try {
      let likes = await Likes.findOne({ messageId: data.messageId });
      if (likes) {
        if (!likes.likes.includes(data.username)) {
          likes.likes.push(data.username);
          if (data.username != data.messageUsername) { await User.findOneAndUpdate({ username: data.messageUsername }, { $inc: { likesCount: 1 } }); }
        } else {
          likes.likes = likes.likes.filter(username => username !== data.username);
          if (data.username != data.messageUsername) { await User.findOneAndUpdate({ username: data.messageUsername }, { $inc: { likesCount: -1 } }); }
        }
        await likes.save();
      } else {
        likes = new Likes({
          messageId: data.messageId,
          likes: [data.username]
        });
        if (data.username != data.messageUsername) { await User.findOneAndUpdate({ username: data.messageUsername }, { $inc: { likesCount: 1 } }); }
        await likes.save();
      }

      clients.forEach((client, id) => {
        if (client.readyState === WebSocket.OPEN
          // && id !== clientId
        ) {
          client.send(JSON.stringify({
            type: 'likes',
            message: { messageId: data.messageId, likes: likes.likes },
          }));
        }
      });
      console.log("send likes", likes);
      let updateUser = await User.findOne({ username: data.username });
      await updateUserLevel(updateUser);
    } catch (error) {
      console.error("Error handling like:", error);
    }
  }
  async function handleNewMessage(data) {
    try {
      let updateUser = await User.findOneAndUpdate(
        { username: data.username },
        {
          username: data.username,
          publicKey: data.publicKey,
          lastSeen: new Date(),
          $inc: { messagesCount: 1 }
        },
        { upsert: true }
      );

      const temporaryId = new mongoose.Types.ObjectId();
      const user = await User.findOne({ username: data.username }).select('badge').lean();
      const badge = user ? user.badge : 'VerifiedBadge';
      const messageToSend = {
        _id: new mongoose.Types.ObjectId(),
        username: data.username,
        publicKey: data.publicKey,
        timestamp: new Date(),
        text: data.text, // Include the message text here
        badge: badge
      };
      console.log("This is message ID", messageToSend._id);
      // Broadcast the message to all connected clients
      clients.forEach((client, id) => {
        if (client.readyState === WebSocket.OPEN
          // && id !== clientId
        ) {
          client.send(JSON.stringify({
            type: 'message',
            message: messageToSend,
          }));
        }
      });
      await updateUserLevel(updateUser)
      messageBatch.push(messageToSend);
      // If batch size is reached, save the batch to IPFS and MongoDB
      if (messageBatch.length >= BATCH_SIZE) {
        // console.log("messageBatch", messageBatch);
        messageBatch.reverse();
        // console.log("reversedMessageBatch", messageBatch);
        const batchCid = await storeMessagesBatch(messageBatch);

        // // Save metadata and CID in MongoDB for each message
        // for (let msg of messageBatch) {
        //   const mongoMessage = new Message({
        //     username: msg.username,
        //     publicKey: msg.publicKey,
        //     timestamp: msg.timestamp,
        //     cid: batchCid // Store the same CID for all batched messages
        //   });
        //   await mongoMessage.save();
        // }

        const mongoMessage = new Message({
          username: messageBatch[0].username, // You can choose to store the first user's info
          publicKey: messageBatch[0].publicKey, // Similarly, you can store the first user's public key
          timestamp: new Date(), // Timestamp for when the batch was saved
          cid: batchCid // Store the same CID for the entire batch
        });

        // Save the single message to MongoDB
        await mongoMessage.save();


        // Clear the batch after saving
        messageBatch = [];
        // console.log("messageBatch", messageBatch);

        console.log(`Stored ${BATCH_SIZE} messages in IPFS with CID: ${batchCid}`);
      }

    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  ws.on('close', () => {
    clients.delete(clientId);
  });
});

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9); // Generates a unique ID
}

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/user/:username', async (req, res) => {
  try {
    console.log("getting user", req.params.username);
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      username: user.username,
      walletAddress: user.publicKey,
      messages: user.messagesCount,
      likes: user.likesCount,
      currentLevel: user.currentLevel,
      nextLevelThreshold: user.nextLevelThreshold,
      badge: user.badge,
      createdAt: user.createdAt,
    });
    console.log("user profile", res.json);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// userEvents.on('newMessage', async (username) => {
//   try {
//     const user = await User.findOneAndUpdate(
//       { username },
//       { $inc: { messagesCount: 1 } },
//       { new: true }
//     );
//     await updateUserLevel(user);
//   } catch (error) {
//     console.error('Error updating message count:', error);
//   }
// });

// userEvents.on('like', async (username, increment) => {
//   try {
//     const user = await User.findOneAndUpdate(
//       { username },
//       { $inc: { likesCount: increment } },
//       { new: true }
//     );
//     await updateUserLevel(user);
//   } catch (error) {
//     console.error('Error updating likes count:', error);
//   }
// });