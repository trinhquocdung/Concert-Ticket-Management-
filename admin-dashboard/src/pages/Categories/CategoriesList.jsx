/**
 * Categories Management Page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Plus, Edit, Trash2, RefreshCw, GripVertical, FolderOpen, Tag
} from 'lucide-react';
import { 
  PageLoader, EmptyState, Button, Card, Badge, 
  Modal, Input, ConfirmDialog 
} from '../../components/ui';
import * as categoryService from '../../services/categoryService';

export default function CategoriesList() {
  const { authFetch } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ type: null, category: null });
  const [form, setForm] = useState(categoryService.DEFAULT_CATEGORY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories(authFetch);
      setCategories(data.data.categories);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openModal = (type, category = null) => {
    setModal({ type, category });
    if (category) {
      setForm({
        name: category.name,
        slug: category.slug,
        isActive: category.isActive !== false,
        order: category.order || 0
      });
    } else {
      setForm({ ...categoryService.DEFAULT_CATEGORY_FORM, order: categories.length });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.category) {
        await categoryService.updateCategory(authFetch, modal.category._id, form);
        toast.success('Category updated');
      } else {
        await categoryService.createCategory(authFetch, form);
        toast.success('Category created');
      }
      setModal({ type: null, category: null });
      fetchCategories();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await categoryService.deleteCategory(authFetch, modal.category._id);
      toast.success('Category deleted');
      setModal({ type: null, category: null });
      fetchCategories();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const generateSlug = (name) => {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese accents
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories Management</h1>
          <p className="text-gray-400">Manage event categories</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={fetchCategories}><RefreshCw size={20} /></Button>
          <Button onClick={() => openModal('form')}><Plus size={18} /> Add Category</Button>
        </div>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card><EmptyState icon={FolderOpen} title="No categories found" description="Create your first category to organize events" /></Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category, index) => {
            return (
              <Card key={category._id} className="p-4">
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="text-gray-500 cursor-grab">
                    <GripVertical size={20} />
                  </div>
                  
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/20">
                    <Tag size={24} className="text-primary" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{category.name}</h3>
                      <Badge variant={category.isActive ? 'success' : 'gray'}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                      Slug: <span className="text-gray-300">{category.slug}</span>
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openModal('form', category)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openModal('delete', category)}>
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal 
        isOpen={modal.type === 'form'} 
        onClose={() => setModal({ type: null, category: null })}
        title={modal.category ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            label="Name *" 
            required 
            value={form.name} 
            onChange={e => {
              const name = e.target.value;
              setForm({ 
                ...form, 
                name,
                slug: modal.category ? form.slug : generateSlug(name)
              });
            }} 
            placeholder="e.g., Music, Sports, Theater"
          />
          
          <Input 
            label="Slug *" 
            required 
            value={form.slug} 
            onChange={e => setForm({ ...form, slug: e.target.value })} 
            placeholder="e.g., music, sports, theater"
            className="font-mono"
          />
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-zinc-800 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-300">Active (visible to users)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setModal({ type: null, category: null })} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {modal.category ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog 
        isOpen={modal.type === 'delete'} 
        title="Delete Category?"
        message={`Are you sure you want to delete "${modal.category?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" 
        onConfirm={handleDelete} 
        onCancel={() => setModal({ type: null, category: null })} 
        variant="danger" 
      />
    </div>
  );
}
