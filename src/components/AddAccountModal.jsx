import React, { useState } from "react";
import api from "../api";
import "../App.css";

const AddAccountModal = ({ onClose, onAccountAdded }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Account name is required.");

    try {
      setLoading(true);
      const res = await api.post("/accounts", { name });
      onAccountAdded(res.data);
      setName("");
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal glass modal-sm">
        <div className="modal-head">
          <h3>Add New Account</h3>
          <button className="close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <label className="field">
            <div className="label">Account name</div>
            <input
              autoFocus
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cash, Bank - Main, Expenses"
            />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Saving..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;
