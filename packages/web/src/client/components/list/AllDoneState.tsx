import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export function AllDoneState() {
  useEffect(() => {
    // Fire confetti when component mounts
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 0,
      colors: ["#8FAF9D", "#7FAF9B", "#E6C97A", "#C6C1F2"], // Pixie brand colors
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Launch confetti from two points
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center py-8 text-center"
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-pixie-sage-400 to-pixie-sage-500 flex items-center justify-center mb-4 shadow-lg dark:from-pixie-glow-sage dark:to-pixie-sage-500"
      >
        <Sparkles className="w-8 h-8 text-white animate-sparkle" />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-display font-semibold text-pixie-charcoal-300 mb-2 dark:text-pixie-mist-100"
      >
        All Done! 🎉
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200"
      >
        Nice work! Everything's crossed off.
      </motion.p>
    </motion.div>
  );
}
