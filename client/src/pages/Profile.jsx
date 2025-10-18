import React from "react";

export default function Profile() {
  return (
    <div className="profile">
      <div className="profile-card">
        <div className="profile-avatar">E</div>
        <h2>Emma Chang</h2>
        <p>Member since: October 1, 2023</p>
        <p className="bio">laufey for life</p>
        <p><strong>Year:</strong> Senior</p>
        <p><strong>Major:</strong> Imaginary Numbers</p>
        <p><strong>Email:</strong> emma.j.chang@vanderbilt.edu</p>
        <button className="deactivate">Deactivate account</button>
      </div>
    </div>
  );
}
