/**
 * Event Form - Create/Edit Event - Refactored
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Loader2, Plus, X, Upload, Link as LinkIcon, Image } from 'lucide-react';
import { Card, Button, Input, Select, Textarea } from '../../components/ui';

import * as eventService from '../../services/eventService';
import { API_URL } from '../../services/api';

// Base URL for uploaded images (without /api)
const BASE_URL = API_URL.replace('/api', '');

export default function EventForm() {
  // Ticket classes for this event
  const [ticketClasses, setTicketClasses] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, token } = useAuth();
  const isEdit = Boolean(id);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [venues, setVenues] = useState([]);
  const [artistsList, setArtistsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [imageMode, setImageMode] = useState('url'); // 'url' or 'upload'

  const [form, setForm] = useState({
    title: '', description: '', category: '',
    venue: '', status: 'DRAFT', thumbnail: '', artists: [],
    performances: []
  });

  // Fetch venues, artists, and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [venuesRes, artistsRes, categoriesRes] = await Promise.all([
          fetch(`${API_URL}/venues`), 
          fetch(`${API_URL}/artists`),
          fetch(`${API_URL}/categories?active=true`)
        ]);
        const [venuesData, artistsData, categoriesData] = await Promise.all([
          venuesRes.json(), artistsRes.json(), categoriesRes.json()
        ]);
        if (venuesData.success) setVenues(venuesData.data.venues || []);
        if (artistsData.success) setArtistsList(artistsData.data.artists || []);
        if (categoriesData.success) {
          setCategories(categoriesData.data.categories || []);
          // Set default category if not editing
          if (!isEdit && categoriesData.data.categories?.length > 0) {
            setForm(f => ({ ...f, category: categoriesData.data.categories[0]._id }));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [isEdit]);

  // Fetch event and ticket classes if editing
  useEffect(() => {
    if (!isEdit || !id) return;
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/concerts/${id}`);
        const data = await res.json();
        if (data.success) {
          const c = data.data.concert;
          const start = new Date(c.start_time);
          const end = c.end_time ? new Date(c.end_time) : null;
          const toLocalDateInput = (dateVal) => {
            if (!dateVal) return '';
            const d = new Date(dateVal);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          };

          setForm({
            title: c.title,
            description: c.description || '',
            category: c.category?._id || c.category || '',
            venue: c.venue?._id || '',
            status: c.status,
            thumbnail: c.thumbnail || '',
            artists: c.artists?.map(a => a._id) || [],
            performances: (c.performances || []).map(perf => ({
              ...perf,
              date: perf.date ? toLocalDateInput(perf.date) : '',
              startTime: perf.startTime || perf.start_time || '',
              endTime: perf.endTime || perf.end_time || ''
            })),
          });
          // Use ticketClasses from the event fetch response
          if (data.data.ticketClasses) setTicketClasses(data.data.ticketClasses);
        }
      } catch (error) {
        toast.error('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Convert performances (date + startTime/endTime) to standardized payload
      const performances = form.performances.map(perf => {
        const perfPayload = { ...perf };
        if (perf.date) {
          const [y, m, d] = perf.date.split('-').map(Number);
          // store date as UTC ISO for the day's midnight in local timezone
          perfPayload.date = new Date(y, m - 1, d).toISOString();
        } else {
          perfPayload.date = null;
        }
        perfPayload.startTime = perf.startTime || perf.start_time || '';
        perfPayload.endTime = perf.endTime || perf.end_time || '';
        return perfPayload;
      });

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        venue: form.venue || null,
        status: form.status,
        thumbnail: form.thumbnail,
        artists: form.artists,
        performances,
      };
      if (isEdit) {
        await eventService.updateConcert(authFetch, id, payload);
        toast.success('Event updated');
      } else {
        await eventService.createConcert(authFetch, payload);
        toast.success('Event created');
      }
      navigate('/events');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleArtist = (artistId) => {
    setForm(f => ({
      ...f,
      artists: f.artists.includes(artistId) ? f.artists.filter(id => id !== artistId) : [...f.artists, artistId]
    }));
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        // Construct full URL for the uploaded image
        const imageUrl = `${BASE_URL}${data.data.url}`;
        setForm(f => ({ ...f, thumbnail: imageUrl }));
        toast.success('Image uploaded successfully');
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Get display URL for thumbnail preview
  const getThumbnailUrl = () => {
    if (!form.thumbnail) return null;
    return form.thumbnail;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/events" className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Event' : 'Create Event'}</h1>
          <p className="text-gray-400">{isEdit ? 'Update event details' : 'Add a new event'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basic Information">
            <div className="space-y-4">
              <Input label="Event Title *" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter event title" />
              <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Event description..." />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  options={categories.map(c => ({ value: c._id, label: c.name }))} />
                <Select label="Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
                  options={[{ value: '', label: 'Select venue...' }, ...venues.map(v => ({ value: v._id, label: v.name }))]} />
              </div>
            </div>
          </Card>

          <Card title="Performances">
            <div className="space-y-4">
              {form.performances.map((perf, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end border-b border-white/10 pb-2 mb-2">
                  <Input label="Date" type="date" value={perf.date} onChange={e => {
                    const val = e.target.value;
                    setForm(f => {
                      const arr = [...f.performances];
                      arr[idx].date = val;
                      return { ...f, performances: arr };
                    });
                  }} />
                  <Input label="Start" type="time" value={perf.startTime} onChange={e => {
                    const val = e.target.value;
                    setForm(f => {
                      const arr = [...f.performances];
                      arr[idx].startTime = val;
                      return { ...f, performances: arr };
                    });
                  }} />
                  <Input label="End" type="time" value={perf.endTime} onChange={e => {
                    const val = e.target.value;
                    setForm(f => {
                      const arr = [...f.performances];
                      arr[idx].endTime = val;
                      return { ...f, performances: arr };
                    });
                  }} />
                  {/* Ticket classes always included, select box hidden */}
                  <input type="hidden" value={perf.ticket_classes?.join(',') || ''} readOnly />
                  <Button type="button" variant="danger" onClick={() => {
                    setForm(f => ({ ...f, performances: f.performances.filter((_, i) => i !== idx) }));
                  }}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => {
                setForm(f => ({
                  ...f,
                  performances: [
                    ...f.performances,
                    {
                      date: '',
                      startTime: '',
                      endTime: '',
                      ticket_classes: ticketClasses.map(tc => tc._id) // always include all
                    }
                  ]
                }));
              }}>
                <Plus size={16} /> Add Performance
              </Button>
              <div className="text-xs text-gray-500 mt-2">All changes are saved when you submit the event form below.</div>
            </div>
          </Card>

          <Card title="Artists">
            <div className="flex flex-wrap gap-2">
              {artistsList.map(artist => (
                <button key={artist._id} type="button" onClick={() => toggleArtist(artist._id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${form.artists.includes(artist._id) ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {artist.name}
                </button>
              ))}
              {artistsList.length === 0 && <p className="text-gray-500 text-sm">No artists available</p>}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card title="Status">
            <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              options={Object.entries(eventService.STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))} />
          </Card>

          <Card title="Thumbnail">
            <div className="space-y-3">
              {/* Image preview */}
              {getThumbnailUrl() && (
                <div className="relative">
                  <img src={getThumbnailUrl()} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, thumbnail: '' })}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Toggle between URL and Upload */}
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${imageMode === 'url' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <LinkIcon size={14} /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${imageMode === 'upload' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Upload size={14} /> Upload
                </button>
              </div>

              {/* URL Input */}
              {imageMode === 'url' && (
                <Input 
                  placeholder="Enter image URL" 
                  value={form.thumbnail} 
                  onChange={e => setForm({ ...form, thumbnail: e.target.value })} 
                />
              )}

              {/* File Upload */}
              {imageMode === 'upload' && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin text-primary" size={24} />
                    ) : (
                      <>
                        <Image size={24} className="text-gray-400 mb-1" />
                        <span className="text-sm text-gray-400">Click to upload</span>
                        <span className="text-xs text-gray-500">Max 5MB (JPG, PNG, GIF, WebP)</span>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-3">
            <Link to="/events" className="flex-1"><Button type="button" variant="outline" className="w-full">Cancel</Button></Link>
            <Button type="submit" loading={saving} className="flex-1"><Save size={16} /> {isEdit ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
