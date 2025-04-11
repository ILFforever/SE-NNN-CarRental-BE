const request = require("supertest");
const mongoose = require("mongoose");
const Car = require("../models/Car");
const car_provier = require("../models/Car_Provider");
const app = require("../app");

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await car_provier.deleteOne({ email: dataPrep.email });
  await mongoose.connection.close();
});

const dataPrep = {
  name: "testlab provider",
  password: "12345678",
  address: "testlab address",
  telephone_number: "999-9999999",
  email: "testlab@car.gmail.com",
};

describe("Register Car Provider", () => {
  test("Car Provier can register", async () => {
    const res = await request(app)
      .post("/api/v1/Car_Provider/register")
      .send(dataPrep);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  test("Car Provier can't repeat register", async () => {
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
    const res = await request(app)
      .post("/api/v1/Car_Provider/login")
      .send({
        email: dataPrep.email,
        password: dataPrep.password,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("token");
  });

  test("Car Provider can't login with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/Car_Provider/login")
      .send({
        email: dataPrep.email,
        password: "wrongpassword",
      });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("msg", "Invalid credentials");
  });

  test("Car Provier can't login with forget value", async () => {
    const res = await request(app)
      .post("/api/v1/Car_Provider/login")
      .send({
        email: "",
      });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("msg", "Please provide an email and password");
  })
});
