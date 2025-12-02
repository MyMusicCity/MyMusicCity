import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import EventDetails from "../src/pages/EventDetails";
import { AuthContext } from "../src/AuthContext";

// Mock the client API module so we control RSVP responses
jest.mock("../src/api", () => ({
  getEventRsvps: jest.fn(),
  postRsvp: jest.fn(),
  deleteRsvp: jest.fn(),
  getComments: jest.fn(),
}));

const { getEventRsvps, postRsvp, deleteRsvp, getComments } = require("../src/api");

beforeEach(() => {
  jest.resetAllMocks();
  // Default getComments to empty tree
  getComments.mockResolvedValue([]);
});

test("shows RSVP when user not attending and converts to Cancel after RSVP", async () => {
  const event = { _id: "ev-1", title: "Test", date: "now", location: "loc" };

  // start with no attendees, then return one after RSVP
  getEventRsvps.mockResolvedValueOnce([]).mockResolvedValueOnce([{ user: { _id: "u1", username: "me" } }]);
  postRsvp.mockResolvedValue({});

  const user = { id: "u1", username: "me" };

  render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={[{ pathname: `/event/${event._id}`, state: { event } }]}>
        <Routes>
          <Route path="/event/:id" element={<EventDetails />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

  // initially, RSVP button should appear
  const rsvpBtn = await screen.findByRole("button", { name: /rsvp/i });
  expect(rsvpBtn).toBeInTheDocument();

  // click RSVP and wait for behavior to update
  fireEvent.click(rsvpBtn);

  await waitFor(() => expect(postRsvp).toHaveBeenCalled());

  // after successful RSVP the UI should show Cancel RSVP
  const cancelBtn = await screen.findByRole("button", { name: /cancel rsvp/i });
  expect(cancelBtn).toBeInTheDocument();
});

test("shows Cancel RSVP when the user is already attending", async () => {
  const event = { _id: "ev-2", title: "Test2", date: "now", location: "loc" };

  // populate attendees with the current user
  getEventRsvps.mockResolvedValue([{ user: { _id: "u2", username: "you" } }, { user: { _id: "me", username: "me" } }]);
  deleteRsvp.mockResolvedValue({});

  const user = { id: "me", username: "me" };

  render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={[{ pathname: `/event/${event._id}`, state: { event } }]}>
        <Routes>
          <Route path="/event/:id" element={<EventDetails />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

  const cancelBtn = await screen.findByRole("button", { name: /cancel rsvp/i });
  expect(cancelBtn).toBeInTheDocument();

  fireEvent.click(cancelBtn);

  await waitFor(() => expect(deleteRsvp).toHaveBeenCalled());
});
