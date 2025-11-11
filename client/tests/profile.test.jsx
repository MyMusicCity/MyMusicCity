import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import Profile from "../src/pages/Profile.jsx";

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

describe("Profile component", () => {

  beforeEach(() => {
    mockNavigate.mockReset();

    localStorage.setItem(
    "user",
    JSON.stringify({
      username: "alice",
      email: "alice@example.com",
      year: "Senior",
      major: "Imaginary Numbers",
    })
  );

  localStorage.setItem("token", "fake-token");
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("redirects to login if no user in localStorage", () => {
    localStorage.removeItem("user");
    render(<Profile />);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("loads profile from localStorage", async () => {
    render(<Profile />);

    const usernameEl = await screen.findAllByText(/alice/i);
    expect(usernameEl[0]).toBeInTheDocument();

    expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Senior/i)).toBeInTheDocument();
    expect(screen.getByText(/Imaginary Numbers/i)).toBeInTheDocument();

  });

  test("editable bio works", () => {
    render(<Profile />);

    const bioEl = screen.getByText(/laufey for life/i);
    expect(bioEl).toBeInTheDocument();

    const editIcon = bioEl.querySelector(".edit-icon");
    fireEvent.click(editIcon);

    const input = screen.getByDisplayValue(/laufey for life/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "New bio" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(screen.getByText(/New bio/i)).toBeInTheDocument();
  });

  test("editable email works", () => {
    render(<Profile />);

    const emailEl = screen.getByText(/alice@example.com/i);
    expect(emailEl).toBeInTheDocument();

    const editIcon = emailEl.querySelector(".edit-icon");
    fireEvent.click(editIcon);

    const input = screen.getByDisplayValue(/alice@example.com/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "new@email.com" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(screen.getByText(/new@email.com/i)).toBeInTheDocument();
  });

  test("editable year works", () => {
    render(<Profile />);

    const yearEl = screen.getByText(/Senior/i);
    expect(yearEl).toBeInTheDocument();

    const editIcon = yearEl.querySelector(".edit-icon");
    fireEvent.click(editIcon);

    const input = screen.getByDisplayValue(/Senior/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "New Year" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(screen.getByText(/New Year/i)).toBeInTheDocument();
  });

  test("editable major works", () => {
    render(<Profile />);

    const majorEl = screen.getByText(/Imaginary Numbers/i);
    expect(majorEl).toBeInTheDocument();

    const editIcon = majorEl.querySelector(".edit-icon");
    fireEvent.click(editIcon);

    const input = screen.getByDisplayValue(/Imaginary Numbers/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "New Major" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(screen.getByText(/New Major/i)).toBeInTheDocument();
  });

  test("logout button clears localStorage and navigates to login", () => {
    render(<Profile />);

    const logoutButton = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutButton);

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

});