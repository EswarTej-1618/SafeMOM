import React from "react";
import { motion } from "framer-motion";
import { Bot, Activity, FileHeart, Brain, Building2, Bell, MapPin, HeartPulse } from "lucide-react";
import PartnerIcon from "@/components/icons/PartnerIcon";

const features = [
  {
    icon: Bot,
    title: "AI Chatbot for Maternal Health",
    description: "Conversational chatbot interface with simple, friendly language. Supports mothers, ASHA workers, and nurses.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Activity,
    title: "Real-Time Risk Assessment",
    description: "Instant WHO-aligned risk calculation with clear levels: Low (🟢), Moderate (🟡), and High (🔴) risk indicators.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: FileHeart,
    title: "Pregnancy Data Collection",
    description: "Track vital signs including age, gestational week, blood pressure, heart rate, SpO₂, temperature, and symptoms.",
    color: "text-heart",
    bgColor: "bg-heart/10",
  },
  {
    icon: Brain,
    title: "AI-Guided Risk Explanation",
    description: "Clear, calm explanations of health risks with next-step guidance. Medical disclaimer included, no diagnosis or prescriptions.",
    color: "text-health-good",
    bgColor: "bg-health-good/10",
  },
  {
    icon: Building2,
    title: "SaaS Platform for Clinics",
    description: "Cloud-based, multi-clinic ready architecture with centralized monitoring dashboard. Scalable for global use.",
    color: "text-health-warning",
    bgColor: "bg-health-warning/10",
  },
  {
    icon: PartnerIcon,
    title: "Partner / Husband Dashboard",
    description: "Husbands and partners get a dedicated read-only dashboard to stay informed about their partner's pregnancy health, vitals, and risk alerts.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: HeartPulse,
    title: "Live Vitals Monitoring",
    description: "Real-time streaming vitals with interactive charts. Track blood pressure, SpO₂, heart rate, and more with instant trend analysis.",
    color: "text-heart",
    bgColor: "bg-heart/10",
  },
  {
    icon: Bell,
    title: "Smart Email Risk Alerts",
    description: "Automated risk-alert emails sent to doctors, ASHA workers, and linked partners when high-risk patterns are detected in vitals or chats.",
    color: "text-health-warning",
    bgColor: "bg-health-warning/10",
  },
  {
    icon: MapPin,
    title: "Nearby Hospital Finder",
    description: "Locate hospitals near the mother in real-time using maps integration. One-tap navigation for emergency preparedness.",
    color: "text-heart",
    bgColor: "bg-heart/10",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-6 lg:px-12 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Powerful <span className="text-gradient-blue">Features</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to monitor maternal health and provide timely care to mothers and babies.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  feature: {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    bgColor: string;
  };
  index: number;
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ feature, index }, ref) => {
    const Icon = feature.icon;
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300"
      >
        <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-5`}>
          <Icon className={`w-7 h-7 ${feature.color}`} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
      </motion.div>
    );
  }
);

FeatureCard.displayName = "FeatureCard";

export default FeaturesSection;
