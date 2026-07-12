import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ChevronRight, ChevronLeft, SlidersHorizontal } from 'lucide-react';
import FloatingChatButton from '../components/FloatingChatButton';

const SIDEBAR_WIDTH = 272;

export function Layout({ children, showSidebar = false, sidebarContent }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', position: 'relative' }}>

        {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
        {showSidebar && (
          <aside
            className="hidden md:flex"
            style={{
              /* Sticky so it stays visible while the products grid scrolls */
              position: 'sticky',
              top: '64px',                          /* navbar height */
              height: 'calc(100vh - 64px)',
              flexShrink: 0,
              flexDirection: 'column',

              /* Width animation */
              width: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0px',
              minWidth: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0px',
              overflow: 'hidden',                   /* hide content when collapsed */

              background: '#ffffff',
              borderRight: '1px solid #edf2f7',
              transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 20,
              boxShadow: sidebarOpen ? '2px 0 8px rgba(0,0,0,0.04)' : 'none',
            }}
          >
            {/* Inner wrapper — always 272px wide so content never wraps during animation */}
            <div style={{ width: `${SIDEBAR_WIDTH}px`, display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* Sidebar header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px 14px 20px',
                borderBottom: '1px solid #edf2f7',
                flexShrink: 0,
                background: '#ffffff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={16} color="#4a5568" />
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1a202c',
                    letterSpacing: '-0.01em',
                  }}>
                    Filters
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  title="Collapse filters"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#f7fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#edf2f7'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f7fafc'}
                >
                  <ChevronLeft size={14} color="#718096" />
                </button>
              </div>

              {/* Scrollable filter body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '20px 20px 16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  /* Hide scrollbar */
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <style>{`
                  aside div::-webkit-scrollbar { display: none; }
                `}</style>
                {sidebarContent}
              </div>
            </div>
          </aside>
        )}

        {/* Collapsed sidebar — floating tab to re-open */}
        {showSidebar && !sidebarOpen && (
          <button
            className="hidden md:flex"
            onClick={() => setSidebarOpen(true)}
            title="Open filters"
            style={{
              position: 'fixed',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 30,
              width: '32px',
              height: '64px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: 'none',
              borderRadius: '0 12px 12px 0',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '3px 0 10px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f7fafc';
              e.currentTarget.style.width = '40px';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.width = '32px';
            }}
          >
            <ChevronRight size={15} color="#718096" />
          </button>
        )}

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,           /* prevent flex blowout */
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}
        >
          {children}
        </div>
      </main>

      <Footer />
      <FloatingChatButton />
    </div>
  );
}
