import React from "react";
import { render, screen } from "@testing-library/react";
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
});