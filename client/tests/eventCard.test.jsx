import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import EventCard from "../src/components/EventCard.jsx";

const now = new Date();

const user = {
  username: "user",
  email: "user@email.com",
  password: "password"
};

const mockEvent = {
  title: "title",
  description: "description",
  date: now,
  location: "location",
  createdBy: user,
  source: "source",
  createdAt: now,
  id: "mock-id"
};

it("renders correctly", () => {
  render(
    <MemoryRouter>
      <EventCard event={mockEvent} />
    </MemoryRouter>
  );

  expect(screen.getByText("title")).toBeInTheDocument();
  expect(screen.getByText("location")).toBeInTheDocument();
  expect(screen.getByText(new Date(mockEvent.date).toLocaleDateString())).toBeInTheDocument();
});

it ("renders the edge case", () => {
  render(
    <MemoryRouter>
      <EventCard event={mockEvent} />
    </MemoryRouter>
  );
  const img = screen.getByRole("img");
  expect(img.src).toMatch(/^https:\/\/picsum\.photos\/400\/240\?random=/);
  fireEvent.error(img);
  expect(img.src).toBe(
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODUuNSAxMjBMMjAwIDEwNS41TDIxNC41IDEyMEwyMDAgMTM0LjVMMTg1LjUgMTIwWiIgZmlsbD0iIzk0QTNCOCIvPgo8L3N2Zz4K"
  );
});