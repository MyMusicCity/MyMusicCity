import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import LoadingSpinner from "../src/components/LoadingSpinner.jsx";

it("renders correctly", () => {
  render(
    <MemoryRouter>
      <LoadingSpinner />
    </MemoryRouter>
  );

  expect(screen.getByText("Loading...")).toBeInTheDocument();
  
});