import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contact" className="py-24 px-6 lg:px-12">
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
            Get in <span className="text-gradient-blue">Touch</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Have questions or suggestions? We'd love to hear from you!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Contact Us</h3>
              <p className="text-muted-foreground leading-relaxed">
                Have any questions or feedback? We're here to help. Complete the form to reach
                out to us, and we'll respond as soon as possible.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Email</h4>
                  <p className="text-muted-foreground">safemom.support@gmail.com</p>
                  <p className="text-muted-foreground">info@safemom.health</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Phone</h4>
                  <p className="text-muted-foreground">+91 1800-SAFEMOM</p>
                  <p className="text-muted-foreground">+91 98765-43210</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-heart/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-heart" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Address</h4>
                  <p className="text-muted-foreground">
                    SafeMOM Healthcare Pvt. Ltd.<br />
                    Tech Park, Sector 21<br />
                    Gurugram, Haryana - 122001
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-xl p-8 border-border/50"
          >
            <form className="space-y-6" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message"),
              };

              if (!data.name || !data.email || !data.message) {
                alert("Please fill in all fields.");
                return;
              }

              const btn = e.currentTarget.querySelector("button");
              if (btn) btn.disabled = true;
              if (btn) btn.textContent = "Sending...";

              try {
                const url = import.meta.env.VITE_API_URL || "http://localhost:3001";
                const response = await fetch(`${url}/api/contact`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });

                if (response.ok) {
                  alert("Message sent successfully! We will get back to you soon.");
                  e.currentTarget.reset();
                } else {
                  console.error("Failed to send message", await response.text());
                  alert("Failed to send message. Please try again.");
                }
              } catch (err) {
                console.error("Error sending message:", err);
                alert("An error occurred. Please try again later.");
              } finally {
                if (btn) btn.disabled = false;
                if (btn) btn.textContent = "Send Message";
              }
            }}>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Name</label>
                <Input
                  name="name"
                  required
                  placeholder="Your name"
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="Your email"
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Message</label>
                <Textarea
                  name="message"
                  required
                  placeholder="Your message"
                  rows={5}
                  className="bg-secondary/50 border-border/50 focus:border-primary resize-none"
                />
              </div>

              <Button type="submit" className="w-full rounded-lg py-6 text-base font-semibold">
                Send Message
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
