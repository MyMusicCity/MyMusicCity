import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import Navbar from "../src/components/Navbar.jsx";


it ("renders correctly", () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  expect(screen.getByText("MyMusicCity")).toBeInTheDocument();

  expect(screen.getByTitle("Messages")).toBeInTheDocument();
  expect(screen.getByTitle("My RSVPs")).toBeInTheDocument();
  expect(screen.getByTitle("Profile")).toBeInTheDocument();

});

test("icon redirects to links", () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  const links = screen.getAllByRole("link");
  const hrefs = links.map((link) => link.getAttribute("href"));
  expect(hrefs).toEqual(["/", "/messages", "/rsvps", "/profile"]);
});