'use client';

import { MessageCircle } from 'lucide-react';

export function WhatsAppBubble() {
  const handleClick = () => {
    window.open('https://wa.me/8801887473720', '_blank');
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Chat with us on WhatsApp"
      className="fixed right-6 bottom-8 z-40 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl"
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
}
