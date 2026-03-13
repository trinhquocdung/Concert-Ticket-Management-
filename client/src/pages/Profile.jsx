import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { 
  User, Mail, Phone, MapPin, Calendar, Edit2, Save, X, 
  Ticket, ShoppingBag, Heart, Settings, LogOut, ChevronRight 
} from "lucide-react";

const Profile = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    dob: "",
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate("/");
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phoneNumbers?.[0]?.phoneNumber || "",
        address: user.publicMetadata?.address || "",
        dob: user.publicMetadata?.dob || "",
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await user.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      // For custom fields like address, dob - you'd update via your backend
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const menuItems = [
    { id: "profile", icon: User, label: "Profile Information" },
    { id: "orders", icon: ShoppingBag, label: "Order History", path: "/orders" },
    { id: "wishlist", icon: Heart, label: "Wishlist", path: "/wishlist" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  // Stats mock data
  const stats = {
    totalTickets: 12,
    upcomingEvents: 3,
    totalSpent: 4500000,
    loyaltyPoints: 450,
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 md:px-16 lg:px-24 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            {/* User Card */}
            <div className="bg-[rgb(37,36,36)] rounded-xl p-6 mb-6">
              <div className="flex flex-col items-center">
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-primary"
                />
                <h2 className="mt-4 text-xl font-semibold">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-400 text-sm">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
                <div className="mt-3 px-4 py-1 bg-primary/20 text-primary rounded-full text-sm">
                  {stats.loyaltyPoints} Points
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="bg-[rgb(37,36,36)] rounded-xl overflow-hidden">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.path ? navigate(item.path) : setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-4 transition hover:bg-white/5 ${
                    activeTab === item.id ? "bg-white/10 border-l-4 border-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-gray-400" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              ))}
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-4 text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Tickets", value: stats.totalTickets, color: "text-blue-400" },
                { label: "Upcoming Events", value: stats.upcomingEvents, color: "text-green-400" },
                    { label: "Total Spent", value: `${(stats.totalSpent / 1000000).toFixed(1)}M VND`, color: "text-primary" },
                { label: "Loyalty Points", value: stats.loyaltyPoints, color: "text-yellow-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-[rgb(37,36,36)] rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Profile Form */}
            {activeTab === "profile" && (
              <div className="bg-[rgb(37,36,36)] rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Profile Information</h2>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:bg-primary-dull flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {loading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">First Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-700 focus:border-primary focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-black/20 rounded-lg">
                        <User className="w-5 h-5 text-gray-500" />
                        <span>{formData.firstName || "Not set"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Last Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-700 focus:border-primary focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-black/20 rounded-lg">
                        <User className="w-5 h-5 text-gray-500" />
                        <span>{formData.lastName || "Not set"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-black/20 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <span>{user.primaryEmailAddress?.emailAddress}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-700 focus:border-primary focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-black/20 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-500" />
                        <span>{formData.phone || "Not set"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Date of Birth</label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-700 focus:border-primary focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-black/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span>{formData.dob || "Not set"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-700 focus:border-primary focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-black/20 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        <span>{formData.address || "Not set"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="bg-[rgb(37,36,36)] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-gray-700">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-gray-400 text-sm">Receive event updates and promotions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-gray-700">
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-gray-400 text-sm">Get ticket reminders via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">Language</p>
                      <p className="text-gray-400 text-sm">Select your preferred language</p>
                    </div>
                    <select className="px-4 py-2 rounded-lg bg-black/30 border border-gray-700">
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
