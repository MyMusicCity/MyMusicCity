import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import '@testing-library/jest-dom';
import Messages from "../src/pages/Messages.jsx";

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

describe("Messages component", () => {

  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test("renders message page", () => {
    render(<Messages />);
    // left screen
    expect(screen.getByText("MESSAGES")).toBeInTheDocument();

    const chatHeader = document.querySelector(".chat-header");
    expect(within(chatHeader).getByText("Jake Seals")).toBeInTheDocument();

    const chatSidebar = document.querySelector(".chat-sidebar");
    expect(within(chatSidebar).getByText("Annette Ma")).toBeInTheDocument();

    // right screen
    expect(screen.getByText("concert tn? :D:D:D")).toBeInTheDocument();
    expect(screen.getByText("ok my seats are row k seat 2")).toBeInTheDocument();
  });

  test("can change chats", () => {
    render(<Messages />);

    const chatSidebar = document.querySelector(".chat-sidebar");
    const switchChat = within(chatSidebar).getByText("Annette Ma");

    fireEvent.click(switchChat);

    const chatHeader = document.querySelector(".chat-header");
    expect(within(chatHeader).getByText("Annette Ma")).toBeInTheDocument();

    const chatThread = document.querySelector(".chat-thread");
    expect(within(chatThread).getByText("Leaving campus at 5!")).toBeInTheDocument();
  });

  test("can send messages", () => {
    render(<Messages />);
    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByText("Send");

    fireEvent.change(input, { target: { value: "wait I\'m going to be late" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    fireEvent.click(sendButton);

    const chatThread = document.querySelector(".chat-thread");
    expect(within(chatThread).getByText("wait I\'m going to be late")).toBeInTheDocument();
  });

});
