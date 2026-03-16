import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  delay?: number;
}

const RoleCard = React.forwardRef<HTMLDivElement, RoleCardProps>(
  ({ title, description, icon: Icon, onClick, delay = 0 }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="cursor-pointer group h-full"
      >
        <div className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-lg transition-all duration-300 border border-border/50 overflow-hidden h-full flex flex-col">
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10 flex flex-col items-center text-center gap-4">
            {/* Icon container */}
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300"
            >
              <Icon className="w-10 h-10 text-primary group-hover:text-accent transition-colors duration-300" strokeWidth={1.5} />
            </motion.div>
            
            {/* Text */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            
            {/* Arrow indicator */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileHover={{ opacity: 1, x: 0 }}
              className="text-primary text-sm font-medium"
            >
              Select →
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }
);

RoleCard.displayName = "RoleCard";

export default RoleCard;
