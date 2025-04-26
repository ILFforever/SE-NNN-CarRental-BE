const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../models/User");
const app = require("../app");
const Car = require("../models/Car");
const Car_Provider = require("../models/Car_Provider");

beforeEach(() => {
  jest.clearAllMocks();
});

let token;
let tokenAdmin;

let objCar = {
  license_plate: "LOL-238",
  brand: "Tesla",
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

let objProvider = {
  name: "Test1",
  address: "Yolow",
  telephone_number: "000-0000000",
  email: "providers@gmail.com",
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

describe("Register Test", () => {
  test("it can't register cause of forgot to enter something", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });

  test("it can register normally", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "testlab@gmail.com",
      password: "12345678",
      name: "testlab",
      telephone_number: "999-9999999",
      role: "user",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  test("it can register admin normally", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "adminlab@gmail.com",
      password: "12345678",
      name: "testlab",
      telephone_number: "999-9999999",
      role: "admin",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
});

describe("Login Authentication Test", () => {
  test("It can log in with valid user credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "testlab@gmail.com",
      password: "12345678",
    });
    token = res.body.token;
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("token");
  });

  test("It can log in with valid admin credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "adminlab@gmail.com",
      password: "12345678",
    });
    tokenAdmin = res.body.token;
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("token");
  });

  test("It can't login if forget to send some value", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });

  test("It can't log in with invalid username", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "testlabs@gmail.com",
      password: "12345678",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });

  test("It can't log in with invalid password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "testlab@gmail.com",
      password: "1234567",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("success", false);
  });
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

describe("Get User Endpoint Test", () => {
  test("It can call current users", async () => {
    const res = await request(app)
      .get("/api/v1/auth/curuser")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
  });
});

describe("Admin Endpoint Test", () => {
  test("Get all admin users", async () => {
    const res = await request(app)
      .get("/api/v1/auth/admins")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toBeInstanceOf(Array);
  });

  test("Get all users list", async () => {
    const res = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toBeInstanceOf(Array);
  });

  test("Delete Admin User - Create new Admin", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "adminlab2@gmail.com",
      password: "12345678",
      name: "testlab",
      telephone_number: "999-9999999",
      role: "admin",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  test("Delete Admin User - Not found user", async () => {
    const res = await request(app)
      .delete(`/api/v1/auth/admins/680bbec4f517fda7e595c71e`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("success", false);
  });

  test("Delete Admin User - That's not admin", async () => {
    const user = await User.findOne();
    const res = await request(app)
      .delete(`/api/v1/auth/admins/${user._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message", "User is not an admin");
  });

  test("Delete Admin User - Can't remove ownself", async () => {
    const user = await User.findOne({ email: "adminlab@gmail.com" });
    const res = await request(app)
      .delete(`/api/v1/auth/admins/${user._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty(
      "message",
      "Admin cannot delete their own account"
    );
  });

  test("Delete Admin User - Normally", async () => {
    const user = await User.findOne({ email: "adminlab2@gmail.com" });
    const res = await request(app)
      .delete(`/api/v1/auth/admins/${user._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
  });

  
  // test("Delete User - Cautions delete admin", async () => {
  //   const user = await User.findOne({role: "admin"});
  //   console.log("user", user);
  //   const res = await request(app)
  //     .delete(`/api/v1/auth/users/${user._id}`)
  //     .set("Authorization", `Bearer ${tokenAdmin}`);
  //   console.log("res", res.body);
  //   expect(res.statusCode).toBe(400);
  //   expect(res.body).toHaveProperty("success", false);
  //   expect(res.body).toHaveProperty(
  //     "message",
  //     "User is not an user"
  //   );
  // });

  // test("Delete User - Not found user", async () => {
  //   const res = await request(app)
  //     .delete(`/api/v1/auth/users/680bbec4f517fda7e595c71e`)
  //     .set("Authorization", `Bearer ${tokenAdmin}`);
  //   console.log("yoloww", res.body);
  //   expect(res.statusCode).toBe(404);
  //   expect(res.body).toHaveProperty("success", false);
  //   expect(res.body).toHaveProperty(
  //     "message",
  //     "User not found with id 680bbec4f517fda7e595c71e"
  //   );
  // });
});

describe("Favorite Car Test", () => {
  test("Add Favorite Car", async () => {
    const provider = await Car_Provider.create(objProvider);
    const car = await Car.create({ ...objCar, provider_id: provider._id });
    const res = await request(app)
      .post("/api/v1/auth/favorite")
      .set("Authorization", `Bearer ${token}`)
      .send({
        carID: car._id,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
  test("Add Favorite Car - Not found car", async () => {
    const res = await request(app)
      .post("/api/v1/auth/favorite")
      .set("Authorization", `Bearer ${token}`)
      .send({
        carID: "680bbec4f517fda7e595c71e",
      });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("success", false);
  });
})