import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from "react-router-dom";
import * as api from "../src/api.js";
import * as router from "react-router-dom";
import ProfileView from "../src/pages/ProfileView.jsx";

// mocking
jest.mock("../src/api.js", () => ({
  getUserById: jest.fn(),
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

describe("ProfileView component", () => {
  const mockUser = {
    username: "alice",
    email: "alice@example.com",
    createdAt: "2024-05-01T00:00:00Z",
  };

  beforeEach(() => {
    api.getUserById.mockReset();
    mockNavigate.mockReset();
  });

  test("renders user profile after loading", async () => {
    api.getUserById.mockResolvedValueOnce(mockUser);

    render(
      <MemoryRouter initialEntries={["/profile/123"]}>
        <Routes>
          <Route path="/profile/:id" element={<ProfileView />} />
        </Routes>
      </MemoryRouter>
    );

    // Loading
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();

    // Wait for username to appear (async)
    const usernameEl = await screen.findAllByText(/alice/i);
    expect(usernameEl[0]).toBeInTheDocument();

    // Avatar
    const avatarEl = document.querySelector(".profile-avatar");
    expect(avatarEl).toHaveTextContent("A");

    // Name
    const nameEl = document.querySelector(".profile-name");
    expect(nameEl).toHaveTextContent("alice");

    // Email
    const emailEl = screen.getByText(/Email:/i).closest("p");
    expect(emailEl).toHaveTextContent(/alice@example\.com/i);

    // Member since
    const memberSinceEl = screen.getByText(/Member since:/i).closest("p");
    expect(memberSinceEl).toHaveTextContent(
      new Date(mockUser.createdAt).toLocaleDateString()
    );
  });

  test("calls navigate(-1) when back button is clicked", async () => {
    api.getUserById.mockResolvedValueOnce(mockUser);

    render(
      <MemoryRouter initialEntries={["/profile/123"]}>
        <Routes>
          <Route path="/profile/:id" element={<ProfileView />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findAllByText(/alice/i);

    const backButton = screen.getAllByRole("button", { name: /back/i })[0];
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test("renders error message if API fails", async () => {
    api.getUserById.mockRejectedValueOnce(new Error("User not found"));

    render(
      <MemoryRouter initialEntries={["/profile/999"]}>
        <Routes>
          <Route path="/profile/:id" element={<ProfileView />} />
        </Routes>
      </MemoryRouter>
    );

    const errorHeading = await screen.findByRole("heading", { name: /error/i });
    expect(errorHeading).toBeInTheDocument();

    expect(screen.getByText(/User not found/i)).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeInTheDocument();
  });

  test("shows loading state", () => {
    api.getUserById.mockReturnValue(new Promise(() => {})); // unresolved promise

    render(
      <MemoryRouter initialEntries={["/profile/123"]}>
        <Routes>
          <Route path="/profile/:id" element={<ProfileView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  test("shows error state if API fails", async () => {
    api.getUserById.mockRejectedValueOnce(new Error("User not found"));

    render(
      <MemoryRouter initialEntries={["/profile/999"]}>
        <Routes>
          <Route path="/profile/:id" element={<ProfileView />} />
        </Routes>
      </MemoryRouter>
    );

    const errorHeading = await screen.findByRole("heading", { name: /error/i });
    expect(errorHeading).toBeInTheDocument();

    expect(screen.getByText(/User not found/i)).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);

  });

});