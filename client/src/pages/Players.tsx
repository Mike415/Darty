/**
 * Players Page — Mobile-First
 *
 * Design: Precision Dark — manage saved player profiles.
 * Create, edit, delete players. Tap a player to view their stats.
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, ChevronRight, User, BarChart3, X } from 'lucide-react';
import { SavedPlayer, getPlayers, savePlayer, deletePlayer } from '@/lib/storage';

export default function Players() {
  const [, setLocation] = useLocation();
  const [players, setPlayers] = useState<SavedPlayer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setPlayers(getPlayers().filter(p => !p.isComputer));
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const player = savePlayer({ name: newName.trim() });
    setPlayers(prev => [...prev, player]);
    setNewName('');
    setShowCreate(false);
  };

  const handleDelete = (id: string) => {
    deletePlayer(id);
    setPlayers(prev => prev.filter(p => p.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header with safe area padding */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-border flex-shrink-0">
        <button onClick={() => setLocation('/')} className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground active:text-foreground active:bg-accent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-foreground">Players</span>
        <button
          onClick={() => setShowCreate(true)}
          className="p-1.5 -mr-1.5 rounded-lg text-neon active:bg-neon/10"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Create player modal - positioned at top to avoid keyboard */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)]"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-[calc(100%-2rem)] max-w-lg bg-card border border-border rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-foreground">New Player</h3>
                <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Player name"
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-input border border-border text-foreground text-base focus:border-neon/50 focus:outline-none mb-4"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="w-full py-3.5 rounded-xl bg-neon text-background font-display font-bold text-base disabled:opacity-40 active:bg-neon/90 transition-colors"
              >
                Create Player
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-display text-sm mb-1">No players yet</p>
            <p className="text-muted-foreground/60 text-xs mb-4">Create a player to start tracking stats</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-xl bg-neon/10 border border-neon/20 text-neon font-display font-bold text-sm active:bg-neon/20"
            >
              <Plus className="w-4 h-4 inline mr-1.5" />
              Add Player
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {players.map((player, idx) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-display font-bold text-neon text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-foreground text-sm truncate">{player.name}</div>
                  <div className="text-[10px] text-muted-foreground/60">
                    Created {new Date(player.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLocation(`/stats/${player.id}`)}
                    className="p-2 rounded-lg text-muted-foreground active:text-neon active:bg-neon/10 transition-colors"
                  >
                    <BarChart3 className="w-4.5 h-4.5" />
                  </button>
                  {deleteConfirm === player.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(player.id)}
                        className="px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive text-xs font-display font-bold active:bg-destructive/25"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded-lg text-muted-foreground text-xs font-display"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(player.id)}
                      className="p-2 rounded-lg text-muted-foreground/40 active:text-destructive active:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
