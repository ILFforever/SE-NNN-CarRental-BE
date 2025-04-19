// Test Setup
const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");
// Models
const Car = require("../models/Car");
const car_provdier = require("../models/Car_Provider");
// Express Injection
const app = require("../app");

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await car_provdier.deleteOne({ email: dataPrep.email });
  await Car.deleteMany({ name: "test car1" });
  await Car.deleteMany({ name: "test car2" });
  await mongoose.connection.close();
});

let userProps = {
  token: "",
};

const dataPrep = {
  name: "testlab provider",
  password: "12345678",
  address: "testlab address",
  telephone_number: "999-9999999",
  email: "testlab@car.gmail.com",
};

describe("Register Car Provider", () => {
  test("Car Provider can register", async () => {
    const res = await request(app)
      .post("/api/v1/Car_Provider/register")
      .send(dataPrep);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  test("Car Provider can't repeat register", async () => {
    const res1 = await request(app)
      .post("/api/v1/Car_Provider")
      .send({ dataPrep });
    const res2 = await request(app).post("/api/v1/Car_Provider").send(dataPrep);
    expect(res1.statusCode).toBe(500);
    expect(res2.statusCode).toBe(500);
  });
});

describe("Login Car Provider", () => {
  test("Car Provider can login", async () => {
    const res = await request(app).post("/api/v1/Car_Provider/login").send({
      email: dataPrep.email,
      password: dataPrep.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("token");
    userProps.token = res.body.token;
  });

  test("Car Provider can't login with invalid credentials", async () => {
    const res = await request(app).post("/api/v1/Car_Provider/login").send({
      email: dataPrep.email,
      password: "wrongpassword",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("msg", "Invalid credentials");
  });

  test("Car Provier can't login with forget value", async () => {
    const res = await request(app).post("/api/v1/Car_Provider/login").send({
      email: "",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty(
      "msg",
      "Please provide an email and password"
    );
  });
});

describe("Make a Car Provider", () => {
  test("Car Provider can create new cars without image", async () => {
    const res = await request(app)
      .post("/api/v1/cars")
      .set("Authorization", `Bearer ${userProps.token}`)
      .send({
        name: "test car1",
        brand: "test brand",
        license_plate: "XXX-1244",
        model: "test model",
        type: "suv",
        color: "red",
        manufactureDate: "2023-01-01",
        available: true,
        dailyRate: 100,
        tier: 1,
        year: 2023,
        price: 20000,
        description: "test description",
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
  });

  test("Car Provider can create new cars with image", async () => {
    const carData = {
      name: "test car2",
      brand: "test brand",
      license_plate: "XXX-5678",
      model: "test model",
      type: "sedan",
      color: "blue",
      manufactureDate: "2023-02-01",
      available: true,
      dailyRate: 120,
      tier: 2,
      year: 2023,
      price: 25000,
      description: "test car with multiple images",
    };
    const res = await request(app)
      .post("/api/v1/cars")
      .set("Authorization", `Bearer ${userProps.token}`)
      .field("name", carData.name)
      .field("brand", carData.brand)
      .field("license_plate", carData.license_plate)
      .field("model", carData.model)
      .field("type", carData.type)
      .field("color", carData.color)
      .field("manufactureDate", carData.manufactureDate)
      .field("available", String(carData.available))
      .field("dailyRate", String(carData.dailyRate))
      .field("tier", String(carData.tier))
      .field("year", String(carData.year))
      .field("price", String(carData.price))
      .field("description", carData.description)
      .attach(
        "images",
        path.resolve(__dirname, "../__tests__/images/test1.jpg")
      )
      .attach(
        "images",
        path.resolve(__dirname, "../__tests__/images/test2.png")
      );

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data.images)).toBe(true);
    expect(res.body.data.images.length).toBe(2);
  });
});
