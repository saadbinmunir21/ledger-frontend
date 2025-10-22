import React, { useEffect, useState } from "react";
import api from "../api";
import AddAccountModal from "../components/AddAccountModal";
import AddTransactionModal from "../components/AddTransactionModal";
import "../App.css"; // single global CSS file as requested

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  // Fetch accounts from backend
  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  };

  // Fetch transactions for selected account
  const fetchTransactions = async (accountId) => {
    if (!accountId) {
      setTransactions([]);
      return;
    }
    setLoadingTx(true);
    try {
      const res = await api.get(`/transactions/${accountId}`);
      setTransactions(res.data);
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

  // called when new account created
  const handleAccountAdded = (newAcc) => {
    setAccounts((p) => [...p, newAcc]);
  };

  // called when transaction added or updated
  const handleTxSaved = (tx) => {
    // refetch to get server-side recalculated balances
    fetchTransactions(selectedAccountId);
  };

  // delete transaction
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

  // open edit modal
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
            title="Add a new account"
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
            <div className="card-note">
              Choose an account from the top-right selector to view transactions.
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
                onClick={() => {
                  // keep original functionality unchanged; this is just a placeholder action that you can customize
                  if (!selectedAccountId) return alert("Select an account first");
                  fetchTransactions(selectedAccountId);
                }}
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
              <div className="empty-state">
                <img
                  src=""
                  alt=""
                  aria-hidden
                  style={{ width: 160, opacity: 0.06 }}
                />
                <div className="empty-title">No account selected</div>
                <div className="empty-sub">Select an account to show its transactions</div>
              </div>
            ) : loadingTx ? (
              <div className="loading">Loading transactions…</div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">No transactions yet</div>
                <div className="empty-sub">Add your first transaction using the button above.</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref</th>
                      <th>Description</th>
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
                        <td>{tx.reference ?? "-"}</td>
                        <td className="desc">{tx.description ?? "-"}</td>
                        <td className="numeric">{tx.debit ? Number(tx.debit).toFixed(2) : "-"}</td>
                        <td className="numeric">{tx.credit ? Number(tx.credit).toFixed(2) : "-"}</td>
                        <td className="numeric balance">{Number(tx.balance ?? 0).toFixed(2)}</td>
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

      {/* Modals */}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onAccountAdded={(acc) => {
            handleAccountAdded(acc);
            setShowAddAccount(false);
          }}
        />
      )}

      {showAddTx && (
        <AddTransactionModal
          accountId={selectedAccountId}
          onClose={() => setShowAddTx(false)}
          onSaved={(tx) => {
            handleTxSaved(tx);
            setShowAddTx(false);
          }}
        />
      )}

      {editingTx && (
        <AddTransactionModal
          existingTransaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={(tx) => {
            handleTxSaved(tx);
            setEditingTx(null);
          }}
        />
      )}
    </div>
  );


};

export default Dashboard;
