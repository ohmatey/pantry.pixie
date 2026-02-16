import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";

const PHRASES = [
  "Pixie is thinking...",
  "One moment...",
  "Checking the pantry...",
  "Just a sec...",
  "Let me see...",
  "Hmm...",
];

const dotVariants = {
  initial: { y: 0 },
  animate: { y: -8 },
};

export function TypingIndicator() {
  const [phrase] = useState(
    () => PHRASES[Math.floor(Math.random() * PHRASES.length)],
  );

  return (
    <div className="flex gap-2 max-w-[85%] mr-auto">
      {/* Breathing Pixie Avatar */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-gradient-to-br from-pixie-sage-500 to-pixie-sage-600 text-white text-xs dark:from-pixie-glow-sage dark:to-pixie-sage-500">
            <Sparkles className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </motion.div>

      <div className="flex items-center gap-3 bg-pixie-cream-100 text-pixie-charcoal-300 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-pixie-soft dark:bg-pixie-dusk-200 dark:text-pixie-mist-100">
        {/* Bouncing Dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: "reverse",
                delay: index * 0.15,
              }}
              className="w-2 h-2 bg-pixie-sage-500 rounded-full dark:bg-pixie-glow-sage"
            />
          ))}
        </div>

        {/* Random Phrase */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-pixie-sage-600 dark:text-pixie-glow-sage"
        >
          {phrase}
        </motion.span>
      </div>
    </div>
  );
}
