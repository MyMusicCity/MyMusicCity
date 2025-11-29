/* eslint-env jest */
// Verify client API postReply calls the correct endpoint and includes auth header

beforeEach(() => {
  // Set test API base so API_BASE in module is deterministic
  process.env.REACT_APP_API_URL = "http://test-api";
  // Ensure a mockable localStorage exists on both window and global
  global.window = global.window || {};
  // Make sure window.localStorage is replaceable in the test environment and
  // that getItem is a jest mock function we can control per-test.
  if (global.window.localStorage) delete global.window.localStorage;
  Object.defineProperty(global.window, "localStorage", {
    value: { getItem: jest.fn() },
    configurable: true,
    writable: true,
  });
  global.localStorage = global.window.localStorage;
});

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

test("postReply sends request to /api/comments/:id/reply with Authorization", async () => {
  // Provide token and mock fetch
  // JSDOM places localStorage on window — ensure both globals match
  localStorage.getItem.mockReturnValue("my-jwt-token");

  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, id: "reply-1" }),
  });

  global.fetch = fetchMock;

  const { postReply } = require("../src/api");
  // ensure our mock returns the token
  expect(localStorage.getItem("token")).toBe("my-jwt-token");
  // Ensure token is available when postReply runs
  // token should be available now

  const reply = await postReply("parent-123", "event-abc", "hello reply");

  expect(reply).toEqual({ success: true, id: "reply-1" });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, opts] = fetchMock.mock.calls[0];
  // Debugging: print opts to understand header shape in test environment
  expect(url).toBe("http://test-api/api/comments/parent-123/reply");
  expect(opts.method).toBe("POST");
  // Some fetch implementations normalize header keys to lowercase
  expect(opts.headers.Authorization || opts.headers.authorization).toBe("Bearer my-jwt-token");
  expect(opts.body).toBe(JSON.stringify({ eventId: "event-abc", text: "hello reply" }));
});

test("postReply surfaces server errors", async () => {
  localStorage.getItem.mockReturnValue("token-xyz");

  const fetchMock = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ error: "Invalid or expired token" }),
  });

  global.fetch = fetchMock;

  const { postReply } = require("../src/api");

  await expect(postReply("p", "e", "t")).rejects.toThrow("Invalid or expired token");
});
