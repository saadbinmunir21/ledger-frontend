import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import AddAccountModal from "../components/AddAccountModal";
import AddTransactionModal from "../components/AddTransactionModal";
import "../App.css";

const Dashboard = ({ onLogout }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showClosedWarning, setShowClosedWarning] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const dropdownRef = useRef(null);

  // Sort accounts by latest transaction date
  const sortAccountsByLatestTransaction = async (accountsList) => {
    try {
      // Fetch latest transaction for each account
      const accountsWithLastTx = await Promise.all(
        accountsList.map(async (acc) => {
          try {
            const res = await api.get(`/transactions/${acc._id}`);
            if (res.data && res.data.length > 0) {
              // Sort transactions to get the latest one
              const sortedTx = res.data.sort((a, b) => {
                const dateDiff = new Date(b.dateOfEntry) - new Date(a.dateOfEntry);
                if (dateDiff !== 0) return dateDiff;
                return b._id.localeCompare(a._id);
              });
              return {
                ...acc,
                lastTransactionDate: new Date(sortedTx[0].dateOfEntry)
              };
            }
            return {
              ...acc,
              lastTransactionDate: null // No transactions
            };
          } catch (err) {
            return {
              ...acc,
              lastTransactionDate: null
            };
          }
        })
      );

      // Sort: closed accounts at bottom, open accounts by latest transaction date
      const sorted = accountsWithLastTx.sort((a, b) => {
        // If one is closed and other is not, closed goes to bottom
        if (a.isClosed && !b.isClosed) return 1;
        if (!a.isClosed && b.isClosed) return -1;

        // Both have same closed status, sort by latest transaction
        if (a.lastTransactionDate && b.lastTransactionDate) {
          return b.lastTransactionDate - a.lastTransactionDate; // Latest first
        }
        
        // Account with transaction comes before account without
        if (a.lastTransactionDate && !b.lastTransactionDate) return -1;
        if (!a.lastTransactionDate && b.lastTransactionDate) return 1;

        // Both have no transactions, maintain current order
        return 0;
      });

      return sorted;
    } catch (err) {
      console.error("Error sorting accounts:", err);
      return accountsList; // Return original list if sorting fails
    }
  };

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      // Load closed status from localStorage
      const accountsWithStatus = res.data.map(acc => {
        const closedAccounts = JSON.parse(localStorage.getItem('closedAccounts') || '{}');
        return {
          ...acc,
          isClosed: closedAccounts[acc._id] || false
        };
      });
      
      // Sort accounts: open accounts with latest transactions first, closed accounts at bottom
      const sortedAccounts = await sortAccountsByLatestTransaction(accountsWithStatus);
      setAccounts(sortedAccounts);
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
      const sortedTx = res.data.sort((a, b) => {
        const dateDiff = new Date(b.dateOfEntry) - new Date(a.dateOfEntry);
        if (dateDiff !== 0) return dateDiff;
        return b._id.localeCompare(a._id);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAccountAdded = async (newAcc) => {
    const updatedAccounts = [...accounts, { ...newAcc, isClosed: false }];
    const sortedAccounts = await sortAccountsByLatestTransaction(updatedAccounts);
    setAccounts(sortedAccounts);
  };

  const handleTxSaved = () => {
    fetchTransactions(selectedAccountId);
    fetchAccounts(); // Re-fetch and re-sort accounts after transaction is added/edited
  };

  const handleDeleteTransaction = async (txId) => {
    const selectedAccount = accounts.find(a => a._id === selectedAccountId);
    if (selectedAccount?.isClosed) {
      setShowClosedWarning(true);
      return;
    }

    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${txId}`);
      fetchTransactions(selectedAccountId);
      fetchAccounts(); // Re-sort after deletion
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      alert("Delete failed");
    }
  };

  const handleEditTransaction = (tx) => {
    const selectedAccount = accounts.find(a => a._id === selectedAccountId);
    if (selectedAccount?.isClosed) {
      setShowClosedWarning(true);
      return;
    }
    setEditingTx(tx);
  };

  const handleAddTransaction = () => {
    if (!selectedAccountId) {
      alert("Select an account first");
      return;
    }

    const selectedAccount = accounts.find(a => a._id === selectedAccountId);
    if (selectedAccount?.isClosed) {
      setShowClosedWarning(true);
      return;
    }

    setShowAddTx(true);
  };

  const toggleAccountClosed = async (accountId, e) => {
    e.stopPropagation();
    const closedAccounts = JSON.parse(localStorage.getItem('closedAccounts') || '{}');
    closedAccounts[accountId] = !closedAccounts[accountId];
    localStorage.setItem('closedAccounts', JSON.stringify(closedAccounts));

    const updatedAccounts = accounts.map(acc => 
      acc._id === accountId 
        ? { ...acc, isClosed: closedAccounts[accountId] }
        : acc
    );

    // Re-sort accounts after toggling closed status
    const sortedAccounts = await sortAccountsByLatestTransaction(updatedAccounts);
    setAccounts(sortedAccounts);

    if (accountId === selectedAccountId && closedAccounts[accountId]) {
      setSelectedAccountId("");
      setTransactions([]);
    }
  };

  const handleSelectAccount = (accountId) => {
    setSelectedAccountId(accountId);
    setShowAccountDropdown(false);
  };

  const selectedAccount = accounts.find(a => a._id === selectedAccountId);

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
          <div className="custom-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="custom-dropdown-button"
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            >
              <span className="dropdown-text">
                {selectedAccountId
                  ? `${accounts.find((a) => a._id === selectedAccountId)?.name || "Select account"} ${
                      selectedAccount?.isClosed ? "(Closed)" : ""
                    }`
                  : "Select account"}
              </span>
              <svg
                className={`dropdown-arrow ${showAccountDropdown ? "open" : ""}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showAccountDropdown && (
              <div className="custom-dropdown-menu">
                {accounts.length === 0 ? (
                  <div className="dropdown-empty">No accounts yet</div>
                ) : (
                  accounts.map((acc) => (
                    <div
                      key={acc._id}
                      className={`dropdown-item ${selectedAccountId === acc._id ? "selected" : ""}`}
                    >
                      <label className="dropdown-checkbox-label">
                        <input
                          type="checkbox"
                          checked={acc.isClosed || false}
                          onChange={(e) => toggleAccountClosed(acc._id, e)}
                          className="dropdown-checkbox"
                        />
                        <span
                          className={`dropdown-account-name ${acc.isClosed ? "closed" : ""}`}
                          onClick={() => handleSelectAccount(acc._id)}
                        >
                          {acc.name}
                          {acc.isClosed && <span className="dropdown-closed-tag">Closed</span>}
                        </span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            className="btn neutral"
            onClick={() => setShowAddAccount(true)}
          >
            + Add Account
          </button>

          <button
            className="btn danger"
            onClick={onLogout}
          >
            Logout
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
            {selectedAccount?.isClosed && (
              <div className="card-note closed-badge">⚠️ This account is closed</div>
            )}
          </div>

          <div className="card quick-actions">
            <div className="card-title">Quick Actions</div>
            <div className="action-row">
              <button
                className={`btn primary large ${!selectedAccountId ? "disabled" : ""}`}
                onClick={handleAddTransaction}
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
                        <td className="numeric debit-cell">{tx.debit ? tx.debit.toFixed(2) : "-"}</td>
                        <td className="numeric credit-cell">{tx.credit ? tx.credit.toFixed(2) : "-"}</td>
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

      {showClosedWarning && (
        <div className="modal-backdrop" onClick={() => setShowClosedWarning(false)}>
          <div className="modal glass modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>⚠️ Account Closed</h3>
              <button className="close" onClick={() => setShowClosedWarning(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: '#073042', lineHeight: '1.6' }}>
                This account is closed. You cannot add, edit, or delete transactions in a closed account.
                <br /><br />
                To make changes, please uncheck the checkbox next to the account name in the dropdown.
              </p>
              <div className="modal-actions">
                <button className="btn primary" onClick={() => setShowClosedWarning(false)}>
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;