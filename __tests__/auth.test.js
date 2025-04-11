const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../models/User");
const app = require("../app");

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await User.deleteOne({ email: "testlab@gmail.com" });
  await mongoose.connection.close();
});

let token;

describe("Register Test", () => {
  test('it can\'t register cause of forgot to enter something', async () => { 
    const res = await request(app).post('/api/v1/auth/register').send({
      email: ''
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  })

  test('it can register normally', async () => { 
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'testlab@gmail.com',
      password: '12345678',
      name: 'testlab',
      telephone_number: '999-9999999',
      role: 'user'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  })
});

describe("Login Authentication Test", () => {
  test("It can log in with valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: 'testlab@gmail.com',
      password: '12345678'
    });
    token = res.body.token;
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("token");
  });

  test('It can\'t login if forget to send some value', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: ''
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  })
});

describe("Logged-in Actions Test (Log-out, getCurrentUser)", () => {
  test("It can get the current user", async () => {
    const res = await request(app)
      .get("/api/v1/auth/curuser")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
  });

  test("It can log out the user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
});
