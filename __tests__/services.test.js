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
  await User.deleteOne({ email: "testlab@gmail.com" });
  await User.deleteOne({ email: "adminlab@gmail.com" });
  await User.deleteOne({ email: "adminlab2@gmail.com" });
  await Car.deleteOne({ license_plate: "LOL-237" });
  await Car.deleteOne({ license_plate: "LOL-238" });
  await Service.deleteOne({ name: "add elonมุด" });
  await Service.deleteOne({ name: "add water" });
  await Car_Provider.deleteOne({ email: "provider@gmail.com" });
  await Car_Provider.deleteOne({ email: "providers@gmail.com" });
  await mongoose.connection.close();
});

let token;

let objProvider = {
  name: "Test",
  address: "Yolow",
  telephone_number: "000-0000000",
  email: "provider@gmail.com",
  password: "$2b$10$9a9UYkRGaWgQaTCHeojTEOLDs6WLPt/Sth2OtILyAwZ7ZOm/rgZV6",
  verified: true,
  completeRent: 2,
  review: {
    totalReviews: 1,
    averageRating: 5,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 1,
    },
  },
  createdAt: "2025-04-11T14:52:42.221Z",
};

let objService = {
  name: "add elonมุด",
  available: true,
  description: "elon musk will drive car for you",
  rate: 10,
  daily: true,
  createdAt: "2025-04-11T16:40:30.688Z",
};

let objCar = {
  license_plate: "LOL-237",
  brand: "Tesla",
  provider_id: null,
  model: "er1",
  type: "convertible",
  color: "White",
  manufactureDate: "2025-04-21T00:00:00.000Z",
  available: true,
  dailyRate: 2,
  tier: 0,
  service: ["680521a6076c6cc56959e954"],
  images: ["4f4db922-1745208418940.png", "93c34a73-1745208418957.png"],
  imageOrder: ["4f4db922-1745208418940.png", "93c34a73-1745208418957.png"],
};

describe("Database Setup", () => {
  test("Setup Process", async () => {
    const provider = await Car_Provider.create(objProvider);
    const service = await Service.create(objService);
    const car = await Car.create({ ...objCar, provider_id: provider._id });
  });
});

describe("Login Service", () => {
  test("It can log in with valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "testlab@gmail.com",
      password: "12345678",
    });

    token = res.body.token;
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("token");
  });
});

describe("Get Service", () => {
  test("It should called get service", async () => {
    const response = await request(app)
      .get("/api/v1/services")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array);
  });

  test("It can call getServicesByCarId", async () => {
    let car = await Car.findOne();
    let params = {
      carID: car._id,
    };

    const response = await request(app)
      .get(`/api/v1/services/${params.carID}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array);
  });

  test("It error car search type", async () => {
    let car = await Car.findOne();
    let params = {
      carID: car._id.toString().substr(0, car._id.length - 2) + "x",
    };

    const response = await request(app)
      .get(`/api/v1/services/${params.carID}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("success", false);
  });

  test("It can't found a car to search", async () => {
    let params = {
      carID: "680bbec4f517fda7e595c71e",
    };

    const response = await request(app)
      .get(`/api/v1/services/${params.carID}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("success", false);
  });
});

describe("Manage Service", () => {
  test("It can log in with admin credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "adminlab@gmail.com",
      password: "12345678",
    });

    token = res.body.token;
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("token");
  });

  test("It should can create service", async () => {
    const response = await request(app)
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "add water",
        available: true,
        description: "we have beverage for you",
        rate: 100,
        daily: false,
      });
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("data");
  });

  test("It shouldn't create repeat item", async () => {
    const response = await request(app)
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "add water",
        available: true,
        description: "we have beverage for you",
        rate: 100,
        daily: false,
      });
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
  });

  test("It should update service", async () => {
    const service = await Service.findOne({ name: "add water" });
    const response = await request(app)
      .put(`/api/v1/services/${service._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "add water",
        available: true,
        description: "we have an beverage for you",
        rate: 100,
        daily: false,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toHaveProperty("description", "we have an beverage for you");
  });

  test("It shouldn\'t update service casue of not found", async () => {
    const response = await request(app)
      .put(`/api/v1/services/680bbec4f517fda7e595c71e`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "add water",
        available: true,
        description: "we have an beverage for you",
        rate: 100,
        daily: false,
      });
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });

  test("It shouldn\'t update service casue of unexpected error", async () => {
    const service = await Service.findOne({ name: "add water" });
    const response = await request(app)
      .put(`/api/v1/services/${service._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "add water",
        available: true,
        description: null,
        rate: "hello",
      });
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });
});

// describe("Get Service Error Handling", () => {
//     test("It should return 500 when Service.find throws an error", async () => {
//         const response = await request(app)
//         .get("/api/v1/services")
//         .set("Authorization", `Bearer ${token}`);

//       expect(response.statusCode).toBe(500);
//       expect(response.body).toHaveProperty("success", false);
//       expect(response.body).toHaveProperty("error", "Server error");

//       await connectDB();
//     });
// });