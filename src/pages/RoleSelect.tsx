import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Baby, Stethoscope, HeartHandshake, ArrowLeft } from "lucide-react";
import PartnerIcon from "@/components/icons/PartnerIcon";
import Navbar from "@/components/Navbar";
import RoleCard from "@/components/RoleCard";
import { Button } from "@/components/ui/button";

const RoleSelect = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: "mother",
      title: "Mother / Patient",
      description: "Track your pregnancy journey and connect with healthcare providers",
      icon: Baby,
    },
    {
      id: "doctor",
      title: "Doctor",
      description: "Monitor patients and provide timely medical guidance",
      icon: Stethoscope,
    },
    {
      id: "asha",
      title: "ASHA Worker",
      description: "Support mothers in your community with care coordination",
      icon: HeartHandshake,
    },
    {
      id: "partner",
      title: "Partner / Husband",
      description: "Stay informed and view your partner's pregnancy health at a glance",
      icon: PartnerIcon,
    },
  ];

  const handleRoleSelect = (roleId: string) => {
    navigate(`/login?role=${roleId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="min-h-screen flex flex-col items-center justify-center px-6 lg:px-12 pt-24 pb-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-4xl lg:max-w-5xl mx-auto px-4 md:px-6">
          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Select Your Role
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose how you'd like to use SafeMOM
            </p>
          </motion.div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, index) => (
              <RoleCard
                key={role.id}
                title={role.title}
                description={role.description}
                icon={role.icon}
                onClick={() => handleRoleSelect(role.id)}
                delay={0.2 + index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default RoleSelect;
