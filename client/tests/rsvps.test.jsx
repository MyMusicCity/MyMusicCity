import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import * as api from "../src/api.js";
import * as router from "react-router-dom";
import { MemoryRouter } from "react-router-dom";
import RSVPs from "../src/pages/RSVPs.jsx";
import { AuthContext } from "../src/AuthContext";

// mocking
jest.mock("../src/api.js", () => ({
  __esModule: true,
  getUserById: jest.fn(),
  getMeRsvps: jest.fn(),
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

describe("RSVP component", () => {
  const mockUser = {
    username: "alice",
    email: "alice@example.com",
    createdAt: "2024-05-01T00:00:00Z",
  };
  const mockEvent = {
    title: "title"
  };
  
  const mockRsvps = [
    { event: mockEvent, user: mockUser }
  ];
  const mockNoRsvps = [
    {}
  ];

  beforeEach(() => {
    api.getUserById.mockReset();
    api.getMeRsvps.mockReset();
    // Default to resolving to an empty array so tests that don't explicitly
    // set a return value don't hit `undefined.then`.
    api.getMeRsvps.mockResolvedValue([]);
    mockNavigate.mockReset();
  });

  test("shows login prompt when user is not logged in", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: null }}>
          <RSVPs />
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Please log in to view your RSVPs\./i)).toBeInTheDocument();
  });

  test("renders user with no RSVPs after loading", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser }}>
          <RSVPs />
        </AuthContext.Provider>
      </MemoryRouter>
    );
    const titleNode = await screen.findByText(/You haven’t RSVP’d to any events yet/i);
    expect(titleNode).toBeInTheDocument();
  });

  test("renders user with RSVP after loading", async () => {
    api.getMeRsvps.mockResolvedValueOnce(mockRsvps);
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser }}>
          <RSVPs />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const titleNode = await screen.findByText("title");
    expect(titleNode).toBeInTheDocument();
  });

  test("shows error state", async () => {
      api.getMeRsvps.mockRejectedValueOnce(new Error("Network error"));
      render(
        <MemoryRouter>
          <AuthContext.Provider value={{ user: mockUser }}>
            <RSVPs />
          </AuthContext.Provider>
        </MemoryRouter>
      );
  
      await waitFor(() => {
        expect(screen.getByText(/Run diagnostics/i)).toBeInTheDocument();
      });
    });
  
});
