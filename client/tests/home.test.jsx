import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import * as api from "../src/api.js";
import Home from "../src/pages/Home.jsx";

jest.mock("../src/api.js", () => ({
  __esModule: true,
  getUserById: jest.fn(),
  getMeRsvps: jest.fn(),
  // Ensure Home imports used in useEffect are available
  ping: jest.fn().mockResolvedValue({ ok: true }),
  getEvents: jest.fn().mockResolvedValue([]),
  API_BASE: '',
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const originalModule = jest.requireActual("react-router-dom");
  return {
    __esModule: true,
    ...originalModule,
    useNavigate: () => mockNavigate, // all calls to useNavigate return this mock
  };
});

describe("Home component", () => {

  const mockUser = {
    username: "alice",
    email: "alice@example.com",
    createdAt: "2024-05-01T00:00:00Z",
  };
  const mockEvent = {
    title: "title"
  };

  beforeEach(() => {
    api.getUserById.mockReset();
    api.getMeRsvps.mockReset();
    api.getMeRsvps.mockResolvedValue([]);
    mockNavigate.mockReset();
  });

  test("renders home page after login", async () => {
    // Mock fetch so the component's data-loading useEffect resolves
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => [
        { id: 1, title: 'Test Event', date: '2025-12-05T19:00:00.000Z' },
      ],
    });

    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Wait for the Filters heading to appear (component finishes loading)
    const filtersHeading = await screen.findByText(/Filters/i);
    // Locate the surrounding `.filters` panel
    const leftFilter = filtersHeading.closest('.filters') || container.querySelector('.filters');
    expect(leftFilter).toBeTruthy();

    // Now query within the left filter panel
    const start = within(leftFilter).getByText(/Start Date/i);
    const end = within(leftFilter).getByText(/End Date/i);

    expect(start).toBeInTheDocument();
    expect(end).toBeInTheDocument();
  });

});