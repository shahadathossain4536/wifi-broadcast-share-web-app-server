// const express = require("express");
// const cors = require("cors");
// const Bonjour = require("bonjour");
// const ping = require("ping");
// const http = require("http");
// const socketIo = require("socket.io");
// const arp = require("node-arp");
// const fs = require('fs');
// const https = require('https');

// const app = express();
// let server;
// if (process.env.NODE_ENV === 'production') {
//   // For HTTPS
//   const credentials = {
//     key: fs.readFileSync('./certificates/private-key.pem', 'utf8'),
//     cert: fs.readFileSync('./certificates/certificate.pem', 'utf8')
//   };
//   server = https.createServer(credentials, app);
// } else {
//   // For HTTP (development)
//   server = http.createServer(app);
// }

// // Enable CORS
// app.use(
//   cors({
//     origin: [
//       "https://192.168.1.107:3000",
//       "http://192.168.1.107:3000",
//       "http://localhost:3000",
//       "https://localhost:3000",
//     ],
//     methods: ["GET", "POST"],
//     credentials: true,
//   })
// );
// app.use(express.json());

// // Socket.IO setup
// const io = socketIo(server, {
//   cors: {
//     origin: [
//       "https://192.168.1.107:3000",
//       "http://192.168.1.107:3000",
//       "http://localhost:3000",
//       "https://localhost:3000"
//     ],
//     methods: ["GET", "POST"],
//     credentials: true
//   }
// });

// // Debugging WebSocket connections
// io.on("connection", (socket) => {
//   console.log("Client connected:", socket.id);

//   socket.on("request-share", (data) => {
//     const { userId, ip } = data;
//     const request = { userId, ip, socketId: socket.id };
//     requestedDevices.push(request);
//     console.log("New request to share camera feed:", request);

//     // Notify admin/frontend about the new request
//     io.emit("new-request", request);
//   });

//   socket.on("approve-request", (data) => {
//     const { userId } = data;
//     const request = requestedDevices.find((req) => req.userId === userId);
//     if (request) {
//       approvedDevices.push(request);
//       requestedDevices = requestedDevices.filter((req) => req.userId !== userId);
//       console.log("Request approved:", request);

//       io.to(request.socketId).emit("start-streaming", { ip: request.ip });
//       io.emit("request-approved", request);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//     requestedDevices = requestedDevices.filter((req) => req.socketId !== socket.id);
//   });
// });

// // Data Storage
// let devices = [];
// let requestedDevices = [];
// let approvedDevices = [];

// // Function to scan devices using ARP (cross-platform)
// const scanDevices = async () => {
//   return new Promise((resolve) => {
//     const ips = [];
//     const subnet = '192.168.1.'; // Adjust this to match your network
//     const promises = [];

//     // Scan common IP ranges in the subnet
//     for (let i = 1; i < 255; i++) {
//       const ip = subnet + i;
//       promises.push(
//         new Promise((resolveIP) => {
//           arp.getMAC(ip, (err, mac) => {
//             if (!err && mac) {
//               ips.push(ip);
//             }
//             resolveIP();
//           });
//         })
//       );
//     }

//     Promise.all(promises).then(() => resolve(ips));
//   });
// };

// // Function to discover devices using mDNS (Bonjour)
// const discoverMdnsDevices = async () => {
//   return new Promise((resolve) => {
//     const bonjour = Bonjour();
//     const mdnsDevices = [];

//     const browser = bonjour.find({ type: "http" });
//     browser.on("up", (service) => {
//       mdnsDevices.push({
//         name: service.name,
//         ip: service.addresses[0],
//         type: service.type,
//       });
//     });

//     setTimeout(() => {
//       browser.stop();
//       resolve(mdnsDevices);
//     }, 5000);
//   });
// };

// // Function to check device status
// const checkDeviceStatus = async (ip) => {
//   try {
//     const res = await ping.promise.probe(ip);
//     return res.alive ? "live" : "offline";
//   } catch (err) {
//     console.error(`Error pinging ${ip}:`, err);
//     return "offline";
//   }
// };

// // Optimized function to update device status
// const updateDeviceStatus = async (trigger = "auto") => {
//   console.log(`Device discovery started (${trigger})...`);

//   try {
//     const arpDevices = await scanDevices();
//     const mdnsDevices = await discoverMdnsDevices();

//     const allDevices = [...new Set([...arpDevices, ...mdnsDevices.map((d) => d.ip)])];

//     const updatedDevices = await Promise.all(
//       allDevices.map(async (ip) => {
//         const status = await checkDeviceStatus(ip);
//         return { ip, status };
//       })
//     );

//     devices = updatedDevices;
//     console.log("Updated Devices:", devices);

//     io.emit("device-update", devices);
//   } catch (error) {
//     console.error("Error during device discovery:", error);
//   }
// };

// // API Routes

// // 1. Get all devices
// app.get("/api/devices", (req, res) => {
//   console.log("GET /api/devices - Returning all devices");
//   res.json({ devices });
// });

// // 2. Request to share camera feed
// app.post("/api/request-share", (req, res) => {
//   const { userId, deviceIp } = req.body;

//   if (!userId || !deviceIp) {
//     return res.status(400).json({ error: "userId and deviceIp are required" });
//   }

//   const request = {
//     userId,
//     ip: deviceIp,
//     requestedAt: new Date(),
//     status: 'pending'
//   };

//   requestedDevices.push(request);
//   io.emit("new-request", request);

//   console.log("POST /api/request-share - New camera share request:", request);
//   res.json({ message: "Request submitted successfully", request });
// });

// // 3. Approve camera share request
// app.post("/api/approve-request", (req, res) => {
//   const { userId, approved } = req.body;

//   if (!userId) {
//     return res.status(400).json({ error: "userId is required" });
//   }

//   const request = requestedDevices.find(req => req.userId === userId);

//   if (!request) {
//     return res.status(404).json({ error: "Request not found" });
//   }

//   if (approved) {
//     approvedDevices.push({
//       ...request,
//       approvedAt: new Date(),
//       status: 'approved'
//     });
//     requestedDevices = requestedDevices.filter(req => req.userId !== userId);

//     // Notify the requesting user that their request was approved
//     io.emit("request-approved", request);
//   } else {
//     // If not approved, just remove from requested devices
//     requestedDevices = requestedDevices.filter(req => req.userId !== userId);
//     io.emit("request-denied", { userId });
//   }

//   console.log(`POST /api/approve-request - Request ${approved ? 'approved' : 'denied'}:`, request);
//   res.json({ message: `Request ${approved ? 'approved' : 'denied'} successfully`, request });
// });

// // 4. Get pending requests for a specific device
// app.get("/api/device/:deviceIp/requests", (req, res) => {
//   const { deviceIp } = req.params;
//   const deviceRequests = requestedDevices.filter(req => req.ip === deviceIp);

//   console.log(`GET /api/device/${deviceIp}/requests - Returning device requests`);
//   res.json({ requests: deviceRequests });
// });

// // 5. Check if user has access to a device
// app.get("/api/device/:deviceIp/access/:userId", (req, res) => {
//   const { deviceIp, userId } = req.params;
//   const hasAccess = approvedDevices.some(
//     device => device.ip === deviceIp && device.userId === userId
//   );

//   console.log(`GET /api/device/${deviceIp}/access/${userId} - Checking access`);
//   res.json({ hasAccess });
// });

// // 6. Get requested devices
// app.get("/api/requested-devices", (req, res) => {
//   console.log("GET /api/requested-devices - Returning requested devices");
//   res.json({ requestedDevices });
// });

// // 7. Get approved devices
// app.get("/api/approved-devices", (req, res) => {
//   console.log("GET /api/approved-devices - Returning approved devices");
//   res.json({ approvedDevices });
// });

// // Start server
// const PORT = 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   updateDeviceStatus("startup");
// });

// // Allow manual scanning via API (reduces unnecessary automatic scans)
// app.get("/api/scan-devices", async (req, res) => {
//   await updateDeviceStatus("manual");
//   res.json({ message: "Device scan triggered", devices });
// });
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    // Broadcast signaling data to all connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});