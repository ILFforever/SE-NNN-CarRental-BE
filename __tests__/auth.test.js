const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../models/User");
const Car = require("../models/Car");
const Car_Provider = require("../models/Car_Provider");
const ValidToken = require("../models/ValidToken");
const app = require("../app");

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Clean up test data
  await User.deleteOne({ email: "testlab@gmail.com" });
  await User.deleteOne({ email: "adminlab@gmail.com" });
  await User.deleteOne({ email: "adminlab2@gmail.com" });
  await User.deleteOne({ email: "userupdate@test.com" });
  await Car.deleteOne({ license_plate: "LOL-238" });
  await Car_Provider.deleteOne({ email: "providers@gmail.com" });
  await mongoose.connection.close();
});

let token;
let tokenAdmin;
let carId;
let userId;
let adminId;

// Test data
const testUser = {
  name: "Test User",
  telephone_number: "999-9999999",
  email: "testlab@gmail.com",
  password: "12345678",
  role: "user",
};

const testAdmin = {
  name: "Admin User",
  telephone_number: "999-9999999",
  email: "adminlab@gmail.com",
  password: "12345678",
  role: "admin",
};

const testProvider = {
  name: "Test Provider",
  address: "Provider Address",
  telephone_number: "000-0000000",
  email: "providers@gmail.com",
  password: "12345678",
};

describe("Authentication & User Management Tests", () => {
  describe("Registration Tests", () => {
    test("User can register with valid data", async () => {
      const res = await request(app).post("/api/v1/auth/register").send(testUser);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });

    test("Admin can register with valid data", async () => {
      const res = await request(app).post("/api/v1/auth/register").send(testAdmin);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });

    test("Registration fails with invalid/missing data", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        email: "incomplete@test.com",
        // Missing other required fields
      });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });

    test("Registration fails with duplicate email", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        ...testUser,
        name: "Duplicate Email",
        telephone_number: "888-8888888",
      });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("Login Tests", () => {
    test("User can login with valid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      token = res.body.token;
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("token");
    });

    test("Admin can login with valid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testAdmin.email,
        password: testAdmin.password,
      });
      tokenAdmin = res.body.token;
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("token");
    });

    test("Login fails with missing credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        // Missing password
      });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("msg", "Please provide an email and password");
    });

    test("Login fails with non-existent user", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@test.com",
        password: "12345678",
      });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("msg", "Invalid credentials");
    });

    test("Login fails with incorrect password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: "wrongpassword",
      });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("msg", "Invalid credentials");
    });
  });

  describe("Authenticated User Actions", () => {
    test("Get current user information", async () => {
      const res = await request(app)
        .get("/api/v1/auth/curuser")
        .set("Authorization", `Bearer ${token}`);
      
      userId = res.body.data._id;
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("email", testUser.email);
      expect(res.body.data).toHaveProperty("name", testUser.name);
      expect(res.body.data).toHaveProperty("role", "user");
    });
    
    test("Get current admin information", async () => {
      const res = await request(app)
        .get("/api/v1/auth/curuser")
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      adminId = res.body.data._id;
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("email", testAdmin.email);
      expect(res.body.data).toHaveProperty("role", "admin");
    });
    
    test("Unauthorized request returns 401", async () => {
      const res = await request(app).get("/api/v1/auth/curuser");
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("success", false);
    });
    
    test("User can log out", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "User logged out successfully");
      
      // Login again to get a fresh token for subsequent tests
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      token = loginRes.body.token;
    });
  });
  
  describe("Admin User Management", () => {
    test("Admin can get list of all admins", async () => {
      const res = await request(app)
        .get("/api/v1/auth/admins")
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Check that all returned users have role = admin
      expect(res.body.data.every(user => user.role === "admin")).toBe(true);
    });
    
    test("Admin can get list of regular users", async () => {
      const res = await request(app)
        .get("/api/v1/auth/users")
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Check that all returned users have role = user
      expect(res.body.data.every(user => user.role === "user")).toBe(true);
    });
    
    test("Regular user cannot access admin lists", async () => {
      const res = await request(app)
        .get("/api/v1/auth/admins")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty("success", false);
    });
    
    test("Create another admin for deletion test", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Admin To Delete",
        telephone_number: "777-7777777",
        email: "adminlab2@gmail.com",
        password: "12345678",
        role: "admin",
      });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });
    
    test("Admin cannot delete non-existent user", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/auth/admins/${fakeId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
    
    test("Admin cannot delete a non-admin user via admin endpoint", async () => {
      const res = await request(app)
        .delete(`/api/v1/auth/admins/${userId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "User is not an admin");
    });
    
    test("Admin cannot delete themselves", async () => {
      const res = await request(app)
        .delete(`/api/v1/auth/admins/${adminId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Admin cannot delete their own account");
    });
    
    test("Admin can delete another admin", async () => {
      // First get the ID of the admin to delete
      const adminsRes = await request(app)
        .get("/api/v1/auth/admins")
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      const adminToDelete = adminsRes.body.data.find(admin => 
        admin.email === "adminlab2@gmail.com"
      );
      
      const res = await request(app)
        .delete(`/api/v1/auth/admins/${adminToDelete._id}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Admin deleted successfully");
    });
  });
  
  describe("User Profile Management", () => {
    test("Register a user for profile update test", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Update Test",
        telephone_number: "555-5555555",
        email: "userupdate@test.com",
        password: "12345678",
        role: "user",
      });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });
    
    test("User can update their profile", async () => {
      // Login as the update test user
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "userupdate@test.com",
        password: "12345678",
      });
      
      const updateToken = loginRes.body.token;
      
      // Update the profile
      const res = await request(app)
        .put("/api/v1/auth/update-profile")
        .set("Authorization", `Bearer ${updateToken}`)
        .send({
          name: "Updated Name",
          telephone_number: "666-6666666",
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Profile updated successfully");
      expect(res.body.data).toHaveProperty("name", "Updated Name");
      expect(res.body.data).toHaveProperty("telephone_number", "666-6666666");
    });
    
    test("Profile update fails with invalid telephone format", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "userupdate@test.com",
        password: "12345678",
      });
      
      const updateToken = loginRes.body.token;
      
      const res = await request(app)
        .put("/api/v1/auth/update-profile")
        .set("Authorization", `Bearer ${updateToken}`)
        .send({
          name: "Valid Name",
          telephone_number: "12345", // Invalid format
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Telephone number must be in the format XXX-XXXXXXX");
    });
    
    test("Profile update fails with missing required fields", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "userupdate@test.com",
        password: "12345678",
      });
      
      const updateToken = loginRes.body.token;
      
      const res = await request(app)
        .put("/api/v1/auth/update-profile")
        .set("Authorization", `Bearer ${updateToken}`)
        .send({
          name: "Only Name",
          // Missing telephone_number
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Name and telephone number are required");
    });
  });
  
  describe("Favorite Car Management", () => {
    test("Setup provider and car for favorite tests", async () => {
      // Register and login provider
      await request(app)
        .post("/api/v1/Car_Provider/register")
        .send(testProvider);
      
      const providerLoginRes = await request(app)
        .post("/api/v1/Car_Provider/login")
        .send({
          email: testProvider.email,
          password: testProvider.password,
        });
      
      const providerToken = providerLoginRes.body.token;
      
      // Get provider ID
      const providerRes = await request(app)
        .get("/api/v1/Car_Provider/me")
        .set("Authorization", `Bearer ${providerToken}`);
      
      const providerId = providerRes.body.data._id;
      
      // Create a car
      const carRes = await request(app)
        .post("/api/v1/cars")
        .set("Authorization", `Bearer ${providerToken}`)
        .send({
          license_plate: "LOL-238",
          brand: "Tesla",
          model: "Model S",
          type: "sedan",
          color: "Black",
          manufactureDate: "2024-01-01",
          available: true,
          dailyRate: 2000,
          tier: 0,
          provider_id: providerId,
        });
      
      expect(carRes.statusCode).toBe(201);
      carId = carRes.body.data._id;
    });
    
    test("User can add a car to favorites", async () => {
      const res = await request(app)
        .post("/api/v1/auth/favorite")
        .set("Authorization", `Bearer ${token}`)
        .send({
          carID: carId,
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Car added to favorites");
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toContain(carId);
    });
    
    test("Adding the same car to favorites is idempotent", async () => {
      const res = await request(app)
        .post("/api/v1/auth/favorite")
        .set("Authorization", `Bearer ${token}`)
        .send({
          carID: carId,
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      // The car should still be in favorites, but not duplicated
      expect(res.body.data.filter(id => id === carId).length).toBe(1);
    });
    
    test("User can remove a car from favorites", async () => {
      const res = await request(app)
        .delete("/api/v1/auth/favorite")
        .set("Authorization", `Bearer ${token}`)
        .send({
          carID: carId,
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Car removed from favorites");
      expect(res.body.data).not.toContain(carId);
    });
    
    test("Removing a non-favorited car is handled gracefully", async () => {
      const res = await request(app)
        .delete("/api/v1/auth/favorite")
        .set("Authorization", `Bearer ${token}`)
        .send({
          carID: carId, // Already removed
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Car removed from favorites");
    });
    
    test("Adding/removing favorites requires carID", async () => {
      // Test adding without carID
      const addRes = await request(app)
        .post("/api/v1/auth/favorite")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      
      expect(addRes.statusCode).toBe(400);
      expect(addRes.body).toHaveProperty("success", false);
      expect(addRes.body).toHaveProperty("message", "carID is required");
      
      // Test removing without carID
      const removeRes = await request(app)
        .delete("/api/v1/auth/favorite")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      
      expect(removeRes.statusCode).toBe(400);
      expect(removeRes.body).toHaveProperty("success", false);
      expect(removeRes.body).toHaveProperty("message", "carID is required");
    });
  });
});