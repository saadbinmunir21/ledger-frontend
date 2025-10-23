import React, { useEffect, useState } from "react";
import api from "../api";
import AddAccountModal from "../components/AddAccountModal";
import AddTransactionModal from "../components/AddTransactionModal";
import "../App.css";

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  };

  // Fetch transactions
  const fetchTransactions = async (accountId) => {
    if (!accountId) {
      setTransactions([]);
      return;
    }
    setLoadingTx(true);
    try {
      const res = await api.get(`/transactions/${accountId}`);
      // Sort by dateOfEntry descending + _id descending for same-date transactions
      const sortedTx = res.data.sort((a, b) => {
        const dateDiff = new Date(b.dateOfEntry) - new Date(a.dateOfEntry);
        if (dateDiff !== 0) return dateDiff;
        return b._id.localeCompare(a._id); // newest first for same date
      });
      setTransactions(sortedTx);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) fetchTransactions(selectedAccountId);
    else setTransactions([]);
  }, [selectedAccountId]);

  const handleAccountAdded = (newAcc) => {
    setAccounts((p) => [...p, newAcc]);
  };

  const handleTxSaved = () => {
    fetchTransactions(selectedAccountId);
  };

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${txId}`);
      fetchTransactions(selectedAccountId);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      alert("Delete failed");
    }
  };

  const handleEditTransaction = (tx) => {
    setEditingTx(tx);
  };

  return (
    <div className="app-shell">
      <div className="topbar glass">
        <div className="brand">
          <div className="logo">LP</div>
          <div className="brand-text">
            <div className="title">LedgerPro</div>
            <div className="subtitle">Simple ledger • Clean balances</div>
          </div>
        </div>

        <div className="top-controls">
          <div className="select-wrap">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="account-select"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn neutral"
            onClick={() => setShowAddAccount(true)}
          >
            + Add Account
          </button>
        </div>
      </div>

      <main className="content">
        <section className="summary-row">
          <div className="card summary">
            <div className="card-title">Selected Account</div>
            <div className="card-value">
              {selectedAccountId
                ? accounts.find((a) => a._id === selectedAccountId)?.name ?? "—"
                : "No account selected"}
            </div>
          </div>

          <div className="card quick-actions">
            <div className="card-title">Quick Actions</div>
            <div className="action-row">
              <button
                className={`btn primary large ${!selectedAccountId ? "disabled" : ""}`}
                onClick={() => {
                  if (!selectedAccountId) return alert("Select an account first");
                  setShowAddTx(true);
                }}
              >
                + Add Transaction
              </button>
              <button
                className="btn outline"
                onClick={() => selectedAccountId && fetchTransactions(selectedAccountId)}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="table-card card">
          <div className="table-header">
            <h3>Transactions</h3>
            <div className="header-controls">
              <span className="muted">
                {selectedAccountId ? `${transactions.length} items` : "—"}
              </span>
            </div>
          </div>

          <div className="table-body">
            {!selectedAccountId ? (
              <div className="empty-state">Select an account to view transactions.</div>
            ) : loadingTx ? (
              <div className="loading">Loading transactions…</div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">No transactions yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Due Date</th>
                      <th>Ref</th>
                      <th>Description</th>
                      <th>Remarks</th>
                      <th className="numeric">Debit</th>
                      <th className="numeric">Credit</th>
                      <th className="numeric">Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id}>
                        <td>{new Date(tx.dateOfEntry).toLocaleDateString()}</td>
                        <td>{tx.dueOn ? new Date(tx.dueOn).toLocaleDateString() : "-"}</td>
                        <td>{tx.reference || "-"}</td>
                        <td>{tx.description || "-"}</td>
                        <td>{tx.remarks || "-"}</td>
                        <td className="numeric">{tx.debit ? tx.debit.toFixed(2) : "-"}</td>
                        <td className="numeric">{tx.credit ? tx.credit.toFixed(2) : "-"}</td>
                        <td className="numeric balance">{tx.balance?.toFixed(2) || "0.00"}</td>
                        <td className="actions">
                          <button className="btn icon edit" onClick={() => handleEditTransaction(tx)}>
                            Edit
                          </button>
                          <button className="btn icon danger" onClick={() => handleDeleteTransaction(tx._id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onAccountAdded={(acc) => {
            handleAccountAdded(acc);
            setShowAddAccount(false);
          }}
        />
      )}

      {(showAddTx || editingTx) && (
        <AddTransactionModal
          accountId={selectedAccountId}
          existingTransaction={editingTx}
          onClose={() => {
            setShowAddTx(false);
            setEditingTx(null);
          }}
          onSaved={handleTxSaved}
        />
      )}
    </div>
  );
};

export default Dashboard;
