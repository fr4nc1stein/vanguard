"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/validation";
import { parseTemplate, AVAILABLE_VARIABLES } from "@/lib/template-parser";

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  body: string;
  variables: string;
  is_active: number;
  created_by: string;
  created_at: number;
  updated_at: number;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function TemplatesManagementPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [toast, setToast] = useState<Toast | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<TemplateCategory>("triage");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      params.append("active_only", "true");
      
      const res = await fetch(`/api/admin/templates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("[fetchTemplates]", error);
      setToast({ message: "Failed to load templates", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode("create");
    setFormName("");
    setFormCategory("triage");
    setFormSubject("");
    setFormBody("");
    setEditingTemplate(null);
    setShowModal(true);
  }

  function openEditModal(template: Template) {
    setModalMode("edit");
    setFormName(template.name);
    setFormCategory(template.category as TemplateCategory);
    setFormSubject(template.subject || "");
    setFormBody(template.body);
    setEditingTemplate(template);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingTemplate(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const payload = {
        name: formName,
        category: formCategory,
        subject: formSubject || undefined,
        body: formBody,
      };

      const url = modalMode === "create" 
        ? "/api/admin/templates"
        : `/api/admin/templates/${editingTemplate?.id}`;
      
      const method = modalMode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save template");
      }

      setToast({ 
        message: modalMode === "create" ? "Template created!" : "Template updated!", 
        type: "success" 
      });
      closeModal();
      fetchTemplates();
    } catch (error: any) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete(template: Template) {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete template");

      setToast({ message: "Template deleted", type: "success" });
      fetchTemplates();
    } catch (error: any) {
      setToast({ message: error.message, type: "error" });
    }
  }

  function openPreview(template: Template) {
    setPreviewTemplate(template);
    setShowPreview(true);
  }

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "triage": return "🔍";
      case "acceptance": return "✅";
      case "rejection": return "❌";
      case "info_request": return "❓";
      default: return "📝";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "triage": return "bg-blue-100 text-blue-700";
      case "acceptance": return "bg-green-100 text-green-700";
      case "rejection": return "bg-red-100 text-red-700";
      case "info_request": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin" className="hover:text-blue-600 transition-colors">Admin</Link>
              <span>›</span>
              <span className="text-gray-700">Response Templates</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">📝 Response Templates</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create reusable templates for common triage scenarios
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            New Template
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  categoryFilter === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                    categoryFilter === cat
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {getCategoryIcon(cat)} {cat.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No templates found</h3>
            <p className="text-gray-400 text-sm mb-6">
              {searchQuery ? "Try a different search term" : "Create your first template to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-lg text-sm hover:bg-purple-700 transition-colors"
              >
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${getCategoryColor(
                          template.category
                        )}`}
                      >
                        {getCategoryIcon(template.category)} {template.category.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{template.body}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openPreview(template)}
                    className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <div className="ml-auto text-xs text-gray-400">
                    {JSON.parse(template.variables || "[]").length} variables
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === "create" ? "Create Template" : "Edit Template"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="e.g., Duplicate Report"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as TemplateCategory)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 capitalize"
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {getCategoryIcon(cat)} {cat.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject (optional)
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  maxLength={200}
                  placeholder="For future email integration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  required
                  rows={8}
                  maxLength={5000}
                  placeholder="Use {{variable_name}} for dynamic content..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">{formBody.length} / 5000 characters</p>
              </div>

              {/* Available Variables */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">Available Variables:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <div key={v.name} className="flex items-start gap-2">
                      <code className="bg-white px-2 py-0.5 rounded text-purple-700 font-mono">
                        {`{{${v.name}}}`}
                      </code>
                      <span className="text-gray-600">{v.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? "Saving..." : modalMode === "create" ? "Create Template" : "Update Template"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Preview: {previewTemplate.name}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Category</h3>
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded capitalize ${getCategoryColor(
                    previewTemplate.category
                  )}`}
                >
                  {getCategoryIcon(previewTemplate.category)} {previewTemplate.category.replace("_", " ")}
                </span>
              </div>

              {previewTemplate.subject && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Subject</h3>
                  <p className="text-sm text-gray-900">{previewTemplate.subject}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Template Body</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                    {previewTemplate.body}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Sample Output</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                    {parseTemplate(previewTemplate.body, {
                      reporter_name: "John Doe",
                      reporter_email: "john@example.com",
                      ref_id: "VDP-123",
                      title: "SQL Injection in Login Form",
                      severity: "High",
                      target: "example.com",
                      status: "triaged",
                      triager_name: "Jane Smith",
                    })}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Variables Used</h3>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(previewTemplate.variables || "[]").map((v: string) => (
                    <code key={v} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowPreview(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
