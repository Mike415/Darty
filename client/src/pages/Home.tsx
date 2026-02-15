/**
 * Home Page — Mobile-First
 *
 * Design: Precision Dark — dramatic hero with game mode selection.
 * Full-screen layout optimized for phone screens.
 * Includes link to Players page for profile/stats management.
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Target, Crosshair, Users, BarChart3 } from 'lucide-react';

const HeroBackground = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="dartboardGradient" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#1a1a2e" />
        <stop offset="100%" stopColor="#0d0d14" />
      </radialGradient>
      <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#00ff87" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#00ff87" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="400" height="300" fill="url(#dartboardGradient)" />
    <circle cx="200" cy="150" r="120" fill="url(#ringGlow)" />
    <circle cx="200" cy="150" r="100" fill="none" stroke="#2a2a3e" strokeWidth="20" />
    <circle cx="200" cy="150" r="80" fill="none" stroke="#1f1f2f" strokeWidth="16" />
    <circle cx="200" cy="150" r="60" fill="none" stroke="#2a2a3e" strokeWidth="14" />
    <circle cx="200" cy="150" r="40" fill="none" stroke="#1f1f2f" strokeWidth="12" />
    <circle cx="200" cy="150" r="20" fill="none" stroke="#00ff87" strokeWidth="2" opacity="0.5" />
    <circle cx="200" cy="150" r="8" fill="#00ff87" opacity="0.8" />
    <circle cx="200" cy="150" r="3" fill="#fff" />
    {[...Array(20)].map((_, i) => (
      <line
        key={i}
        x1="200"
        y1="150"
        x2={200 + 110 * Math.cos((i * 18 - 90) * Math.PI / 180)}
        y2={150 + 110 * Math.sin((i * 18 - 90) * Math.PI / 180)}
        stroke="#3a3a4e"
        strokeWidth="1"
        opacity="0.4"
      />
    ))}
  </svg>
);

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
      {/* Hero section with safe area padding */}
      <div className="relative flex-shrink-0 h-[36vh] min-h-[200px] max-h-[280px] overflow-hidden pt-[env(safe-area-inset-top)]">
        <HeroBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl font-bold text-white leading-tight"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.7)' }}
          >
            Darty
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-white/70 mt-1 font-display"
            style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}
          >
            Track scores. Challenge the AI. Play to win.
          </motion.p>
        </div>
      </div>

      {/* Game mode selection */}
      <div className="flex-1 flex flex-col px-5 py-5 gap-3 overflow-y-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-display font-bold text-muted-foreground uppercase tracking-widest mb-0.5"
        >
          Choose Game Mode
        </motion.p>

        {/* X01 Card */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => setLocation('/setup/x01')}
          className="w-full text-left rounded-2xl border border-border bg-card/60 p-4 active:bg-neon/10 active:border-neon/30 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center flex-shrink-0 group-active:bg-neon/20">
              <Target className="w-5.5 h-5.5 text-neon" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground">X01</h3>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Classic countdown from 501, 301, or custom. Double out to finish.
              </p>
            </div>
          </div>
        </motion.button>

        {/* Cricket Card */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => setLocation('/setup/cricket')}
          className="w-full text-left rounded-2xl border border-border bg-card/60 p-4 active:bg-info/10 active:border-info/30 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center flex-shrink-0 group-active:bg-info/20">
              <Crosshair className="w-5.5 h-5.5 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground">Cricket</h3>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Close 20 through 15 and Bull. Score points on open numbers.
              </p>
            </div>
          </div>
        </motion.button>

        {/* Divider */}
        <div className="h-px bg-border/50 my-1" />

        {/* Players & Stats */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          onClick={() => setLocation('/players')}
          className="w-full text-left rounded-2xl border border-border bg-card/40 p-4 active:bg-accent active:border-border transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0 group-active:bg-warning/20">
              <Users className="w-5.5 h-5.5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-bold text-foreground">Players & Stats</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage profiles, view game history and performance</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          </div>
        </motion.button>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-5 pb-4 text-center">
        <p className="text-[10px] text-muted-foreground/40 font-display">
          Play with passion.
        </p>
      </div>
    </div>
  );
}
