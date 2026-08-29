// /**
//  * সুপার Simple Load Test Tool
//  * শুধু এই file টা backend folder-এ রাখুন
//  * এবং: node loadtest.js চালান
//  */

// const http = require("http");

// // ⚙️ SETTINGS (এখানে বদলান)
// const TARGET_URL = "http://localhost:5000"; // আপনার backend URL
// const NUM_USERS = 500; // কতজন student simulate করবে
// const SPAWN_RATE = 50; // প্রতি সেকেন্ডে কতজন যোগ হবে
// const DURATION = 300; // কত সেকেন্ড ধরে চলবে (5 minutes)

// // =====================================================
// // Code (এটা বুঝতে হবে না, শুধু run করুন)
// // =====================================================

// let activeUsers = 0;
// let totalRequests = 0;
// let totalErrors = 0;
// let responseTimes = [];

// function makeRequest() {
//   return new Promise((resolve) => {
//     const startTime = Date.now();

//     const options = {
//       hostname: new URL(TARGET_URL).hostname,
//       port: new URL(TARGET_URL).port || 80,
//       path: "/all", // আপনার quiz এর path বদলান: /quiz
//       method: "GET",
//     };

//     const req = http.request(options, (res) => {
//       let data = "";
//       res.on("data", (chunk) => {
//         data += chunk;
//       });

//       res.on("end", () => {
//         const responseTime = Date.now() - startTime;
//         responseTimes.push(responseTime);
//         totalRequests++;

//         if (res.statusCode !== 200) {
//           totalErrors++;
//         }

//         resolve(responseTime);
//       });
//     });

//     req.on("error", () => {
//       totalErrors++;
//       totalRequests++;
//       resolve(-1);
//     });

//     req.setTimeout(5000);
//     req.end();
//   });
// }

// async function simulateUser() {
//   activeUsers++;

//   while (Date.now() < startTime + DURATION * 1000) {
//     await makeRequest();
//     // প্রতিটা request এর পরে 2-5 সেকেন্ড অপেক্ষা
//     const wait = Math.random() * 3000 + 2000;
//     await new Promise((resolve) => setTimeout(resolve, wait));
//   }

//   activeUsers--;
// }

// async function startTest() {
//   const startTime = Date.now();
//   console.log("");
//   console.log("╔════════════════════════════════════════╗");
//   console.log("║   🚀 LOAD TEST START                  ║");
//   console.log("╠════════════════════════════════════════╣");
//   console.log(`║ Target: ${TARGET_URL.padEnd(36)} ║`);
//   console.log(
//     `║ Users: ${NUM_USERS} | Spawn: ${SPAWN_RATE}/sec | Duration: ${DURATION}s  ║`,
//   );
//   console.log("║                                        ║");
//   console.log("║ Starting users...                      ║");
//   console.log("╚════════════════════════════════════════╝");
//   console.log("");

//   // প্রতি সেকেন্ডে SPAWN_RATE জন users যোগ করা
//   for (let i = 0; i < NUM_USERS; i += SPAWN_RATE) {
//     for (let j = 0; j < SPAWN_RATE && i + j < NUM_USERS; j++) {
//       simulateUser(); // background-এ চলবে
//     }
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//   }

//   // Test চলার সময় প্রতি 10 সেকেন্ডে stats দেখান
//   const statsInterval = setInterval(() => {
//     const elapsed = Math.round((Date.now() - startTime) / 1000);
//     const avgResponse =
//       responseTimes.length > 0
//         ? (
//             responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
//           ).toFixed(2)
//         : 0;

//     console.log(
//       `[${elapsed}s] Active Users: ${activeUsers} | Total Requests: ${totalRequests} | Errors: ${totalErrors} | Avg Response: ${avgResponse}ms`,
//     );
//   }, 10000);

//   // Test শেষ হওয়া পর্যন্ত অপেক্ষা
//   await new Promise((resolve) => {
//     const checkInterval = setInterval(() => {
//       const elapsed = Date.now() - startTime;
//       if (elapsed >= DURATION * 1000 && activeUsers === 0) {
//         clearInterval(checkInterval);
//         clearInterval(statsInterval);
//         resolve();
//       }
//     }, 1000);
//   });

//   printReport(startTime);
// }

// function printReport(startTime) {
//   const totalTime = (Date.now() - startTime) / 1000;
//   const avgResponse =
//     responseTimes.length > 0
//       ? (
//           responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
//         ).toFixed(2)
//       : 0;

//   const minResponse = Math.min(...responseTimes);
//   const maxResponse = Math.max(...responseTimes);

//   // Percentile calculate করা
//   responseTimes.sort((a, b) => a - b);
//   const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];

//   const successRate = (
//     ((totalRequests - totalErrors) / totalRequests) *
//     100
//   ).toFixed(2);

//   console.log("");
//   console.log("╔════════════════════════════════════════════════════════════╗");
//   console.log(
//     "║                  📊 TEST REPORT                             ║",
//   );
//   console.log("╠════════════════════════════════════════════════════════════╣");
//   console.log(`║ Total Time: ${totalTime.toFixed(2)}s`.padEnd(61) + "║");
//   console.log(`║ Total Requests: ${totalRequests}`.padEnd(61) + "║");
//   console.log(
//     `║ Success: ${totalRequests - totalErrors} | Errors: ${totalErrors}`.padEnd(
//       61,
//     ) + "║",
//   );
//   console.log(`║ Success Rate: ${successRate}%`.padEnd(61) + "║");
//   console.log("║".padEnd(61) + "║");
//   console.log(`║ Avg Response Time: ${avgResponse}ms`.padEnd(61) + "║");
//   console.log(
//     `║ Min: ${minResponse}ms | Max: ${maxResponse}ms | 95%ile: ${p95}ms`.padEnd(
//       61,
//     ) + "║",
//   );
//   console.log("║".padEnd(61) + "║");

//   if (avgResponse < 500) {
//     console.log(
//       "║ ✅ EXCELLENT - Your server can handle 500 users!".padEnd(61) + "║",
//     );
//   } else if (avgResponse < 1000) {
//     console.log(
//       "║ ⚠️  GOOD - Your server is okay, but optimize recommended".padEnd(61) +
//         "║",
//     );
//   } else {
//     console.log("║ ❌ POOR - Your server needs optimization".padEnd(61) + "║");
//   }

//   console.log("╚════════════════════════════════════════════════════════════╝");
//   console.log("");
// }

// startTest().catch(console.error);
