"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sheet } from "@/types";

export default function HomePage() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [newSheetName, setNewSheetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    try {
      const response = await fetch("/api/sheets");
      if (response.ok) {
        const data = await response.json();
        // Handle both array and single sheet responses
        setSheets(Array.isArray(data) ? data : [data].filter(Boolean));
      }
    } catch (error) {
      console.error("Failed to fetch sheets:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSheet = async () => {
    if (!newSheetName.trim() || creating) return;

    setCreating(true);
    try {
      const response = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSheetName.trim(),
          rows: 20,
          cols: 10,
        }),
      });

      if (response.ok) {
        const sheet = await response.json();
        setSheets([...sheets, sheet]);
        setNewSheetName("");
      }
    } catch (error) {
      console.error("Failed to create sheet:", error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="home-page loading-state">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your spreadsheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Header Section */}
      <header className="home-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="32"
                  height="32"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <line
                  x1="4"
                  y1="12"
                  x2="36"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <line
                  x1="12"
                  y1="4"
                  x2="12"
                  y2="36"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <line
                  x1="20"
                  y1="12"
                  x2="20"
                  y2="36"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1="28"
                  y1="12"
                  x2="28"
                  y2="36"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1="12"
                  y1="20"
                  x2="36"
                  y2="20"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1="12"
                  y1="28"
                  x2="36"
                  y2="28"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
              </svg>
            </div>
            <h1 className="logo-text">TinyGrid</h1>
          </div>
          <p className="tagline">
            Professional spreadsheet with formulas and ranges
          </p>
        </div>
      </header>

      <div className="main-container">
        {/* Create Sheet Section */}
        <section className="create-section">
          <div className="section-header">
            <h2 className="section-title">Create New Spreadsheet</h2>
            <p className="section-description">
              Start with a blank spreadsheet to organize your data
            </p>
          </div>

          <div className="create-form">
            <div className="input-group">
              <input
                type="text"
                className="sheet-name-input"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createSheet();
                  }
                }}
                placeholder="Enter spreadsheet name..."
                disabled={creating}
                maxLength={100}
              />
              <button
                className={`create-button ${creating ? "creating" : ""}`}
                onClick={createSheet}
                disabled={!newSheetName.trim() || creating}
              >
                {creating ? (
                  <>
                    <span className="button-spinner"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg
                      className="button-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M8 2V14M2 8H14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Create Sheet
                  </>
                )}
              </button>
            </div>
            {newSheetName && (
              <p className="input-hint">Press Enter to create</p>
            )}
          </div>
        </section>

        {/* Sheets Section */}
        <section className="sheets-section">
          <div className="section-header">
            <h2 className="section-title">Your Spreadsheets</h2>
            <p className="section-description">
              {sheets.length === 0
                ? "No spreadsheets yet"
                : `${sheets.length} spreadsheet${
                    sheets.length === 1 ? "" : "s"
                  } available`}
            </p>
          </div>

          {sheets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <rect
                    x="8"
                    y="16"
                    width="48"
                    height="40"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.3"
                  />
                  <rect
                    x="16"
                    y="24"
                    width="12"
                    height="8"
                    fill="currentColor"
                    opacity="0.2"
                  />
                  <rect
                    x="32"
                    y="24"
                    width="12"
                    height="8"
                    fill="currentColor"
                    opacity="0.2"
                  />
                  <rect
                    x="16"
                    y="36"
                    width="12"
                    height="8"
                    fill="currentColor"
                    opacity="0.2"
                  />
                  <rect
                    x="32"
                    y="36"
                    width="12"
                    height="8"
                    fill="currentColor"
                    opacity="0.2"
                  />
                </svg>
              </div>
              <h3 className="empty-title">No spreadsheets yet</h3>
              <p className="empty-description">
                Create your first spreadsheet to get started with data
                organization and calculations
              </p>
            </div>
          ) : (
            <div className="sheets-grid">
              {sheets.map((sheet) => (
                <Link
                  key={sheet.id}
                  href={`/s/${sheet.id}`}
                  className="sheet-card"
                >
                  <div className="sheet-card-header">
                    <div className="sheet-icon">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <line
                          x1="3"
                          y1="8"
                          x2="21"
                          y2="8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <line
                          x1="8"
                          y1="3"
                          x2="8"
                          y2="21"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <line
                          x1="14"
                          y1="8"
                          x2="14"
                          y2="21"
                          stroke="currentColor"
                          strokeWidth="1"
                          opacity="0.3"
                        />
                        <line
                          x1="8"
                          y1="14"
                          x2="21"
                          y2="14"
                          stroke="currentColor"
                          strokeWidth="1"
                          opacity="0.3"
                        />
                      </svg>
                    </div>
                    <div className="sheet-status">
                      {Object.keys(sheet.cells || {}).length > 0 && (
                        <span className="status-badge">Active</span>
                      )}
                    </div>
                  </div>

                  <h3 className="sheet-title">{sheet.name}</h3>

                  <div className="sheet-meta">
                    <div className="meta-item">
                      <span className="meta-label">Size</span>
                      <span className="meta-value">
                        {sheet.rows} × {sheet.cols}
                      </span>
                    </div>
                    {sheet.cells !== undefined && (
                      <div className="meta-item">
                        <span className="meta-label">Cells</span>
                        <span className="meta-value">
                          {Object.keys(sheet.cells || {}).length || 0} filled
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="sheet-footer">
                    <span className="sheet-date">
                      Updated{" "}
                      {new Date(sheet.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="sheet-arrow">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M6 12L10 8L6 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
