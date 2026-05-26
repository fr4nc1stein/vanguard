"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import Pagination from "../../components/Pagination";

interface Scope {
  id: string;
  domain: string;
  description: string | null;
  targetType: string;
  status: string;
  allowedVulnTypes: string | null;    // JSON array string
  severityRestriction: string | null; // JSON array string
  notes: string | null;
  exclusionPaths: string | null;
  deletedAt: number | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

const ALL_VULN_TYPES = [
  'Broken Access Control', 'Cryptographic Failure', 'Injection (SQL / XSS / Command / SSTI)',
  'Insecure Design', 'Security Misconfiguration', 'Vulnerable or Outdated Component',
  'Authentication / Session Failure', 'Software & Data Integrity Failure',
  'SSRF (Server-Side Request Forgery)', 'Business Logic Flaw',
  'Information Disclosure / Data Leak', 'IDOR (Insecure Direct Object Reference)',
  'Open Redirect', 'Clickjacking / UI Redressing', 'CORS Misconfiguration',
  'Path Traversal / File Inclusion', 'Other',
] as const;

const ALL_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;

const TARGET_TYPE_LABELS: Record<string, string> = {
  web_app: "Web Application",
  api: "API",
  mobile: "Mobile App",
  infrastructure: "Infrastructure",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  deprecated: "bg-yellow-100 text-yellow-700 border-yellow-200",
  out_of_scope: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function ScopeManagement() {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScope, setEditingScope] = useState<Scope | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    domain: "",
    description: "",
    targetType: "web_app",
    status: "active",
    allowedVulnTypes: [] as string[],
    severityRestriction: [] as string[],
    notes: "",
    exclusionPaths: "",
  });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; domain: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Scope | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchScopes = useCallback(async () => {
    setLoading(true);
    try {
      const params = showArchived ? '?include_archived=true' : '';
      const res = await fetch(`/api/admin/scopes${params}`);
      if (!res.ok) throw new Error('Failed to fetch scopes');
      const data = await res.json();
      setScopes(data.scopes);
    } catch (err) {
      console.error('[fetchScopes]', err);
      setToast({
        message: 'Failed to load scopes',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchScopes();
  }, [fetchScopes]);

  // Search and filter logic
  const filteredScopes = scopes.filter(scope => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      scope.domain.toLowerCase().includes(query) ||
      (scope.description && scope.description.toLowerCase().includes(query)) ||
      scope.targetType.toLowerCase().includes(query) ||
      scope.status.toLowerCase().includes(query) ||
      (scope.deletedAt !== null && 'archived'.includes(query))
    );
  });

  // Sorting logic
  const sortedScopes = [...filteredScopes].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: string | number | null = a[sortField];
    let bVal: string | number | null = b[sortField];
    
    // Handle null values
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedScopes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScopes = sortedScopes.slice(startIndex, endIndex);

  // Handle sort column click
  const handleSort = (field: keyof Scope) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Sort icon component
  const SortIcon = ({ field }: { field: keyof Scope }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingScope ? `/api/admin/scopes/${editingScope.id}` : '/api/admin/scopes';
      const method = editingScope ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save scope');
      }

      await fetchScopes();
      setShowAddModal(false);
      setEditingScope(null);
      setFormData({ domain: "", description: "", targetType: "web_app", status: "active", allowedVulnTypes: [], severityRestriction: [], notes: "", exclusionPaths: "" });
      setToast({
        message: editingScope ? 'Scope updated successfully!' : 'Scope added successfully!',
        type: 'success'
      });
    } catch (err: unknown) {
      console.error('[handleSubmit]', err);
      setToast({
        message: err instanceof Error ? err.message : 'Failed to save scope',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete(id: string, domain: string) {
    setConfirmDialog({ id, domain });
  }

  async function handleDelete() {
    if (!confirmDialog) return;
    const { id } = confirmDialog;
    setConfirmDialog(null);

    try {
      const res = await fetch(`/api/admin/scopes/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete scope');
      }

      await fetchScopes();
      setToast({
        message: 'Scope archived successfully!',
        type: 'success'
      });
    } catch (err: unknown) {
      console.error('[handleDelete]', err);
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete scope',
        type: 'error'
      });
    }
  }

  async function restoreScope(id: string) {
    try {
      const res = await fetch(`/api/admin/scopes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to restore scope');
      }

      await fetchScopes();
      setToast({
        message: 'Scope restored successfully!',
        type: 'success'
      });
    } catch (err: unknown) {
      console.error('[restoreScope]', err);
      setToast({
        message: err instanceof Error ? err.message : 'Failed to restore scope',
        type: 'error'
      });
    }
  }

  function openEditModal(scope: Scope) {
    setEditingScope(scope);
    setFormData({
      domain: scope.domain,
      description: scope.description || "",
      targetType: scope.targetType,
      status: scope.status,
      allowedVulnTypes: scope.allowedVulnTypes ? JSON.parse(scope.allowedVulnTypes) : [],
      severityRestriction: scope.severityRestriction ? JSON.parse(scope.severityRestriction) : [],
      notes: scope.notes || "",
      exclusionPaths: scope.exclusionPaths || "",
    });
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingScope(null);
    setFormData({ domain: "", description: "", targetType: "web_app", status: "active", allowedVulnTypes: [], severityRestriction: [], notes: "", exclusionPaths: "" });
  }

  function toggleArrayField(field: 'allowedVulnTypes' | 'severityRestriction', value: string) {
    setFormData(prev => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎯 Scope Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Define in-scope targets for vulnerability submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Target
            </button>
            <button
              onClick={() => setShowArchived((value) => !value)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                showArchived
                  ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        {!loading && scopes.length > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search by domain, description, type, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <p className="text-xs text-gray-500 mt-2">
                Found {filteredScopes.length} target{filteredScopes.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Targets</p>
            <p className="text-2xl font-bold text-gray-900">{scopes.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Active</p>
            <p className="text-2xl font-bold text-green-700">{scopes.filter(s => s.status === 'active' && s.deletedAt === null).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Deprecated</p>
            <p className="text-2xl font-bold text-yellow-700">{scopes.filter(s => s.status === 'deprecated' && s.deletedAt === null).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{showArchived ? 'Archived' : 'Out of Scope'}</p>
            <p className={`text-2xl font-bold ${showArchived ? 'text-gray-700' : 'text-red-700'}`}>
              {showArchived
                ? scopes.filter(s => s.deletedAt !== null).length
                : scopes.filter(s => s.status === 'out_of_scope' && s.deletedAt === null).length}
            </p>
          </div>
        </div>

        {/* Scopes Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : scopes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-sm font-medium">No targets defined yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Target
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('domain')}>
                      Domain <SortIcon field="domain" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('description')}>
                      Description <SortIcon field="description" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('targetType')}>
                      Type <SortIcon field="targetType" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                      Status <SortIcon field="status" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                      Added <SortIcon field="createdAt" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedScopes.map((scope) => (
                    <tr key={scope.id} className={`hover:bg-gray-50 transition-colors ${scope.deletedAt !== null ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm text-gray-900">{scope.domain}</p>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-600 truncate">{scope.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">
                          {TARGET_TYPE_LABELS[scope.targetType] || scope.targetType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold capitalize ${scope.deletedAt !== null ? STATUS_COLORS.archived : STATUS_COLORS[scope.status] || STATUS_COLORS.active}`}>
                          {scope.deletedAt !== null ? 'archived' : scope.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(scope.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {scope.deletedAt === null ? (
                            <>
                              <button
                                onClick={() => openEditModal(scope)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => confirmDelete(scope.id, scope.domain)}
                                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Archive
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => restoreScope(scope.id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={sortedScopes.length}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">ℹ️ About Scope Management</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>Active:</strong> Targets currently accepting vulnerability reports</li>
            <li><strong>Deprecated:</strong> Legacy targets, reports still accepted but discouraged</li>
            <li><strong>Out of Scope:</strong> Targets explicitly excluded from the program</li>
          </ul>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingScope ? 'Edit Target' : 'Add New Target'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain / URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="example.com or https://api.example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this target..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Type
                </label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="web_app">Web Application</option>
                  <option value="api">API</option>
                  <option value="mobile">Mobile App</option>
                  <option value="infrastructure">Infrastructure</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="deprecated">Deprecated</option>
                  <option value="out_of_scope">Out of Scope</option>
                </select>
              </div>

              {/* Allowed Vulnerability Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Vulnerability Types
                  <span className="ml-1 text-xs text-gray-400 font-normal">(leave empty = all allowed)</span>
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {ALL_VULN_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleArrayField('allowedVulnTypes', type)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        formData.allowedVulnTypes.includes(type)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Restriction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity Restriction
                  <span className="ml-1 text-xs text-gray-400 font-normal">(leave empty = all allowed)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SEVERITIES.map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => toggleArrayField('severityRestriction', sev)}
                      className={`px-3 py-1 text-xs rounded border transition-colors ${
                        formData.severityRestriction.includes(sev)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes / Guidelines for Researchers
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions, known issues, testing environment details..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Exclusion Paths */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exclusion Paths / Out-of-Scope Rules
                </label>
                <textarea
                  rows={3}
                  value={formData.exclusionPaths}
                  onChange={(e) => setFormData({ ...formData, exclusionPaths: e.target.value })}
                  placeholder="/admin/*, /health, third-party login pages..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingScope ? 'Update Target' : 'Add Target'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SiteFooter />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title="Archive Target"
          message={`Are you sure you want to archive "${confirmDialog.domain}"? It will no longer appear in the submission form or scope list. This can be undone by an admin.`}
          confirmText="Archive"
          cancelText="Cancel"
          type="warning"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </main>
  );
}
