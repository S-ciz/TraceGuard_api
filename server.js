
const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --------------------------------------------------
// IN-MEMORY DATA
// All data resets when the server restarts.
// Replace the example BLE IDs with real device IDs.
// --------------------------------------------------

let vehicles = [
  {
    id: "vehicle-001",
    name: "Toyota Corolla",
    registration: "ABC123GP",
    status: "stolen",
    bleDeviceId: "YOUR_REAL_BLE_DEVICE_ID"
  },
  {
    id: "vehicle-002",
    name: "Honda Civic",
    registration: "XYZ456GP",
    status: "protected",
    bleDeviceId: "YOUR_OTHER_BLE_DEVICE_ID"
  }
];

let detections = [];

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "TraceGuard API is running",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// --------------------------------------------------
// VEHICLES
// --------------------------------------------------

// Get all vehicles
app.get("/vehicles", (req, res) => {
  res.json(vehicles);
});

// Get only stolen vehicles
app.get("/vehicles/stolen", (req, res) => {
  res.json(
    vehicles.filter(vehicle => vehicle.status === "stolen")
  );
});

// Get one vehicle
app.get("/vehicles/:id", (req, res) => {
  const vehicle = vehicles.find(
    item => item.id === req.params.id
  );

  if (!vehicle) {
    return res.status(404).json({
      error: "Vehicle not found"
    });
  }

  res.json(vehicle);
});

// Register a vehicle
app.post("/vehicles", (req, res) => {
  const {
    name,
    registration = "",
    status = "protected",
    bleDeviceId = ""
  } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({
      error: "Vehicle name is required"
    });
  }

  if (!["stolen", "protected"].includes(status)) {
    return res.status(400).json({
      error: "Status must be stolen or protected"
    });
  }

  const vehicle = {
    id: randomUUID(),
    name: name.trim(),
    registration,
    status,
    bleDeviceId
  };

  vehicles.push(vehicle);

  res.status(201).json(vehicle);
});

// Update vehicle details or status
app.patch("/vehicles/:id", (req, res) => {
  const index = vehicles.findIndex(
    item => item.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Vehicle not found"
    });
  }

  const allowedFields = [
    "name",
    "registration",
    "status",
    "bleDeviceId"
  ];

  for (const field of Object.keys(req.body)) {
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        error: `Field '${field}' cannot be updated`
      });
    }
  }

  if (
    req.body.status !== undefined &&
    !["stolen", "protected"].includes(req.body.status)
  ) {
    return res.status(400).json({
      error: "Status must be stolen or protected"
    });
  }

  if (
    req.body.name !== undefined &&
    (typeof req.body.name !== "string" ||
      !req.body.name.trim())
  ) {
    return res.status(400).json({
      error: "Vehicle name cannot be empty"
    });
  }

  vehicles[index] = {
    ...vehicles[index],
    ...req.body,
    name:
      req.body.name !== undefined
        ? req.body.name.trim()
        : vehicles[index].name
  };

  res.json(vehicles[index]);
});

// Delete a vehicle
app.delete("/vehicles/:id", (req, res) => {
  const exists = vehicles.some(
    item => item.id === req.params.id
  );

  if (!exists) {
    return res.status(404).json({
      error: "Vehicle not found"
    });
  }

  vehicles = vehicles.filter(
    item => item.id !== req.params.id
  );

  res.json({ message: "Vehicle deleted successfully" });
});

// --------------------------------------------------
// DETECTIONS
// --------------------------------------------------

// Get detection history
app.get("/detections", (req, res) => {
  res.json(detections);
});

// Record a detection of a registered stolen vehicle
app.post("/detections", (req, res) => {
  const { vehicleId, deviceId } = req.body;

  if (!vehicleId || !deviceId) {
    return res.status(400).json({
      error: "vehicleId and deviceId are required"
    });
  }

  const vehicle = vehicles.find(
    item => item.id === vehicleId
  );

  if (!vehicle) {
    return res.status(404).json({
      error: "Vehicle not found"
    });
  }

  if (vehicle.status !== "stolen") {
    return res.status(403).json({
      error: "Only stolen vehicles can be recorded"
    });
  }

  if (vehicle.bleDeviceId !== deviceId) {
    return res.status(403).json({
      error: "BLE device does not match this vehicle"
    });
  }

  const detection = {
    id: randomUUID(),
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    deviceId,
    status: "stolen",
    detectedAt: new Date().toISOString()
  };

  detections.unshift(detection);

  res.status(201).json(detection);
});

// Delete all detection history
app.delete("/detections", (req, res) => {
  detections = [];

  res.json({
    message: "Detection history cleared"
  });
});

// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal server error"
  });
});

// Listen on all network interfaces so phones on the
// same network can access the API.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`TraceGuard API running on port ${PORT}`);
  console.log(`Health check: http:// 192.168.0.106:${PORT}/health`);
});
