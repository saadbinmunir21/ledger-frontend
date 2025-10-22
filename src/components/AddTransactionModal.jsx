import React, { useEffect, useState } from "react";
import api from "../api";
import "../App.css";

/**
 * Props:
 * - accountId (string) : Mongo _id of selected account (required for add)
 * - onClose () => void
 * - onSaved (transaction) => void   // called after create or update
 * - existingTransaction (optional) : if provided, modal will edit this transaction
 */

const AddTransactionModal = ({ accountId, onClose, onSaved, existingTransaction }) => {
  const [form, setForm] = useState({
    dateOfEntry: "",
    reference: "",
    description: "",
    dueOn: "",
    debit: "",
    credit: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (existingTransaction) {
      setForm({
        dateOfEntry: existingTransaction.dateOfEntry ? new Date(existingTransaction.dateOfEntry).toISOString().slice(0, 10) : "",
        reference: existingTransaction.reference ?? "",
        description: existingTransaction.description ?? "",
        dueOn: existingTransaction.dueOn ? new Date(existingTransaction.dueOn).toISOString().slice(0, 10) : "",
        debit: existingTransaction.debit ?? "",
        credit: existingTransaction.credit ?? "",
      });
    } else {
      setForm({
        dateOfEntry: "",
        reference: "",
        description: "",
        dueOn: "",
        debit: "",
        credit: "",
      });
    }
  }, [existingTransaction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.dateOfEntry) return setError("Date of entry is required.");
    if (!existingTransaction && !accountId) return setError("No account selected.");

    const payload = {
      dateOfEntry: form.dateOfEntry,
      reference: form.reference ? Number(form.reference) : undefined,
      description: form.description,
      dueOn: form.dueOn || undefined,
      debit: form.debit ? Number(form.debit) : 0,
      credit: form.credit ? Number(form.credit) : 0,
    };

    try {
      setLoading(true);
      let res;
      if (existingTransaction) {
        res = await api.put(`/transactions/${existingTransaction._id}`, payload);
      } else {
        res = await api.post("/transactions", { ...payload, accountId });
      }

      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal glass modal-lg">
        <div className="modal-head">
          <h3>{existingTransaction ? "Edit Transaction" : "Add Transaction"}</h3>
          <button className="close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body grid-2">
          <label className="field">
            <div className="label">Date</div>
            <input type="date" name="dateOfEntry" value={form.dateOfEntry} onChange={handleChange} className="input" required />
          </label>

          <label className="field">
            <div className="label">Due on</div>
            <input type="date" name="dueOn" value={form.dueOn} onChange={handleChange} className="input" />
          </label>

          <label className="field full">
            <div className="label">Reference #</div>
            <input type="number" name="reference" value={form.reference} onChange={handleChange} className="input" placeholder="Optional" />
          </label>

          <label className="field full">
            <div className="label">Description</div>
            <input type="text" name="description" value={form.description} onChange={handleChange} className="input" placeholder="Description" />
          </label>

          <label className="field">
            <div className="label">Debit</div>
            <input type="number" name="debit" step="0.01" value={form.debit} onChange={handleChange} className="input" placeholder="0.00" />
          </label>

          <label className="field">
            <div className="label">Credit</div>
            <input type="number" name="credit" step="0.01" value={form.credit} onChange={handleChange} className="input" placeholder="0.00" />
          </label>

          {error && <div className="error full">{error}</div>}

          <div className="modal-actions full">
            <button type="button" className="btn outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading}>{loading ? "Saving..." : existingTransaction ? "Update" : "Add Transaction"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
