/**
 * Artists List - Simplified (name & bio only)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Music, Edit, Trash2, RefreshCw, MoreVertical } from 'lucide-react';
import { PageLoader, EmptyState, SearchInput, Button, Card, Pagination, Modal, Input, Textarea, ConfirmDialog, ActionMenu } from '../../components/ui';
import * as artistService from '../../services/artistService';

export default function ArtistsList() {
  const { authFetch } = useAuth();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [showMenu, setShowMenu] = useState(null);
  const [modal, setModal] = useState({ type: null, artist: null });
  const [form, setForm] = useState(artistService.DEFAULT_ARTIST_FORM);
  const [saving, setSaving] = useState(false);

  const fetchArtists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await artistService.getArtists(authFetch, { ...filters, page: pagination.page, limit: 12 });
      setArtists(data.data.artists);
      setPagination(p => ({ ...p, ...data.data.pagination }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters, pagination.page]);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  const openModal = (type, artist = null) => {
    setModal({ type, artist });
    setForm(artist ? { name: artist.name, bio: artist.bio || '' } : artistService.DEFAULT_ARTIST_FORM);
    setShowMenu(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.artist) {
        await artistService.updateArtist(authFetch, modal.artist._id, form);
        toast.success('Artist updated');
      } else {
        await artistService.createArtist(authFetch, form);
        toast.success('Artist created');
      }
      setModal({ type: null, artist: null });
      fetchArtists();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await artistService.deleteArtist(authFetch, modal.artist._id);
      toast.success('Artist deleted');
      setModal({ type: null, artist: null });
      fetchArtists();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading && artists.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artists Management</h1>
          <p className="text-gray-400">Manage artists and bands</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={fetchArtists}><RefreshCw size={20} /></Button>
          <Button onClick={() => openModal('form')}><Plus size={18} /> Add Artist</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <SearchInput value={filters.search} onChange={v => setFilters(f => ({ ...f, search: v }))} placeholder="Search artists..." className="max-w-md" />
      </Card>

      {/* Artists Grid */}
      {artists.length === 0 ? (
        <Card><EmptyState icon={Music} title="No artists found" /></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {artists.map(artist => (
            <ArtistCard key={artist._id} artist={artist} showMenu={showMenu} setShowMenu={setShowMenu}
              onEdit={() => openModal('form', artist)} onDelete={() => openModal('delete', artist)} />
          ))}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.pages} total={pagination.total}
        onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} itemLabel="artists" />

      {/* Form Modal - Simplified */}
      <Modal isOpen={modal.type === 'form'} onClose={() => setModal({ type: null, artist: null })}
        title={modal.artist ? 'Edit Artist' : 'Add Artist'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Artist or band name" />
          <Textarea label="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={4} placeholder="Short biography..." />
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setModal({ type: null, artist: null })} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{modal.artist ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={modal.type === 'delete'} title="Delete Artist?"
        message={`Are you sure you want to delete ${modal.artist?.name}?`}
        confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setModal({ type: null, artist: null })} variant="danger" />
    </div>
  );
}

const ArtistCard = ({ artist, showMenu, setShowMenu, onEdit, onDelete }) => {
  const menuBtnRef = React.useRef(null);
  const initials = artistService.getArtistInitials(artist);
  
  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-square bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center">
        <span className="text-4xl font-bold text-white/70">{initials}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white">{artist.name}</h3>
          {artist.bio && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{artist.bio}</p>}
        </div>
        <div className="absolute top-2 right-2">
          <button 
            ref={menuBtnRef}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(showMenu === artist._id ? null : artist._id); }} 
            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={16} />
          </button>
          <ActionMenu
            isOpen={showMenu === artist._id}
            onClose={() => setShowMenu(null)}
            buttonRef={menuBtnRef}
            items={[
              { icon: Edit, label: 'Edit', onClick: onEdit },
              { icon: Trash2, label: 'Delete', onClick: onDelete, variant: 'danger' }
            ]}
          />
        </div>
      </div>
    </Card>
  );
};
