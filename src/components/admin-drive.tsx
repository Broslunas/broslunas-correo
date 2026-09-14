'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  List,
  Search,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Archive,
  Film,
  Table as TableIcon,
  AlertTriangle,
  HardDrive,
  Mail,
  CheckSquare,
  Square,
  X,
  Loader2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { showConfirm } from '@/lib/modal';

export interface R2FileItem {
  key: string;
  filename: string;
  size: number;
  lastModified: string;
  contentType: string;
  category: 'image' | 'document' | 'spreadsheet' | 'archive' | 'media' | 'other';
  isOrphan: boolean;
  emailId: string | null;
  emailSubject: string | null;
  from: string | null;
  fromName: string | null;
  to: string | null;
  folder: string | null;
}

interface AdminDriveProps {
  mailboxes?: Array<{ email: string; name: string }>;
}

export default function AdminDrive({ mailboxes = [] }: AdminDriveProps) {
  const [files, setFiles] = useState<R2FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMailbox, setSelectedMailbox] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<R2FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (selectedMailbox) params.set('mailbox', selectedMailbox);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/files?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setStats(data.stats || null);
        setSelectedKeys([]);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al cargar los archivos');
      }
    } catch (err) {
      console.error('Error fetching R2 files:', err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [categoryFilter, selectedMailbox]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const toggleSelectKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    if (selectedKeys.length === files.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(files.map((f) => f.key));
    }
  };

  const handleDelete = async (keysToDelete: string[]) => {
    if (!keysToDelete.length) return;
    const msg =
      keysToDelete.length === 1
        ? '¿Estás seguro de que deseas eliminar este archivo permanentemente de Cloudflare R2?'
        : `¿Estás seguro de que deseas eliminar ${keysToDelete.length} archivos permanentemente de Cloudflare R2?`;
    const confirmed = await showConfirm(msg, {
      title: 'Eliminar archivo(s)',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keysToDelete })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || 'Archivo(s) eliminado(s) correctamente.');
        fetchFiles();
        if (previewFile && keysToDelete.includes(previewFile.key)) {
          setPreviewFile(null);
        }
      } else {
        setError(data.error || 'Error al eliminar archivo(s)');
      }
    } catch (err) {
      console.error(err);
      setError('Error de comunicación con el servidor al eliminar.');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (category === 'image') return <ImageIcon className="h-5 w-5 text-emerald-400" />;
    if (category === 'spreadsheet' || ['xls', 'xlsx', 'csv'].includes(ext))
      return <TableIcon className="h-5 w-5 text-green-500" />;
    if (ext === 'pdf') return <FileText className="h-5 w-5 text-rose-500" />;
    if (category === 'document') return <FileText className="h-5 w-5 text-blue-400" />;
    if (category === 'archive') return <Archive className="h-5 w-5 text-amber-400" />;
    if (category === 'media') return <Film className="h-5 w-5 text-purple-400" />;
    return <File className="h-5 w-5 text-slate-400" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* Top Banner & Stats */}
      <div className="p-4 border-b border-border bg-card/60 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              Cloudflare R2 File Drive
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Explorador de adjuntos y archivos almacenados en bucket
            </p>
          </div>
        </div>

        {/* Global Stats Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-muted border border-border flex items-center gap-2">
            <span className="text-muted-foreground">Archivos:</span>
            <span className="font-bold text-foreground">{stats?.totalFiles ?? files.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-muted border border-border flex items-center gap-2">
            <span className="text-muted-foreground">Espacio R2:</span>
            <span className="font-bold text-primary">{stats?.totalMB ?? '0'} MB</span>
          </div>
          {stats?.orphanCount > 0 && (
            <button
              onClick={() => setCategoryFilter(categoryFilter === 'orphan' ? 'all' : 'orphan')}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                categoryFilter === 'orphan'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Filtrar archivos sin correo vinculado"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{stats.orphanCount} Huérfanos</span>
            </button>
          )}
          <button
            onClick={fetchFiles}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            title="Recargar archivos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Bar (Google Drive Style) */}
      <div className="px-6 py-3 border-b border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, remitente o asunto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-8 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTimeout(fetchFiles, 0);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {/* Mailbox Filter Dropdown */}
        {mailboxes.length > 0 && (
          <div className="relative">
            <select
              value={selectedMailbox}
              onChange={(e) => setSelectedMailbox(e.target.value)}
              className="rounded-lg border border-border bg-background py-1.5 px-3 text-xs text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="">Todos los Buzones</option>
              {mailboxes.map((mb) => (
                <option key={mb.email} value={mb.email}>
                  {mb.name} ({mb.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Multi-selection delete button */}
        {selectedKeys.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              disabled={deleting}
              onClick={() => handleDelete(selectedKeys)}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar ({selectedKeys.length})
            </button>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-background">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista Cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista Lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-6 py-2 border-b border-border/50 bg-background/50 flex items-center gap-1.5 overflow-x-auto shrink-0">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'image', label: 'Imágenes', icon: ImageIcon },
          { id: 'document', label: 'Documentos', icon: FileText },
          { id: 'spreadsheet', label: 'Planillas', icon: TableIcon },
          { id: 'archive', label: 'Comprimidos', icon: Archive },
          { id: 'media', label: 'Multimedia', icon: Film },
          { id: 'orphan', label: 'Huérfanos', icon: AlertTriangle }
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-border/60'
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs">Consultando bucket Cloudflare R2 y metadatos...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <HardDrive className="h-12 w-12 opacity-25 mb-3" />
            <p className="text-sm font-semibold text-foreground">No se encontraron archivos</p>
            <p className="text-xs mt-1">El bucket R2 está vacío o no coincide ningún archivo con los filtros seleccionados.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View (Google Drive Cards) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {files.map((file) => {
              const isSelected = selectedKeys.includes(file.key);
              const downloadUrl = `/api/attachments?key=${encodeURIComponent(file.key)}&filename=${encodeURIComponent(file.filename)}`;
              const previewUrl = `/api/attachments?key=${encodeURIComponent(file.key)}&filename=${encodeURIComponent(file.filename)}&inline=true`;

              return (
                <div
                  key={file.key}
                  className={`group relative rounded-xl border transition-all bg-card overflow-hidden flex flex-col justify-between hover:shadow-lg ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  {/* Card Header & Preview Area */}
                  <div
                    onClick={() => setPreviewFile(file)}
                    className="h-36 bg-muted/30 flex items-center justify-center relative cursor-pointer overflow-hidden select-none"
                  >
                    {file.category === 'image' ? (
                      <img
                        src={previewUrl}
                        alt={file.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                        <div className="p-3 rounded-2xl bg-background shadow border border-border group-hover:scale-110 transition-transform duration-300">
                          {getCategoryIcon(file.category, file.filename)}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                          {file.filename.split('.').pop()}
                        </span>
                      </div>
                    )}

                    {/* Selection Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectKey(file.key);
                      }}
                      className={`absolute top-2 left-2 p-1 rounded-md transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>

                    {/* Orphan Badge */}
                    {file.isOrphan && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-bold tracking-tight shadow">
                        Huérfano
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <p
                        className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-primary"
                        title={file.filename}
                        onClick={() => setPreviewFile(file)}
                      >
                        {file.filename}
                      </p>

                      {/* Associated Email Info */}
                      {file.emailSubject ? (
                        <div className="text-[10px] text-muted-foreground truncate mt-1 flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0 text-primary" />
                          <span className="truncate" title={file.emailSubject}>
                            {file.emailSubject}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-500 truncate mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Sin correo asociado</span>
                        </div>
                      )}

                      {file.from && (
                        <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5">
                          De: {file.from}
                        </p>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="p-1 rounded hover:bg-muted hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                          title="Previsualizar"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={downloadUrl}
                          download={file.filename}
                          className="p-1 rounded hover:bg-muted hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                          title="Descargar"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete([file.key])}
                          className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-all cursor-pointer"
                          title="Eliminar de R2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View (Table) */
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur border-b border-border text-muted-foreground font-medium text-[10px] uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <button type="button" onClick={selectAll} className="cursor-pointer">
                      {selectedKeys.length === files.length && files.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Archivo</th>
                  <th className="py-3 px-4">Correo Vinculado</th>
                  <th className="py-3 px-4">Buzón</th>
                  <th className="py-3 px-4">Tamaño</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {files.map((file) => {
                  const isSelected = selectedKeys.includes(file.key);
                  const downloadUrl = `/api/attachments?key=${encodeURIComponent(file.key)}&filename=${encodeURIComponent(file.filename)}`;

                  return (
                    <tr
                      key={file.key}
                      className={`hover:bg-muted/40 transition-all ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectKey(file.key)}
                          className="cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          {getCategoryIcon(file.category, file.filename)}
                          <span
                            className="font-semibold cursor-pointer hover:text-primary truncate max-w-xs"
                            title={file.filename}
                            onClick={() => setPreviewFile(file)}
                          >
                            {file.filename}
                          </span>
                          {file.isOrphan && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold border border-amber-500/30">
                              Huérfano
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {file.emailSubject ? (
                          <div className="truncate max-w-xs" title={file.emailSubject}>
                            {file.emailSubject}
                          </div>
                        ) : (
                          <span className="text-amber-500 text-[10px]">Sin correo vinculado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {file.from || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {new Date(file.lastModified).toLocaleDateString('es-ES', {
                          dateStyle: 'short'
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Previsualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <a
                            href={downloadUrl}
                            download={file.filename}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDelete([file.key])}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer"
                            title="Eliminar de R2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-background border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-zoomIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3 min-w-0">
                {getCategoryIcon(previewFile.category, previewFile.filename)}
                <div className="truncate">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {previewFile.filename}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(previewFile.size)} • {previewFile.contentType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/attachments?key=${encodeURIComponent(previewFile.key)}&filename=${encodeURIComponent(previewFile.filename)}`}
                  download={previewFile.filename}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-all hover:bg-primary/90 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Preview Display */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20 min-h-[350px]">
              {previewFile.category === 'image' ? (
                <img
                  src={`/api/attachments?key=${encodeURIComponent(previewFile.key)}&inline=true`}
                  alt={previewFile.filename}
                  className="max-h-[70vh] max-w-full object-contain rounded shadow"
                />
              ) : previewFile.filename.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`/api/attachments?key=${encodeURIComponent(previewFile.key)}&filename=${encodeURIComponent(previewFile.filename)}&inline=true`}
                  className="w-full h-[70vh] border-0 rounded"
                  title={previewFile.filename}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
                  <div className="p-4 rounded-3xl bg-muted border border-border">
                    {getCategoryIcon(previewFile.category, previewFile.filename)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Vista previa no disponible</p>
                    <p className="text-xs mt-1">Este tipo de archivo no admite previsualización en el navegador.</p>
                  </div>
                  <a
                    href={`/api/attachments?key=${encodeURIComponent(previewFile.key)}&filename=${encodeURIComponent(previewFile.filename)}`}
                    download={previewFile.filename}
                    className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-2 cursor-pointer shadow"
                  >
                    <Download className="h-4 w-4" />
                    Descargar para abrir
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer: Email Context */}
            <div className="px-6 py-3 border-t border-border bg-card/60 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-4">
                <span>
                  <strong className="text-foreground">Clave R2:</strong>{' '}
                  <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {previewFile.key}
                  </code>
                </span>
                {previewFile.emailSubject && (
                  <span>
                    <strong className="text-foreground">Asunto Correo:</strong> {previewFile.emailSubject}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete([previewFile.key])}
                className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar Archivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
