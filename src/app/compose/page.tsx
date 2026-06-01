'use client';

import React, { useEffect, useState, Suspense } from 'react';
import ComposeModal from '@/components/compose-modal';

function StandaloneCompose() {
  const [initialData, setInitialData] = useState<{ to: string; subject: string; bodyHtml: string; cc?: string; bcc?: string } | null>(null);

  useEffect(() => {
    // Read from localStorage to preserve state safely without URL length restrictions
    const saved = localStorage.getItem('popout_compose_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setInitialData(parsed);
        // Clean up from storage to prevent stale reuse
        localStorage.removeItem('popout_compose_state');
      } catch (e) {
        console.error('Error parsing popout compose state:', e);
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-[#060b18] flex items-center justify-center p-0">
      {/* We configure ComposeModal to render fullscreen inside this standalone page */}
      <ComposeModal
        isOpen={true}
        onClose={() => window.close()}
        initialData={initialData}
        assignedAddresses={[]}
      />
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#060b18]">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'hsl(var(--primary)) transparent transparent transparent' }} />
      </div>
    }>
      <StandaloneCompose />
    </Suspense>
  );
}
