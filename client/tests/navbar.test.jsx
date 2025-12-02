import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../src/AuthContext";
import Navbar from "../src/components/Navbar.jsx";

const mockUser = {
    username: "alice",
    email: "alice@example.com",
    createdAt: "2024-05-01T00:00:00Z",
  };

it ("renders without signing in", () => {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: null }}>
        <Navbar />
      </AuthContext.Provider>
    </MemoryRouter>
  );

  expect(screen.getByText("MyMusicCity")).toBeInTheDocument();
  expect(screen.getByText("Sign In")).toBeInTheDocument();

});

it ("renders after signing in", async () => {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ 
        isAuthenticated: true,
        user: mockUser }}>
        <Navbar />
      </AuthContext.Provider>
    </MemoryRouter>
  );

  expect(screen.getByText("MyMusicCity")).toBeInTheDocument();

  expect(screen.getByText("❤️ My RSVPs")).toBeInTheDocument();

  const dropdown = document.querySelector('.user-dropdown');
  expect(dropdown).toBeInTheDocument();

});

test("icon redirects to links", async () => {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ 
        isAuthenticated: true,
        user: mockUser }}>
        <Navbar />
      </AuthContext.Provider>
    </MemoryRouter>
  );

  const links = screen.getAllByRole("link");
  const hrefs = links.map((link) => link.getAttribute("href"));
  expect(hrefs).toEqual(["/", "/rsvps"]);

  const dropdown = document.querySelector('.user-dropdown');
  fireEvent.mouseOver(dropdown);

  const profile = screen.getByRole("link", { name: /Profile/i });
  expect(profile).toBeInTheDocument();

  expect(profile).toHaveAttribute("href", "/profile");

});