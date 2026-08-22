const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../src/middleware/authMiddleware");

const secret = process.env.JWT_SECRET || "chat-app-development-secret";

const runMiddleware = (authorization) => {
  let statusCode;
  let body;
  let nextCalled = false;
  const request = { headers: authorization ? { authorization } : {} };
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  authMiddleware(request, response, () => {
    nextCalled = true;
  });

  return { request, statusCode, body, nextCalled };
};

test("rejects requests without a bearer token", () => {
  const result = runMiddleware();

  assert.equal(result.statusCode, 401);
  assert.equal(result.body.message, "Authentication required");
  assert.equal(result.nextCalled, false);
});

test("rejects invalid bearer tokens", () => {
  const result = runMiddleware("Bearer invalid-token");

  assert.equal(result.statusCode, 401);
  assert.equal(result.body.message, "Invalid or expired token");
  assert.equal(result.nextCalled, false);
});

test("accepts a valid bearer token and exposes the user", () => {
  const token = jwt.sign({ id: 42, email: "test@example.com" }, secret);
  const result = runMiddleware(`Bearer ${token}`);

  assert.equal(result.nextCalled, true);
  assert.equal(result.request.user.id, 42);
  assert.equal(result.request.user.email, "test@example.com");
  assert.equal(result.statusCode, undefined);
});
