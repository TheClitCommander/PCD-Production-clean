import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Clock, Star, Wrench, Shield, Award, CheckCircle } from "lucide-react";

// Example customer website - Mike's Auto Repair
export default function CustomerSite() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mike's Auto Repair</h1>
                <p className="text-blue-200 text-sm">Trusted Since 1995</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span className="font-semibold">(207) 555-0123</span>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700">
                Schedule Service
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            <a href="#" className="py-3 border-b-2 border-orange-500 text-orange-200">Home</a>
            <a href="#services" className="py-3 hover:text-blue-200">Services</a>
            <a href="#about" className="py-3 hover:text-blue-200">About</a>
            <a href="#reviews" className="py-3 hover:text-blue-200">Reviews</a>
            <a href="#contact" className="py-3 hover:text-blue-200">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-blue-900 to-blue-700 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&h=600" 
            alt="Auto repair shop"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-2xl">
            <h2 className="text-5xl font-bold mb-4">Brunswick's Most Trusted Auto Repair</h2>
            <p className="text-xl mb-8 text-blue-100">
              Expert automotive service with 25+ years of experience. We keep your vehicle running safely and efficiently.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Phone className="w-5 h-5 mr-2" />
                Call Now: (207) 555-0123
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-900">
                Get Free Estimate
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Bar */}
      <section className="bg-gray-100 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <MapPin className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold">123 Main Street</p>
                <p className="text-gray-600">Brunswick, ME 04011</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold">Mon-Fri: 8AM-6PM</p>
                <p className="text-gray-600">Sat: 9AM-4PM</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Star className="w-6 h-6 text-yellow-500" />
              <div>
                <p className="font-semibold">4.9/5 Rating</p>
                <p className="text-gray-600">200+ Happy Customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From routine maintenance to major repairs, we provide comprehensive automotive services to keep you on the road.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: "Oil Changes", price: "Starting at $39", icon: "🛢️" },
              { name: "Brake Service", price: "Starting at $89", icon: "🛞" },
              { name: "Engine Diagnostics", price: "Starting at $129", icon: "🔧" },
              { name: "Transmission Service", price: "Starting at $149", icon: "⚙️" },
              { name: "AC Repair", price: "Starting at $99", icon: "❄️" },
              { name: "Tire Installation", price: "Starting at $25", icon: "🏎️" }
            ].map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">{service.icon}</div>
                  <h4 className="text-xl font-semibold mb-2">{service.name}</h4>
                  <p className="text-gray-600 mb-4">{service.price}</p>
                  <Button variant="outline" className="w-full">Learn More</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Mike's Auto Repair?</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Licensed & Insured", desc: "Fully certified mechanics" },
              { icon: Award, title: "25+ Years Experience", desc: "Trusted by Brunswick families" },
              { icon: CheckCircle, title: "Quality Guarantee", desc: "All work backed by warranty" },
              { icon: Clock, title: "Fast Service", desc: "Same-day service available" }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-3xl font-bold mb-6">Ready to Schedule Service?</h3>
              <p className="text-blue-100 mb-8">
                Call us today or stop by our shop. We're here to keep your vehicle running at its best.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="font-semibold text-xl">(207) 555-0123</p>
                    <p className="text-blue-200">Call for appointment</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="font-semibold">123 Main Street</p>
                    <p className="text-blue-200">Brunswick, ME 04011</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white text-gray-900 rounded-lg p-8">
              <h4 className="text-2xl font-bold mb-6">Schedule Online</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Service Needed</label>
                  <select className="w-full p-3 border rounded-lg">
                    <option>Oil Change</option>
                    <option>Brake Service</option>
                    <option>Engine Diagnostics</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Date</label>
                  <input type="date" className="w-full p-3 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input type="tel" className="w-full p-3 border rounded-lg" />
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  Request Appointment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 Mike's Auto Repair. All rights reserved.</p>
          <p className="text-gray-400 mt-2">Licensed Maine Auto Repair Facility #AR2024-1234</p>
        </div>
      </footer>
    </div>
  );
}