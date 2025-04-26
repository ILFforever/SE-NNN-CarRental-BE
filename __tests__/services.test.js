// Test Setup
const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");
// Models
const User = require("../models/User");
const Car = require("../models/Car");
const Service = require("../models/Service");
const Car_Provider = require("../models/Car_Provider");
// Express Injection
const app = require("../app");

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Clean up test data
  await User.deleteOne({ email: "testlab@gmail.com" });
  await User.deleteOne({ email: "adminlab@gmail.com" });
  await Car.deleteOne({ license_plate: "LOL-237" });
  await Service.deleteOne({ name: "add elonมุด" });
  await Service.deleteOne({ name: "add water" });
  await Car_Provider.deleteOne({ email: "provider@gmail.com" });
  await mongoose.connection.close();
});

let token;
let adminToken;
let providerToken;
let providerId;
let carId;
let serviceId;

// Test data
let objProvider = {
  name: "Test Provider",
  address: "Provider Address",
  telephone_number: "000-0000000",
  email: "provider@gmail.com",
  password: "12345678",
};

let objCar = {
  license_plate: "LOL-237",
  brand: "Tesla",
  model: "Model X",
  type: "convertible",
  color: "White",
  manufactureDate: "2025-04-21T00:00:00.000Z",
  available: true,
  dailyRate: 2000,
  tier: 0,
};

let objService = {
  name: "add elonมุด",
  available: true,
  description: "elon musk will drive car for you",
  rate: 10000,
  daily: true,
};

describe("Service Management Tests", () => {
  // Setup: Register users and create initial data
  test("Register test users", async () => {
    // Register regular user
    const userRes = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      telephone_number: "111-1111111",
      email: "testlab@gmail.com",
      password: "12345678",
      role: "user",
    });
    expect(userRes.statusCode).toBe(200);
    expect(userRes.body).toHaveProperty("success", true);

    // Register admin user
    const adminRes = await request(app).post("/api/v1/auth/register").send({
      name: "Admin User",
      telephone_number: "222-2222222",
      email: "adminlab@gmail.com",
      password: "12345678",
      role: "admin",
    });
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.body).toHaveProperty("success", true);

    // Register provider
    const providerRes = await request(app)
      .post("/api/v1/Car_Provider/register")
      .send(objProvider);
    expect(providerRes.statusCode).toBe(200);
    expect(providerRes.body).toHaveProperty("success", true);
  });

  test("Login with test users", async () => {
    // Login as regular user
    const userLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: "testlab@gmail.com",
      password: "12345678",
    });
    token = userLoginRes.body.token;
    expect(userLoginRes.statusCode).toBe(200);
    expect(userLoginRes.body).toHaveProperty("token");

    // Login as admin user
    const adminLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: "adminlab@gmail.com",
      password: "12345678",
    });
    adminToken = adminLoginRes.body.token;
    expect(adminLoginRes.statusCode).toBe(200);
    expect(adminLoginRes.body).toHaveProperty("token");

    // Login as provider
    const providerLoginRes = await request(app)
      .post("/api/v1/Car_Provider/login")
      .send({
        email: objProvider.email,
        password: objProvider.password,
      });
    providerToken = providerLoginRes.body.token;
    expect(providerLoginRes.statusCode).toBe(200);
    expect(providerLoginRes.body).toHaveProperty("token");
  });

  test("Setup provider and car for service tests", async () => {
    // Get provider ID
    const providerRes = await request(app)
      .get("/api/v1/Car_Provider/me")
      .set("Authorization", `Bearer ${providerToken}`);
    providerId = providerRes.body.data._id;
    expect(providerRes.statusCode).toBe(200);

    // Create service first
    const serviceRes = await request(app)
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(objService);
    expect(serviceRes.statusCode).toBe(201);
    serviceId = serviceRes.body.data._id;

    // Create car with provider ID
    const carRes = await request(app)
      .post("/api/v1/cars")
      .set("Authorization", `Bearer ${providerToken}`)
      .send({
        ...objCar,
        provider_id: providerId,
        service: [serviceId],
      });
    expect(carRes.statusCode).toBe(201);
    carId = carRes.body.data._id;
  });

  describe("Get Service Tests", () => {
    test("It should get all services", async () => {
      const response = await request(app)
        .get("/api/v1/services")
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test("It can get services by car ID", async () => {
      const response = await request(app)
        .get(`/api/v1/services/${carId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test("It returns 404 for non-existent car ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/services/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty("success", false);
    });

    test("It returns 500 for invalid car ID format", async () => {
      const response = await request(app)
        .get("/api/v1/services/invalid-id-format")
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Service Management (Admin only)", () => {
    test("Admin can create a new service", async () => {
      const newService = {
        name: "add water",
        available: true,
        description: "we have beverage for you",
        rate: 100,
        daily: false,
      };

      const response = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newService);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("name", "add water");
    });

    test("Admin cannot create a service with duplicate name", async () => {
      const duplicateService = {
        name: "add water", // Already exists
        available: true,
        description: "duplicate service",
        rate: 150,
        daily: true,
      };

      const response = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(duplicateService);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });

    test("Admin can update a service", async () => {
      // First get the service ID
      const servicesRes = await request(app)
        .get("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`);
      
      const waterService = servicesRes.body.data.find(s => s.name === "add water");
      
      const updatedData = {
        name: "add water", // Keep same name to avoid unique constraint
        available: true,
        description: "we have premium beverages for you",
        rate: 120,
        daily: false,
      };

      const response = await request(app)
        .put(`/api/v1/services/${waterService._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatedData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("description", "we have premium beverages for you");
      expect(response.body.data).toHaveProperty("rate", 120);
    });

    test("Admin gets 404 when updating non-existent service", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/v1/services/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "non-existent service",
          available: true,
          description: "This service doesn't exist",
          rate: 100,
          daily: false,
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty("success", false);
    });

    test("Regular user cannot create services", async () => {
      const newService = {
        name: "unauthorized service",
        available: true,
        description: "This should fail",
        rate: 50,
        daily: true,
      };

      const response = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${token}`)
        .send(newService);

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty("success", false);
    });

    test("Regular user cannot update services", async () => {
      // Get a service to attempt to update
      const servicesRes = await request(app)
        .get("/api/v1/services")
        .set("Authorization", `Bearer ${token}`);
      
      const service = servicesRes.body.data[0];
      
      const response = await request(app)
        .put(`/api/v1/services/${service._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...service,
          description: "Unauthorized update",
        });

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Error Validation Tests", () => {
    test("Admin cannot create service with invalid data", async () => {
      const invalidService = {
        name: "invalid service",
        available: true,
        // Missing required description
        rate: "not-a-number", // Invalid rate
        // Missing required daily field
      };

      const response = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidService);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });

    test("Admin cannot update service with invalid data", async () => {
      // First get a service to update
      const servicesRes = await request(app)
        .get("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`);
      
      const service = servicesRes.body.data[0];
      
      const invalidUpdate = {
        name: service.name,
        available: "not-a-boolean", // Invalid boolean
        description: null, // Invalid description
        rate: -100, // Negative rate
        daily: service.daily,
      };

      const response = await request(app)
        .put(`/api/v1/services/${service._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidUpdate);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });
});