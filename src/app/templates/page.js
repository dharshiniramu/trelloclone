"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

const categories = [
  { label: "Personal", value: "personal" },
  { label: "Productivity", value: "productivity" },
  { label: "Product Management", value: "product_management" },
  { label: "Project Management", value: "project_management" },
];

const templates = {
  personal: [
    { 
      title: "Personal Task Tracker", 
      img: "/ptemp1.jpg" // Replace with your local image path
    },
    { 
      title: "Home Management", 
      img: "/ptemp2.png" // Replace with your local image path
    },
    { 
      title: "Learning Goals", 
      img: "/ptemp3.jpg" // Replace with your local image path
    },
    { 
      title: "Health & Fitness", 
      img: "/ptemp4.jpg" // Replace with your local image path
    },
  ],
  productivity: [
    { 
      title: "Time Blocking", 
      img: "/prtemp1.jpg" // Replace with your local image path
    },
    { 
      title: "Habit Tracker", 
      img: "/prtemp2.jpg" // Replace with your local image path
    },
    { 
      title: "Goal Setting", 
      img: "/prtemp3.jpg" // Replace with your local image path
    },
    { 
      title: "Focus Sessions", 
      img: "/prtemp4.avif" // Replace with your local image path
    },
  ],
  product_management: [
    { 
      title: "Product Roadmap", 
      img: "/prmtemp1.png" // Replace with your local image path
    },
    { 
      title: "Feature Prioritization", 
      img: "/prmtemp2.jpg" // Replace with your local image path
    },
    { 
      title: "User Research", 
      img: "/prmtemp3.jpeg" // Replace with your local image path
    },
    { 
      title: "A/B Testing", 
      img: "/prmtemp4.avif" // Replace with your local image path
    },
  ],
  project_management: [
    { 
      title: "Agile Sprint Planning", 
      img: "/pmtemp1.jpg" // Replace with your local image path
    },
    { 
      title: "Risk Management", 
      img: "/pmtemp2.jpg" // Replace with your local image path
    },
    { 
      title: "Resource Allocation", 
      img: "/pmtemp3.jpg" // Replace with your local image path
    },
    { 
      title: "Stakeholder Communication", 
      img: "/pmtemp4.jpg" // Replace with your local image path
    },
  ],
};

export default function TemplatesPage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState("personal");

  // Set initial category based on URL parameter
  useEffect(() => {
    const category = searchParams.get('category');
    if (category && templates[category]) {
      setSelected(category);
    }
  }, [searchParams]);

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r px-6 py-8">
          <h2 className="text-xl font-bold mb-6">Templates</h2>
          <nav>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelected(cat.value)}
                className={`block w-full text-left px-4 py-2 rounded-lg mb-2 font-medium transition-all duration-200 ${
                  selected === cat.value
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "hover:bg-gray-100 text-gray-700 hover:shadow-sm"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 flex flex-col px-8 py-12">
          <div className="max-w-6xl mx-auto w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {categories.find(cat => cat.value === selected)?.label} Templates
              </h1>
              <p className="text-gray-600">
                Choose from our curated collection of {categories.find(cat => cat.value === selected)?.label.toLowerCase()} templates
              </p>
            </div>
            
            {/* Template Grid - 2x2 layout with only title and image */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {templates[selected].map((tpl, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={tpl.img}
                      alt={tpl.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to a placeholder if local image path doesn't work
                        e.target.src = "https://via.placeholder.com/400x300?text=Template+Image";
                      }}
                    />
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      {tpl.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}