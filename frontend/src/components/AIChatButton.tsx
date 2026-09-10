/**
 * AIChatButton - Floating action button to open AI chat
 */

import React, { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIChat from "./AIChat";
import { motion, AnimatePresence } from "framer-motion";

const AIChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-full border-2 border-background/90 bg-gradient-to-br from-[hsl(210_80%_52%)] to-[hsl(220_78%_48%)] text-white shadow-lg shadow-[hsl(210_80%_55%/0.4)] ring-2 ring-border/25 transition-[transform,box-shadow,opacity] hover:scale-[1.03] hover:shadow-[hsl(210_80%_55%/0.5)] hover:opacity-100 dark:border-card dark:from-[hsl(210_82%_58%)] dark:to-[hsl(220_76%_52%)] dark:ring-border/30"
            >
              <MessageSquare size={24} strokeWidth={2} className="drop-shadow-sm" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AIChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default AIChatButton;
