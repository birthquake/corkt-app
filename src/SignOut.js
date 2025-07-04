import React, { useState } from "react";
import { getAuth, signOut } from "firebase/auth";

const SignOut = () => {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    const auth = getAuth();

    try {
      await signOut(auth);
      console.log("User successfully signed out.");
      // No need for alert since the UI will update automatically when user state changes
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      style={{
        margin: "10px",
        padding: "10px 20px",
        backgroundColor: loading ? "#ccc" : "#dc3545",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
      title="Sign out of your account"
    >
      {loading ? "Signing Out..." : "Sign Out"}
    </button>
  );
};

export default SignOut;
