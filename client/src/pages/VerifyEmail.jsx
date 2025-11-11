import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { verifyEmail, resendVerification } from "../api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const email = params.get("email");

  const [status, setStatus] = useState("pending"); // pending | success | error
  const [message, setMessage] = useState("");
  const [resendState, setResendState] = useState({ busy: false, result: null });

  useEffect(() => {
    async function run() {
      if (!token || !email) {
        setStatus("error");
        setMessage("Missing token or email in the URL.");
        return;
      }
      try {
        const res = await verifyEmail(token, email);
        if (res && res.ok) {
          setStatus("success");
          setMessage("Email verified! You can now log in.");
        } else {
          setStatus("error");
          setMessage(res?.error || res?.message || "Verification failed");
        }
      } catch (e) {
        setStatus("error");
        setMessage(e?.message || "Verification failed");
      }
    }
    run();
  }, [token, email]);

  async function handleResend() {
    if (!email) return;
    setResendState({ busy: true, result: null });
    try {
      const res = await resendVerification(email);
      setResendState({ busy: false, result: res?.message || "Verification email resent" });
    } catch (e) {
      setResendState({ busy: false, result: e?.message || "Resend failed" });
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
      <h1>Verify your email</h1>
      {status === "pending" && (
        <p>Verifying your email address… Please wait.</p>
      )}
      {status === "success" && (
        <>
          <p style={{ color: "green" }}>{message}</p>
          <p>
            Continue to <Link to="/login">Login</Link>.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <p style={{ color: "crimson" }}>{message}</p>
          {email && (
            <button onClick={handleResend} disabled={resendState.busy}>
              {resendState.busy ? "Resending…" : "Resend verification email"}
            </button>
          )}
          {resendState.result && <p>{resendState.result}</p>}
          <p>
            Return to <Link to="/login">Login</Link>.
          </p>
        </>
      )}
    </div>
  );
}
