"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

interface Scope {
  id: string;
  domain: string;
  description: string | null;
  targetType: string;
  status: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

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
};

export default function ScopeManagement() {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScope, setEditingScope] = useState<Scope | null>(null);
  const [formData, setFormData] = useState({
    domain: "",
    description: "",
    targetType: "web_app",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchScopes();
  }, []);

  async function fetchScopes() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/scopes');
      if (!res.ok) throw new Error('Failed to fetch scopes');
      const data = await res.json();
      setScopes(data.scopes);
    } catch (err) {
      console.error('[fetchScopes]', err);
      alert('Failed to load scopes');
    } finally {
      setLoading(false);
    }
  }

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
      setFormData({ domain: "", description: "", targetType: "web_app", status: "active" });
      alert(editingScope ? 'Scope updated successfully' : 'Scope added successfully');
    } catch (err: unknown) {
      console.error('[handleSubmit]', err);
      alert(err instanceof Error ? err.message : 'Failed to save scope');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this scope? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/scopes/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete scope');
      }

      await fetchScopes();
      alert('Scope deleted successfully');
    } catch (err: unknown) {
      console.error('[handleDelete]', err);
      alert(err instanceof Error ? err.message : 'Failed to delete scope');
    }
  }

  function openEditModal(scope: Scope) {
    setEditingScope(scope);
    setFormData({
      domain: scope.domain,
      description: scope.description || "",
      targetType: scope.targetType,
      status: scope.status,
    });
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingScope(null);
    setFormData({ domain: "", description: "", targetType: "web_app", status: "active" });
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
            <Link
              href="/admin"
              className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Targets</p>
            <p className="text-2xl font-bold text-gray-900">{scopes.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Active</p>
            <p className="text-2xl font-bold text-green-700">{scopes.filter(s => s.status === 'active').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Deprecated</p>
            <p className="text-2xl font-bold text-yellow-700">{scopes.filter(s => s.status === 'deprecated').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Out of Scope</p>
            <p className="text-2xl font-bold text-red-700">{scopes.filter(s => s.status === 'out_of_scope').length}</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Added</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scopes.map((scope) => (
                    <tr key={scope.id} className="hover:bg-gray-50 transition-colors">
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
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold capitalize ${STATUS_COLORS[scope.status] || STATUS_COLORS.active}`}>
                          {scope.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(scope.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(scope)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(scope.id)}
                            className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
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
    </main>
  );
}
